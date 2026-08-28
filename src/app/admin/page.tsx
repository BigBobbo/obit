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
      "id, target_type, memory_id, category, reporter_email, reporter_relationship, evidence_text, status, resolution, created_at, never_autoclose, pages!inner(id, random_id, name, status)",
    )
    // awaiting_reporter is shown too: a report parked on a follow-up must stay
    // visible, or "asked a question" becomes indistinguishable from "forgotten".
    .in("status", ["escalated", "open", "awaiting_reporter"])
    .order("created_at", { ascending: true })
    .limit(100);

  // Memory reports reach this queue when the stewards don't act on them, and
  // they cannot be judged without the memory itself — a rejected or pending
  // one is not visible anywhere on the public page.
  const memoryIds = (reports ?? [])
    .map((r) => r.memory_id)
    .filter((id): id is string => Boolean(id));
  const { data: reportedMemories } = memoryIds.length
    ? await admin
        .from("memories")
        .select("id, contributor_name, contributor_email, body, status")
        .in("id", memoryIds)
    : { data: [] };
  const memoriesById = new Map((reportedMemories ?? []).map((m) => [m.id as string, m]));

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
                {r.status === "awaiting_reporter" && (
                  <Badge variant="warning">waiting on reporter</Badge>
                )}
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
                <p className="mt-2 whitespace-pre-wrap rounded bg-muted p-3 text-sm">
                  {r.evidence_text}
                </p>
              )}
              {r.resolution && (
                <p className="mt-2 text-sm italic text-muted-foreground">{r.resolution}</p>
              )}
              {r.memory_id &&
                (() => {
                  const memory = memoriesById.get(r.memory_id!);
                  if (!memory) {
                    return (
                      <p className="mt-2 text-sm text-muted-foreground">
                        The reported memory is no longer on the page.
                      </p>
                    );
                  }
                  return (
                    <div className="mt-3 border-l-2 border-border pl-4">
                      <p className="text-sm text-muted-foreground">
                        {memory.contributor_name as string} ·{" "}
                        {memory.contributor_email as string}{" "}
                        <Badge variant="muted">{memory.status as string}</Badge>
                      </p>
                      {(memory.body as string) && (
                        <p className="mt-2 whitespace-pre-wrap font-serif text-sm">
                          {memory.body as string}
                        </p>
                      )}
                    </div>
                  );
                })()}
              <div className="mt-4">
                <AdminReportActions
                  reportId={r.id}
                  pageId={page.id}
                  pageStatus={page.status}
                  reporterEmail={r.reporter_email}
                  status={r.status}
                />
              </div>
            </article>
          );
        })}
      </div>
    </main>
  );
}
