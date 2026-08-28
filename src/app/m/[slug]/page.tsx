import type { Metadata } from "next";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { publicPhotoUrl } from "@/lib/images";
import { findPageByRef } from "@/lib/pages";
import { formatDate } from "@/lib/utils";
import { ACCESS_COLUMNS, isGated, type AccessPage } from "@/lib/access";
import { resolveAccess } from "@/lib/access-server";
import { nextServiceLine, type EventRecord } from "@/lib/events";
import { AccessGate } from "@/components/access-gate";
import { EventBlock } from "@/components/event-block";
import { ShareSheet } from "@/components/share-sheet";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ access?: string }>;
};

const PAGE_COLUMNS = `id, random_id, slug, name, date_of_birth, date_of_death, bio,
  cover_photo_path, status, announcement_text, ${ACCESS_COLUMNS}`;

type PageRecord = AccessPage & {
  slug: string | null;
  name: string;
  date_of_birth: string;
  date_of_death: string;
  bio: string;
  cover_photo_path: string | null;
  status: string;
  announcement_text: string;
};

const EVENT_COLUMNS =
  "id, kind, title, starts_at, tz, venue, locality, map_url, livestream_url, notes, on_announcement, rsvp_enabled";

async function loadPage(slug: string) {
  const supabase = await createClient();
  return findPageByRef<PageRecord>(supabase, slug, PAGE_COLUMNS);
}

function appUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
}

/**
 * Every memorial is unlisted: noindex/nofollow everywhere, in every mode
 * (PRD §2, §4.1; PRD v2 §1.2 keeps it that way — the share card's job is
 * WhatsApp, not search).
 *
 * What Open Graph exposes is exactly what the announcement exposes, and no
 * more: name, dates, portrait. A gated page whose family never turned the
 * announcement on gets a card with no name on it at all.
 */
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const page = await loadPage(slug);
  const robots = { index: false, follow: false, noarchive: true };
  if (!page) return { robots: { index: false, follow: false } };

  const announcementSafe = !isGated(page) || page.announcement_enabled;
  if (!announcementSafe) {
    return { title: "A memorial page", robots };
  }

  return {
    title: `In memory of ${page.name}`,
    robots,
    openGraph: {
      title: `In memory of ${page.name}`,
      description: `${formatDate(page.date_of_birth)} — ${formatDate(page.date_of_death)}`,
      images: [`${appUrl()}/api/og/${page.id}`],
    },
  };
}

export default async function MemorialPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { access: accessNotice } = await searchParams;
  const page = await loadPage(slug);
  if (!page) {
    // Could be a frozen/deleted page (hidden by RLS) — check via the public
    // "frozen marker": we deliberately 404 soft-deleted pages but show the
    // neutral message for frozen ones, which requires a service-side peek.
    return await frozenOrNotFound(slug);
  }

  // Custom slugs redirect to the canonical random_id URL so the QR target
  // never changes (PRD §4.4).
  if (slug !== page.random_id) {
    permanentRedirect(`/m/${page.random_id}`);
  }

  const { viewer, access } = await resolveAccess(page);

  if (access.view === "full") {
    return <FullMemorial page={page} steward={viewer.steward} />;
  }
  return (
    <GatedMemorial
      page={page}
      view={access.view}
      gate={access.gate}
      accessNotice={accessNotice}
    />
  );
}

// ---------------------------------------------------------------------------
// The memorial itself
// ---------------------------------------------------------------------------

