import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import {
  defaultModerationConfig,
  mergeModerationConfig,
} from "@/lib/moderation/config";

const DEFAULTS = defaultModerationConfig();

describe("mergeModerationConfig", () => {
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => {});
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns defaults for an empty row", () => {
    expect(mergeModerationConfig({})).toEqual(DEFAULTS);
  });

  it("applies a fully specified row", () => {
    const stored = {
      thresholds: {
        toxicity_reject: 0.8,
        toxicity_review: 0.3,
        spam_reject: 0.85,
        spam_review: 0.45,
        relevance_review_below: 0.25,
      },
      sightengine: { nudity_reject: 0.5, gore_reject: 0.4, violence_reject: 0.55 },
      prompt: "custom prompt",
    };
    expect(mergeModerationConfig(stored)).toEqual(stored);
  });

  /**
   * The regression that matters. A shallow merge turned an omitted key into
   * undefined, every `score >= undefined` comparison into false, and the whole
   * routing table into "publish everything" — with nothing logged. Editing one
   * threshold in the Supabase dashboard is the documented workflow, so a
   * partial object has to keep the rest of the defaults.
   */
  it("keeps unmentioned thresholds when only one is edited", () => {
    const merged = mergeModerationConfig({ thresholds: { toxicity_reject: 0.75 } });

    expect(merged.thresholds.toxicity_reject).toBe(0.75);
    expect(merged.thresholds.spam_reject).toBe(DEFAULTS.thresholds.spam_reject);
    expect(merged.thresholds.toxicity_review).toBe(DEFAULTS.thresholds.toxicity_review);
    expect(merged.thresholds.spam_review).toBe(DEFAULTS.thresholds.spam_review);
    expect(merged.thresholds.relevance_review_below).toBe(
      DEFAULTS.thresholds.relevance_review_below,
    );
    expect(merged.sightengine).toEqual(DEFAULTS.sightengine);

    for (const value of Object.values(merged.thresholds)) {
      expect(value).toBeTypeOf("number");
    }
  });

  it("keeps unmentioned sightengine thresholds", () => {
    const merged = mergeModerationConfig({ sightengine: { gore_reject: 0.3 } });
    expect(merged.sightengine.gore_reject).toBe(0.3);
    expect(merged.sightengine.nudity_reject).toBe(DEFAULTS.sightengine.nudity_reject);
    expect(merged.sightengine.violence_reject).toBe(DEFAULTS.sightengine.violence_reject);
  });

  it("keeps the default prompt when the row omits one", () => {
    const merged = mergeModerationConfig({ thresholds: { spam_reject: 0.7 } });
    expect(merged.prompt).toBe(DEFAULTS.prompt);
  });

  it("falls back to defaults when a threshold is out of range", () => {
    expect(mergeModerationConfig({ thresholds: { toxicity_reject: 4 } })).toEqual(DEFAULTS);
    expect(mergeModerationConfig({ thresholds: { toxicity_reject: -1 } })).toEqual(DEFAULTS);
  });

  it("falls back to defaults when a threshold is the wrong type", () => {
    expect(mergeModerationConfig({ thresholds: { spam_reject: "0.9" } })).toEqual(DEFAULTS);
    expect(mergeModerationConfig({ thresholds: { spam_reject: null } })).toEqual(DEFAULTS);
  });

  it("falls back to defaults for a non-object row", () => {
    expect(mergeModerationConfig(null)).toEqual(DEFAULTS);
    expect(mergeModerationConfig("nope")).toEqual(DEFAULTS);
    expect(mergeModerationConfig([])).toEqual(DEFAULTS);
  });

  it("rejects an empty prompt rather than silently sending one", () => {
    expect(mergeModerationConfig({ prompt: "" })).toEqual(DEFAULTS);
  });

  it("logs when it rejects a row, so a bad edit is not silent", () => {
    mergeModerationConfig({ thresholds: { toxicity_reject: 9 } });
    expect(console.error).toHaveBeenCalled();
  });
});
