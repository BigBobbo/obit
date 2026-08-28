import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { touchStewardActivity } from "@/lib/audit";
import { ModerationQueue } from "@/components/moderation-queue";
import { MemoryReports, type ReportedMemory } from "@/components/memory-reports";
import { StewardRequestsPanel } from "@/components/steward-requests-panel";
import { PageSettings } from "@/components/page-settings";
import { PrivacySettings } from "@/components/privacy-settings";
import { AccessRequestsPanel, type AccessRequestCard } from "@/components/access-requests-panel";
import { EventsPanel, type StewardEvent } from "@/components/events-panel";
import { ShareSheet } from "@/components/share-sheet";
import { nextServiceLine, type EventRecord } from "@/lib/events";
import {
  formatLatency,
  LATENCY_TARGET_HOURS,
  medianHours,
  toLatencySamples,
  type DecisionRow,
} from "@/lib/latency";
import { QrPanel } from "@/components/qr-panel";
import { StewardsPanel } from "@/components/stewards-panel";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
import { effectivePlan } from "@/lib/plan";
import Link from "next/link";

export const dynamic = "force-dynamic";

// Single string literals: supabase-js infers row types from the select text, and
// a concatenated string collapses every column to `unknown`.
const PAGE_COLUMNS =
  "id, random_id, slug, name, date_of_birth, date_of_death, bio, status, review_everything, auto_publish_optout, access_mode, access_code_hash, access_code_rotated_at, announcement_enabled, announcement_text";
const EVENT_COLUMNS =
  "id, kind, title, starts_at, tz, venue, locality, map_url, livestream_url, notes, on_announcement, rsvp_enabled, event_rsvps(id, party_size)";

