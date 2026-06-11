import type { Metadata } from "next";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { publicPhotoUrl } from "@/lib/images";
import { formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

// All memorial pages are unlisted: noindex/nofollow (PRD §2, §4.1). Open Graph
// exposes only name/dates and the cover photo — never contributed photos.
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const page = await loadPage(slug);
  if (!page) return { robots: { index: false, follow: false } };
  return {
    title: `In memory of ${page.name}`,
    robots: { index: false, follow: false, noarchive: true },
    openGraph: {
      title: `In memory of ${page.name}`,
      description: `${formatDate(page.date_of_birth)} — ${formatDate(page.date_of_death)}`,
      images: page.cover_photo_path ? [publicPhotoUrl(page.cover_photo_path)] : [],
    },
  };
}

async function loadPage(slug: string) {
  const supabase = await createClient();
  // The slug param may be the canonical random_id or a custom slug.
  const { data } = await supabase
    .from("pages")
    .select(
      "id, random_id, slug, name, date_of_birth, date_of_death, bio, cover_photo_path, status",
    )
    .or(`random_id.eq.${slug},slug.eq.${slug}`)
    .maybeSingle();
  return data;
}

export default async function MemorialPage({ params }: Props) {
  const { slug } = await params;
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

  const supabase = await createClient();
  const { data: memories } = await supabase
    .from("memories")
    .select("id, contributor_name, body, created_at, photos(id, sizes)")
    .eq("page_id", page.id)
    .eq("status", "approved")
    .order("created_at", { ascending: false })
    .limit(200);

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
                  const sizes = p.sizes as Record<string, { path: string }>;
                  const medium = sizes?.medium ?? sizes?.thumb;
                  if (!medium) return null;
                  return (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      key={p.id}
                      src={publicPhotoUrl(medium.path)}
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

      <footer className="mt-16 border-t border-border pt-6 text-center text-xs text-muted-foreground">
        <Link href={`/m/${page.random_id}/report`} className="underline">
          Report this page
        </Link>
        {" · "}
        <Link href="/legal/terms" className="underline">Terms</Link>
        {" · "}
        <Link href="/legal/privacy" className="underline">Privacy</Link>
      </footer>
    </main>
  );
}

async function frozenOrNotFound(slug: string) {
  // Frozen pages are hidden from public RLS but show a neutral message
  // instead of a 404 (PRD §6). Uses the service role for the status check only.
  const { createAdminClient } = await import("@/lib/supabase/admin");
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("pages")
    .select("status")
    .or(`random_id.eq.${slug},slug.eq.${slug}`)
    .maybeSingle();

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
