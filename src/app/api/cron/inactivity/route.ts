import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendInactivityHoldNotice } from "@/lib/email";
import { deletePagePhotos } from "@/lib/images";
import { logEvent } from "@/lib/audit";

// Vercel's Hobby tier caps function duration well below the 300s this used to
// declare. The job is batched instead: each run handles at most BATCH_LIMIT
// pages per phase and reports whether more remain, so a run that hits the cap
// degrades into "finish next time" rather than being killed mid-purge.
export const maxDuration = 60;

const BATCH_LIMIT = 100;

/**
 * Daily job (PRD §2, §11):
 *  1. 90-day fail-safe — pages with no steward activity switch from
 *     auto-publish to hold-all-for-review (unless opted out). Pages are never
 *     auto-deleted; viewing is unaffected.
 *  2. Purge soft-deleted pages older than 30 days.
 *  3. Auto-close stale reports (except never_autoclose categories).
 *
 * Every run writes an audit record. A silent partial run is the dangerous
 * failure here: if phase 1 stops early and nobody notices, pages quietly stop
 * being protected by the fail-safe.
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
    .lt("last_steward_activity_at", ninetyDaysAgo)
    .order("last_steward_activity_at", { ascending: true })
    .limit(BATCH_LIMIT);

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
    .lt("deleted_at", thirtyDaysAgo)
    .order("deleted_at", { ascending: true })
    .limit(BATCH_LIMIT);

  for (const page of purgeable ?? []) {
    // Remove stored photos from both buckets first, then the row (cascades).
    await deletePagePhotos(page.id);
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

  const held = stale?.length ?? 0;
  const purged = purgeable?.length ?? 0;
  // A full batch means there is very likely more waiting; surface it rather
  // than letting the backlog grow invisibly.
  const moreWaiting = held >= BATCH_LIMIT || purged >= BATCH_LIMIT;

  const summary = {
    held,
    purged,
    reportsClosed: closed?.length ?? 0,
    moreWaiting,
  };
  await logEvent({ action: "cron_inactivity_completed", meta: summary });

  return NextResponse.json(summary);
}

function authorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return request.headers.get("authorization") === `Bearer ${secret}`;
}