async function FullMemorial({ page, steward }: { page: PageRecord; steward: boolean }) {
  // On a gated page the anon key returns nothing (RLS, migration 0005), so the
  // read runs with the service role *after* access has been settled above.
  const reader = isGated(page) ? createAdminClient() : await createClient();

  const [{ data: memories }, { data: events }] = await Promise.all([
    reader
      .from("memories")
      .select("id, contributor_name, body, created_at, photos(id, sizes)")
      .eq("page_id", page.id)
      .eq("status", "approved")
      .order("created_at", { ascending: false })
      .limit(200),
    reader.from("events").select(EVENT_COLUMNS).eq("page_id", page.id),
  ]);

  const gated = isGated(page);
  const url = `${appUrl()}/m/${page.random_id}`;

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <header className="text-center">
        {page.cover_photo_path && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={publicPhotoUrl(page.cover_photo_path)}
            alt={`Photo of ${page.name}`}
            className="mx-auto mb-6 h-44 w-44 rounded-full object-cover shadow"
          />
        )}
        <h1 className="font-serif text-4xl">{page.name}</h1>
        <p className="mt-2 text-muted-foreground">
          {formatDate(page.date_of_birth)} — {formatDate(page.date_of_death)}
        </p>
      </header>

      {page.bio && (
        <section className="mt-8 whitespace-pre-wrap font-serif text-lg leading-relaxed">
          {page.bio}
        </section>
      )}

      <EventBlock events={(events ?? []) as EventRecord[]} />

      <div className="mt-10 text-center">
        <Button asChild size="lg">
          <Link href={`/m/${page.random_id}/share`}>Share a memory</Link>
        </Button>
      </div>

      <section className="mt-12 space-y-8">
        <h2 className="font-serif text-2xl">Memories</h2>
        {(memories ?? []).length === 0 && (
          <p className="text-muted-foreground">
            No memories have been shared yet. Be the first.
          </p>
        )}
        {(memories ?? []).map((m) => (
          <article key={m.id} className="rounded-lg border border-border bg-card p-6">
            {m.body && <p className="whitespace-pre-wrap font-serif leading-relaxed">{m.body}</p>}
            {m.photos && m.photos.length > 0 && (
              <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
                {m.photos.map((p) => {
                  const src = memoryPhotoSrc(page, p.id as string, p.sizes as PhotoSizes);
                  if (!src) return null;
                  return (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      key={p.id}
                      src={src}
                      alt=""
                      loading="lazy"
                      className="aspect-square rounded-md object-cover"
                    />
                  );
                })}
              </div>
            )}
            <footer className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
              <span>— {m.contributor_name}</span>
              <Link
                href={`/m/${page.random_id}/report?memory=${m.id}`}
                className="text-xs underline opacity-60 hover:opacity-100"
              >
                Report
              </Link>
            </footer>
          </article>
        ))}
      </section>

      <section className="mt-14 rounded-lg border border-border bg-card p-6">
        <h2 className="font-serif text-xl">Share this page</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {gated
            ? "Anyone you send this to will still need the family's permission to read the memories."
            : "Anyone with this link can read the memories, so share it with people the family would welcome."}
        </p>
        <div className="mt-4">
          <ShareSheet
            url={url}
            pageName={page.name}
            nextService={nextServiceLine((events ?? []) as EventRecord[])}
            codeEntry={steward && page.access_mode === "code"}
          />
        </div>
      </section>

      <PageFooter randomId={page.random_id} />
    </main>
  );
}

// ---------------------------------------------------------------------------
// The doorway
// ---------------------------------------------------------------------------

