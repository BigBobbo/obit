import { createClient as createSupabaseClient, SupabaseClient } from "@supabase/supabase-js";

let cached: SupabaseClient | null = null;

/**
 * Service-role client. Bypasses RLS — server only. Used by the moderation
 * pipeline, submission flow, cron jobs, Stripe webhook and admin actions.
 */
export function createAdminClient(): SupabaseClient {
  if (cached) return cached;
  cached = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
  return cached;
}
