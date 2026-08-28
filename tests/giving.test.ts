import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { givingEnabled, givingPartner } from "@/lib/giving/partner";
import { formatGivingTotal, normalizeEin } from "@/lib/giving/format";
import { routeDonorWords } from "@/lib/giving/moderation";
import { tier0TextPatterns } from "@/lib/moderation/tier0";

const THRESHOLDS = {
  toxicity_reject: 0.9,
  toxicity_review: 0.4,
  spam_reject: 0.9,
  spam_review: 0.5,
};

const CLEAN = {
  toxicity: 0.02,
  spam: 0.01,
  relevance: 0.3,
  mentions_living_person_negatively: false,
  flags: [] as string[],
};

beforeEach(() => {
  process.env.GIVING_PARTNER = "everydotorg";
  process.env.EVERY_ORG_API_KEY = "test-api-key";
  process.env.EVERY_ORG_WEBHOOK_TOKEN = "test-webhook-token";
});

afterEach(() => {
  delete process.env.GIVING_PARTNER;
  delete process.env.EVERY_ORG_API_KEY;
  delete process.env.EVERY_ORG_WEBHOOK_TOKEN;
});

describe("the partner is optional and fails closed", () => {
  it("is off with no keys, and off if the partner name is unknown", () => {
    delete process.env.EVERY_ORG_API_KEY;
    expect(givingPartner()).toBeNull();
    expect(givingEnabled()).toBe(false);

    process.env.EVERY_ORG_API_KEY = "test-api-key";
    process.env.GIVING_PARTNER = "some-other-processor";
    expect(givingPartner()).toBeNull();

    process.env.GIVING_PARTNER = "none";
    expect(givingPartner()).toBeNull();
  });

  it("is on once it is fully configured", () => {
    expect(givingPartner()?.id).toBe("everydotorg");
    expect(givingEnabled()).toBe(true);
  });
});

describe("EINs and totals", () => {
  it("normalises an EIN however it was typed", () => {
    expect(normalizeEin("131644147")).toBe("13-1644147");
    expect(normalizeEin("13-1644147")).toBe("13-1644147");
    expect(normalizeEin(" 13 1644147 ")).toBe("13-1644147");
  });

  /** Amounts appear as one aggregate, and never per donor (PRD v2 §3.2). */
  it("renders a total the way a family would read it", () => {
    expect(formatGivingTotal(234000)).toBe("$2,340");
    expect(formatGivingTotal(0)).toBe("$0");
  });
});

describe("the donate link", () => {
  it("carries the memorial, the designation and the webhook token", () => {
    const url = new URL(
      givingPartner()!.donateUrl({
        charity: { slug: "a-charity", name: "A Charity" },
        pageCharityId: "pc-1",
        personName: "Maura",
        returnUrl: "https://example.com/m/Demo7pageXyz",
      }),
    );
    expect(url.origin).toBe("https://www.every.org");
    expect(url.pathname).toBe("/a-charity/donate");
    expect(url.searchParams.get("partner_donation_id")).toBe("pc-1");
    expect(url.searchParams.get("designation")).toBe("In memory of Maura");
    expect(url.searchParams.get("webhook_token")).toBe("test-webhook-token");
    expect(url.searchParams.get("frequency")).toBe("ONCE");
  });
});

describe("the confirmation webhook", () => {
  const partner = () => givingPartner()!;
  const good = {
    webhookToken: "test-webhook-token",
    chargeId: "charge_123",
    partnerDonationId: "pc-1",
    amount: 25,
    currency: "USD",
    firstName: "Ada",
    lastName: "Lovelace",
    publicTestimony: "She taught me to swim.",
  };

  it("records an authenticated confirmation", () => {
    const parsed = partner().parseWebhook(JSON.stringify(good), new Headers());
    expect(parsed).toEqual({
      partnerRef: "charge_123",
      pageCharityId: "pc-1",
      amountCents: 2500,
      currency: "usd",
      donorName: "Ada Lovelace",
      donorMessage: "She taught me to swim.",
    });
  });

  it("accepts the token from an Authorization header instead", () => {
    const { webhookToken: _omitted, ...rest } = good;
    void _omitted;
    const headers = new Headers({ authorization: "Bearer test-webhook-token" });
    expect(partner().parseWebhook(JSON.stringify(rest), headers)?.partnerRef).toBe("charge_123");
  });

  /** Anyone can POST to a webhook URL. Without the shared token, nothing is. */
  it("drops anything that cannot prove it came from the partner", () => {
    expect(partner().parseWebhook(JSON.stringify({ ...good, webhookToken: "" }), new Headers())).toBeNull();
    expect(
      partner().parseWebhook(JSON.stringify({ ...good, webhookToken: "wrong" }), new Headers()),
    ).toBeNull();
    expect(partner().parseWebhook("not json", new Headers())).toBeNull();
  });

  it("drops a payload missing anything it needs, rather than half-recording it", () => {
    for (const missing of ["chargeId", "partnerDonationId", "amount"]) {
      const payload: Record<string, unknown> = { ...good };
      delete payload[missing];
      expect(partner().parseWebhook(JSON.stringify(payload), new Headers())).toBeNull();
    }
  });

  it("respects a donor who asked to stay private", () => {
    const parsed = partner().parseWebhook(
      JSON.stringify({ ...good, private: true }),
      new Headers(),
    );
    expect(parsed?.donorName).toBeNull();
    expect(parsed?.amountCents).toBe(2500);
  });
});

