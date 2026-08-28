import { describe, it, expect, vi, afterEach } from "vitest";
import { verifyTurnstile } from "@/lib/turnstile";
import { tier0Image } from "@/lib/moderation/tier0";

/**
 * An unconfigured safety integration must not silently pass in production.
 * This is the failure nothing alerts on: the app keeps working, the checks
 * just stop happening.
 */
afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("Turnstile without a secret key", () => {
  it("refuses the request in production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("TURNSTILE_SECRET_KEY", "");
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect(await verifyTurnstile("any-token")).toBe(false);
  });

  it("still lets local development through", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("TURNSTILE_SECRET_KEY", "");
    vi.spyOn(console, "warn").mockImplementation(() => {});
    expect(await verifyTurnstile(null)).toBe(true);
  });
});

describe("Sightengine without credentials", () => {
  it("rejects the upload in production rather than skipping Tier 0", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("SIGHTENGINE_API_USER", "");
    vi.stubEnv("SIGHTENGINE_API_SECRET", "");
    vi.spyOn(console, "error").mockImplementation(() => {});

    const result = await tier0Image(Buffer.from("not-really-a-jpeg"));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("image_moderation_unconfigured");
  });

  it("still lets local development through", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("SIGHTENGINE_API_USER", "");
    vi.stubEnv("SIGHTENGINE_API_SECRET", "");
    vi.spyOn(console, "warn").mockImplementation(() => {});

    expect((await tier0Image(Buffer.from("not-really-a-jpeg"))).ok).toBe(true);
  });
});
