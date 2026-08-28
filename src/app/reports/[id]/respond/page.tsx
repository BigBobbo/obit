import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { ReportResponseForm } from "@/components/report-response-form";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { robots: { index: false, follow: false } };

/**
 * Where a follow-up email lands (PRD §4.6). Answering here returns the report
 * to the admin queue and stops the 30-day auto-close clock.
 */
export default async function RespondPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ token?: string }>;
}) {
  const { id } = await params;
  const { token } = await searchParams;
  if (!token) notFound();

  const admin = createAdminClient();
  const { data: report } = await admin
    .from("reports")
    .select("id, status, response_token, pages!inner(name)")
    .eq("id", id)
    .maybeSingle();

  // Constant-time comparison isn't meaningful here: this read only decides
  // what to render, and the POST route does the real check.
  if (!report || report.response_token !== token) notFound();

  const pageName = (report.pages as unknown as { name: string }).name;

  if (report.status === "resolved" || report.status === "auto_closed") {
    return (
      <main className="mx-auto max-w-xl px-6 py-12">
        <h1 className="font-serif text-3xl">This report is closed</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          We&apos;ve finished looking at your report about {pageName}. If there
          is something new, please file a fresh report from the page.
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-xl px-6 py-12">
      <h1 className="font-serif text-3xl">Reply to our question</h1>
      <p className="mt-3 text-sm text-muted-foreground">
        About your report on {pageName}. Anything you add goes straight to the
        Memorial Pages team.
      </p>
      <div className="mt-8">
        <ReportResponseForm reportId={report.id} token={token} />
      </div>
    </main>
  );
}
