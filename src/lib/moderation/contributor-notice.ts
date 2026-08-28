import { sendMemoryDeclined, sendMemoryReceipt } from "@/lib/email";
import { AUTO_DECLINE_REASON } from "@/lib/decline-templates";
import type { PipelineOutcome } from "@/lib/moderation/pipeline";

/**
 * What the contributor hears, on every path (PRD v2 §2.3).
 *
 * Two rules, and this is the only place either can be broken: every submission
 * is acknowledged, and every decline carries a human-readable reason. An
 * auto-rejection used to receive the "the family reviews contributions before
 * they appear" receipt — a promise about a review that was never going to
 * happen.
 */
export async function notifyContributorOfOutcome(opts: {
  email: string;
  pageName: string;
  randomId: string | null;
  memoryId: string;
  removalToken: string;
  outcome: PipelineOutcome;
}): Promise<void> {
  if (opts.outcome === "auto_rejected") {
    await sendMemoryDeclined(opts.email, {
      pageName: opts.pageName,
      reason: AUTO_DECLINE_REASON,
      randomId: opts.randomId,
    });
    return;
  }

  await sendMemoryReceipt(
    opts.email,
    opts.pageName,
    opts.memoryId,
    opts.removalToken,
    opts.outcome === "approved",
  );
}
