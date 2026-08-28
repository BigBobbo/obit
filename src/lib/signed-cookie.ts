import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * The HMAC key behind every cookie this app trusts: the returning-contributor
 * cookie (PRD §4.3) and the per-page visitor cookie that opens a gated
 * memorial (PRD v2 §1.1).
 *
 * Both are bearer credentials — one skips email verification, the other opens a
 * private page — so a guessable key is a bypass of the check it stands in for.
 * There is no production fallback.
 *
 * In development an unset key falls back to a fixed dev-only value and says so,
 * so `npm run dev` works out of the box against a local Supabase.
 */
const DEV_SECRET = "insecure-development-only-secret";
let warnedAboutDevSecret = false;

export function cookieSecret(): string {
  const configured = process.env.CONTRIBUTOR_COOKIE_SECRET;
  if (configured) return configured;

  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "CONTRIBUTOR_COOKIE_SECRET is not set. Generate one with `openssl rand -base64 32` " +
        "and set it in the environment — without it the returning-contributor and " +
        "page-access cookies are forgeable.",
    );
  }

  if (!warnedAboutDevSecret) {
    warnedAboutDevSecret = true;
    console.warn(
      "CONTRIBUTOR_COOKIE_SECRET not set; using the development-only key. " +
        "Set a real one before deploying.",
    );
  }
  return DEV_SECRET;
}

export function signPayload(payload: string): string {
  return createHmac("sha256", cookieSecret()).update(payload).digest("base64url");
}

/** `<base64url payload>.<mac>` — the shape both cookies share. */
export function seal(payload: string): string {
  return `${Buffer.from(payload).toString("base64url")}.${signPayload(payload)}`;
}

/** Returns the payload, or null when the value is missing, malformed or forged. */
export function unseal(value: string | undefined): string | null {
  if (!value) return null;
  const [b64, mac] = value.split(".");
  if (!b64 || !mac) return null;
  let payload: string;
  try {
    payload = Buffer.from(b64, "base64url").toString();
  } catch {
    return null;
  }
  const expected = signPayload(payload);
  const a = Buffer.from(mac);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  return payload;
}
