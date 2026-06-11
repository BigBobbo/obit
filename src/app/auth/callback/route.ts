import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logEvent } from "@/lib/audit";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error && data.user) {
      // Steward logins count as activity for the 90-day clock; the dashboard
      // touches each page on load.
      await logEvent({ actorUserId: data.user.id, action: "login" });
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth`);
}
