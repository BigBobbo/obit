import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendInactivityHoldNotice } from "@/lib/email";
import { logEvent } from "@/lib/audit";

export const maxDuration = 300;

/**
 * Daily job (PRD §2, §11):
 *  1. 90-day fail-safe — pages with no steward activity switch from
 *     auto-publish to hold-all-for-review (unless opted out). Pages are never
 *     auto-deleted; viewing is unaffected.
 *  2. Purge soft-deleted pages older than 30 days.
 *  3. Auto-close stale reports (except never_autoclose categories).
 */
export async function GET(request: Request) {
  if (!authorized(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminClient();
  const ninetyDaysAgo = new Date(Date.now() - 90 * 86400_000).toISOString();
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400_000).toISOString();

  // --- 1. Inactivity hold ---
  const { data: stale } = await admin
    .from("pages")
    .select("id, name")
    .eq("status", "active")
    .eq("auto_publish_optout", false)
    .lt("last_steward_activity_at", ninetyDaysAgo);

  for (const page of stale ?? []) {
    await admin.from("pages").update({ status: "inactivity_hold" }).eq("id", page.id);
    await logEvent({ pageId: page.id, action: "inactivity_hold_applied" });
    const { data: stewards } = await admin
      .from("stewards")
      .select("profiles!inner(email)")
      .eq("page_id", page.id);
    for (const s of stewards ?? []) {
      const email = (s.profiles as unknown as { email: string }).email;
      await sendInactivityHoldNotice(email, page.name, page.id);
    }
  }

  // --- 2. Purge soft-deleted pages past the 30-day recovery window ---
  const { data: purgeable } = await admin
    .from("pages")
    .select("id")
    .eq("status", "soft_deleted")
    .lt("deleted_at", thirtyDaysAgo);

  for (const page of purgeable ?? []) {
    // Remove stored photos first (both buckets), then the row (cascades).
    const { data: photos } = await admin
      .from("photos")
      .select("original_path, sizes")
      .eq("page_id", page.id);
    const originals = (photos ?? []).map((p) => p.original_path).filter(Boolean);
    const renditions = (photos ?? []).flatMap((p) =>
      Object.values((p.sizes ?? {}) as Record<string, { path: string }>).map((s) => s.path),
    );
    if (originals.length) await admin.storage.from("originals").remove(originals);
    if (renditions.length) await admin.storage.from("photos").remove(renditions);
    await admin.from("pages").delete().eq("id", page.id);
    await logEvent({ pageId: page.id, action: "page_purged" });
  }

  // --- 3. Auto-close stale reports (30 days, never CSAM/illegal) ---
  const { data: closed } = await admin
    .from("reports")
    .update({ status: "auto_closed", resolved_at: new Date().toISOString() })
    .in("status", ["open", "steward"])
    .eq("never_autoclose", false)
    .lt("created_at", thirtyDaysAgo)
    .select("id");

  return NextResponse.json({
    held: stale?.length ?? 0,
    purged: purgeable?.length ?? 0,
    reportsClosed: closed?.length ?? 0,
  });
}

function authorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return request.headers.get("authorization") === `Bearer ${secret}`;
}
