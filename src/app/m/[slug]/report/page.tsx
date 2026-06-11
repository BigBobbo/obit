import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ReportForm } from "@/components/report-form";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function ReportPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ memory?: string }>;
}) {
  const { slug } = await params;
  const { memory } = await searchParams;

  const supabase = await createClient();
  const { data: page } = await supabase
    .from("pages")
    .select("random_id, name")
    .or(`random_id.eq.${slug},slug.eq.${slug}`)
    .maybeSingle();
  if (!page) notFound();

  return (
    <main className="mx-auto max-w-xl px-6 py-12">
      <h1 className="font-serif text-3xl">
        {memory ? "Report a memory" : "Report this page"}
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Reports about individual memories go to the family first. Reports about
        the page itself go to the Memorial Pages team.
      </p>
      <div className="mt-8">
        <ReportForm pageRandomId={page.random_id} memoryId={memory} />
      </div>
    </main>
  );
}
