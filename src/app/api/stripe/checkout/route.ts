import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStripe } from "@/lib/stripe";

/** Stripe Checkout for the single paid tier (PRD §8) — no custom billing UI. */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL("/login", request.url), 303);

  const stripe = getStripe();
  const admin = createAdminClient();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin;

  const { data: profile } = await admin
    .from("profiles")
    .select("stripe_customer_id, email")
    .eq("id", user.id)
    .single();

  let customerId = profile?.stripe_customer_id;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: profile?.email ?? user.email ?? undefined,
      metadata: { user_id: user.id },
    });
    customerId = customer.id;
    await admin.from("profiles").update({ stripe_customer_id: customerId }).eq("id", user.id);
  }

  // Annual is offered inside Checkout when both prices exist.
  const form = await request.formData().catch(() => null);
  const interval = form?.get("interval") === "annual" ? "annual" : "monthly";
  const price =
    interval === "annual" && process.env.STRIPE_PRICE_ANNUAL
      ? process.env.STRIPE_PRICE_ANNUAL
      : process.env.STRIPE_PRICE_MONTHLY;
  if (!price) {
    return NextResponse.json({ error: "Billing is not configured." }, { status: 500 });
  }

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: "subscription",
    line_items: [{ price, quantity: 1 }],
    success_url: `${appUrl}/dashboard?upgraded=1`,
    cancel_url: `${appUrl}/dashboard`,
    metadata: { user_id: user.id },
  });

  return NextResponse.redirect(session.url!, 303);
}
