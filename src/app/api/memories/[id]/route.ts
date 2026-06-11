import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { incrementApprovedCount } from "@/lib/moderation/pipeline";
import { touchStewardActivity } from "@/lib/audit";

const schema = z.object({
  action: z.enum(["approve", "reject", "reject_and_block"]),
});

/** Steward moderation: one-tap approve / reject / reject + block (PRD §4.5). */
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
  const { data: memory } = await admin
    .from("memories")
    .select("id, page_id, status, contributor_email")
    .eq("id", id)
    .single();
  if (!memory) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { data: steward } = await admin
    .from("stewards")
    .select("id")
    .eq("page_id", memory.page_id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!steward) return NextResponse.json({ error: "Not a steward of this page" }, { status: 403 });

  if (memory.status !== "pending") {
    return NextResponse.json({ error: "This memory is not awaiting review" }, { status: 409 });
  }

  const { action } = parsed.data;
  if (action === "approve") {
    await admin
      .from("memories")
      .update({
        status: "approved",
        approved_by: user.id,
        approved_at: new Date().toISOString(),
      })
      .eq("id", id);
    await incrementApprovedCount(memory.contributor_email);
  } else {
    await admin.from("memories").update({ status: "rejected" }).eq("id", id);
    if (action === "reject_and_block") {
      await admin.from("contributor_page_blocks").upsert({
        page_id: memory.page_id,
        email: memory.contributor_email,
      });
    }
  }

  await touchStewardActivity(memory.page_id, user.id, `memory_${action}`);
  return NextResponse.json({ ok: true });
}
