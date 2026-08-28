import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  contributorCookieMaxAge,
  contributorCookieName,
  createContributorCookieValue,
  readContributorCookie,
} from "@/lib/contributor-cookie";

const ORIGINAL_SECRET = process.env.CONTRIBUTOR_COOKIE_SECRET;

beforeEach(() => {
  process.env.CONTRIBUTOR_COOKIE_SECRET = "test-secret-aaaaaaaaaaaaaaaaaaaaaaaa";
});

afterEach(() => {
  if (ORIGINAL_SECRET === undefined) delete process.env.CONTRIBUTOR_COOKIE_SECRET;
  else process.env.CONTRIBUTOR_COOKIE_SECRET = ORIGINAL_SECRET;
  vi.unstubAllEnvs();
  vi.useRealTimers();
});

describe("returning-contributor cookie", () => {
  it("round-trips a verified email", () => {
    const value = createContributorCookieValue("friend@example.com");
    expect(readContributorCookie(value)).toBe("friend@example.com");
  });

  it("has a stable name and a six-month lifetime", () => {
    expect(contributorCookieName()).toBe("mp_contributor");
    expect(contributorCookieMaxAge()).toBe(60 * 60 * 24 * 180);
  });

  it("rejects a missing or malformed value", () => {
    expect(readContributorCookie(undefined)).toBeNull();
    expect(readContributorCookie("")).toBeNull();
    expect(readContributorCookie("no-dot-separator")).toBeNull();
    expect(readContributorCookie(".")).toBeNull();
  });

  it("rejects a tampered payload", () => {
    const value = createContributorCookieValue("friend@example.com");
    const [, mac] = value.split(".");
    const forged = Buffer.from("attacker@example.com|" + (Date.now() + 100000))
      .toString("base64url");
    expect(readContributorCookie(`${forged}.${mac}`)).toBeNull();
  });

  it("rejects a tampered signature", () => {
    const [payload] = createContributorCookieValue("friend@example.com").split(".");
    expect(readContributorCookie(`${payload}.deadbeef`)).toBeNull();
  });

  /**
   * The key is what stops a forged cookie skipping email verification, so a
   * cookie minted under one secret must not verify under another.
   */
  it("does not verify a cookie signed with a different secret", () => {
    const value = createContributorCookieValue("friend@example.com");
    process.env.CONTRIBUTOR_COOKIE_SECRET = "a-completely-different-secret-value";
    expect(readContributorCookie(value)).toBeNull();
  });

  it("rejects an expired cookie", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));
    const value = createContributorCookieValue("friend@example.com");

    vi.setSystemTime(new Date("2026-06-01T00:00:00Z")); // ~5 months: still valid
    expect(readContributorCookie(value)).toBe("friend@example.com");

    vi.setSystemTime(new Date("2027-01-01T00:00:00Z")); // past six months
    expect(readContributorCookie(value)).toBeNull();
  });

  it("refuses to sign without a configured secret in production", async () => {
    vi.resetModules();
    delete process.env.CONTRIBUTOR_COOKIE_SECRET;
    vi.stubEnv("NODE_ENV", "production");

    const mod = await import("@/lib/contributor-cookie");
    expect(() => mod.createContributorCookieValue("friend@example.com")).toThrow(
      /CONTRIBUTOR_COOKIE_SECRET/,
    );
  });
});
