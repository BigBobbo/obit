import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  accessCookieName,
  accessMode,
  approvalAdmits,
  createAccessCookieValue,
  decideAccess,
  hashAccessCode,
  isGated,
  isValidAccessCode,
  normalizeAccessCode,
  readAccessCookie,
  verifyAccessCode,
  type AccessPage,
} from "@/lib/access";
import { createContributorCookieValue, readContributorCookie } from "@/lib/contributor-cookie";

const ORIGINAL_SECRET = process.env.CONTRIBUTOR_COOKIE_SECRET;

beforeEach(() => {
  process.env.CONTRIBUTOR_COOKIE_SECRET = "test-secret-aaaaaaaaaaaaaaaaaaaaaaaa";
});

afterEach(() => {
  if (ORIGINAL_SECRET === undefined) delete process.env.CONTRIBUTOR_COOKIE_SECRET;
  else process.env.CONTRIBUTOR_COOKIE_SECRET = ORIGINAL_SECRET;
  vi.useRealTimers();
});

function page(overrides: Partial<AccessPage> = {}): AccessPage {
  return {
    id: "11111111-1111-1111-1111-111111111111",
    random_id: "Demo7pageXyz",
    access_mode: "code",
    access_code_rotated_at: "2026-08-01T00:00:00.000Z",
    announcement_enabled: true,
    ...overrides,
  };
}

describe("access codes", () => {
  /**
   * Codes are read off an order of service and typed by people who are not
   * thinking about capitalisation. Every one of these is the same code.
   */
  it("normalises the ways a person might type the same code", () => {
    for (const typed of ["nana-rose", "Nana Rose", "  NANA_ROSE  ", "nana--rose", "nana rose"]) {
      expect(normalizeAccessCode(typed)).toBe("nana-rose");
    }
  });

  it("accepts human codes and rejects unusable ones", () => {
    expect(isValidAccessCode(normalizeAccessCode("nana-rose"))).toBe(true);
    expect(isValidAccessCode(normalizeAccessCode("Grand Père"))).toBe(true);
    expect(isValidAccessCode(normalizeAccessCode("1938"))).toBe(true);
    expect(isValidAccessCode(normalizeAccessCode("ab"))).toBe(false);
    expect(isValidAccessCode(normalizeAccessCode(""))).toBe(false);
    expect(isValidAccessCode(normalizeAccessCode("has/slash"))).toBe(false);
  });

  it("verifies a code however it was typed, and rejects a wrong one", () => {
    const stored = hashAccessCode("Nana Rose");
    expect(verifyAccessCode("nana-rose", stored)).toBe(true);
    expect(verifyAccessCode("  NANA_ROSE ", stored)).toBe(true);
    expect(verifyAccessCode("nana-rosé", stored)).toBe(false);
    expect(verifyAccessCode("", stored)).toBe(false);
  });

  it("salts, so two pages with the same code do not share a hash", () => {
    expect(hashAccessCode("nana-rose")).not.toBe(hashAccessCode("nana-rose"));
  });

  it("survives a hash column that is missing or corrupt", () => {
    expect(verifyAccessCode("nana-rose", null)).toBe(false);
    expect(verifyAccessCode("nana-rose", "")).toBe(false);
    expect(verifyAccessCode("nana-rose", "not-a-hash")).toBe(false);
    expect(verifyAccessCode("nana-rose", "scrypt$16384$8$1$zz$zz")).toBe(false);
  });
});

