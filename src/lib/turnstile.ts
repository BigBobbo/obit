/**
 * Server-side verification of a Cloudflare Turnstile token.
 *
 * Unconfigured means *no bot defense at all* on page creation, submissions and
 * reports. In development that is a convenience; in production it is a silent
 * hole that nothing would ever alert on, so there it fails closed instead.
 */
export async function verifyTurnstile(token: string | null, ip?: string): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      console.error(
        "TURNSTILE_SECRET_KEY is not set — refusing the request. Bot defense cannot be skipped in production.",
      );
      return false;
    }
    // Local dev — allow, but make it visible in logs.
    console.warn("TURNSTILE_SECRET_KEY not set; skipping bot check");
    return true;
  }
  if (!token) return false;

  const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      secret,
      response: token,
      ...(ip && ip !== "unknown" ? { remoteip: ip } : {}),
    }),
  });
  if (!res.ok) return false;
  const data = (await res.json()) as { success: boolean };
  return data.success;
}