async function GatedMemorial({
  page,
  view,
  gate,
  accessNotice,
}: {
  page: PageRecord;
  view: "announcement" | "gate";
  gate: "code" | "request";
  accessNotice?: string;
}) {
  const announcement = view === "announcement";
  const admin = createAdminClient();
  const { data: events } = announcement
    ? await admin
        .from("events")
        .select(EVENT_COLUMNS)
        .eq("page_id", page.id)
        .eq("on_announcement", true)
    : { data: [] };

  const url = `${appUrl()}/m/${page.random_id}`;

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      {announcement ? (
        <header className="text-center">
          {page.cover_photo_path && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={publicPhotoUrl(page.cover_photo_path)}
              alt={`Photo of ${page.name}`}
              className="mx-auto mb-6 h-44 w-44 rounded-full object-cover shadow"
            />
          )}
          <h1 className="font-serif text-4xl">{page.name}</h1>
          <p className="mt-2 text-muted-foreground">
            {formatDate(page.date_of_birth)} — {formatDate(page.date_of_death)}
          </p>
          {page.announcement_text && (
            <p className="mx-auto mt-6 max-w-xl whitespace-pre-wrap font-serif text-lg leading-relaxed">
              {page.announcement_text}
            </p>
          )}
        </header>
      ) : (
        <header className="text-center">
          <h1 className="font-serif text-3xl">{page.name}</h1>
          <p className="mt-3 text-muted-foreground">
            This memorial is private. The family decides who can read it.
          </p>
        </header>
      )}

      {announcement && <EventBlock events={(events ?? []) as EventRecord[]} />}

      {accessNotice === "requested" && (
        <p className="mt-8 rounded-md border border-border bg-card p-4 text-center text-base">
          Thank you — the family will review your request.
        </p>
      )}
      {accessNotice === "invalid" && (
        <p className="mt-8 rounded-md border border-border bg-card p-4 text-center text-base">
          That link has expired. You can ask again below.
        </p>
      )}

      <section className="mt-10">
        <AccessGate
          pageId={page.id}
          pageName={page.name}
          gate={gate}
          alreadyRequested={accessNotice === "requested"}
        />
        <p className="mx-auto mt-4 max-w-md text-center text-sm text-muted-foreground">
          {gate === "code"
            ? "The memories on this page are only shown to people with the code."
            : "The memories on this page are only shown to people the family has added."}
        </p>
      </section>

      {announcement && (
        <section className="mt-12 rounded-lg border border-border bg-card p-6">
          <h2 className="font-serif text-xl">Share this announcement</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            This card shows the name, the dates and the service details — never
            the memories.
          </p>
          <div className="mt-4">
            <ShareSheet
              url={url}
              pageName={page.name}
              nextService={nextServiceLine((events ?? []) as EventRecord[])}
            />
          </div>
        </section>
      )}

      <div className="mt-10 text-center">
        <Link href={`/m/${page.random_id}/share`} className="text-sm underline">
          Share a memory with the family
        </Link>
        <p className="mt-1 text-xs text-muted-foreground">
          You don&apos;t need access to write to the family — everything you send
          goes to them for review.
        </p>
      </div>

      <PageFooter randomId={page.random_id} />
    </main>
  );
}

// ---------------------------------------------------------------------------

type PhotoSizes = Record<string, { path: string }> | null;

/**
 * On a gated page the markup must not contain a public storage URL: those are
 * permanent capabilities once handed out. The access-checked route proxies
 * instead (Phase 1 acceptance criterion 3).
 */
function memoryPhotoSrc(page: PageRecord, photoId: string, sizes: PhotoSizes): string | null {
  if (isGated(page)) return `/api/pages/${page.id}/photos/${photoId}?size=medium`;
  const path = sizes?.medium?.path ?? sizes?.thumb?.path;
  return path ? publicPhotoUrl(path) : null;
}

function PageFooter({ randomId }: { randomId: string }) {
  return (
    <footer className="mt-16 border-t border-border pt-6 text-center text-xs text-muted-foreground">
      <Link href={`/m/${randomId}/report`} className="underline">
        Report this page
      </Link>
      {" · "}
      <Link href="/legal/terms" className="underline">Terms</Link>
      {" · "}
      <Link href="/legal/privacy" className="underline">Privacy</Link>
    </footer>
  );
}

async function frozenOrNotFound(slug: string) {
  // Frozen pages are hidden from public RLS but show a neutral message
  // instead of a 404 (PRD §6). Uses the service role for the status check only.
  const data = await findPageByRef<{ status: string }>(createAdminClient(), slug, "status");

  if (data?.status === "frozen") {
    return (
      <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-6 text-center">
        <h1 className="font-serif text-2xl">This page is under review</h1>
        <p className="mt-4 text-muted-foreground">
          This memorial page is temporarily unavailable while we review a report.
        </p>
      </main>
    );
  }
  notFound();
}
