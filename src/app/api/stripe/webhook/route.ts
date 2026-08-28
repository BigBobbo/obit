import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Stripe webhook: keeps profiles.plan in sync with the subscription state.
 *
 * Every event id is recorded before it is acted on, because Stripe redelivers
 * on any non-2xx response and on its own retry schedule — and a replayed
 * subscription.deleted arriving after a customer re-subscribed would downgrade
 * a paying account.
 */
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

  // Claim the event. The primary key makes this the dedupe: a duplicate insert
  // fails, which means some earlier delivery already handled it.
  const { error: claimError } = await admin
    .from("processed_stripe_events")
    .insert({ event_id: event.id, event_type: event.type });
  if (claimError) {
    // 23505 = unique_violation. Anything else is a real failure, and returning
    // non-2xx asks Stripe to retry.
    if (claimError.code === "23505") {
      return NextResponse.json({ received: true, duplicate: true });
    }
    console.error("failed to record stripe event", claimError);
    return NextResponse.json({ error: "Could not record event" }, { status: 500 });
  }

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
      await admin
        .from("profiles")
        .update({
          plan: entitledPlan(sub.status),
          stripe_subscription_id: entitledPlan(sub.status) === "paid" ? sub.id : null,
        })
        .eq("stripe_customer_id", customerId);
      break;
    }
    default:
      break;
  }

  return NextResponse.json({ received: true });
}

/**
 * A card failing its first retry should not cost someone their co-stewards and
 * custom slug while Stripe is still trying to charge them, so `past_due` and
 * `incomplete` keep their entitlements. Only a subscription that has actually
 * ended — or been abandoned — downgrades.
 */
function entitledPlan(status: Stripe.Subscription.Status): "free" | "paid" {
  switch (status) {
    case "active":
    case "trialing":
    case "past_due":
    case "incomplete":
      return "paid";
    default:
      // canceled, unpaid, incomplete_expired, paused
      return "free";
  }
}
