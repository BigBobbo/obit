import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { touchStewardActivity } from "@/lib/audit";
import { givingPartner } from "@/lib/giving/partner";
import { normalizeEin } from "@/lib/giving/format";

/** Three, per the PRD: enough for the causes that mattered, few enough to read. */
const MAX_CHARITIES = 3;

const schema = z.object({ ein: z.string().min(9).max(20) });

/**
 * Attach a charity to a page (PRD v2 §3.2).
 *
 * The EIN is re-checked against the partner's registry here rather than trusted
 * from the form. "Named, verified charities only" is the guardrail the whole
 * feature rests on, and a client-supplied name and slug would walk straight
 * around it.
 */
export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const partner = givingPartner();
  if (!partner) {
    return NextResponse.json({ error: "Giving isn't available yet." }, { status: 503 });
  }

  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

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

  const { count } = await admin
    .from("page_charities")
    .select("id", { count: "exact", head: true })
    .eq("page_id", id);
  if ((count ?? 0) >= MAX_CHARITIES) {
    return NextResponse.json(
      { error: `A page can name ${MAX_CHARITIES} charities.` },
      { status: 403 },
    );
  }

  const charity = await partner.lookup(normalizeEin(parsed.data.ein));
  if (!charity) {
    return NextResponse.json(
      { error: "We couldn't confirm that charity in the registry. Please search and pick again." },
      { status: 422 },
    );
  }

  const { error } = await admin.from("page_charities").insert({
    page_id: id,
    ein: charity.ein,
    name: charity.name,
    partner_slug: charity.slug,
  });
  if (error) {
    // The unique (page_id, ein) index is the only realistic failure.
    return NextResponse.json({ error: "That charity is already on this page." }, { status: 409 });
  }

  await touchStewardActivity(id, user.id, "charity_added");
  return NextResponse.json({ ok: true, charity });
}
