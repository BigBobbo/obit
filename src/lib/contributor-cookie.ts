import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Signed "returning contributor" cookie (PRD §4.3): a verified email with
 * approval history skips re-verification on later submissions.
 */
const COOKIE_NAME = "mp_contributor";
const MAX_AGE_S = 60 * 60 * 24 * 180; // 6 months

function secret(): string {
  return process.env.CONTRIBUTOR_COOKIE_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || "dev";
}

function sign(payload: string): string {
  return createHmac("sha256", secret()).update(payload).digest("base64url");
}

export function contributorCookieName(): string {
  return COOKIE_NAME;
}

export function createContributorCookieValue(email: string): string {
  const payload = `${email}|${Date.now() + MAX_AGE_S * 1000}`;
  return `${Buffer.from(payload).toString("base64url")}.${sign(payload)}`;
}

export function contributorCookieMaxAge(): number {
  return MAX_AGE_S;
}

/** Returns the verified email, or null when missing/invalid/expired. */
export function readContributorCookie(value: string | undefined): string | null {
  if (!value) return null;
  const [b64, mac] = value.split(".");
  if (!b64 || !mac) return null;
  let payload: string;
  try {
    payload = Buffer.from(b64, "base64url").toString();
  } catch {
    return null;
  }
  const expected = sign(payload);
  const a = Buffer.from(mac);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  const [email, expiry] = payload.split("|");
  if (!email || !expiry || Number(expiry) < Date.now()) return null;
  return email;
}
