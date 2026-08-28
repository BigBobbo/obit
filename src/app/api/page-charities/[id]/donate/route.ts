import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { givingPartner } from "@/lib/giving/partner";

/**
 * The donate button (PRD v2 §3.2). One redirect, straight to the partner's
 * hosted checkout — we never take a card number, never hold a cent, and never
 * see the payment.
 *
 * It is a route rather than a plain link because the checkout URL carries the
 * webhook token that authenticates the confirmation coming back. Rendering that
 * into the page HTML would publish the shared secret to every visitor.
 */
export async function GET(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const partner = givingPartner();
  if (!partner) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const admin = createAdminClient();
  const { data: charity } = await admin
    .from("page_charities")
    .select("id, page_id, name, partner_slug, pages!inner(name, random_id, status)")
    .eq("id", id)
    .maybeSingle();
  if (!charity) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const page = charity.pages as unknown as { name: string; random_id: string; status: string };
  if (!["active", "inactivity_hold"].includes(page.status)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin;
  const url = partner.donateUrl({
    charity: { slug: charity.partner_slug as string, name: charity.name as string },
    pageCharityId: charity.id as string,
    personName: page.name,
    returnUrl: `${appUrl}/m/${page.random_id}`,
  });

  return NextResponse.redirect(url, {
    // Never cached, anywhere: the destination carries a shared secret.
    headers: { "Cache-Control": "no-store", "X-Robots-Tag": "noindex, nofollow" },
    status: 302,
  });
}
