import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { AdminReportActions } from "@/components/admin-report-actions";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

/**
 * Platform-admin escalation queue (PRD §4.6). The pipeline never routes here —
 * only page-level reports, CSAM categories and steward non-response do.
 */
export default async function AdminPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();
  if (!profile?.is_admin) notFound();

  const { data: reports } = await admin
    .from("reports")
    .select(
      "id, target_type, category, reporter_email, reporter_relationship, evidence_text, status, created_at, never_autoclose, pages!inner(id, random_id, name, status)",
    )
    .in("status", ["escalated", "open"])
    .order("created_at", { ascending: true })
    .limit(100);

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <Link href="/dashboard" className="text-sm text-muted-foreground underline">← Dashboard</Link>
      <h1 className="mt-4 font-serif text-3xl">Escalation queue</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        {(reports ?? []).length} open escalation(s).
      </p>

      <div className="mt-8 space-y-4">
        {(reports ?? []).length === 0 && (
          <p className="text-muted-foreground">Nothing here. As designed.</p>
        )}
        {(reports ?? []).map((r) => {
          const page = r.pages as unknown as {
            id: string;
            random_id: string;
            name: string;
            status: string;
          };
          return (
            <article key={r.id} className="rounded-lg border border-border bg-card p-5">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={r.never_autoclose ? "destructive" : "warning"}>
                  {r.category.replace(/_/g, " ")}
                </Badge>
                <Badge variant="muted">{r.target_type}</Badge>
                <span className="text-sm text-muted-foreground">
                  {new Date(r.created_at).toLocaleString()}
                </span>
              </div>
              <p className="mt-2 text-sm">
                Page: <Link href={`/m/${page.random_id}`} className="underline">{page.name}</Link>{" "}
                <Badge variant="muted">{page.status}</Badge>
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Reporter: {r.reporter_email}
                {r.reporter_relationship && ` (${r.reporter_relationship})`}
              </p>
              {r.evidence_text && (
                <p className="mt-2 rounded bg-muted p-3 text-sm">{r.evidence_text}</p>
              )}
              <div className="mt-4">
                <AdminReportActions
                  reportId={r.id}
                  pageId={page.id}
                  pageStatus={page.status}
                  reporterEmail={r.reporter_email}
                />
              </div>
            </article>
          );
        })}
      </div>
    </main>
  );
}
