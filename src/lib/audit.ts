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
  const supabase = createAdminClient();
  await supabase
    .from("pages")
    .update({ last_steward_activity_at: new Date().toISOString() })
    .eq("id", pageId);
  const { data: page } = await supabase
    .from("pages")
    .select("status")
    .eq("id", pageId)
    .single();
  if (page?.status === "inactivity_hold") {
    await supabase.from("pages").update({ status: "active" }).eq("id", pageId);
  }
  await logEvent({ actorUserId: userId, pageId, action });
}
