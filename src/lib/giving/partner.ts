import { timingSafeEqual } from "node:crypto";
import { isValidEin, normalizeEin } from "@/lib/giving/format";

/**
 * The charity directory partner (PRD v2 §3.2).
 *
 * Everything about giving that touches money is somebody else's job. The
 * partner holds the 501(c)(3) registry, takes the payment, issues the receipt
 * and sends the money to the charity; we hold a *record that it happened*, so a
 * family can see a total and thank the people who gave. That division is the
 * compliance design, not an implementation detail — it is what keeps us out of
 * money-transmitter and charitable-solicitation territory.
 *
 * **Decision (PRD v2 §8, open question 3): Every.org.** It is the PRD's own
 * candidate and the only one of the two that covers the full US registry, hosts
 * its own checkout, confirms by webhook and prices at 0%. Pledge.to stays the
 * documented alternate: everything below goes through this one interface, so
 * swapping it is a file, not a refactor.
 *
 * **What the spike still has to confirm** — the shapes below follow Every.org's
 * published partner API, but they are not verified against a live account here,
 * and neither are the terms. Both are launch blockers in
 * `docs/giving-compliance.md`. Every failure path is loud rather than silent: a
 * payload we cannot parse is a 400 with a log line, never a recorded donation.
 */

export type Charity = {
  ein: string;
  name: string;
  /** The partner's own identifier, used to build the checkout link. */
  slug: string;
  description?: string | null;
  logoUrl?: string | null;
};

export type PartnerDonation = {
  /** The partner's charge id — our idempotency key. */
  partnerRef: string;
  /** Our page_charities row, round-tripped through the checkout link. */
  pageCharityId: string;
  amountCents: number;
  currency: string;
  donorName: string | null;
  donorMessage: string | null;
};

export type GivingPartner = {
  id: string;
  /** Shown to stewards and in the footer language. */
  displayName: string;
  search(query: string): Promise<Charity[]>;
  /** Confirms an EIN really is in the partner's registry before we store it. */
  lookup(ein: string): Promise<Charity | null>;
  donateUrl(opts: {
    charity: Pick<Charity, "slug" | "name">;
    pageCharityId: string;
    personName: string;
    returnUrl: string;
  }): string;
  /** Parses and authenticates a confirmation webhook. Null means "not ours". */
  parseWebhook(rawBody: string, headers: Headers): PartnerDonation | null;
};

/** Giving is off entirely unless a partner is configured. */
export function givingPartner(): GivingPartner | null {
  const configured = (process.env.GIVING_PARTNER ?? "everydotorg").trim();
  if (!configured || configured === "none") return null;
  if (configured !== "everydotorg") {
    console.error(`Unknown GIVING_PARTNER "${configured}" — giving is disabled.`);
    return null;
  }
  if (!process.env.EVERY_ORG_API_KEY || !process.env.EVERY_ORG_WEBHOOK_TOKEN) return null;
  return everyDotOrg();
}

export function givingEnabled(): boolean {
  return givingPartner() !== null;
}

// ---------------------------------------------------------------------------
// Every.org
// ---------------------------------------------------------------------------

const API_BASE = "https://partners.every.org/v0.2";
const CHECKOUT_BASE = "https://www.every.org";
const MAX_RESULTS = 10;

type RawNonprofit = {
  ein?: unknown;
  name?: unknown;
  slug?: unknown;
  description?: unknown;
  logoUrl?: unknown;
};

function toCharity(raw: RawNonprofit): Charity | null {
  const ein = typeof raw.ein === "string" ? normalizeEin(raw.ein) : "";
  const name = typeof raw.name === "string" ? raw.name : "";
  const slug = typeof raw.slug === "string" ? raw.slug : "";
  if (!isValidEin(ein) || !name || !slug) return null;
  return {
    ein,
    name,
    slug,
    description: typeof raw.description === "string" ? raw.description : null,
    logoUrl: typeof raw.logoUrl === "string" ? raw.logoUrl : null,
  };
}

