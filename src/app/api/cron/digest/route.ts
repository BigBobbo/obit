import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendWeeklyDigest } from "@/lib/email";

export const maxDuration = 300;

/**
 * Weekly digest (PRD §4.5): new approved memories + pending queue count per
 * page, emailed to every steward. Acting on the digest link counts as steward
 * activity (handled by the dashboard's ?digest= param).
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const weekAgo = new Date(Date.now() - 7 * 86400_000).toISOString();

  const { data: pages } = await admin
    .from("pages")
    .select("id, name")
    .in("status", ["active", "inactivity_hold"]);

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

  return NextResponse.json({ digestsSent: sent });
}
