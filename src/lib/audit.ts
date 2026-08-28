import { createAdminClient } from "@/lib/supabase/admin";

/** Appends to the audit log; steward actions feed the 90-day inactivity clock. */
export async function logEvent(opts: {
  actorUserId?: string | null;
  actorEmail?: string | null;
  pageId?: string | null;
  action: string;
  meta?: Record<string, unknown>;
}) {
  const supabase = createAdminClient();
  await supabase.from("audit_log").insert({
    actor_user_id: opts.actorUserId ?? null,
    actor_email: opts.actorEmail ?? null,
    page_id: opts.pageId ?? null,
    action: opts.action,
    meta: opts.meta ?? {},
  });
}

/**
 * Marks steward activity on a page: resets the 90-day clock and lifts an
 * inactivity hold if one is in place.
 */
export async function touchStewardActivity(pageId: string, userId: string, action: string) {
  await recordStewardActivity([pageId], userId, action, pageId);
}

/**
 * The same, for every page a steward has just shown up for at once.
 *
 * The fail-safe releases on *signing in*, not only on opening one page
 * (PRD §2): a steward who signs in, sees their dashboard and leaves must not
 * leave their pages holding contributions. The dashboard used to bump the
 * clock but leave the status alone, so the hold outlived the activity that was
 * supposed to clear it.
 */
export async function touchStewardActivityForPages(
  pageIds: string[],
  userId: string,
  action: string,
) {
  await recordStewardActivity(pageIds, userId, action, null);
}

async function recordStewardActivity(
  pageIds: string[],
  userId: string,
  action: string,
  logPageId: string | null,
) {
  if (pageIds.length === 0) return;
  const supabase = createAdminClient();

  await supabase
    .from("pages")
    .update({ last_steward_activity_at: new Date().toISOString() })
    .in("id", pageIds);

  // Scoped to held pages so an active or frozen page is never touched — a
  // frozen page must stay frozen no matter who signs in.
  await supabase
    .from("pages")
    .update({ status: "active" })
    .in("id", pageIds)
    .eq("status", "inactivity_hold");

  await logEvent({ actorUserId: userId, pageId: logPageId, action });
}
