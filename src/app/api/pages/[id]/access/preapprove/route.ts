import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { touchStewardActivity } from "@/lib/audit";
import { parseEmailList } from "@/lib/utils";

const schema = z.object({
  // A pasted block: commas, semicolons, spaces or newlines — whatever comes out
  // of the family's phone.
  emails: z.string().max(20000),
});

/**
 * Pre-approved emails (PRD v2 §1.1): close family should not wait in a queue
 * their own relative is supposed to be watching. A pre-approved address still
 * has to verify — the standing yes is about waiting, not about identity.
 *
 * Adding an address that already has a decision leaves that decision alone: a
 * paste of the family address book must not silently reverse a decline.
 */
export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
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
  const { data: steward } = await admin
    .from("stewards")
    .select("id")
    .eq("page_id", id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!steward) {
    return NextResponse.json({ error: "Not a steward of this page" }, { status: 403 });
  }

  const emails = parseEmailList(parsed.data.emails);
  if (emails.length === 0) {
    return NextResponse.json({ error: "No valid email addresses found." }, { status: 400 });
  }

  const { data: existing } = await admin
    .from("access_requests")
    .select("email")
    .eq("page_id", id)
    .in("email", emails);
  const already = new Set((existing ?? []).map((r) => r.email as string));
  const fresh = emails.filter((e) => !already.has(e));

  if (fresh.length > 0) {
    const { error } = await admin
      .from("access_requests")
      .insert(fresh.map((email) => ({ page_id: id, email, status: "preapproved" })));
    if (error) {
      console.error("pre-approval insert failed", error);
      return NextResponse.json({ error: "Could not save that list." }, { status: 500 });
    }
  }

  await touchStewardActivity(id, user.id, "access_preapproved");
  return NextResponse.json({ ok: true, added: fresh.length, skipped: emails.length - fresh.length });
}
