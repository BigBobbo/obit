import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { incrementApprovedCount } from "@/lib/moderation/pipeline";
import { touchStewardActivity } from "@/lib/audit";
import { removeMemory } from "@/lib/moderation/removal";
import { stewardActionAllowed, actionConflictMessage } from "@/lib/memories";
import { resolveDeclineReason } from "@/lib/decline-templates";
import { sendMemoryDeclined } from "@/lib/email";

const schema = z.object({
  action: z.enum(["approve", "reject", "reject_and_block"]),
  // Every decline carries a human-readable reason (PRD v2 §2.3). A steward
  // picks a template or writes their own; neither the UI nor this route has a
  // path that produces a silent rejection.
  declineTemplate: z.string().max(50).optional(),
  declineReason: z.string().max(1000).optional(),
});

/**
 * Steward moderation: one-tap approve / reject / reject + block (PRD §4.5).
 *
 * Rejection is accepted for an already-approved memory too, which is what
 * makes a report on a published memory actionable by the family (PRD §4.6).
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

  const { action } = parsed.data;
  if (!stewardActionAllowed(memory.status, action)) {
    return NextResponse.json(
      { error: actionConflictMessage(memory.status, action) },
      { status: 409 },
    );
  }

  const now = new Date().toISOString();

  if (action === "approve") {
    await admin
      .from("memories")
      .update({
        status: "approved",
        approved_by: user.id,
        approved_at: now,
        // Half of the approval-latency clock (PRD v2 §2.3): latency is the
        // conversion risk here, so it is measured before it is optimised.
        decided_at: now,
      })
      .eq("id", id);
    await incrementApprovedCount(memory.contributor_email);
  } else {
    const reason = resolveDeclineReason({
      templateId: parsed.data.declineTemplate,
      custom: parsed.data.declineReason,
    });
    await removeMemory(id, {
      revokeApproval: true,
      blockContributorOnPage:
        action === "reject_and_block"
          ? { pageId: memory.page_id, email: memory.contributor_email }
          : undefined,
    });
    await admin
      .from("memories")
      .update({ decided_at: now, decline_reason: reason })
      .eq("id", id);

    // The contributor hears why. Never a bare rejection.
    const { data: page } = await admin
      .from("pages")
      .select("name, random_id")
      .eq("id", memory.page_id)
      .single();
    await sendMemoryDeclined(memory.contributor_email, {
      pageName: (page?.name as string) ?? "the memorial page",
      reason,
      randomId: (page?.random_id as string) ?? null,
    });

    // Removing a published memory settles any open steward report about it.
    await admin
      .from("reports")
      .update({
        status: "resolved",
        resolution: "Memory removed by a steward.",
        resolved_at: now,
      })
      .eq("memory_id", id)
      .eq("status", "steward");
  }

  await touchStewardActivity(memory.page_id, user.id, `memory_${action}`);
  return NextResponse.json({ ok: true });
}
