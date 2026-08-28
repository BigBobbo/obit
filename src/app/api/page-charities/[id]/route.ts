import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { touchStewardActivity } from "@/lib/audit";

/**
 * Remove a charity from a page. The donations recorded against it go with it —
 * they are our record of a gift that lives at the charity, not a ledger, so
 * nothing is lost that anybody is owed.
 */
export async function DELETE(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const admin = createAdminClient();
  const { data: charity } = await admin
    .from("page_charities")
    .select("id, page_id")
    .eq("id", id)
    .maybeSingle();
  if (!charity) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { data: steward } = await admin
    .from("stewards")
    .select("id")
    .eq("page_id", charity.page_id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!steward) {
    return NextResponse.json({ error: "Not a steward of this page" }, { status: 403 });
  }

  const { error } = await admin.from("page_charities").delete().eq("id", id);
  if (error) return NextResponse.json({ error: "Could not remove that charity." }, { status: 500 });

  await touchStewardActivity(charity.page_id as string, user.id, "charity_removed");
  return NextResponse.json({ ok: true });
}
