import { describe, expect, it } from "vitest";
import { PLAN_LIMITS, limitsFor } from "@/lib/plan";

describe("plan limits", () => {
  it("treats anything that is not 'paid' as free", () => {
    expect(limitsFor("free")).toEqual(PLAN_LIMITS.free);
    expect(limitsFor("")).toEqual(PLAN_LIMITS.free);
    expect(limitsFor("enterprise")).toEqual(PLAN_LIMITS.free);
    expect(limitsFor("PAID")).toEqual(PLAN_LIMITS.free);
  });

  it("resolves the paid plan exactly", () => {
    expect(limitsFor("paid")).toEqual(PLAN_LIMITS.paid);
  });

  it("fences the free plan on conveniences", () => {
    const free = limitsFor("free");
    expect(free.maxPages).toBe(1);
    expect(free.maxPhotosPerPage).toBe(50);
    expect(free.customSlug).toBe(false);
    expect(free.coStewards).toBe(false);
    expect(free.plaquePdf).toBe(false);
    expect(free.instantQueueNotifications).toBe(false);
  });

  it("lifts those fences on the paid plan", () => {
    const paid = limitsFor("paid");
    expect(paid.maxPages).toBe(Infinity);
    expect(paid.maxPhotosPerPage).toBe(Infinity);
    expect(paid.customSlug).toBe(true);
    expect(paid.coStewards).toBe(true);
    expect(paid.plaquePdf).toBe(true);
    expect(paid.instantQueueNotifications).toBe(true);
  });

  /**
   * Safety is never paywalled (PRD §8). The plan object must not grow a key
   * that a moderation decision could read — if this fails, someone has added a
   * lever that makes a paid page moderated differently from a free one.
   */
  it("exposes no moderation-related lever", () => {
    const keys = Object.keys(PLAN_LIMITS.free);
    expect(keys).toEqual(Object.keys(PLAN_LIMITS.paid));
    for (const key of keys) {
      expect(key).not.toMatch(/moderat|review|threshold|toxic|spam|tier|verif/i);
    }
  });

  it("rate-limits page creation on both plans", () => {
    expect(limitsFor("free").pagesPer30Days).toBeGreaterThan(0);
    expect(limitsFor("paid").pagesPer30Days).toBeGreaterThan(0);
  });
});
