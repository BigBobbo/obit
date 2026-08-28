import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { seal, unseal } from "@/lib/signed-cookie";

/**
 * Page access (PRD v2 §1). Three modes, steward-chosen, changeable any time:
 *
 *   link      the URL is the secret — v1's behaviour, and still the default
 *   code      a short family-chosen code opens the memorial
 *   approved  the steward admits visitors, or pre-approves their emails
 *
 * The code is a **soft gate and we say so**: it stops strangers, scrapers and
 * obituary-pirates, not a determined insider who was told the code. What it
 * buys is that a family can put an announcement in a funeral programme without
 * putting their memories there too.
 *
 * Everything here is reading. Writing is unchanged in every mode: sharing a
 * memory still needs email verification and still runs the moderation pipeline.
 */

export type AccessMode = "link" | "code" | "approved";

export type AccessPage = {
  id: string;
  random_id: string;
  access_mode: string;
  access_code_rotated_at: string | null;
  announcement_enabled: boolean;
};

/**
 * The columns any caller needs to make an access decision. Deliberately without
 * `access_code_hash`: only the code-entry route reads that, with the service
 * role, and the anon key is not granted it at all (migration 0005).
 */
export const ACCESS_COLUMNS =
  "access_mode, access_code_rotated_at, announcement_enabled";

export function accessMode(page: { access_mode: string }): AccessMode {
  return page.access_mode === "code" || page.access_mode === "approved"
    ? page.access_mode
    : "link";
}

export function isGated(page: { access_mode: string }): boolean {
  return accessMode(page) !== "link";
}

// ---------------------------------------------------------------------------
// The code itself
// ---------------------------------------------------------------------------

/**
 * Codes are told out loud, printed on an order of service, and typed by people
 * who are not thinking about capitalisation. "Nana Rose", "nana-rose" and
 * "NANA_ROSE" are the same code.
 */
export function normalizeAccessCode(raw: string): string {
  return raw
    .normalize("NFKC")
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-+|-+$/g, "");
}

const CODE_RE = /^[\p{L}\p{N}][\p{L}\p{N}-]{3,39}$/u;

/** Validates a code the steward is *setting* (entry is far more forgiving). */
export function isValidAccessCode(normalized: string): boolean {
  return CODE_RE.test(normalized);
}

// scrypt, not a bare digest: these codes are short and human, so a fast hash
// over a leaked table would fall to a wordlist in seconds. Parameters are
// stored with the hash so they can be raised later without orphaning old rows.
const SCRYPT = { N: 16384, r: 8, p: 1, keylen: 32 } as const;

export function hashAccessCode(rawCode: string): string {
  const normalized = normalizeAccessCode(rawCode);
  const salt = randomBytes(16);
  const hash = scryptSync(normalized, salt, SCRYPT.keylen, {
    N: SCRYPT.N,
    r: SCRYPT.r,
    p: SCRYPT.p,
  });
  return [
    "scrypt",
    SCRYPT.N,
    SCRYPT.r,
    SCRYPT.p,
    salt.toString("hex"),
    hash.toString("hex"),
  ].join("$");
}

export function verifyAccessCode(rawCode: string, stored: string | null | undefined): boolean {
  if (!stored) return false;
  const parts = stored.split("$");
  if (parts.length !== 6 || parts[0] !== "scrypt") return false;
  const [, n, r, p, saltHex, hashHex] = parts;
  const salt = Buffer.from(saltHex, "hex");
  const expected = Buffer.from(hashHex, "hex");
  if (salt.length === 0 || expected.length === 0) return false;

  let actual: Buffer;
  try {
    actual = scryptSync(normalizeAccessCode(rawCode), salt, expected.length, {
      N: Number(n),
      r: Number(r),
      p: Number(p),
    });
  } catch {
    return false;
  }
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

// ---------------------------------------------------------------------------
// The visitor cookie
// ---------------------------------------------------------------------------

const MAX_AGE_S = 60 * 60 * 24 * 180; // 6 months, like the contributor cookie

/**
 * One cookie per page, so admission to one memorial never implies admission to
 * another, and so a shared browser can hold several without collision.
 */
export function accessCookieName(randomId: string): string {
  return `mp_access_${randomId}`;
}

export function accessCookieMaxAge(): number {
  return MAX_AGE_S;
}

export type AccessClaim = {
  pageId: string;
  mode: "code" | "approved";
  /** `access_code_rotated_at` at the moment of entry; code mode only. */
  rotatedAt: string;
  /** The verified email, for approved mode. */
  email: string;
};

const PURPOSE = "access";

export function createAccessCookieValue(claim: Omit<AccessClaim, "rotatedAt"> & {
  rotatedAt?: string | null;
}): string {
  const payload = [
    PURPOSE,
    claim.pageId,
    claim.mode,
    claim.rotatedAt ?? "",
    claim.email,
    Date.now() + MAX_AGE_S * 1000,
  ].join("|");
  return seal(payload);
}

/**
 * Reads a visitor cookie *for this page*. Returns null unless every claim still
 * holds — in particular, a code cookie stops verifying the moment the steward
 * rotates the code, because the rotation timestamp is signed into it.
 *
 * Approved mode is deliberately not settled here: the caller still has to
 * confirm the email is approved *now*, so a withdrawn approval takes effect on
 * the next page view rather than in six months.
 */
export function readAccessCookie(
  value: string | undefined,
  page: AccessPage,
): AccessClaim | null {
  const payload = unseal(value);
  if (payload === null) return null;

  const [purpose, pageId, mode, rotatedAt, email, expiry] = payload.split("|");
  if (purpose !== PURPOSE) return null;
  if (pageId !== page.id) return null;
  if (mode !== "code" && mode !== "approved") return null;

  const expiresAt = Number(expiry);
  if (!Number.isFinite(expiresAt) || expiresAt < Date.now()) return null;

  // The cookie has to match the mode the page is in now. A page moved from
  // `code` to `approved` should ask everyone again.
  if (mode !== accessMode(page)) return null;

  if (mode === "code" && rotatedAt !== (page.access_code_rotated_at ?? "")) return null;

  return { pageId, mode, rotatedAt: rotatedAt ?? "", email: email ?? "" };
}

// ---------------------------------------------------------------------------
// The decision
// ---------------------------------------------------------------------------

export type AccessView =
  /** The memorial itself: bio, memories, photos. */
  | { view: "full" }
  /** The public doorway plus a gate. */
  | { view: "announcement"; gate: AccessGate }
  /** No announcement configured: the gate on its own. */
  | { view: "gate"; gate: AccessGate };

export type AccessGate = "code" | "request";

/**
 * Pure: what an arriving visitor should see. `admitted` is the caller's
 * verdict on the visitor cookie (and, in approved mode, on the approval that
 * still has to back it).
 */
export function decideAccess(
  page: Pick<AccessPage, "access_mode" | "announcement_enabled">,
  viewer: { steward: boolean; admitted: boolean },
): AccessView {
  const mode = accessMode(page);
  if (mode === "link") return { view: "full" };
  if (viewer.steward || viewer.admitted) return { view: "full" };

  const gate: AccessGate = mode === "code" ? "code" : "request";
  return page.announcement_enabled ? { view: "announcement", gate } : { view: "gate", gate };
}

/**
 * Which access_request states count as admitted. `preapproved` is the steward's
 * standing yes; it only opens the page once the email behind it is verified,
 * which is why verification is checked alongside.
 */
export function approvalAdmits(row: {
  status: string;
  verified_at: string | null;
}): boolean {
  if (!row.verified_at) return false;
  return row.status === "approved" || row.status === "preapproved";
}
