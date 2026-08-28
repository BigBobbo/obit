import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { findPageByRef } from "@/lib/pages";
import { ShareForm } from "@/components/share-form";
import { pickPrompts, promptSeed } from "@/lib/prompts";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function SharePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createClient();
  const page = await findPageByRef<{
    id: string;
    random_id: string;
    name: string;
    status: string;
  }>(supabase, slug, "id, random_id, name, status");
  if (!page) notFound();

  return (
    <main className="mx-auto max-w-xl px-6 py-12">
      <h1 className="font-serif text-3xl">Share a memory of {page.name}</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Your memory will appear with the name you choose. We&apos;ll send a
        6-digit code to your email to confirm it&apos;s you — no account needed.
      </p>
      <div className="mt-8">
        {/* Chosen on the server so the markup matches on hydration; seeded by
            the day so a page doesn't collect five answers to one question. */}
        <ShareForm
          pageId={page.id}
          randomId={page.random_id}
          pageName={page.name}
          prompts={pickPrompts(promptSeed(page.id))}
        />
      </div>
    </main>
  );
}
