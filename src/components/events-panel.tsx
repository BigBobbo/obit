"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { EVENT_KINDS, eventKindLabel, formatEventTime, type EventRecord } from "@/lib/events";

export type StewardEvent = EventRecord & { rsvpCount: number; rsvpGuests: number };

type FormState = {
  kind: string;
  title: string;
  startsAtLocal: string;
  tz: string;
  venue: string;
  locality: string;
  mapUrl: string;
  livestreamUrl: string;
  notes: string;
  onAnnouncement: boolean;
  rsvpEnabled: boolean;
};

function emptyForm(): FormState {
  return {
    kind: "service",
    title: "",
    startsAtLocal: "",
    tz: Intl.DateTimeFormat().resolvedOptions().timeZone || "America/New_York",
    venue: "",
    locality: "",
    mapUrl: "",
    livestreamUrl: "",
    notes: "",
    onAnnouncement: true,
    rsvpEnabled: false,
  };
}

/**
 * Service details, the single most-asked-for thing in the funeral week
 * (PRD v2 §2.1).
 *
 * Two deliberate details: each event is marked public or memorial-only, so a
 * family can announce the church service without announcing the private
 * burial; and the venue help text warns about home addresses, because
 * publishing one next to a time the house will be empty is a known burglary
 * vector.
 */
