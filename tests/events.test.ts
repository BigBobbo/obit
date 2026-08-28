import { describe, expect, it } from "vitest";
import {
  buildIcs,
  formatEventTime,
  nextServiceLine,
  partitionEvents,
  pastEventsSummary,
  safeExternalUrl,
  type EventRecord,
} from "@/lib/events";
import { toInstant } from "@/lib/event-input";
import { parseEmailList } from "@/lib/utils";

function event(overrides: Partial<EventRecord> = {}): EventRecord {
  return {
    id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
    kind: "service",
    title: "Funeral service",
    starts_at: "2026-09-02T15:00:00.000Z",
    tz: "America/New_York",
    venue: "St Anne's",
    locality: "Rye, NY",
    map_url: null,
    livestream_url: null,
    notes: null,
    on_announcement: true,
    rsvp_enabled: false,
    ...overrides,
  };
}

describe("events recede after they pass", () => {
  const now = new Date("2026-09-10T12:00:00Z");

  it("splits upcoming from past, soonest first and most recent first", () => {
    const soon = event({ id: "soon", starts_at: "2026-09-12T15:00:00.000Z" });
    const later = event({ id: "later", starts_at: "2026-09-20T15:00:00.000Z" });
    const gone = event({ id: "gone", starts_at: "2026-09-01T15:00:00.000Z" });
    const older = event({ id: "older", starts_at: "2026-08-28T15:00:00.000Z" });

    const { upcoming, past } = partitionEvents([later, gone, soon, older], now);
    expect(upcoming.map((e) => e.id)).toEqual(["soon", "later"]);
    expect(past.map((e) => e.id)).toEqual(["gone", "older"]);
  });

  /** Nobody standing in the car park should watch the service drop off. */
  it("keeps an event that has only just started", () => {
    const started = event({ starts_at: "2026-09-10T10:00:00.000Z" });
    expect(partitionEvents([started], now).upcoming).toHaveLength(1);
  });

  it("collapses past services into one quiet line", () => {
    const a = event({ id: "a", starts_at: "2026-09-01T15:00:00.000Z" });
    const b = event({ id: "b", starts_at: "2026-08-28T15:00:00.000Z" });
    expect(pastEventsSummary([a])).toBe("Services were held on September 1, 2026.");
    expect(pastEventsSummary([a, b])).toBe(
      "Services were held on September 1, 2026 and August 28, 2026.",
    );
    expect(pastEventsSummary([])).toBe("");
  });

  it("leads with the next service on the share card", () => {
    const soon = event({ id: "soon", title: "Visitation", starts_at: "2026-09-12T15:00:00.000Z" });
    const later = event({ id: "later", starts_at: "2026-09-20T15:00:00.000Z" });
    expect(nextServiceLine([later, soon], now)).toContain("Visitation");
    expect(nextServiceLine([], now)).toBeNull();
  });
});

describe("event times are the venue's local time", () => {
  it("formats in the event's timezone, not the reader's", () => {
    const formatted = formatEventTime(event());
    expect(formatted).toContain("11:00");
    expect(formatted).toContain("September 2, 2026");
  });

  it("falls back to UTC rather than blanking the one line people came for", () => {
    expect(formatEventTime(event({ tz: "Not/AZone" }))).toContain("September 2, 2026");
  });

  it("turns a steward's wall time into the right instant, DST included", () => {
    // 11:00 in New York is 15:00 UTC in September (EDT, UTC-4) …
    expect(toInstant("2026-09-02T11:00", "America/New_York")).toBe("2026-09-02T15:00:00.000Z");
    // … and 16:00 UTC in January (EST, UTC-5).
    expect(toInstant("2026-01-02T11:00", "America/New_York")).toBe("2026-01-02T16:00:00.000Z");
    expect(toInstant("2026-09-02T11:00", "UTC")).toBe("2026-09-02T11:00:00.000Z");
  });

  it("refuses a time or zone it cannot make sense of", () => {
    expect(toInstant("not-a-date", "America/New_York")).toBeNull();
    expect(toInstant("2026-09-02T11:00", "Not/AZone")).toBeNull();
  });
});

describe(".ics", () => {
  it("carries the event, the person and the place", () => {
    const ics = buildIcs(event(), {
      pageName: "Eleanor M. Hartley",
      url: "https://example.com/m/Demo7pageXyz",
      now: new Date("2026-08-28T12:00:00Z"),
    });
    expect(ics).toContain("BEGIN:VCALENDAR");
    expect(ics).toContain("DTSTART:20260902T150000Z");
    expect(ics).toContain("Funeral service");
    expect(ics).toContain("END:VCALENDAR");
    expect(ics.endsWith("\r\n")).toBe(true);
  });

  it("escapes the characters that would otherwise break the file", () => {
    const ics = buildIcs(event({ venue: "St Anne's, Rye; the old church", locality: null }), {
      pageName: "A, B",
      now: new Date("2026-08-28T12:00:00Z"),
    });
    expect(ics).toContain("LOCATION:St Anne's\\, Rye\\; the old church");
    expect(ics).toContain("SUMMARY:Funeral service — A\\, B");
  });

  it("folds long lines, because Outlook enforces the 75-octet limit", () => {
    const ics = buildIcs(event({ notes: "x".repeat(200) }), {
      pageName: "Eleanor M. Hartley",
      now: new Date("2026-08-28T12:00:00Z"),
    });
    for (const line of ics.split("\r\n")) {
      expect(Buffer.from(line, "utf8").length).toBeLessThanOrEqual(75);
    }
    // Unfolding (drop CRLF + one leading space) must give the text back.
    expect(ics.replace(/\r\n /g, "")).toContain("x".repeat(200));
  });
});

describe("links a steward pastes in", () => {
  it("keeps ordinary web links and drops everything else", () => {
    expect(safeExternalUrl("https://maps.example.com/a")).toBe("https://maps.example.com/a");
    expect(safeExternalUrl("http://maps.example.com/a")).toBe("http://maps.example.com/a");
    expect(safeExternalUrl("javascript:alert(1)")).toBeNull();
    expect(safeExternalUrl("data:text/html,<script>")).toBeNull();
    expect(safeExternalUrl("not a url")).toBeNull();
    expect(safeExternalUrl(null)).toBeNull();
  });
});

describe("the pre-approval paste box", () => {
  it("pulls addresses out of whatever the family pasted", () => {
    expect(
      parseEmailList("Anna <ANNA@example.com>, joe@example.com;  mary@example.com\nnot-an-email"),
    ).toEqual(["anna@example.com", "joe@example.com", "mary@example.com"]);
  });

  it("de-duplicates and survives an empty paste", () => {
    expect(parseEmailList("a@example.com a@example.com")).toEqual(["a@example.com"]);
    expect(parseEmailList("   ")).toEqual([]);
  });

  it("caps a runaway paste", () => {
    const many = Array.from({ length: 500 }, (_, i) => `p${i}@example.com`).join("\n");
    expect(parseEmailList(many)).toHaveLength(200);
  });
});