export default async function ManagePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ digest?: string }>;
}) {
  const { id } = await params;
  const { digest } = await searchParams;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login`);

  const admin = createAdminClient();
  const { data: me } = await admin
    .from("stewards")
    .select("role")
    .eq("page_id", id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!me) notFound();

  // Opening the dashboard — including via a digest link — counts as steward
  // activity for the 90-day clock (PRD §4.5).
  await touchStewardActivity(id, user.id, digest ? "digest_link_opened" : "manage_page_visit");

  const { data: page } = await admin
    .from("pages")
    .select(PAGE_COLUMNS)
    .eq("id", id)
    .single();
  if (!page) notFound();

  const { data: pending } = await admin
    .from("memories")
    .select("id, contributor_name, contributor_email, body, created_at, moderation_scores, photos(id, sizes)")
    .eq("page_id", id)
    .eq("status", "pending")
    .order("created_at", { ascending: true });

  // Approval latency (PRD v2 §2.3): the last hundred decisions this page made.
  const { data: decisions } = await admin
    .from("memories")
    .select("created_at, decided_at, moderation_scores")
    .eq("page_id", id)
    .not("decided_at", "is", null)
    .order("decided_at", { ascending: false })
    .limit(100);
  const latency = medianHours(toLatencySamples((decisions ?? []) as DecisionRow[]));

  const { data: stewards } = await admin
    .from("stewards")
    .select("id, role, user_id, profiles!inner(email)")
    .eq("page_id", id);

  const { data: profile } = await admin
    .from("profiles")
    .select("plan")
    .eq("id", user.id)
    .single();

  const { data: memoryReports } = await admin
    .from("reports")
    .select("id, category, evidence_text, created_at, memory_id")
    .eq("page_id", id)
    .eq("status", "steward")
    .order("created_at", { ascending: true });

  // The reported memories themselves — a steward can't judge a report against
  // content they can't see, and most reports are about published memories.
  const reportedMemoryIds = (memoryReports ?? [])
    .map((r) => r.memory_id)
    .filter((mid): mid is string => Boolean(mid));
  const { data: reportedMemories } = reportedMemoryIds.length
    ? await admin
        .from("memories")
        .select("id, contributor_name, contributor_email, body, status, photos(id, sizes)")
        .in("id", reportedMemoryIds)
    : { data: [] };
  const memoriesById = new Map(
    (reportedMemories ?? []).map((m) => [
      m.id as string,
      {
        id: m.id as string,
        contributorName: m.contributor_name as string,
        contributorEmail: m.contributor_email as string,
        body: m.body as string,
        status: m.status as string,
        photos: (m.photos ?? []).map((ph) => ({
          id: ph.id as string,
          sizes: ph.sizes as Record<string, { path: string }>,
        })),
      },
    ]),
  );
  const reportCards: ReportedMemory[] = (memoryReports ?? []).map((r) => ({
    reportId: r.id,
    category: r.category,
    evidence: r.evidence_text,
    createdAt: r.created_at,
    memory: (r.memory_id && memoriesById.get(r.memory_id)) || null,
  }));

  // The access queue (PRD v2 §1.1). Unverified requests are deliberately shown
  // too — a steward may recognise the name and let them in before they click.
  const { data: accessRequests } = await admin
    .from("access_requests")
    .select("id, name, email, relationship, created_at, verified_at")
    .eq("page_id", id)
    .eq("status", "pending")
    .order("created_at", { ascending: true });

  const { count: preapprovedCount } = await admin
    .from("access_requests")
    .select("id", { count: "exact", head: true })
    .eq("page_id", id)
    .eq("status", "preapproved");

  const { data: events } = await admin
    .from("events")
    .select(EVENT_COLUMNS)
    .eq("page_id", id)
    .order("starts_at", { ascending: true });

  const stewardEvents: StewardEvent[] = (events ?? []).map((e) => {
    const rsvps = (e.event_rsvps ?? []) as { id: string; party_size: number }[];
    return {
      id: e.id as string,
      kind: e.kind as string,
      title: e.title as string,
      starts_at: e.starts_at as string,
      tz: e.tz as string,
      venue: e.venue as string | null,
      locality: e.locality as string | null,
      map_url: e.map_url as string | null,
      livestream_url: e.livestream_url as string | null,
      notes: e.notes as string | null,
      on_announcement: e.on_announcement as boolean,
      rsvp_enabled: e.rsvp_enabled as boolean,
      rsvpCount: rsvps.length,
      rsvpGuests: rsvps.reduce((sum, r) => sum + (r.party_size ?? 1), 0),
    };
  });

  const { data: stewardRequests } = await admin
    .from("steward_requests")
    .select("id, requester_name, requester_email, relationship, message, status, created_at")
    .eq("page_id", id)
    .in("status", ["pending", "awaiting_signup"])
    .order("created_at", { ascending: true });

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <Link href="/dashboard" className="text-sm text-muted-foreground underline">
        ← All pages
      </Link>
      <div className="mt-4 flex items-center justify-between">
        <div>
          <h1 className="font-serif text-3xl">{page.name}</h1>
          <p className="text-sm text-muted-foreground">
            {formatDate(page.date_of_birth)} — {formatDate(page.date_of_death)}
            {" · "}
            <Link href={`/m/${page.random_id}`} className="underline">View public page</Link>
          </p>
        </div>
        <div className="flex gap-2">
          {page.status === "inactivity_hold" && <Badge variant="warning">Holding new memories</Badge>}
          {page.status === "frozen" && <Badge variant="destructive">Under review</Badge>}
        </div>
      </div>

      <section className="mt-10">
        <h2 className="font-serif text-xl">Waiting for your review ({pending?.length ?? 0})</h2>
        {latency !== null && (
          <p className="mt-2 text-sm text-muted-foreground">
            You usually reply in <strong>{formatLatency(latency)}</strong>.{" "}
            {latency <= LATENCY_TARGET_HOURS
              ? "People who hear back quickly are the ones who write again."
              : "A memory that sits unanswered is usually the last one that person writes."}
          </p>
        )}
        <div className="mt-4">
          <ModerationQueue
            memories={(pending ?? []).map((m) => ({
              id: m.id,
              contributorName: m.contributor_name,
              contributorEmail: m.contributor_email,
              body: m.body,
              createdAt: m.created_at,
              flags:
                ((m.moderation_scores as Record<string, unknown> | null)?.routing as
                  | { reasons?: string[] }
                  | undefined)?.reasons ?? [],
              photos: (m.photos ?? []).map((p) => ({
                id: p.id,
                sizes: p.sizes as Record<string, { path: string }>,
              })),
            }))}
          />
        </div>
      </section>

      {reportCards.length > 0 && (
        <section className="mt-10">
          <h2 className="font-serif text-xl">Reports on memories ({reportCards.length})</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Reports come to you first. Anything you&apos;d rather not judge, send
            to the Memorial Pages team — and anything left unanswered for a week
            goes to them automatically.
          </p>
          <div className="mt-4">
            <MemoryReports reports={reportCards} />
          </div>
        </section>
      )}

      {(stewardRequests?.length ?? 0) > 0 && (
        <section className="mt-10">
          <h2 className="font-serif text-xl">
            Requests to help ({stewardRequests!.length})
          </h2>
          <div className="mt-4">
            <StewardRequestsPanel
              requests={stewardRequests!.map((r) => ({
                id: r.id,
                name: r.requester_name,
                email: r.requester_email,
                relationship: r.relationship,
                message: r.message,
                status: r.status,
                createdAt: r.created_at,
              }))}
            />
          </div>
        </section>
      )}

      <section className="mt-10">
        <h2 className="font-serif text-xl">Services and events</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Times, places and a calendar link. Past services fade to a single line
          on the page once they have happened.
        </p>
        <div className="mt-4">
          <EventsPanel pageId={page.id} events={stewardEvents} />
        </div>
      </section>

      {page.access_mode === "approved" && (
        <section className="mt-10">
          <h2 className="font-serif text-xl">
            Asking for access ({accessRequests?.length ?? 0})
          </h2>
          <div className="mt-4">
            <AccessRequestsPanel
              pageId={page.id}
              preapprovedCount={preapprovedCount ?? 0}
              requests={(accessRequests ?? []).map(
                (r): AccessRequestCard => ({
                  id: r.id,
                  name: r.name,
                  email: r.email,
                  relationship: r.relationship,
                  createdAt: r.created_at,
                  verifiedAt: r.verified_at,
                }),
              )}
            />
          </div>
        </section>
      )}

      <section className="mt-10">
        <h2 className="font-serif text-xl">Share this page</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Prewritten words you can edit. The week of the funeral is when a
          memorial actually travels.
        </p>
        <div className="mt-4 rounded-lg border border-border bg-card p-6">
          <ShareSheet
            url={`${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/m/${page.random_id}`}
            pageName={page.name}
            nextService={nextServiceLine(stewardEvents as EventRecord[])}
            codeEntry={page.access_mode === "code"}
          />
        </div>
      </section>

      <section className="mt-10">
        <h2 className="font-serif text-xl">Privacy</h2>
        <div className="mt-4">
          <PrivacySettings
            pageId={page.id}
            initial={{
              accessMode: (page.access_mode ?? "link") as "link" | "code" | "approved",
              hasCode: Boolean(page.access_code_hash),
              announcementEnabled: page.announcement_enabled,
              announcementText: page.announcement_text ?? "",
            }}
          />
        </div>
      </section>

      <section className="mt-10">
        <h2 className="font-serif text-xl">QR code</h2>
        <div className="mt-4">
          <QrPanel pageId={page.id} randomId={page.random_id} paid={effectivePlan(profile?.plan) === "paid"} />
        </div>
      </section>

      <section className="mt-10">
        <h2 className="font-serif text-xl">Stewards</h2>
        <div className="mt-4">
          <StewardsPanel
            pageId={page.id}
            myRole={me.role as "owner" | "co_steward"}
            myUserId={user.id}
            stewards={(stewards ?? []).map((s) => ({
              id: s.id,
              role: s.role,
              userId: s.user_id,
              email: (s.profiles as unknown as { email: string }).email,
            }))}
          />
        </div>
      </section>

      <section className="mt-10">
        <h2 className="font-serif text-xl">Settings</h2>
        <div className="mt-4">
          <PageSettings
            pageId={page.id}
            isOwner={me.role === "owner"}
            initial={{
              name: page.name,
              bio: page.bio,
              slug: page.slug,
              reviewEverything: page.review_everything,
              autoPublishOptout: page.auto_publish_optout,
            }}
            paid={effectivePlan(profile?.plan) === "paid"}
          />
        </div>
      </section>
    </main>
  );
}