describe("the donor wall runs the same gauntlet as a memory", () => {
  it("publishes a clean message", () => {
    expect(
      routeDonorWords({
        hasWords: true,
        tier0Reason: null,
        scores: CLEAN,
        scoringFailed: false,
        thresholds: THRESHOLDS,
      }).status,
    ).toBe("published");
  });

  it("publishes an anonymous gift with nothing written on it", () => {
    const routing = routeDonorWords({
      hasWords: false,
      tier0Reason: null,
      scores: null,
      scoringFailed: false,
      thresholds: THRESHOLDS,
    });
    expect(routing.status).toBe("published");
    expect(routing.reasons).toContain("no_donor_words");
  });

  it("hides a Tier 0 block outright — that is what Tier 0 is for", () => {
    const routing = routeDonorWords({
      hasWords: true,
      tier0Reason: "fundraising_link",
      scores: null,
      scoringFailed: false,
      thresholds: THRESHOLDS,
    });
    expect(routing.status).toBe("hidden");
    expect(routing.reasons).toContain("tier0_fundraising_link");
  });

  it("hides a flagrant message and queues a borderline one", () => {
    expect(
      routeDonorWords({
        hasWords: true,
        tier0Reason: null,
        scores: { ...CLEAN, toxicity: 0.95 },
        scoringFailed: false,
        thresholds: THRESHOLDS,
      }).status,
    ).toBe("hidden");

    expect(
      routeDonorWords({
        hasWords: true,
        tier0Reason: null,
        scores: { ...CLEAN, toxicity: 0.5 },
        scoringFailed: false,
        thresholds: THRESHOLDS,
      }).status,
    ).toBe("pending");
  });

  /** Fail toward a human, never toward publishing. */
  it("queues rather than publishes when scoring is unavailable", () => {
    const routing = routeDonorWords({
      hasWords: true,
      tier0Reason: null,
      scores: null,
      scoringFailed: true,
      thresholds: THRESHOLDS,
    });
    expect(routing.status).toBe("pending");
    expect(routing.reasons).toContain("scoring_unavailable");
  });

  /**
   * "Thinking of you all" scores as barely relevant to a *memory* prompt, and
   * is exactly what a donor writes. Relevance must not be a signal here.
   */
  it("does not judge a donor's few words for relevance", () => {
    expect(
      routeDonorWords({
        hasWords: true,
        tier0Reason: null,
        scores: { ...CLEAN, relevance: 0.01 },
        scoringFailed: false,
        thresholds: THRESHOLDS,
      }).status,
    ).toBe("published");
  });
});

describe("Tier 0 blocks a competing ask", () => {
  it.each([
    ["a fundraiser link", "Please give at gofundme.com/help-the-family"],
    ["a payment link", "paypal.me/somebody"],
    ["a cash handle", "You can send it to $maryflowers"],
    ["a plain solicitation", "Venmo me and I'll pass it on"],
    ["the ask in the other order", "Please donate through cash app"],
  ])("rejects %s", (_label, body) => {
    const result = tier0TextPatterns(body);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toMatch(/fundraising|payment/);
      expect(result.userMessage).toMatch(/fundraising or payment/i);
    }
  });

  /** A memory that mentions money is not a solicitation. */
  it.each([
    "She raised thousands for the hospice over the years.",
    "He left us $50 each and a note telling us to spend it badly.",
    "Every year she'd donate her tomatoes to the church sale.",
  ])("leaves an ordinary memory alone: %s", (body) => {
    expect(tier0TextPatterns(body).ok).toBe(true);
  });
});