function everyDotOrg(): GivingPartner {
  const apiKey = process.env.EVERY_ORG_API_KEY!;
  const webhookToken = process.env.EVERY_ORG_WEBHOOK_TOKEN!;

  async function search(query: string): Promise<Charity[]> {
    const term = query.trim();
    if (term.length < 2) return [];
    const url = `${API_BASE}/search/${encodeURIComponent(term)}?apiKey=${encodeURIComponent(apiKey)}&take=${MAX_RESULTS}`;
    let payload: { nonprofits?: RawNonprofit[] };
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
      if (!res.ok) {
        console.error("every.org search failed", res.status);
        return [];
      }
      payload = (await res.json()) as { nonprofits?: RawNonprofit[] };
    } catch (err) {
      console.error("every.org search error", err);
      return [];
    }
    return (payload.nonprofits ?? [])
      .map(toCharity)
      .filter((c): c is Charity => c !== null)
      .slice(0, MAX_RESULTS);
  }

  return {
    id: "everydotorg",
    displayName: "Every.org",
    search,

    /**
     * Verification, not convenience: a steward's chosen EIN has to come back
     * from the partner's own registry or it is not stored. "Named, verified
     * charities only" is the whole guardrail, and this is where it is enforced.
     */
    async lookup(ein: string): Promise<Charity | null> {
      const wanted = normalizeEin(ein);
      if (!isValidEin(wanted)) return null;
      const results = await search(wanted);
      return results.find((c) => c.ein === wanted) ?? null;
    },

    donateUrl({ charity, pageCharityId, personName, returnUrl }) {
      const params = new URLSearchParams({
        frequency: "ONCE",
        // Round-trips through the partner and comes back on the webhook: it is
        // how a confirmation finds the memorial it belongs to.
        partner_donation_id: pageCharityId,
        webhook_token: webhookToken,
        success_url: returnUrl,
        exit_url: returnUrl,
        designation: `In memory of ${personName}`,
      });
      return `${CHECKOUT_BASE}/${encodeURIComponent(charity.slug)}/donate?${params.toString()}`;
    },

    parseWebhook(rawBody, headers) {
      let body: Record<string, unknown>;
      try {
        body = JSON.parse(rawBody) as Record<string, unknown>;
      } catch {
        return null;
      }

      // Authenticated by the token we put on the checkout link. Accepted from
      // the payload or from an Authorization header, because the partner
      // documents the first and proxies sometimes prefer the second — and
      // requiring *either* is still requiring a shared secret.
      const bearer = headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
      const claimed = typeof body.webhookToken === "string" ? body.webhookToken : bearer;
      if (!tokensMatch(claimed, webhookToken)) return null;

      const partnerRef = firstString(body.chargeId, body.id);
      const pageCharityId = firstString(body.partnerDonationId, body.partner_donation_id);
      const amount = toCents(body.amount, body.netAmount);
      if (!partnerRef || !pageCharityId || amount === null) {
        console.error("every.org webhook missing required fields", Object.keys(body));
        return null;
      }

      const first = firstString(body.firstName) ?? "";
      const last = firstString(body.lastName) ?? "";
      const donorName = body.private === true ? null : `${first} ${last}`.trim() || null;

      return {
        partnerRef,
        pageCharityId,
        amountCents: amount,
        currency: (firstString(body.currency) ?? "usd").toLowerCase(),
        donorName,
        donorMessage: firstString(body.publicTestimony) ?? null,
      };
    },
  };
}

function tokensMatch(a: string, b: string): boolean {
  if (!a || !b) return false;
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

function firstString(...values: unknown[]): string | null {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return null;
}

/** The partner reports dollars; we store cents, and never a negative one. */
function toCents(...values: unknown[]): number | null {
  for (const value of values) {
    const amount = typeof value === "string" ? Number(value) : value;
    if (typeof amount === "number" && Number.isFinite(amount) && amount >= 0) {
      return Math.round(amount * 100);
    }
  }
  return null;
}
