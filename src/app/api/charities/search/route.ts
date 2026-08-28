import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { clientIp, rateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { givingPartner } from "@/lib/giving/partner";

/**
 * Charity search, for stewards choosing an "in lieu of flowers" destination
 * (PRD v2 §3.2). Signed-in only: it proxies a partner API key, and there is no
 * reason for a visitor to search a nonprofit registry through us.
 */
export async function GET(request: Request) {
  const partner = givingPartner();
  if (!partner) {
    return NextResponse.json({ error: "Giving isn't available yet." }, { status: 503 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const allowed = await rateLimit(
    `charity:search:${user.id}`,
    RATE_LIMITS.charitySearchPerUserPerHour.max,
    RATE_LIMITS.charitySearchPerUserPerHour.window,
  );
  if (!allowed) {
    return NextResponse.json({ error: "Too many searches. Try again shortly." }, { status: 429 });
  }
  void clientIp(request);

  const query = new URL(request.url).searchParams.get("q") ?? "";
  const results = await partner.search(query);
  return NextResponse.json({ partner: partner.displayName, charities: results });
}
