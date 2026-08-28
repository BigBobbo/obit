import { createAdminClient } from "@/lib/supabase/admin";
import { ACCESS_COLUMNS, type AccessPage } from "@/lib/access";
import type { EventRecord } from "@/lib/events";

export const EVENT_COLUMNS =
  "id, page_id, kind, title, starts_at, tz, venue, locality, map_url, livestream_url, notes, on_announcement, rsvp_enabled";

export type LoadedEvent = {
  event: EventRecord & { page_id: string };
  page: AccessPage & { name: string; status: string };
};

/** One lookup for every route that acts on a single event. */
export async function loadEvent(eventId: string): Promise<LoadedEvent | null> {
  const admin = createAdminClient();
  const { data: event } = await admin
    .from("events")
    .select(EVENT_COLUMNS)
    .eq("id", eventId)
    .maybeSingle<EventRecord & { page_id: string }>();
  if (!event) return null;

  const { data: page } = await admin
    .from("pages")
    .select(`id, random_id, name, status, ${ACCESS_COLUMNS}`)
    .eq("id", event.page_id)
    .maybeSingle<AccessPage & { name: string; status: string }>();
  if (!page || page.status === "soft_deleted") return null;

  return { event, page };
}
