import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { touchStewardActivity } from "@/lib/audit";
import { ModerationQueue } from "@/components/moderation-queue";
import { MemoryReports, type ReportedMemory } from "@/components/memory-reports";
import { StewardRequestsPanel } from "@/components/steward-requests-panel";
import { PageSettings } from "@/components/page-settings";
import { QrPanel } from "@/components/qr-panel";
import { StewardsPanel } from "@/components/stewards-panel";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
import Link from "next/link";

export const dynamic = "force-dynamic";

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
    .select(
      "id, random_id, slug, name, date_of_birth, date_of_death, bio, status, review_everything, auto_publish_optout",
    )
    .eq("id", id)
    .single();
  if (!page) notFound();

  const { data: pending } = await admin
    .from("memories")
    .select("id, contributor_name, contributor_email, body, created_at, moderation_scores, photos(id, sizes)")
    .eq("page_id", id)
    .eq("status", "pending")
    .order("created_at", { ascending: true });

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
        <h2 className="font-serif text-xl">QR code</h2>
        <div className="mt-4">
          <QrPanel pageId={page.id} randomId={page.random_id} paid={profile?.plan === "paid"} />
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
            paid={profile?.plan === "paid"}
          />
        </div>
      </section>
    </main>
  );
}
