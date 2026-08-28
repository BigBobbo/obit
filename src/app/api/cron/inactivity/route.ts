import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendInactivityHoldNotice } from "@/lib/email";
import { deletePagePhotos } from "@/lib/images";
import { logEvent } from "@/lib/audit";
import { daysAgo, STEWARD_RESPONSE_DAYS, REPORT_AUTOCLOSE_DAYS } from "@/lib/reports";

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
 *  3. Escalate memory reports the stewards have left untouched — non-response
 *     is an escalation to the platform admin (PRD §4.6), not a quiet expiry.
 *  4. Auto-close reports whose reporter never answered our follow-up
 *     (never CSAM/illegal, which stay open until resolved by hand).
 *
 * Every run writes an audit record. A silent partial run is the dangerous
 * failure here: if phase 1 stops early and nobody notices, pages quietly stop
 * being protected by the fail-safe.
 */
export async function GET(request: Request) {
  if (!authorized(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminClient();
  const now = new Date();
  const nowIso = now.toISOString();
  const ninetyDaysAgo = daysAgo(90, now);
  const thirtyDaysAgo = daysAgo(30, now);

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

  // --- 3. Steward non-response → platform admin (PRD §4.6) ---
  // A memory report the family has not touched within the window is exactly
  // the case the PRD escalates. Before this, such reports auto-closed instead:
  // ignoring a report made it disappear rather than surface.
  const { data: escalated } = await admin
    .from("reports")
    .update({ status: "escalated", escalated_at: nowIso })
    .eq("status", "steward")
    .lt("created_at", daysAgo(STEWARD_RESPONSE_DAYS, now))
    .select("id");

  // --- 4. Auto-close reports whose reporter never replied to our follow-up ---
  // Conditional on an *unanswered follow-up*, not on age alone: a report
  // nobody has asked about must stay in the queue until a human closes it.
  const { data: closed } = await admin
    .from("reports")
    .update({
      status: "auto_closed",
      resolved_at: nowIso,
      resolution: `Closed automatically — no reply to our follow-up within ${REPORT_AUTOCLOSE_DAYS} days.`,
    })
    .eq("status", "awaiting_reporter")
    .eq("never_autoclose", false)
    .lt("follow_up_sent_at", thirtyDaysAgo)
    .select("id");

  const held = stale?.length ?? 0;
  const purged = purgeable?.length ?? 0;
  // A full batch means there is very likely more waiting; surface it rather
  // than letting the backlog grow invisibly.
  const moreWaiting = held >= BATCH_LIMIT || purged >= BATCH_LIMIT;

  const summary = {
    held,
    purged,
    reportsEscalated: escalated?.length ?? 0,
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
