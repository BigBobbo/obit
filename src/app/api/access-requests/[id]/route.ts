import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendAccessApproved } from "@/lib/email";
import { touchStewardActivity } from "@/lib/audit";

const schema = z.object({ action: z.enum(["approve", "decline"]) });

/**
 * The steward's decision on an access request (PRD v2 §1.1).
 *
 * Approving emails the requester the link that opens the page. Declining emails
 * nobody: the requester keeps seeing "the family will review your request" and
 * the family never has to write a rejection.
 */
export async function PATCH(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const admin = createAdminClient();
  const { data: req } = await admin
    .from("access_requests")
    .select("id, page_id, email, status, verify_token")
    .eq("id", id)
    .maybeSingle();
  if (!req) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { data: steward } = await admin
    .from("stewards")
    .select("id")
    .eq("page_id", req.page_id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!steward) {
    return NextResponse.json({ error: "Not a steward of this page" }, { status: 403 });
  }

  if (req.status !== "pending") {
    return NextResponse.json({ error: "This request has already been decided." }, { status: 409 });
  }

  const { action } = parsed.data;
  await admin
    .from("access_requests")
    .update({
      status: action === "approve" ? "approved" : "declined",
      decided_by: user.id,
      decided_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (action === "approve") {
    const { data: page } = await admin
      .from("pages")
      .select("name, random_id")
      .eq("id", req.page_id)
      .single();
    if (page) {
      await sendAccessApproved(req.email as string, {
        pageName: page.name as string,
        randomId: page.random_id as string,
        token: req.verify_token as string,
      });
    }
  }

  await touchStewardActivity(req.page_id as string, user.id, `access_request_${action}`);
  return NextResponse.json({ ok: true });
}
