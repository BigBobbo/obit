/** Server-side verification of a Cloudflare Turnstile token. */
export async function verifyTurnstile(token: string | null, ip?: string): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) {
    // Not configured (local dev) — allow, but make it visible in logs.
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
