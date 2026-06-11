import { createAdminClient } from "@/lib/supabase/admin";
import { getModerationConfig } from "@/lib/moderation/config";
import { scoreText, type ModerationScores } from "@/lib/moderation/llm";
import { sendPendingNotification } from "@/lib/email";

/**
 * Tier 1 + Tier 2 (PRD §5). Called after email verification and after Tier 0
 * has passed. Decides: auto-publish | steward queue | auto-reject.
 *
 * Design intent: most legitimate submissions auto-resolve; stewards see only
 * the gray zone; the admin sees nothing here (escalation happens via reports).
 */
export type PipelineOutcome = "approved" | "pending" | "auto_rejected";

export async function runModerationPipeline(memoryId: string): Promise<PipelineOutcome> {
  const supabase = createAdminClient();

  const { data: memory, error } = await supabase
    .from("memories")
    .select("id, page_id, body, contributor_email, contributor_name")
    .eq("id", memoryId)
    .single();
  if (error || !memory) throw new Error("memory not found");

  const { data: page } = await supabase
    .from("pages")
    .select("id, name, status, review_everything, auto_publish_optout")
    .eq("id", memory.page_id)
    .single();
  if (!page) throw new Error("page not found");

  const config = await getModerationConfig();

  // --- Tier 1: LLM scoring (text submissions only; photo-only passes through) ---
  let scores: ModerationScores | null = null;
  let scoringFailed = false;
  if (memory.body.trim().length > 0) {
    scores = await scoreText(memory.body, memory.contributor_name, page.name);
    scoringFailed = scores === null;
  }

  // --- Tier 2: routing ---
  const t = config.thresholds;
  let outcome: PipelineOutcome;
  const reasons: string[] = [];

  if (scores && (scores.toxicity >= t.toxicity_reject || scores.spam >= t.spam_reject)) {
    outcome = "auto_rejected";
    reasons.push("tier1_hard_reject");
  } else {
    const borderline =
      scoringFailed ||
      (scores !== null &&
        (scores.toxicity >= t.toxicity_review ||
          scores.spam >= t.spam_review ||
          scores.relevance < t.relevance_review_below ||
          scores.mentions_living_person_negatively ||
          scores.flags.length > 0));
    if (borderline) reasons.push(scoringFailed ? "scoring_unavailable" : "borderline_scores");

    // Returning-contributor check: ≥1 previously approved memory on the platform.
    const { data: contributor } = await supabase
      .from("contributors")
      .select("approved_count")
      .eq("email", memory.contributor_email)
      .maybeSingle();
    const firstTime = (contributor?.approved_count ?? 0) < 1;
    if (firstTime) reasons.push("first_time_contributor");

    // Page mode: review-everything, frozen, or inactivity hold force the queue.
    const pageHolds =
      page.review_everything ||
      page.status === "inactivity_hold" ||
      page.status === "frozen";
    if (pageHolds) reasons.push(`page_mode_${page.review_everything ? "review_everything" : page.status}`);

    outcome = borderline || firstTime || pageHolds ? "pending" : "approved";
  }

  const now = new Date().toISOString();
  await supabase
    .from("memories")
    .update({
      status: outcome === "approved" ? "approved" : outcome === "pending" ? "pending" : "auto_rejected",
      moderation_scores: {
        tier1: scores,
        routing: { outcome, reasons, decided_at: now },
      },
      ...(outcome === "approved" ? { approved_at: now } : {}),
    })
    .eq("id", memoryId);

  if (outcome === "approved") {
    await incrementApprovedCount(memory.contributor_email);
  }

  if (outcome === "pending") {
    await notifyStewardsIfInstant(page.id, page.name);
  }

  return outcome;
}

export async function incrementApprovedCount(email: string) {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("contributors")
    .select("approved_count")
    .eq("email", email)
    .maybeSingle();
  await supabase
    .from("contributors")
    .upsert({ email, approved_count: (data?.approved_count ?? 0) + 1 });
}

/** Paid stewards get instant pending-queue notifications (PRD §8). */
async function notifyStewardsIfInstant(pageId: string, pageName: string) {
  const supabase = createAdminClient();
  const { data: stewards } = await supabase
    .from("stewards")
    .select("user_id, profiles!inner(email, plan)")
    .eq("page_id", pageId);
  for (const s of stewards ?? []) {
    const profile = s.profiles as unknown as { email: string; plan: string };
    if (profile.plan === "paid") {
      await sendPendingNotification(profile.email, pageName, pageId);
    }
  }
}
