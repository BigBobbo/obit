/**
 * Service & event block (PRD v2 §2.1).
 *
 * The funeral week is the only time a memorial circulates widely, and what
 * people need in that week is *when and where*. But the page has to outlive
 * that week: once an event has passed it stops leading and collapses into a
 * single quiet line, so a memorial doesn't spend year two shouting about a
 * funeral that happened in year one.
 */

export type EventKind = "visitation" | "service" | "burial" | "celebration" | "other";

export type EventRecord = {
  id: string;
  kind: string;
  title: string;
  starts_at: string;
  tz: string;
  venue: string | null;
  locality: string | null;
  map_url: string | null;
  livestream_url: string | null;
  notes: string | null;
  on_announcement: boolean;
  rsvp_enabled: boolean;
};

export const EVENT_KINDS: { value: EventKind; label: string }[] = [
  { value: "visitation", label: "Visitation" },
  { value: "service", label: "Service" },
  { value: "burial", label: "Burial" },
  { value: "celebration", label: "Celebration of life" },
  { value: "other", label: "Other" },
];

export function eventKindLabel(kind: string): string {
  return EVENT_KINDS.find((k) => k.value === kind)?.label ?? "Event";
}

/**
 * Upcoming events lead; past ones recede. An event is "upcoming" until it has
 * been over for a few hours, so nobody standing in the car park watches the
 * service they are attending drop off the page.
 */
const GRACE_MS = 4 * 60 * 60 * 1000;

export function partitionEvents(
  events: EventRecord[],
  now: Date = new Date(),
): { upcoming: EventRecord[]; past: EventRecord[] } {
  const upcoming: EventRecord[] = [];
  const past: EventRecord[] = [];
  for (const e of events) {
    const starts = new Date(e.starts_at).getTime();
    if (Number.isNaN(starts) || starts + GRACE_MS >= now.getTime()) upcoming.push(e);
    else past.push(e);
  }
  upcoming.sort((a, b) => a.starts_at.localeCompare(b.starts_at));
  past.sort((a, b) => b.starts_at.localeCompare(a.starts_at));
  return { upcoming, past };
}

/**
 * A funeral happens in one place, at one local time. Rendering it in the
 * reader's timezone would tell the half of the family who moved away the wrong
 * hour, so every event is formatted in the timezone the steward entered.
 */
export function formatEventTime(event: Pick<EventRecord, "starts_at" | "tz">): string {
  const date = new Date(event.starts_at);
  if (Number.isNaN(date.getTime())) return "";
  try {
    return new Intl.DateTimeFormat("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      timeZoneName: "short",
      timeZone: event.tz,
    }).format(date);
  } catch {
    // An unknown zone must not blank the one line people came for.
    return new Intl.DateTimeFormat("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      timeZone: "UTC",
      timeZoneName: "short",
    }).format(date);
  }
}

export function formatEventDate(event: Pick<EventRecord, "starts_at" | "tz">): string {
  const date = new Date(event.starts_at);
  if (Number.isNaN(date.getTime())) return "";
  const options: Intl.DateTimeFormatOptions = {
    month: "long",
    day: "numeric",
    year: "numeric",
  };
  try {
    return new Intl.DateTimeFormat("en-US", { ...options, timeZone: event.tz }).format(date);
  } catch {
    return new Intl.DateTimeFormat("en-US", { ...options, timeZone: "UTC" }).format(date);
  }
}

export function eventPlace(event: Pick<EventRecord, "venue" | "locality">): string {
  return [event.venue, event.locality].filter(Boolean).join(", ");
}

/** The quiet line a passed service collapses into. */
export function pastEventsSummary(past: EventRecord[]): string {
  if (past.length === 0) return "";
  const dates = [...new Set(past.map((e) => formatEventDate(e)).filter(Boolean))];
  if (dates.length === 1) return `Services were held on ${dates[0]}.`;
  return `Services were held on ${dates.slice(0, -1).join(", ")} and ${dates[dates.length - 1]}.`;
}

// ---------------------------------------------------------------------------
// .ics
// ---------------------------------------------------------------------------

const ICS_DEFAULT_DURATION = "PT1H";

function icsEscape(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

function icsStamp(date: Date): string {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

/** RFC 5545 wants lines folded at 75 octets; Outlook actually enforces it. */
function fold(line: string): string {
  const bytes = Buffer.from(line, "utf8");
  if (bytes.length <= 75) return line;
  const chunks: string[] = [];
  let start = 0;
  while (start < bytes.length) {
    const limit = start === 0 ? 75 : 74;
    let end = Math.min(start + limit, bytes.length);
    // Never split a multi-byte character across a fold.
    while (end > start && end < bytes.length && (bytes[end] & 0xc0) === 0x80) end--;
    chunks.push((start === 0 ? "" : " ") + bytes.subarray(start, end).toString("utf8"));
    start = end;
  }
  return chunks.join("\r\n");
}

/**
 * A single-event calendar file. Elder-friendly and cheap: "add to calendar" is
 * one tap on every phone and every desktop mail client, with no account and no
 * reminder machinery of ours to maintain.
 */
export function buildIcs(
  event: EventRecord,
  opts: { pageName: string; url?: string; now?: Date },
): string {
  const start = new Date(event.starts_at);
  const place = eventPlace(event);
  const description = [event.notes, event.livestream_url ? `Livestream: ${event.livestream_url}` : null]
    .filter(Boolean)
    .join("\n");

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Memorial Pages//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${event.id}@memorial-pages`,
    `DTSTAMP:${icsStamp(opts.now ?? new Date())}`,
    `DTSTART:${icsStamp(start)}`,
    `DURATION:${ICS_DEFAULT_DURATION}`,
    `SUMMARY:${icsEscape(`${event.title} — ${opts.pageName}`)}`,
    place ? `LOCATION:${icsEscape(place)}` : null,
    description ? `DESCRIPTION:${icsEscape(description)}` : null,
    opts.url ? `URL:${icsEscape(opts.url)}` : null,
    "END:VEVENT",
    "END:VCALENDAR",
  ].filter((l): l is string => l !== null);

  return lines.map(fold).join("\r\n") + "\r\n";
}

/**
 * A map link is a convenience, not an invitation to inject a redirect: only
 * plain http(s) URLs survive.
 */
export function safeExternalUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" || parsed.protocol === "http:" ? parsed.toString() : null;
  } catch {
    return null;
  }
}

/** The one-line "next service" the share card and the announcement lead with. */
export function nextServiceLine(events: EventRecord[], now?: Date): string | null {
  const next = partitionEvents(events, now).upcoming[0];
  if (!next) return null;
  const place = eventPlace(next);
  return `${next.title} · ${formatEventTime(next)}${place ? ` · ${place}` : ""}`;
}
