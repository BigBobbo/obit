import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";

/** Stripe webhook: keeps profiles.plan in sync with the subscription state. */
export async function POST(request: Request) {
  const payload = await request.text();
  const signature = request.headers.get("stripe-signature");
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!signature || !secret) {
    return NextResponse.json({ error: "Webhook not configured" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(payload, signature, secret);
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const admin = createAdminClient();

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object;
      const userId = session.metadata?.user_id;
      if (userId) {
        await admin
          .from("profiles")
          .update({
            plan: "paid",
            stripe_subscription_id:
              typeof session.subscription === "string" ? session.subscription : null,
          })
          .eq("id", userId);
      }
      break;
    }
    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      const sub = event.data.object;
      const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;
      const active = sub.status === "active" || sub.status === "trialing";
      await admin
        .from("profiles")
        .update({
          plan: active ? "paid" : "free",
          stripe_subscription_id: active ? sub.id : null,
        })
        .eq("stripe_customer_id", customerId);
      break;
    }
    default:
      break;
  }

  return NextResponse.json({ received: true });
}
