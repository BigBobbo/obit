import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { touchStewardActivity } from "@/lib/audit";
import { eventSchema, eventUpdates } from "@/lib/event-input";

const MAX_EVENTS_PER_PAGE = 20;

export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const body = await request.json().catch(() => null);
  const parsed = eventSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const admin = createAdminClient();
  const { data: steward } = await admin
    .from("stewards")
    .select("id")
    .eq("page_id", id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!steward) {
    return NextResponse.json({ error: "Not a steward of this page" }, { status: 403 });
  }

  const { count } = await admin
    .from("events")
    .select("id", { count: "exact", head: true })
    .eq("page_id", id);
  if ((count ?? 0) >= MAX_EVENTS_PER_PAGE) {
    return NextResponse.json(
      { error: `A page can hold ${MAX_EVENTS_PER_PAGE} events.` },
      { status: 403 },
    );
  }

  const updates = eventUpdates(parsed.data);
  if (!updates) {
    return NextResponse.json({ error: "That date, time or timezone isn't valid." }, { status: 400 });
  }

  const { error } = await admin.from("events").insert({ page_id: id, ...updates });
  if (error) {
    console.error("event insert failed", error);
    return NextResponse.json({ error: "Could not save that event." }, { status: 500 });
  }

  await touchStewardActivity(id, user.id, "event_created");
  return NextResponse.json({ ok: true });
}