export function EventsPanel({ pageId, events }: { pageId: string; events: StewardEvent[] }) {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function startEdit(event: StewardEvent) {
    setEditingId(event.id);
    setOpen(true);
    setForm({
      kind: event.kind,
      title: event.title,
      startsAtLocal: toLocalInput(event.starts_at, event.tz),
      tz: event.tz,
      venue: event.venue ?? "",
      locality: event.locality ?? "",
      mapUrl: event.map_url ?? "",
      livestreamUrl: event.livestream_url ?? "",
      notes: event.notes ?? "",
      onAnnouncement: event.on_announcement,
      rsvpEnabled: event.rsvp_enabled,
    });
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch(
        editingId ? `/api/events/${editingId}` : `/api/pages/${pageId}/events`,
        {
          method: editingId ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        },
      );
      const data = await res.json();
      if (res.ok) {
        setForm(emptyForm());
        setEditingId(null);
        setOpen(false);
        router.refresh();
      } else {
        setMessage(data.error ?? "Could not save that event.");
      }
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    if (!window.confirm("Remove this event? Any RSVPs for it are removed too.")) return;
    const res = await fetch(`/api/events/${id}`, { method: "DELETE" });
    if (res.ok) router.refresh();
  }

  return (
    <div className="space-y-4">
      {events.length === 0 && !open && (
        <p className="text-sm text-muted-foreground">
          No services added yet. Adding them is the single most useful thing you
          can do this week — it&apos;s what people open the page for.
        </p>
      )}

      {events.map((event) => (
        <article key={event.id} className="rounded-lg border border-border bg-card p-5">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            {eventKindLabel(event.kind)}
            {event.on_announcement ? " · public" : " · memorial only"}
          </p>
          <h3 className="mt-1 font-serif text-lg">{event.title}</h3>
          <p className="mt-1 text-sm">{formatEventTime(event)}</p>
          {(event.venue || event.locality) && (
            <p className="text-sm text-muted-foreground">
              {[event.venue, event.locality].filter(Boolean).join(", ")}
            </p>
          )}
          {event.rsvp_enabled && (
            <p className="mt-2 text-sm">
              <strong>{event.rsvpCount}</strong>{" "}
              {event.rsvpCount === 1 ? "reply" : "replies"} · {event.rsvpGuests}{" "}
              {event.rsvpGuests === 1 ? "person" : "people"} expected
            </p>
          )}
          <div className="mt-3 flex gap-2">
            <Button size="sm" variant="outline" onClick={() => startEdit(event)}>
              Edit
            </Button>
            <Button size="sm" variant="ghost" className="text-destructive" onClick={() => remove(event.id)}>
              Remove
            </Button>
          </div>
        </article>
      ))}

      {!open ? (
        <Button
          variant="outline"
          onClick={() => {
            setForm(emptyForm());
            setEditingId(null);
            setOpen(true);
          }}
        >
          Add a service
        </Button>
      ) : (
        <form onSubmit={submit} className="space-y-4 rounded-lg border border-border bg-card p-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="ev-kind">Kind</Label>
              <select
                id="ev-kind"
                value={form.kind}
                onChange={(e) => set("kind", e.target.value)}
                className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
              >
                {EVENT_KINDS.map((k) => (
                  <option key={k.value} value={k.value}>
                    {k.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="ev-title">Title</Label>
              <Input
                id="ev-title"
                required
                maxLength={200}
                value={form.title}
                onChange={(e) => set("title", e.target.value)}
                placeholder="Funeral service"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ev-start">Date and time</Label>
              <Input
                id="ev-start"
                type="datetime-local"
                required
                value={form.startsAtLocal}
                onChange={(e) => set("startsAtLocal", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ev-tz">Timezone</Label>
              <Input
                id="ev-tz"
                required
                value={form.tz}
                onChange={(e) => set("tz", e.target.value)}
                placeholder="America/New_York"
              />
              <p className="text-xs text-muted-foreground">
                The local time where it happens — everyone sees that hour.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="ev-venue">Venue</Label>
              <Input
                id="ev-venue"
                maxLength={200}
                value={form.venue}
                onChange={(e) => set("venue", e.target.value)}
                placeholder="St Anne's Church"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ev-locality">Town</Label>
              <Input
                id="ev-locality"
                maxLength={200}
                value={form.locality}
                onChange={(e) => set("locality", e.target.value)}
                placeholder="Rye, NY"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ev-map">Map link</Label>
              <Input
                id="ev-map"
                maxLength={2000}
                value={form.mapUrl}
                onChange={(e) => set("mapUrl", e.target.value)}
                placeholder="https://maps.example.com/…"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ev-stream">Livestream link</Label>
              <Input
                id="ev-stream"
                maxLength={2000}
                value={form.livestreamUrl}
                onChange={(e) => set("livestreamUrl", e.target.value)}
                placeholder="https://…"
              />
            </div>
          </div>

          <p className="rounded-md bg-muted p-3 text-xs text-muted-foreground">
            <strong>A note on addresses.</strong> Venue name and town is enough.
            Publishing a home address next to the hour everyone will be at the
            funeral is a well-known way for a house to be burgled.
          </p>

          <div className="space-y-2">
            <Label htmlFor="ev-notes">Notes</Label>
            <Textarea
              id="ev-notes"
              maxLength={1000}
              rows={2}
              value={form.notes}
              onChange={(e) => set("notes", e.target.value)}
              placeholder="“Please wear something colourful.”"
            />
          </div>

          <label className="flex items-start gap-3 text-sm">
            <input
              type="checkbox"
              className="mt-0.5"
              checked={form.onAnnouncement}
              onChange={(e) => set("onAnnouncement", e.target.checked)}
            />
            <span>
              <strong>Show on the public announcement</strong> — uncheck for
              something private, like a family-only burial.
            </span>
          </label>

          <label className="flex items-start gap-3 text-sm">
            <input
              type="checkbox"
              className="mt-0.5"
              checked={form.rsvpEnabled}
              onChange={(e) => set("rsvpEnabled", e.target.checked)}
            />
            <span>
              <strong>Ask people to say they&apos;re coming</strong> — a head
              count only you can see.
            </span>
          </label>

          {message && <p className="text-sm text-destructive">{message}</p>}
          <div className="flex gap-2">
            <Button type="submit" disabled={busy}>
              {busy ? "Saving…" : editingId ? "Save changes" : "Add the service"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setOpen(false);
                setEditingId(null);
              }}
            >
              Cancel
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}

/**
 * An instant back into the `datetime-local` shape, expressed in the event's own
 * timezone — otherwise editing an event from a different country silently
 * shifts it.
 */
function toLocalInput(iso: string, tz: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  try {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: tz,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    }).formatToParts(date);
    const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
    return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}`;
  } catch {
    return date.toISOString().slice(0, 16);
  }
}
