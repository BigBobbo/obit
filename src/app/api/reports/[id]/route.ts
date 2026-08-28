import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { removeMemory } from "@/lib/moderation/removal";
import { touchStewardActivity } from "@/lib/audit";
import { REPORTED_DECLINE_REASON } from "@/lib/decline-templates";
import { sendMemoryDeclined } from "@/lib/email";

const schema = z.object({
  action: z.enum(["dismiss", "remove_memory", "remove_and_block", "escalate"]),
  note: z.string().max(2000).optional(),
});

/**
 * Steward action on a report about a memory on their page (PRD §4.6).
 *
 * Memory reports go to the family first — but until this existed they arrived
 * as a read-only list, with no way to act on a memory that was already
 * published. Escalation to the platform admin stays available for anything the
 * family would rather not judge itself.
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
  const { data: report } = await admin
    .from("reports")
    .select("id, page_id, memory_id, target_type, status")
    .eq("id", id)
    .maybeSingle();
  if (!report) return NextResponse.json({ error: "Report not found" }, { status: 404 });

  const { data: steward } = await admin
    .from("stewards")
    .select("id")
    .eq("page_id", report.page_id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!steward) return NextResponse.json({ error: "Not a steward of this page" }, { status: 403 });

  // Stewards handle memory reports only. Page-level reports and anything
  // already escalated belong to the platform admin.
  if (report.target_type !== "memory" || report.status !== "steward") {
    return NextResponse.json(
      { error: "This report is no longer yours to action." },
      { status: 409 },
    );
  }

  const { action, note } = parsed.data;
  const now = new Date().toISOString();

  if (action === "escalate") {
    await admin
      .from("reports")
      .update({
        status: "escalated",
        escalated_at: now,
        resolution: note ? `Escalated by a steward: ${note}` : "Escalated by a steward.",
      })
      .eq("id", id);
    await touchStewardActivity(report.page_id, user.id, "report_escalated");
    return NextResponse.json({ ok: true, status: "escalated" });
  }

  if (action !== "dismiss" && report.memory_id) {
    const { data: memory } = await admin
      .from("memories")
      .select("contributor_email")
      .eq("id", report.memory_id)
      .maybeSingle();
    await removeMemory(report.memory_id, {
      revokeApproval: true,
      blockContributorOnPage:
        action === "remove_and_block" && memory
          ? { pageId: report.page_id, email: memory.contributor_email }
          : undefined,
    });

    // A takedown is a decline too, and no decline is silent (PRD v2 §2.3).
    await admin
      .from("memories")
      .update({ decided_at: now, decline_reason: REPORTED_DECLINE_REASON })
      .eq("id", report.memory_id);
    if (memory) {
      const { data: page } = await admin
        .from("pages")
        .select("name, random_id")
        .eq("id", report.page_id)
        .single();
      await sendMemoryDeclined(memory.contributor_email as string, {
        pageName: (page?.name as string) ?? "the memorial page",
        reason: REPORTED_DECLINE_REASON,
        randomId: (page?.random_id as string) ?? null,
      });
    }
  }

  await admin
    .from("reports")
    .update({
      status: "resolved",
      resolved_at: now,
      resolution:
        action === "dismiss"
          ? note || "Reviewed by a steward; no action taken."
          : "Memory removed by a steward.",
    })
    .eq("id", id);

  await touchStewardActivity(report.page_id, user.id, `report_${action}`);
  return NextResponse.json({ ok: true, status: "resolved" });
}
