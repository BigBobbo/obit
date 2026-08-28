import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { findPageByRef } from "@/lib/pages";
import { JoinForm } from "@/components/join-form";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { robots: { index: false, follow: false } };

/** "Ask the family to add you as a co-steward" (PRD §4.2 dedupe path, §6). */
export default async function JoinPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createClient();
  const page = await findPageByRef<{ random_id: string; name: string }>(
    supabase,
    slug,
    "random_id, name",
  );
  if (!page) notFound();

  return (
    <main className="mx-auto max-w-xl px-6 py-12">
      <h1 className="font-serif text-3xl">Ask to help look after this page</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Your request goes to the family who created the page for {page.name}.
        They decide — we don&apos;t add anyone without their approval. If you
        believe this page is in the wrong hands entirely, use{" "}
        <a href={`/m/${page.random_id}/report?category=impersonation_or_ownership`} className="underline">
          report this page
        </a>{" "}
        instead.
      </p>
      <div className="mt-8">
        <JoinForm pageRandomId={page.random_id} pageName={page.name} />
      </div>
    </main>
  );
}
