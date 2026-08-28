import { describe, expect, it } from "vitest";
import { generatePageId, generateVerificationCode, isValidPageRef } from "@/lib/ids";

describe("generatePageId", () => {
  it("produces 12 characters from the unambiguous alphabet", () => {
    for (let i = 0; i < 50; i++) {
      expect(generatePageId()).toMatch(/^[23456789A-HJ-NP-Za-hjkmnp-z]{12}$/);
    }
  });

  it("does not repeat across a large sample", () => {
    const ids = new Set(Array.from({ length: 500 }, generatePageId));
    expect(ids.size).toBe(500);
  });

  it("always produces a valid page reference", () => {
    for (let i = 0; i < 50; i++) {
      expect(isValidPageRef(generatePageId())).toBe(true);
    }
  });
});

describe("generateVerificationCode", () => {
  it("is always six digits", () => {
    for (let i = 0; i < 200; i++) {
      expect(generateVerificationCode()).toMatch(/^\d{6}$/);
    }
  });

  it("covers the full 100000-999999 range without clustering at the ends", () => {
    const codes = Array.from({ length: 500 }, () => Number(generateVerificationCode()));
    expect(Math.min(...codes)).toBeGreaterThanOrEqual(100000);
    expect(Math.max(...codes)).toBeLessThanOrEqual(999999);
    expect(new Set(codes).size).toBeGreaterThan(400);
  });
});

describe("isValidPageRef", () => {
  it("accepts canonical ids and custom slugs", () => {
    expect(isValidPageRef("aB3xK9mQr2Tz")).toBe(true);
    expect(isValidPageRef("john-smith-1942-2024")).toBe(true);
    expect(isValidPageRef("abc")).toBe(true);
  });

  // These are the regression cases for the PostgREST filter injection: a
  // reference containing filter syntax used to be interpolated straight into an
  // or=() clause, turning a point lookup into a search across the pages table.
  it("rejects PostgREST filter metacharacters", () => {
    expect(isValidPageRef("zzz,name.like.A*")).toBe(false);
    expect(isValidPageRef("zzz,status.eq.soft_deleted")).toBe(false);
    expect(isValidPageRef("a.b")).toBe(false);
    expect(isValidPageRef("a(b)")).toBe(false);
    expect(isValidPageRef("a*")).toBe(false);
    expect(isValidPageRef("a,b")).toBe(false);
  });

  it("rejects references that are empty, too short, or too long", () => {
    expect(isValidPageRef("")).toBe(false);
    expect(isValidPageRef("ab")).toBe(false);
    expect(isValidPageRef("a".repeat(82))).toBe(false);
  });

  it("rejects leading hyphens, whitespace and control characters", () => {
    expect(isValidPageRef("-abc")).toBe(false);
    expect(isValidPageRef("ab c")).toBe(false);
    expect(isValidPageRef("abc\n")).toBe(false);
    expect(isValidPageRef("abc\ndef")).toBe(false);
  });
});
