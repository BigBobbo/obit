import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Moderation thresholds and the LLM prompt live in the moderation_config table
 * so they can be tuned without a redeploy (PRD §5). Cached briefly per server
 * instance; falls back to defaults if the row is missing.
 */
export type ModerationConfig = {
  thresholds: {
    toxicity_reject: number;
    toxicity_review: number;
    spam_reject: number;
    spam_review: number;
    relevance_review_below: number;
  };
  sightengine: {
    nudity_reject: number;
    gore_reject: number;
    violence_reject: number;
  };
  prompt: string;
};

const DEFAULTS: ModerationConfig = {
  thresholds: {
    toxicity_reject: 0.9,
    toxicity_review: 0.4,
    spam_reject: 0.9,
    spam_review: 0.5,
    relevance_review_below: 0.2,
  },
  sightengine: { nudity_reject: 0.6, gore_reject: 0.5, violence_reject: 0.6 },
  prompt:
    "You are a content moderator for a memorial website where friends and family share written memories of a deceased person. Score the following submission. Respond with JSON only.",
};

let cache: { value: ModerationConfig; fetchedAt: number } | null = null;
const TTL_MS = 60_000;

export async function getModerationConfig(): Promise<ModerationConfig> {
  if (cache && Date.now() - cache.fetchedAt < TTL_MS) return cache.value;
  try {
    const supabase = createAdminClient();
    const { data } = await supabase
      .from("moderation_config")
      .select("config")
      .eq("id", 1)
      .single();
    const value = data?.config
      ? ({ ...DEFAULTS, ...data.config } as ModerationConfig)
      : DEFAULTS;
    cache = { value, fetchedAt: Date.now() };
    return value;
  } catch {
    return DEFAULTS;
  }
}