describe("visitor cookie", () => {
  it("is scoped to one page", () => {
    expect(accessCookieName("Demo7pageXyz")).toBe("mp_access_Demo7pageXyz");
  });

  it("round-trips an admission and survives a browser restart", () => {
    const p = page();
    const value = createAccessCookieValue({
      pageId: p.id,
      mode: "code",
      rotatedAt: p.access_code_rotated_at,
      email: "",
    });
    // A restart is simply the same cookie arriving again.
    expect(readAccessCookie(value, p)?.mode).toBe("code");
  });

  /** Phase 1 acceptance criterion 1: the code survives a restart, not a rotation. */
  it("stops verifying the moment the steward rotates the code", () => {
    const p = page();
    const value = createAccessCookieValue({
      pageId: p.id,
      mode: "code",
      rotatedAt: p.access_code_rotated_at,
      email: "",
    });
    const rotated = page({ access_code_rotated_at: "2026-09-01T00:00:00.000Z" });
    expect(readAccessCookie(value, rotated)).toBeNull();
  });

  it("does not open a different page", () => {
    const value = createAccessCookieValue({
      pageId: page().id,
      mode: "code",
      rotatedAt: page().access_code_rotated_at,
      email: "",
    });
    expect(readAccessCookie(value, page({ id: "22222222-2222-2222-2222-222222222222" }))).toBeNull();
  });

  it("does not survive a change of access mode", () => {
    const value = createAccessCookieValue({
      pageId: page().id,
      mode: "code",
      rotatedAt: page().access_code_rotated_at,
      email: "",
    });
    expect(readAccessCookie(value, page({ access_mode: "approved" }))).toBeNull();
  });

  it("carries the email an approved-mode admission has to be re-checked against", () => {
    const p = page({ access_mode: "approved", access_code_rotated_at: null });
    const value = createAccessCookieValue({
      pageId: p.id,
      mode: "approved",
      email: "cousin@example.com",
    });
    expect(readAccessCookie(value, p)?.email).toBe("cousin@example.com");
  });

  it("rejects a forged or tampered cookie", () => {
    const p = page();
    const value = createAccessCookieValue({
      pageId: p.id,
      mode: "code",
      rotatedAt: p.access_code_rotated_at,
      email: "",
    });
    const [payload, mac] = value.split(".");
    expect(readAccessCookie(`${payload}.deadbeef`, p)).toBeNull();
    const forged = Buffer.from(
      `access|${p.id}|code|${p.access_code_rotated_at}||${Date.now() + 10000}`,
    ).toString("base64url");
    expect(readAccessCookie(`${forged}.${mac}`, p)).toBeNull();
    expect(readAccessCookie(undefined, p)).toBeNull();
  });

  it("expires", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));
    const p = page();
    const value = createAccessCookieValue({
      pageId: p.id,
      mode: "code",
      rotatedAt: p.access_code_rotated_at,
      email: "",
    });
    vi.setSystemTime(new Date("2027-01-01T00:00:00Z"));
    expect(readAccessCookie(value, p)).toBeNull();
  });

  /**
   * Both cookies are signed with the same key, so neither may be replayed as
   * the other: one skips email verification, the other opens a private page.
   */
  it("cannot be swapped with the returning-contributor cookie", () => {
    const p = page();
    const contributor = createContributorCookieValue("friend@example.com");
    expect(readAccessCookie(contributor, p)).toBeNull();

    const visitor = createAccessCookieValue({
      pageId: p.id,
      mode: "code",
      rotatedAt: p.access_code_rotated_at,
      email: "",
    });
    expect(readContributorCookie(visitor)).toBeNull();
  });
});

describe("the access decision", () => {
  it("leaves link-mode pages exactly as they were", () => {
    const p = page({ access_mode: "link", announcement_enabled: false });
    expect(isGated(p)).toBe(false);
    expect(decideAccess(p, { steward: false, admitted: false })).toEqual({ view: "full" });
  });

  it("shows a stranger the announcement and the right gate", () => {
    expect(decideAccess(page(), { steward: false, admitted: false })).toEqual({
      view: "announcement",
      gate: "code",
    });
    expect(
      decideAccess(page({ access_mode: "approved" }), { steward: false, admitted: false }),
    ).toEqual({ view: "announcement", gate: "request" });
  });

  it("shows only the gate when the family never turned the announcement on", () => {
    expect(
      decideAccess(page({ announcement_enabled: false }), { steward: false, admitted: false }),
    ).toEqual({ view: "gate", gate: "code" });
  });

  it("lets stewards and admitted visitors through", () => {
    expect(decideAccess(page(), { steward: true, admitted: false })).toEqual({ view: "full" });
    expect(decideAccess(page(), { steward: false, admitted: true })).toEqual({ view: "full" });
  });

  it("treats an unknown mode as the safe default rather than as gated", () => {
    expect(accessMode({ access_mode: "nonsense" })).toBe("link");
  });
});

describe("who an approval admits", () => {
  it("admits an approved or pre-approved address once it is verified", () => {
    expect(approvalAdmits({ status: "approved", verified_at: "2026-08-01T00:00:00Z" })).toBe(true);
    expect(approvalAdmits({ status: "preapproved", verified_at: "2026-08-01T00:00:00Z" })).toBe(true);
  });

  it("never admits before verification, and never admits a decline", () => {
    expect(approvalAdmits({ status: "approved", verified_at: null })).toBe(false);
    expect(approvalAdmits({ status: "preapproved", verified_at: null })).toBe(false);
    expect(approvalAdmits({ status: "declined", verified_at: "2026-08-01T00:00:00Z" })).toBe(false);
    expect(approvalAdmits({ status: "pending", verified_at: "2026-08-01T00:00:00Z" })).toBe(false);
  });
});
