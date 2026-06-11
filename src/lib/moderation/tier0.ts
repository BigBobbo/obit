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

// Conservative patterns — false positives get a friendly message, not a ban.
const URL_RE = /(?:https?:\/\/|www\.)\S+|[a-z0-9-]+\.(?:com|net|org|io|co|info|biz|me|app|shop|xyz)(?:\/\S*)?/i;
const EMAIL_RE = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
const PHONE_RE = /(?:\+?\d[\s().-]*){10,15}/;
const STREET_ADDRESS_RE = /\b\d{1,6}\s+(?:[A-Z][a-z]+\s){1,3}(?:St(?:reet)?|Ave(?:nue)?|Blvd|Boulevard|Rd|Road|Dr(?:ive)?|Ln|Lane|Ct|Court|Way|Pl(?:ace)?)\b\.?/;

/** Tier 0 text checks: links, PII patterns, bans. */
export async function tier0Text(
  body: string,
  email: string,
  ip: string,
): Promise<Tier0Result> {
  if (URL_RE.test(body)) {
    return { ok: false, reason: "link", userMessage: PII_MESSAGE };
  }
  if (EMAIL_RE.test(body)) {
    return { ok: false, reason: "email_in_text", userMessage: PII_MESSAGE };
  }
  if (PHONE_RE.test(body)) {
    return { ok: false, reason: "phone", userMessage: PII_MESSAGE };
  }
  if (STREET_ADDRESS_RE.test(body)) {
    return { ok: false, reason: "street_address", userMessage: PII_MESSAGE };
  }

  const supabase = createAdminClient();

  // Blocklisted contributor email or IP → generic message (don't confirm the ban).
  const { data: ban } = await supabase
    .from("bans")
    .select("id")
    .or(`email.eq.${email},ip.eq.${ip}`)
    .limit(1)
    .maybeSingle();
  if (ban) {
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
