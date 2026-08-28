import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { touchStewardActivity } from "@/lib/audit";
import { eventSchema, eventUpdates } from "@/lib/event-input";

async function requireStewardOfEvent(eventId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: NextResponse.json({ error: "Not signed in" }, { status: 401 }) };

  const admin = createAdminClient();
  const { data: event } = await admin
    .from("events")
    .select("id, page_id")
    .eq("id", eventId)
    .maybeSingle();
  if (!event) return { error: NextResponse.json({ error: "Not found" }, { status: 404 }) };

  const { data: steward } = await admin
    .from("stewards")
    .select("id")
    .eq("page_id", event.page_id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!steward) {
    return { error: NextResponse.json({ error: "Not a steward of this page" }, { status: 403 }) };
  }
  return { user, admin, pageId: event.page_id as string };
}

export async function PATCH(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const auth = await requireStewardOfEvent(id);
  if ("error" in auth) return auth.error;

  const body = await request.json().catch(() => null);
  const parsed = eventSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  const updates = eventUpdates(parsed.data);
  if (!updates) {
    return NextResponse.json({ error: "That date, time or timezone isn't valid." }, { status: 400 });
  }

  const { error } = await auth.admin.from("events").update(updates).eq("id", id);
  if (error) return NextResponse.json({ error: "Could not save that event." }, { status: 500 });

  await touchStewardActivity(auth.pageId, auth.user.id, "event_updated");
  return NextResponse.json({ ok: true });
}

/** Deleting an event takes its RSVPs with it (cascade) — nobody keeps a
 * guest list for a service that was cancelled. */
export async function DELETE(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const auth = await requireStewardOfEvent(id);
  if ("error" in auth) return auth.error;

  const { error } = await auth.admin.from("events").delete().eq("id", id);
  if (error) return NextResponse.json({ error: "Could not remove that event." }, { status: 500 });

  await touchStewardActivity(auth.pageId, auth.user.id, "event_deleted");
  return NextResponse.json({ ok: true });
}
