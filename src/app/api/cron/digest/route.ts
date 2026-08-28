import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendWeeklyDigest } from "@/lib/email";
import { logEvent } from "@/lib/audit";

// See the note in the inactivity job: Hobby-tier duration caps sit well below
// the 300s this used to declare, so the job pages through its work instead.
export const maxDuration = 60;

const PAGE_SIZE = 100;

/**
 * Weekly digest (PRD §4.5): new approved memories + pending queue count per
 * page, emailed to every steward. Acting on the digest link counts as steward
 * activity (handled by the dashboard's ?digest= param).
 *
 * Resumable: pass ?after=<page id> to continue from where a previous run
 * stopped. The response reports `nextCursor` when more pages remain.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const weekAgo = new Date(Date.now() - 7 * 86400_000).toISOString();
  const after = new URL(request.url).searchParams.get("after");

  let query = admin
    .from("pages")
    .select("id, name")
    .in("status", ["active", "inactivity_hold"])
    .order("id", { ascending: true })
    .limit(PAGE_SIZE);
  if (after) query = query.gt("id", after);

  const { data: pages } = await query;

  let sent = 0;
  for (const page of pages ?? []) {
    const { count: newApproved } = await admin
      .from("memories")
      .select("id", { count: "exact", head: true })
      .eq("page_id", page.id)
      .eq("status", "approved")
      .gte("approved_at", weekAgo);
    const { count: pendingCount } = await admin
      .from("memories")
      .select("id", { count: "exact", head: true })
      .eq("page_id", page.id)
      .eq("status", "pending");

    // No news, no email — keep digests meaningful.
    if ((newApproved ?? 0) === 0 && (pendingCount ?? 0) === 0) continue;

    const { data: stewards } = await admin
      .from("stewards")
      .select("profiles!inner(email)")
      .eq("page_id", page.id);
    for (const s of stewards ?? []) {
      const email = (s.profiles as unknown as { email: string }).email;
      await sendWeeklyDigest(
        email,
        page.name,
        page.id,
        newApproved ?? 0,
        pendingCount ?? 0,
        randomUUID(),
      );
      sent++;
    }
  }

  const scanned = pages?.length ?? 0;
  const summary = {
    digestsSent: sent,
    pagesScanned: scanned,
    nextCursor: scanned >= PAGE_SIZE ? (pages![scanned - 1].id as string) : null,
  };
  await logEvent({ action: "cron_digest_completed", meta: summary });

  return NextResponse.json(summary);
}
