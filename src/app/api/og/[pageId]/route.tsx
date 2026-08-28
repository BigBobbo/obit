import { ImageResponse } from "next/og";
import { createAdminClient } from "@/lib/supabase/admin";
import { ACCESS_COLUMNS, isGated, type AccessPage } from "@/lib/access";
import { publicPhotoUrl } from "@/lib/images";
import { nextServiceLine, type EventRecord } from "@/lib/events";
import { formatDate } from "@/lib/utils";

export const runtime = "nodejs";

/**
 * The share card image (PRD v2 §2.2).
 *
 * Every platform's scraper fetches this with no cookie, so it may contain
 * **only announcement-safe content**: portrait, name, dates, and the next
 * announcement-visible service. Never a memory, never a contributed photo —
 * which is also Phase 1 acceptance criterion 3, and the reason this route reads
 * the same announcement fields the announcement view does rather than the page
 * as a whole.
 *
 * A gated page whose family has not turned the announcement on gets a card with
 * no name at all: if they didn't publish a doorway, we don't print one.
 */
const WIDTH = 1200;
const HEIGHT = 630;

const INK = "#242a26";
const STONE = "#69736c";
const GROUND = "#f2f3ef";

export async function GET(_request: Request, ctx: { params: Promise<{ pageId: string }> }) {
  const { pageId } = await ctx.params;

  const admin = createAdminClient();
  const { data: page } = await admin
    .from("pages")
    .select(
      `id, name, date_of_birth, date_of_death, cover_photo_path, status, ${ACCESS_COLUMNS}`,
    )
    .eq("id", pageId)
    .maybeSingle<
      AccessPage & {
        name: string;
        date_of_birth: string;
        date_of_death: string;
        cover_photo_path: string | null;
        status: string;
      }
    >();

  const visible =
    page &&
    ["active", "inactivity_hold"].includes(page.status) &&
    (!isGated(page) || page.announcement_enabled);

  if (!visible) return renderCard({});

  let service: string | null = null;
  if (page.announcement_enabled) {
    const { data: events } = await admin
      .from("events")
      .select(
        "id, kind, title, starts_at, tz, venue, locality, map_url, livestream_url, notes, on_announcement, rsvp_enabled",
      )
      .eq("page_id", page.id)
      .eq("on_announcement", true)
      .order("starts_at", { ascending: true });
    service = nextServiceLine((events ?? []) as EventRecord[]);
  }

  return renderCard({
    name: page.name,
    dates: `${formatDate(page.date_of_birth)} — ${formatDate(page.date_of_death)}`,
    portrait: await fetchPortrait(page.cover_photo_path),
    service,
  });
}

/**
 * The portrait is fetched here rather than handed to the renderer as a URL: a
 * fetch that fails inside ImageResponse throws and takes the whole card with
 * it, and a scraper that gets a 500 shows a bare link.
 */
async function fetchPortrait(path: string | null): Promise<string | null> {
  if (!path) return null;
  try {
    const res = await fetch(publicPhotoUrl(path), { signal: AbortSignal.timeout(3000) });
    if (!res.ok) return null;
    const buffer = Buffer.from(await res.arrayBuffer());
    if (buffer.byteLength > 4 * 1024 * 1024) return null;
    return `data:${res.headers.get("content-type") ?? "image/jpeg"};base64,${buffer.toString("base64")}`;
  } catch {
    return null;
  }
}

function renderCard(card: {
  name?: string;
  dates?: string;
  portrait?: string | null;
  service?: string | null;
}) {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          gap: 56,
          padding: 80,
          background: GROUND,
          color: INK,
          fontFamily: "serif",
        }}
      >
        {card.portrait ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={card.portrait}
            alt=""
            width={320}
            height={320}
            style={{ width: 320, height: 320, borderRadius: 320, objectFit: "cover" }}
          />
        ) : null}
        <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
          <div style={{ fontSize: 26, letterSpacing: 4, textTransform: "uppercase", color: STONE }}>
            In memory of
          </div>
          <div style={{ fontSize: card.name ? 72 : 48, marginTop: 16, lineHeight: 1.1 }}>
            {card.name ?? "A memorial page"}
          </div>
          {card.dates ? (
            <div style={{ fontSize: 34, marginTop: 20, color: STONE }}>{card.dates}</div>
          ) : null}
          {card.service ? (
            <div style={{ fontSize: 28, marginTop: 28, color: INK }}>{card.service}</div>
          ) : null}
        </div>
      </div>
    ),
    {
      width: WIDTH,
      height: HEIGHT,
      headers: {
        // Announcement content only, so a shared cache is safe. The URL in the
        // page metadata carries a version, so a long TTL never serves a stale
        // card for an edited page.
        "Cache-Control": "public, max-age=3600, s-maxage=3600",
        "X-Robots-Tag": "noindex, nofollow, noarchive",
      },
    },
  );
}
