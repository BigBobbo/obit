import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Fixed-window rate limiter backed by Postgres (PRD §6: Vercel middleware +
 * Supabase counters). Returns true when the call is allowed.
 */
export async function rateLimit(
  key: string,
  max: number,
  windowSeconds: number,
): Promise<boolean> {
  const supabase = createAdminClient();
  const { data, error } = await supabase.rpc("bump_rate_limit", {
    p_key: key,
    p_window_seconds: windowSeconds,
  });
  if (error) {
    // Fail closed for abuse-sensitive endpoints: a DB error should not open
    // the floodgates.
    console.error("rate limit error", error);
    return false;
  }
  return (data as number) <= max;
}

export function clientIp(request: Request): string {
  const fwd = request.headers.get("x-forwarded-for");
  return fwd ? fwd.split(",")[0].trim() : "unknown";
}

const DAY = 86400;

export const RATE_LIMITS = {
  // Memory submissions (PRD §4.3)
  submitPerEmailPerDay: { max: 5, window: DAY },
  submitPerIpPerDay: { max: 20, window: DAY },
  submitPerPagePerDay: { max: 20, window: DAY },
  // Verification code requests
  verifyCodePerEmailPerHour: { max: 6, window: 3600 },
  // Reports
  reportPerIpPerDay: { max: 10, window: DAY },
  reportPerEmailPerDay: { max: 5, window: DAY },
  // Page creation (free tier: 2 per account per 30 days — checked separately)
  pageCreatePerIpPerDay: { max: 5, window: DAY },
} as const;
