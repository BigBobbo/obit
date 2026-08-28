import { beforeEach, describe, expect, it, vi } from "vitest";
import { createStub, type Row } from "./helpers/supabase-stub";

const stubs = vi.hoisted(() => ({ client: null as unknown }));

vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => stubs.client }));

import { tier0Text } from "@/lib/moderation/tier0";

function world(tables: Record<string, Row[]> = {}) {
  const { client, state } = createStub({ bans: [], contributors: [], ...tables });
  stubs.client = client;
  return state;
}

const check = (body: string) => tier0Text(body, "friend@example.com", "203.0.113.9");

beforeEach(() => {
  world();
});

describe("Tier 0 — links and PII are blocked before storage", () => {
  it.each([
    ["a bare http url", "Read more at https://example.com/obit"],
    ["a www url", "See www.example.com for details"],
    ["a bare domain", "Her business was maryflowers.com and it thrived"],
  ])("rejects %s", async (_label, body) => {
    const result = await check(body);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("link");
  });

  it("rejects an email address in the body", async () => {
    const result = await check("Contact me at alex@example.org if you knew her");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("email_in_text");
  });

  it.each([
    ["a plain number", "Call me on 5551234567"],
    ["a spaced number", "My number is 555 123 4567"],
    ["a dashed number", "Reach me: 555-123-4567"],
  ])("rejects %s", async (_label, body) => {
    const result = await check(body);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("phone");
  });

  it("rejects a street address", async () => {
    const result = await check("She lived at 42 Willow Lane for forty years");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("street_address");
  });

  it("explains itself rather than accusing, so a false positive is recoverable", async () => {
    const result = await check("Call 555-123-4567");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.userMessage).toMatch(/can't include/i);
      expect(result.userMessage).toMatch(/try again/i);
    }
  });
});

describe("Tier 0 — ordinary memories pass", () => {
  it.each([
    "She taught me how to make bread, and I still use her recipe.",
    "We met in 1974 at the community hall. She never forgot a birthday.",
    "Dad was 87 and still fixing bicycles in the garage.",
    "I'll miss the way she said my name.",
    "",
  ])("accepts %j", async (body) => {
    expect((await check(body)).ok).toBe(true);
  });

  it("accepts a year range, which is not a phone number", async () => {
    expect((await check("Married 1962, widowed 2019.")).ok).toBe(true);
  });
});

describe("Tier 0 — bans", () => {
  it("blocks a banned email", async () => {
    world({ bans: [{ id: "b1", email: "friend@example.com", ip: null }] });
    const result = await check("A kind memory.");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("banned");
  });

  it("blocks a banned IP", async () => {
    world({ bans: [{ id: "b1", email: null, ip: "203.0.113.9" }] });
    const result = await check("A kind memory.");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("banned");
  });

  it("ignores a ban on a different email and IP", async () => {
    world({ bans: [{ id: "b1", email: "someone@else.com", ip: "198.51.100.1" }] });
    expect((await check("A kind memory.")).ok).toBe(true);
  });

  it("blocks a contributor flagged as blocked", async () => {
    world({ contributors: [{ email: "friend@example.com", blocked: true }] });
    const result = await check("A kind memory.");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("contributor_blocked");
  });

  it("never confirms the ban to the person being blocked", async () => {
    world({ bans: [{ id: "b1", email: "friend@example.com", ip: null }] });
    const result = await check("A kind memory.");
    if (!result.ok) {
      expect(result.userMessage).toBe("Your submission could not be accepted.");
      expect(result.userMessage).not.toMatch(/ban|block/i);
    }
  });
});
