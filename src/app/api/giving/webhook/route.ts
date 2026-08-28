import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { givingPartner } from "@/lib/giving/partner";
import { moderateDonation } from "@/lib/giving/moderation";
import { logEvent } from "@/lib/audit";

export const maxDuration = 60;

/**
 * The partner's confirmation that somebody gave (PRD v2 §3.2).
 *
 * This is the only way a donation ever enters the database: the money went
 * donor → processor → charity without touching us, and what arrives here is a
 * receipt. Two properties matter and both are enforced below —
 *
 *   authenticated  the payload must carry the shared token we put on the
 *                  checkout link, or it is not ours and is dropped
 *   idempotent     webhooks are retried; `partner_ref` is unique, so a replay
 *                  cannot double a family's total
 */
export async function POST(request: Request) {
  const partner = givingPartner();
  if (!partner) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const raw = await request.text();
  const donation = partner.parseWebhook(raw, request.headers);
  if (!donation) {
    // Deliberately terse: an unauthenticated caller learns nothing about why.
    return NextResponse.json({ error: "Rejected" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: charity } = await admin
    .from("page_charities")
    .select("id, page_id, pages!inner(name)")
    .eq("id", donation.pageCharityId)
    .maybeSingle();
  if (!charity) {
    console.error("giving webhook for an unknown page_charity", donation.pageCharityId);
    return NextResponse.json({ error: "Unknown destination" }, { status: 404 });
  }

  const { data: inserted, error } = await admin
    .from("donations")
    .insert({
      page_charity_id: charity.id,
      amount_cents: donation.amountCents,
      currency: donation.currency,
      donor_name: donation.donorName,
      donor_message: donation.donorMessage,
      partner_ref: donation.partnerRef,
      status: "pending",
    })
    .select("id")
    .maybeSingle();

  if (error) {
    // A duplicate partner_ref is the retry we designed for, not a failure: 200
    // so the partner stops redelivering.
    const { data: existing } = await admin
      .from("donations")
      .select("id")
      .eq("partner_ref", donation.partnerRef)
      .maybeSingle();
    if (existing) return NextResponse.json({ ok: true, duplicate: true });
    console.error("donation insert failed", error);
    return NextResponse.json({ error: "Could not record that donation." }, { status: 500 });
  }

  if (inserted) {
    const page = charity.pages as unknown as { name: string };
    await moderateDonation(inserted.id as string, page?.name ?? "");
    await logEvent({
      pageId: charity.page_id as string,
      action: "donation_recorded",
      meta: { amountCents: donation.amountCents, currency: donation.currency },
    });
  }

  return NextResponse.json({ ok: true });
}
