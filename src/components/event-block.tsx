import { RsvpForm } from "@/components/rsvp-form";
import {
  eventKindLabel,
  eventPlace,
  formatEventTime,
  partitionEvents,
  pastEventsSummary,
  safeExternalUrl,
  type EventRecord,
} from "@/lib/events";

/**
 * Services on the announcement and on the memorial (PRD v2 §2.1).
 *
 * Upcoming events lead. Past ones collapse into one quiet line, because the
 * page has to outlive its funeral-week shape — a memorial still headlining a
 * service from three years ago is a memorial nobody visits twice.
 */
export function EventBlock({
  events,
  heading = "Services",
  now,
}: {
  events: EventRecord[];
  heading?: string;
  now?: Date;
}) {
  if (events.length === 0) return null;
  const { upcoming, past } = partitionEvents(events, now);

  return (
    <section className="mt-10">
      <h2 className="font-serif text-2xl">{heading}</h2>
      <div className="mt-4 space-y-4">
        {upcoming.map((event) => {
          const place = eventPlace(event);
          const mapUrl = safeExternalUrl(event.map_url);
          const livestream = safeExternalUrl(event.livestream_url);
          return (
            <article key={event.id} className="rounded-lg border border-border bg-card p-5">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                {eventKindLabel(event.kind)}
              </p>
              <h3 className="mt-1 font-serif text-xl">{event.title}</h3>
              <p className="mt-2 text-base">{formatEventTime(event)}</p>
              {place && <p className="mt-1 text-base text-muted-foreground">{place}</p>}
              {event.notes && (
                <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">{event.notes}</p>
              )}
              <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-sm">
                <a className="underline" href={`/api/events/${event.id}/ics`}>
                  Add to calendar
                </a>
                {mapUrl && (
                  <a className="underline" href={mapUrl} target="_blank" rel="noopener noreferrer nofollow">
                    Map
                  </a>
                )}
                {livestream && (
                  <a className="underline" href={livestream} target="_blank" rel="noopener noreferrer nofollow">
                    Watch online
                  </a>
                )}
              </div>
              {event.rsvp_enabled && <RsvpForm eventId={event.id} />}
            </article>
          );
        })}
      </div>

      {past.length > 0 && (
        <p className="mt-4 text-sm text-muted-foreground">{pastEventsSummary(past)}</p>
      )}
    </section>
  );
}
