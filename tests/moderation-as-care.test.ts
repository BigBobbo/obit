import { describe, expect, it } from "vitest";
import { MEMORY_PROMPTS, pickPrompts, promptSeed, seedTextarea } from "@/lib/prompts";
import {
  AUTO_DECLINE_REASON,
  DECLINE_TEMPLATES,
  REPORTED_DECLINE_REASON,
  resolveDeclineReason,
} from "@/lib/decline-templates";
import {
  formatLatency,
  medianHours,
  toLatencySamples,
  type DecisionRow,
} from "@/lib/latency";

describe("guided prompts", () => {
  it("shows a handful, and the same handful all day", () => {
    const seed = promptSeed("page-1", new Date("2026-08-28T09:00:00Z"));
    const later = promptSeed("page-1", new Date("2026-08-28T23:00:00Z"));
    expect(seed).toBe(later);
    expect(pickPrompts(seed)).toEqual(pickPrompts(later));
    expect(pickPrompts(seed)).toHaveLength(5);
  });

  it("rotates by day and by page", () => {
    const monday = pickPrompts(promptSeed("page-1", new Date("2026-08-28T09:00:00Z")));
    const tuesday = pickPrompts(promptSeed("page-1", new Date("2026-08-29T09:00:00Z")));
    const otherPage = pickPrompts(promptSeed("page-2", new Date("2026-08-28T09:00:00Z")));
    expect(monday).not.toEqual(tuesday);
    expect(monday).not.toEqual(otherPage);
  });

  it("only ever offers curated questions, never a duplicate", () => {
    const picked = pickPrompts(promptSeed("page-1"));
    expect(new Set(picked).size).toBe(picked.length);
    for (const p of picked) expect(MEMORY_PROMPTS).toContain(p);
  });

  it("puts the question in the box without eating what is already there", () => {
    expect(seedTextarea("", "How did you meet?")).toBe("How did you meet?\n\n");
    expect(seedTextarea("  ", "How did you meet?")).toBe("How did you meet?\n\n");
    expect(seedTextarea("We met in 1961.", "Something they taught you")).toBe(
      "We met in 1961.\n\nSomething they taught you\n\n",
    );
  });
});

describe("no decline is ever bare", () => {
  it("prefers the steward's own words", () => {
    expect(resolveDeclineReason({ templateId: "private", custom: "  Not this one, sorry.  " })).toBe(
      "Not this one, sorry.",
    );
  });

  it("falls back to the chosen template", () => {
    expect(resolveDeclineReason({ templateId: "private", custom: "" })).toBe(
      DECLINE_TEMPLATES[0].body,
    );
  });

  /** The property that matters: there is no input that yields an empty reason. */
  it("still produces a reason when the steward chose nothing at all", () => {
    for (const input of [
      {},
      { templateId: null, custom: null },
      { templateId: "not-a-template", custom: "   " },
    ]) {
      expect(resolveDeclineReason(input).length).toBeGreaterThan(20);
    }
  });

  it("has a reason for the two declines no steward types", () => {
    expect(AUTO_DECLINE_REASON.length).toBeGreaterThan(20);
    expect(REPORTED_DECLINE_REASON.length).toBeGreaterThan(20);
  });

  it("caps a runaway custom reason", () => {
    expect(resolveDeclineReason({ custom: "x".repeat(5000) })).toHaveLength(1000);
  });
});

describe("approval latency", () => {
  const hoursAgo = (h: number) => new Date(Date.UTC(2026, 7, 28, 12) - h * 3_600_000).toISOString();

  function queued(hoursWaited: number): DecisionRow {
    return {
      created_at: hoursAgo(hoursWaited + 50),
      decided_at: hoursAgo(0),
      moderation_scores: { routing: { outcome: "pending", decided_at: hoursAgo(hoursWaited) } },
    };
  }

  /**
   * The clock starts when the memory reached the queue. The time a contributor
   * spent hunting for the verification email is not the family's response time.
   */
  it("measures from queue entry, not from submission", () => {
    expect(medianHours(toLatencySamples([queued(6)]))).toBeCloseTo(6, 5);
  });

  /** An auto-published memory is decided in milliseconds; counting those would
   * show every steward a reassuring number that means nothing. */
  it("ignores everything a human never had to look at", () => {
    const auto: DecisionRow = {
      created_at: hoursAgo(1),
      decided_at: hoursAgo(1),
      moderation_scores: { routing: { outcome: "approved", decided_at: hoursAgo(1) } },
    };
    const undecided: DecisionRow = {
      created_at: hoursAgo(30),
      decided_at: null,
      moderation_scores: { routing: { outcome: "pending", decided_at: hoursAgo(30) } },
    };
    expect(toLatencySamples([auto, undecided])).toEqual([]);
    expect(medianHours([])).toBeNull();
  });

  it("takes the median, not the average, so one bad week doesn't dominate", () => {
    const samples = toLatencySamples([queued(1), queued(2), queued(300)]);
    expect(medianHours(samples)).toBeCloseTo(2, 5);
  });

  it("survives rows with unusable timestamps", () => {
    const broken: DecisionRow = {
      created_at: "not-a-date",
      decided_at: "also-not-a-date",
      moderation_scores: { routing: { outcome: "pending" } },
    };
    const backwards: DecisionRow = {
      created_at: hoursAgo(1),
      decided_at: hoursAgo(5),
      moderation_scores: { routing: { outcome: "pending", decided_at: hoursAgo(1) } },
    };
    expect(toLatencySamples([broken, backwards])).toEqual([]);
  });

  it("reads like a person wrote it", () => {
    expect(formatLatency(0.25)).toBe("15 minutes");
    expect(formatLatency(1)).toBe("1 hour");
    expect(formatLatency(20)).toBe("20 hours");
    expect(formatLatency(72)).toBe("3 days");
  });
});
