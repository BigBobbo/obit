import Anthropic from "@anthropic-ai/sdk";
import { getModerationConfig } from "@/lib/moderation/config";

/**
 * Tier 1 — LLM text scoring (PRD §5). One cheap structured-output call per
 * text submission. The prompt lives in moderation_config (tunable without
 * redeploys); the schema is fixed here.
 */
export type ModerationScores = {
  toxicity: number;
  spam: number;
  relevance: number;
  mentions_living_person_negatively: boolean;
  flags: string[];
};

const SCORE_SCHEMA = {
  type: "object",
  properties: {
    toxicity: { type: "number" },
    spam: { type: "number" },
    relevance: { type: "number" },
    mentions_living_person_negatively: { type: "boolean" },
    flags: { type: "array", items: { type: "string" } },
  },
  required: ["toxicity", "spam", "relevance", "mentions_living_person_negatively", "flags"],
  additionalProperties: false,
} as const;

// Cheapest current model — moderation is a simple classification task and the
// PRD pins the Haiku tier for cost.
const MODEL = "claude-haiku-4-5";

/**
 * Returns scores, or null when scoring is unavailable (caller routes to the
 * steward queue — fail toward human review, never toward auto-publish).
 */
export async function scoreText(
  body: string,
  contributorName: string,
  deceasedName: string,
): Promise<ModerationScores | null> {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.warn("ANTHROPIC_API_KEY not set; skipping Tier 1 scoring");
    return null;
  }

  const config = await getModerationConfig();
  const client = new Anthropic();

  try {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 512,
      system: config.prompt,
      output_config: {
        format: { type: "json_schema", schema: SCORE_SCHEMA },
      },
      messages: [
        {
          role: "user",
          content: [
            `Memorial page is for: ${deceasedName}`,
            `Contributor display name: ${contributorName}`,
            `Submission text:`,
            `"""`,
            body,
            `"""`,
          ].join("\n"),
        },
      ],
    });

    const text = response.content.find((b) => b.type === "text");
    if (!text || text.type !== "text") return null;
    const parsed = JSON.parse(text.text) as ModerationScores;

    return {
      toxicity: clamp01(parsed.toxicity),
      spam: clamp01(parsed.spam),
      relevance: clamp01(parsed.relevance),
      mentions_living_person_negatively: Boolean(parsed.mentions_living_person_negatively),
      flags: Array.isArray(parsed.flags) ? parsed.flags.map(String).slice(0, 10) : [],
    };
  } catch (err) {
    console.error("Tier 1 scoring failed", err);
    return null;
  }
}

function clamp01(n: unknown): number {
  const v = Number(n);
  if (Number.isNaN(v)) return 1; // suspicious output → treat as worst case
  return Math.min(1, Math.max(0, v));
}
