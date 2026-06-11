import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { normalizeEmail } from "@/lib/utils";

/**
 * Private-beta gate (PRD §11): when BETA_INVITE_CODES is set, new signups need
 * a valid invite code. Existing users always pass.
 */
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = z
    .object({ email: z.string().email(), invite: z.string().optional() })
    .safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const codes = (process.env.BETA_INVITE_CODES ?? "")
    .split(",")
    .map((c) => c.trim())
    .filter(Boolean);
  if (codes.length === 0) return NextResponse.json({ ok: true });

  const email = normalizeEmail(parsed.data.email);
  const supabase = createAdminClient();
  const { data: existing } = await supabase
    .from("profiles")
    .select("id")
    .eq("email", email)
    .maybeSingle();
  if (existing) return NextResponse.json({ ok: true });

  if (parsed.data.invite && codes.includes(parsed.data.invite.trim())) {
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json(
    { error: "Memorial Pages is in private beta. An invite code is required to sign up." },
    { status: 403 },
  );
}
