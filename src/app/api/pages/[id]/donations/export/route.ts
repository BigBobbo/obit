import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { loadGivingAdmin } from "@/lib/giving/queries";

/**
 * The family's own copy (PRD v2 §3.2). A thank-you list is the reason this
 * feature has a donor wall at all, and a family should never need us in order
 * to have one.
 */
export async function GET(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const admin = createAdminClient();
  const { data: steward } = await admin
    .from("stewards")
    .select("id")
    .eq("page_id", id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!steward) {
    return NextResponse.json({ error: "Not a steward of this page" }, { status: 403 });
  }

  const { charities, donations } = await loadGivingAdmin(id);
  const charityNames = new Map(charities.map((c) => [c.id, c.name]));

  const rows = [
    ["date", "charity", "donor", "message", "amount_usd", "shown_on_page"],
    ...donations.map((d) => [
      d.createdAt,
      charityNames.get(d.pageCharityId) ?? "",
      d.donorName ?? "",
      d.donorMessage ?? "",
      (d.amountCents / 100).toFixed(2),
      d.status === "published" ? "yes" : "no",
    ]),
  ];

  const csv = rows.map((row) => row.map(csvCell).join(",")).join("\r\n") + "\r\n";
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="donations.csv"',
      "Cache-Control": "no-store",
    },
  });
}

/** A leading =, +, - or @ makes a spreadsheet treat a cell as a formula. */
function csvCell(value: string): string {
  const safe = /^[=+\-@]/.test(value) ? `'${value}` : value;
  return `"${safe.replace(/"/g, '""')}"`;
}
