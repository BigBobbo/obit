import { z } from "zod";
import { safeExternalUrl } from "@/lib/events";

/**
 * The shape of a steward's event form (PRD v2 §2.1), and the timezone
 * arithmetic behind it. Kept out of the route so it can be tested without a
 * request.
 */
export const eventSchema = z.object({
  kind: z.enum(["visitation", "service", "burial", "celebration", "other"]),
  title: z.string().trim().min(1).max(200),
  // Local wall time from a datetime-local input, plus the zone it belongs to.
  startsAtLocal: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/),
  tz: z.string().trim().min(1).max(100),
  venue: z.string().trim().max(200).optional(),
  locality: z.string().trim().max(200).optional(),
  mapUrl: z.string().trim().max(2000).optional(),
  livestreamUrl: z.string().trim().max(2000).optional(),
  notes: z.string().trim().max(1000).optional(),
  onAnnouncement: z.boolean().default(true),
  rsvpEnabled: z.boolean().default(false),
});

export type EventInput = z.infer<typeof eventSchema>;

/**
 * A funeral is a local event: the steward types the wall time where it happens
 * and names the zone. Storing the resulting instant means everyone sees the
 * same moment, and formatting it back in `tz` means everyone reads the local
 * hour the family meant.
 */
export function toInstant(localWallTime: string, tz: string): string | null {
  const naive = localWallTime.length === 16 ? `${localWallTime}:00` : localWallTime;
  const asUtc = new Date(`${naive}Z`);
  if (Number.isNaN(asUtc.getTime())) return null;

  let offset: number;
  try {
    // What clock does `tz` show at that instant? The difference is the offset
    // to subtract to turn the wall time into a real instant.
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
    }).formatToParts(asUtc);
    const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
    const shown = Date.UTC(
      get("year"),
      get("month") - 1,
      get("day"),
      get("hour"),
      get("minute"),
      get("second"),
    );
    offset = shown - asUtc.getTime();
  } catch {
    return null;
  }

  // One correction pass settles every case except a wall time inside a DST
  // gap, where any answer is a guess and the later one is the safer guess.
  return new Date(asUtc.getTime() - offset).toISOString();
}

export function eventUpdates(input: EventInput) {
  const startsAt = toInstant(input.startsAtLocal, input.tz);
  if (!startsAt) return null;
  return {
    kind: input.kind,
    title: input.title,
    starts_at: startsAt,
    tz: input.tz,
    venue: input.venue || null,
    locality: input.locality || null,
    map_url: safeExternalUrl(input.mapUrl) ?? null,
    livestream_url: safeExternalUrl(input.livestreamUrl) ?? null,
    notes: input.notes || null,
    on_announcement: input.onAnnouncement,
    rsvp_enabled: input.rsvpEnabled,
  };
}

