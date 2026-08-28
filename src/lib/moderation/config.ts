import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Moderation thresholds and the LLM prompt live in the moderation_config table
 * so they can be tuned without a redeploy (PRD §5). Cached briefly per server
 * instance; falls back to defaults if the row is missing or malformed.
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

/**
 * The stored row is hand-edited in the Supabase dashboard, so it is untrusted
 * input. Every field is optional and every missing one falls back to its
 * default individually — a partial `thresholds` object must not blank out the
 * thresholds it doesn't mention.
 *
 * That is the failure this schema exists to prevent: a shallow merge turned an
 * omitted key into `undefined`, every `score >= undefined` comparison into
 * false, and the whole routing table into "publish everything" — silently.
 */
const score = z.number().min(0).max(1);

const storedConfigSchema = z.object({
  thresholds: z
    .object({
      toxicity_reject: score.optional(),
      toxicity_review: score.optional(),
      spam_reject: score.optional(),
      spam_review: score.optional(),
      relevance_review_below: score.optional(),
    })
    .optional(),
  sightengine: z
    .object({
      nudity_reject: score.optional(),
      gore_reject: score.optional(),
      violence_reject: score.optional(),
    })
    .optional(),
  prompt: z.string().min(1).optional(),
});

/** Merges a validated partial row over the defaults, key by key. */
export function mergeModerationConfig(stored: unknown): ModerationConfig {
  const parsed = storedConfigSchema.safeParse(stored);
  if (!parsed.success) {
    console.error(
      "moderation_config row failed validation; falling back to defaults",
      parsed.error.flatten(),
    );
    return DEFAULTS;
  }

  return {
    thresholds: { ...DEFAULTS.thresholds, ...stripUndefined(parsed.data.thresholds) },
    sightengine: { ...DEFAULTS.sightengine, ...stripUndefined(parsed.data.sightengine) },
    prompt: parsed.data.prompt ?? DEFAULTS.prompt,
  };
}

function stripUndefined<T extends object>(value: T | undefined): Partial<T> {
  if (!value) return {};
  return Object.fromEntries(
    Object.entries(value).filter(([, v]) => v !== undefined),
  ) as Partial<T>;
}

export function defaultModerationConfig(): ModerationConfig {
  return DEFAULTS;
}

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
    const value = data?.config ? mergeModerationConfig(data.config) : DEFAULTS;
    cache = { value, fetchedAt: Date.now() };
    return value;
  } catch {
    return DEFAULTS;
  }
}

/** Test seam: drops the per-instance cache. */
export function resetModerationConfigCache(): void {
  cache = null;
}
