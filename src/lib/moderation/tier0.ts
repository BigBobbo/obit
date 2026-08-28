import { createAdminClient } from "@/lib/supabase/admin";
import { getModerationConfig } from "@/lib/moderation/config";

/**
 * Tier 0 — hard blocks (PRD §5). Runs before anything reaches a human.
 *
 * CSAM scanning note: the Cloudflare CSAM Scanning Tool operates at the CDN
 * layer (the site must be proxied through Cloudflare) — it is enabled in the
 * Cloudflare dashboard, not in app code. See README "CSAM scanning" for the
 * runbook. Sightengine and the text checks below are the in-app portion.
 */

export type Tier0Result =
  | { ok: true }
  | { ok: false; reason: string; userMessage: string };

const PII_MESSAGE =
  "To protect the family's privacy, memories can't include phone numbers, email addresses, street addresses or links. Please remove them and try again.";

/**
 * Giving has exactly one surface on a memorial: the family's own block, which
 * points at a verified charity through a regulated processor (PRD v2 §3.3).
 * A tribute that carries a competing ask is how the fake-fundraiser problem
 * arrives, so a payment or fundraising destination is refused *by name* rather
 * than swept up as "a link" — the contributor deserves to know which rule they
 * hit, and the audit log deserves to say so.
 */
const FUNDRAISING_MESSAGE =
  "Memories can't include fundraising or payment links. If the family has asked for donations, they appear on the page itself — please leave the ask to them.";

// Conservative patterns — false positives get a friendly message, not a ban.
const URL_RE = /(?:https?:\/\/|www\.)\S+|[a-z0-9-]+\.(?:com|net|org|io|co|info|biz|me|app|shop|xyz)(?:\/\S*)?/i;
const EMAIL_RE = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
const PHONE_RE = /(?:\+?\d[\s().-]*){10,15}/;
const STREET_ADDRESS_RE = /\b\d{1,6}\s+(?:[A-Z][a-z]+\s){1,3}(?:St(?:reet)?|Ave(?:nue)?|Blvd|Boulevard|Rd|Road|Dr(?:ive)?|Ln|Lane|Ct|Court|Way|Pl(?:ace)?)\b\.?/;

const PAYMENT_HOSTS = [
  "gofundme.com", "gofund.me", "paypal.com", "paypal.me", "venmo.com", "cash.app",
  "cashapp.com", "zelle.com", "patreon.com", "kickstarter.com", "indiegogo.com",
  "gogetfunding.com", "givesendgo.com", "fundly.com", "donorbox.org",
  "givebutter.com", "buymeacoffee.com", "ko-fi.com", "spotfund.com",
];
const PAYMENT_HOST_RE = new RegExp(
  `\\b(?:${PAYMENT_HOSTS.map((h) => h.replace(/\./g, "\\.")).join("|")})\\b`,
  "i",
);

// Cash App cashtags: "$maryflowers". Deliberately not "$40" or "$1,200" — a
// memory that mentions money is not a solicitation.
const CASHTAG_RE = /(?:^|\s)\$[a-zA-Z][a-zA-Z0-9_]{4,}\b/;

// A payment brand *and* an ask, close together. "She raised money on GoFundMe
// for the shelter" is a memory and stays one; "venmo me for the flowers" is not.
const BRANDS = "venmo|paypal|cash ?app|zelle|gofundme|go fund me|wire transfer";
const ASKS = "me|us|him|her|them|link|account|page|handle|donate|donations?|send|sending|transfer|contribute|chip in";
const SOLICITATION_RE = new RegExp(
  `\\b(?:${BRANDS})\\b[^.!?\\n]{0,30}\\b(?:${ASKS})\\b|` +
    `\\b(?:${ASKS})\\b[^.!?\\n]{0,30}\\b(?:${BRANDS})\\b`,
  "i",
);

/**
 * The pattern half of Tier 0 — no database, so the donor wall can reuse it
 * (PRD v2 §3.2: donor names and messages run the same gauntlet as a memory).
 */
