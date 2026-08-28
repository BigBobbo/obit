import { seal, unseal } from "@/lib/signed-cookie";

/**
 * Signed "returning contributor" cookie (PRD §4.3): a verified email with
 * approval history skips re-verification on later submissions.
 *
 * The key, and the seal/unseal pair, are shared with the page-access cookie
 * (`src/lib/access.ts`). The two payload formats are kept distinguishable on
 * purpose — this one is `<email>|<expiry>`, the other opens with a literal
 * `access` purpose claim — so neither cookie can be replayed as the other.
 */
const COOKIE_NAME = "mp_contributor";
const MAX_AGE_S = 60 * 60 * 24 * 180; // 6 months

export function contributorCookieName(): string {
  return COOKIE_NAME;
}

export function createContributorCookieValue(email: string): string {
  return seal(`${email}|${Date.now() + MAX_AGE_S * 1000}`);
}

export function contributorCookieMaxAge(): number {
  return MAX_AGE_S;
}

/** Returns the verified email, or null when missing/invalid/expired. */
export function readContributorCookie(value: string | undefined): string | null {
  const payload = unseal(value);
  if (payload === null) return null;
  const [email, expiry] = payload.split("|");
  if (!email || !expiry) return null;
  // A non-numeric expiry is not an unexpired one: Number("x") is NaN, and every
  // comparison against NaN is false, so a bare `< Date.now()` would wave it
  // through. That is the shape a cookie meant for another purpose would take.
  const expiresAt = Number(expiry);
  if (!Number.isFinite(expiresAt) || expiresAt < Date.now()) return null;
  return email;
}
