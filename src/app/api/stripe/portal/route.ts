import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStripe } from "@/lib/stripe";

/** Stripe Customer Portal — subscription management without custom UI. */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL("/login", request.url), 303);

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("stripe_customer_id")
    .eq("id", user.id)
    .single();
  if (!profile?.stripe_customer_id) {
    return NextResponse.redirect(new URL("/dashboard", request.url), 303);
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin;
  const session = await getStripe().billingPortal.sessions.create({
    customer: profile.stripe_customer_id,
    return_url: `${appUrl}/dashboard`,
  });

  return NextResponse.redirect(session.url, 303);
}
