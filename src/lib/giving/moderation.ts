import { createAdminClient } from "@/lib/supabase/admin";
import { getModerationConfig } from "@/lib/moderation/config";
import { scoreText, type ModerationScores } from "@/lib/moderation/llm";
import { tier0TextPatterns } from "@/lib/moderation/tier0";

/**
 * The donor wall runs the same gauntlet as a memory (PRD v2 §3.2).
 *
 * A donor wall is a wall, and people write on walls — the only thing that
 * changes is that the money is already with the charity by the time we see the
 * words, so declining a message never declines a donation.
 */
export type DonationDisplayStatus = "published" | "pending" | "hidden";

export type DonationRouting = {
  status: DonationDisplayStatus;
  reasons: string[];
};

/**
 * Pure, and the same three-way shape as Tier 2 for memories: publish the clean
 * ones, hide the flagrant ones, and hand the grey zone to the family.
 */
export function routeDonorWords(input: {
  hasWords: boolean;
  tier0Reason: string | null;
  scores: ModerationScores | null;
  scoringFailed: boolean;
  thresholds: {
    toxicity_reject: number;
    toxicity_review: number;
    spam_reject: number;
    spam_review: number;
  };
}): DonationRouting {
  // An anonymous donation with nothing written on it has nothing to moderate.
  if (!input.hasWords) return { status: "published", reasons: ["no_donor_words"] };

  if (input.tier0Reason) {
    return { status: "hidden", reasons: [`tier0_${input.tier0Reason}`] };
  }

  const t = input.thresholds;
  const s = input.scores;
  if (s && (s.toxicity >= t.toxicity_reject || s.spam >= t.spam_reject)) {
    return { status: "hidden", reasons: ["tier1_hard_reject"] };
  }

  const reasons: string[] = [];
  if (input.scoringFailed) reasons.push("scoring_unavailable");
  if (
    s &&
    (s.toxicity >= t.toxicity_review ||
      s.spam >= t.spam_review ||
      s.mentions_living_person_negatively ||
      s.flags.length > 0)
  ) {
    reasons.push("borderline_scores");
  }

  // Relevance is deliberately not a signal here. "Thinking of you all" scores
  // as barely relevant to a memory prompt and is exactly what a donor writes.
  return reasons.length > 0
    ? { status: "pending", reasons }
    : { status: "published", reasons: [] };
}

/** Scores a confirmed donation's words and records where they should sit. */
export async function moderateDonation(
  donationId: string,
  personName: string,
): Promise<DonationRouting> {
  const admin = createAdminClient();
  const { data: donation } = await admin
    .from("donations")
    .select("id, donor_name, donor_message")
    .eq("id", donationId)
    .maybeSingle();
  if (!donation) return { status: "hidden", reasons: ["donation_missing"] };

  const words = [donation.donor_name, donation.donor_message]
    .filter((v): v is string => typeof v === "string" && v.trim().length > 0)
    .join(" — ");

  const tier0 = tier0TextPatterns(words);
  let scores: ModerationScores | null = null;
  let scoringFailed = false;
  if (words.trim().length > 0 && tier0.ok) {
    scores = await scoreText(words, donation.donor_name ?? "A donor", personName);
    scoringFailed = scores === null;
  }

  const config = await getModerationConfig();
  const routing = routeDonorWords({
    hasWords: words.trim().length > 0,
    tier0Reason: tier0.ok ? null : tier0.reason,
    scores,
    scoringFailed,
    thresholds: config.thresholds,
  });

  await admin
    .from("donations")
    .update({
      status: routing.status,
      moderation_scores: {
        tier1: scores,
        routing: { ...routing, decided_at: new Date().toISOString() },
      },
    })
    .eq("id", donationId);

  return routing;
}
