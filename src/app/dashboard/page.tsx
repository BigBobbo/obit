import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
import { logEvent } from "@/lib/audit";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const admin = createAdminClient();
  const { data: stewardships } = await admin
    .from("stewards")
    .select("role, pages!inner(id, random_id, name, status, date_of_birth, date_of_death)")
    .eq("user_id", user.id);

  // Dashboard visit = steward activity for the 90-day clock on every page.
  const pages = (stewardships ?? []).map((s) => ({
    role: s.role,
    page: s.pages as unknown as {
      id: string;
      random_id: string;
      name: string;
      status: string;
      date_of_birth: string;
      date_of_death: string;
    },
  }));
  if (pages.length > 0) {
    const now = new Date().toISOString();
    const ids = pages.map((p) => p.page.id);
    await admin.from("pages").update({ last_steward_activity_at: now }).in("id", ids);
    await logEvent({ actorUserId: user.id, action: "dashboard_visit" });
  }

  // Pending counts per page.
  const pending: Record<string, number> = {};
  for (const { page } of pages) {
    const { count } = await admin
      .from("memories")
      .select("id", { count: "exact", head: true })
      .eq("page_id", page.id)
      .eq("status", "pending");
    pending[page.id] = count ?? 0;
  }

  const { data: profile } = await admin
    .from("profiles")
    .select("plan, is_admin")
    .eq("id", user.id)
    .single();

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <div className="flex items-center justify-between">
        <h1 className="font-serif text-3xl">Your memorial pages</h1>
        <div className="flex gap-2">
          {profile?.is_admin && (
            <Button variant="outline" asChild>
              <Link href="/admin">Admin</Link>
            </Button>
          )}
          <Button asChild>
            <Link href="/dashboard/new">Create a page</Link>
          </Button>
        </div>
      </div>

      {profile?.plan !== "paid" && (
        <Card className="mt-6">
          <CardContent className="flex items-center justify-between pt-6">
            <p className="text-sm text-muted-foreground">
              Free plan: 1 page, 50 photos, standard QR. Upgrade for multiple
              pages, unlimited photos, custom links, co-stewards and plaque PDFs.
            </p>
            <form action="/api/stripe/checkout" method="POST">
              <Button type="submit" variant="outline" size="sm">Upgrade</Button>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="mt-8 space-y-4">
        {pages.length === 0 && (
          <p className="text-muted-foreground">
            You haven&apos;t created a memorial page yet.
          </p>
        )}
        {pages.map(({ page, role }) => (
          <Card key={page.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="font-serif">{page.name}</CardTitle>
                <div className="flex gap-2">
                  {role === "owner" ? <Badge variant="muted">Owner</Badge> : <Badge variant="muted">Co-steward</Badge>}
                  {page.status === "inactivity_hold" && <Badge variant="warning">Holding new memories</Badge>}
                  {page.status === "frozen" && <Badge variant="destructive">Under review</Badge>}
                  {page.status === "soft_deleted" && <Badge variant="destructive">Deleted (recoverable)</Badge>}
                  {(pending[page.id] ?? 0) > 0 && (
                    <Badge>{pending[page.id]} pending</Badge>
                  )}
                </div>
              </div>
              <CardDescription>
                {formatDate(page.date_of_birth)} — {formatDate(page.date_of_death)}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex gap-3">
              <Button variant="outline" size="sm" asChild>
                <Link href={`/dashboard/pages/${page.id}`}>Manage</Link>
              </Button>
              <Button variant="ghost" size="sm" asChild>
                <Link href={`/m/${page.random_id}`}>View page</Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </main>
  );
}
