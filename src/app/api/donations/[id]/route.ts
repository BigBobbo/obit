import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { touchStewardActivity } from "@/lib/audit";

const schema = z.object({ action: z.enum(["publish", "hide"]) });

/**
 * The family's decision on what a donor wrote (PRD v2 §3.2).
 *
 * Display only. Hiding a message never touches the money — it was given to the
 * charity, it is counted in the total, and no action here can change either.
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
  const { data: donation } = await admin
    .from("donations")
    .select("id, page_charities!inner(page_id)")
    .eq("id", id)
    .maybeSingle();
  if (!donation) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const pageId = (donation.page_charities as unknown as { page_id: string }).page_id;
  const { data: steward } = await admin
    .from("stewards")
    .select("id")
    .eq("page_id", pageId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!steward) {
    return NextResponse.json({ error: "Not a steward of this page" }, { status: 403 });
  }

  const { error } = await admin
    .from("donations")
    .update({ status: parsed.data.action === "publish" ? "published" : "hidden" })
    .eq("id", id);
  if (error) return NextResponse.json({ error: "Could not save that." }, { status: 500 });

  await touchStewardActivity(pageId, user.id, `donation_${parsed.data.action}`);
  return NextResponse.json({ ok: true });
}