export function tier0TextPatterns(body: string): Tier0Result {
  // Payment destinations before the generic link check: both block, but the
  // specific reason is the one worth recording and the one worth telling a
  // contributor who tripped it.
  if (PAYMENT_HOST_RE.test(body)) {
    return { ok: false, reason: "fundraising_link", userMessage: FUNDRAISING_MESSAGE };
  }
  if (CASHTAG_RE.test(body)) {
    return { ok: false, reason: "payment_handle", userMessage: FUNDRAISING_MESSAGE };
  }
  if (SOLICITATION_RE.test(body)) {
    return { ok: false, reason: "fundraising_solicitation", userMessage: FUNDRAISING_MESSAGE };
  }

  // Email before URL: an address always contains a domain, so the bare-domain
  // branch of URL_RE would otherwise match first and record the wrong reason.
  // Same block either way, but the audit log should say what was found.
  if (EMAIL_RE.test(body)) {
    return { ok: false, reason: "email_in_text", userMessage: PII_MESSAGE };
  }
  if (URL_RE.test(body)) {
    return { ok: false, reason: "link", userMessage: PII_MESSAGE };
  }
  if (PHONE_RE.test(body)) {
    return { ok: false, reason: "phone", userMessage: PII_MESSAGE };
  }
  if (STREET_ADDRESS_RE.test(body)) {
    return { ok: false, reason: "street_address", userMessage: PII_MESSAGE };
  }
  return { ok: true };
}

/** Tier 0 text checks: fundraising asks, links, PII patterns, bans. */
export async function tier0Text(
  body: string,
  email: string,
  ip: string,
): Promise<Tier0Result> {
  const patterns = tier0TextPatterns(body);
  if (!patterns.ok) return patterns;

  const supabase = createAdminClient();

  // Blocklisted contributor email or IP → generic message (don't confirm the ban).
  // Two exact-match lookups rather than an interpolated or(): the IP comes from
  // an X-Forwarded-For header, and PostgREST filter strings are not
  // parameterised, so interpolating one can inject extra predicates.
  const [{ data: emailBan }, { data: ipBan }] = await Promise.all([
    supabase.from("bans").select("id").eq("email", email).limit(1).maybeSingle(),
    supabase.from("bans").select("id").eq("ip", ip).limit(1).maybeSingle(),
  ]);
  if (emailBan || ipBan) {
    return {
      ok: false,
      reason: "banned",
      userMessage: "Your submission could not be accepted.",
    };
  }

  const { data: contributor } = await supabase
    .from("contributors")
    .select("blocked")
    .eq("email", email)
    .maybeSingle();
  if (contributor?.blocked) {
    return {
      ok: false,
      reason: "contributor_blocked",
      userMessage: "Your submission could not be accepted.",
    };
  }

  return { ok: true };
}

/** Tier 0 image moderation via Sightengine: nudity, gore, graphic violence. */
export async function tier0Image(jpeg: Buffer): Promise<Tier0Result> {
  const user = process.env.SIGHTENGINE_API_USER;
  const secret = process.env.SIGHTENGINE_API_SECRET;
  if (!user || !secret) {
    // Same reasoning as Turnstile: an unconfigured moderation API in
    // production means every photo publishes unchecked, which is precisely the
    // failure this tier exists to prevent. It already fails closed when the
    // API errors; missing credentials are not a weaker case.
    if (process.env.NODE_ENV === "production") {
      console.error("SIGHTENGINE credentials are not set — rejecting the upload rather than skipping Tier 0.");
      return {
        ok: false,
        reason: "image_moderation_unconfigured",
        userMessage: "We can't accept photos right now. Please try again later.",
      };
    }
    console.warn("Sightengine not configured; image passes Tier 0 unchecked");
    return { ok: true };
  }

  const config = await getModerationConfig();
  const form = new FormData();
  form.append("media", new Blob([new Uint8Array(jpeg)], { type: "image/jpeg" }), "photo.jpg");
  form.append("models", "nudity-2.1,gore-2.0,violence");
  form.append("api_user", user);
  form.append("api_secret", secret);

  const res = await fetch("https://api.sightengine.com/1.0/check.json", {
    method: "POST",
    body: form,
  });
  if (!res.ok) {
    // Fail closed: if the moderation API is down, hold rather than publish.
    return {
      ok: false,
      reason: "image_moderation_unavailable",
      userMessage: "We couldn't process your photos right now. Please try again later.",
    };
  }

  const data = (await res.json()) as {
    nudity?: { sexual_activity?: number; sexual_display?: number; erotica?: number };
    gore?: { prob?: number };
    violence?: { prob?: number };
  };

  const nudityScore = Math.max(
    data.nudity?.sexual_activity ?? 0,
    data.nudity?.sexual_display ?? 0,
    data.nudity?.erotica ?? 0,
  );
  const t = config.sightengine;
  if (nudityScore >= t.nudity_reject) {
    return { ok: false, reason: "nudity", userMessage: "One of your photos could not be accepted." };
  }
  if ((data.gore?.prob ?? 0) >= t.gore_reject) {
    return { ok: false, reason: "gore", userMessage: "One of your photos could not be accepted." };
  }
  if ((data.violence?.prob ?? 0) >= t.violence_reject) {
    return { ok: false, reason: "violence", userMessage: "One of your photos could not be accepted." };
  }

  return { ok: true };
}
