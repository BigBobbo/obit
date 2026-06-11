import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { limitsFor } from "@/lib/plan";
import { sendStewardChangeNotification } from "@/lib/email";
import { touchStewardActivity } from "@/lib/audit";
import { normalizeEmail } from "@/lib/utils";

/**
 * Co-steward management (PRD §3, §4.5). Steward-role changes notify all
 * stewards by email (account-takeover defense, PRD §6).
 */
export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id: pageId } = await ctx.params;
  const body = await request.json().catch(() => null);
  const parsed = z.object({ email: z.string().email() }).safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const admin = createAdminClient();
  const { data: me } = await admin
    .from("stewards")
    .select("role")
    .eq("page_id", pageId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!me) return NextResponse.json({ error: "Not a steward of this page" }, { status: 403 });

  // Co-stewards are a paid feature of the page owner's plan.
  const { data: owner } = await admin
    .from("stewards")
    .select("user_id, profiles!inner(plan)")
    .eq("page_id", pageId)
    .eq("role", "owner")
    .single();
  const ownerPlan = (owner?.profiles as unknown as { plan: string })?.plan ?? "free";
  if (!limitsFor(ownerPlan).coStewards) {
    return NextResponse.json(
      { error: "Co-stewards are a paid feature.", code: "plan_limit" },
      { status: 403 },
    );
  }

  const email = normalizeEmail(parsed.data.email);
  const { data: invitee } = await admin
    .from("profiles")
    .select("id")
    .eq("email", email)
    .maybeSingle();
  if (!invitee) {
    return NextResponse.json(
      { error: "That person needs a Memorial Pages account first. Ask them to sign up, then invite them." },
      { status: 404 },
    );
  }

  const { error } = await admin
    .from("stewards")
    .insert({ page_id: pageId, user_id: invitee.id, role: "co_steward" });
  if (error) {
    return NextResponse.json({ error: "They may already be a steward of this page." }, { status: 409 });
  }

  await notifyAllStewards(pageId, `${email} was added as a co-steward.`);
  await touchStewardActivity(pageId, user.id, "co_steward_added");
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id: pageId } = await ctx.params;
  const body = await request.json().catch(() => null);
  const parsed = z.object({ stewardId: z.string().uuid() }).safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const admin = createAdminClient();
  const { data: me } = await admin
    .from("stewards")
    .select("role")
    .eq("page_id", pageId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!me) return NextResponse.json({ error: "Not a steward of this page" }, { status: 403 });

  const { data: target } = await admin
    .from("stewards")
    .select("id, role, user_id, profiles!inner(email)")
    .eq("id", parsed.data.stewardId)
    .eq("page_id", pageId)
    .single();
  if (!target) return NextResponse.json({ error: "Steward not found" }, { status: 404 });

  // Co-stewards cannot remove the original steward (PRD §3). Owners can't be
  // removed at all here — ownership transfer is an admin action.
  if (target.role === "owner") {
    return NextResponse.json({ error: "The page owner cannot be removed." }, { status: 403 });
  }
  // Only the owner can remove other co-stewards; a co-steward may remove themself.
  if (me.role !== "owner" && target.user_id !== user.id) {
    return NextResponse.json({ error: "Only the page owner can remove co-stewards." }, { status: 403 });
  }

  await admin.from("stewards").delete().eq("id", target.id);
  const targetEmail = (target.profiles as unknown as { email: string }).email;
  await notifyAllStewards(pageId, `${targetEmail} was removed as a co-steward.`);
  await touchStewardActivity(pageId, user.id, "co_steward_removed");
  return NextResponse.json({ ok: true });
}

async function notifyAllStewards(pageId: string, change: string) {
  const admin = createAdminClient();
  const { data: page } = await admin.from("pages").select("name").eq("id", pageId).single();
  const { data: stewards } = await admin
    .from("stewards")
    .select("profiles!inner(email)")
    .eq("page_id", pageId);
  for (const s of stewards ?? []) {
    const email = (s.profiles as unknown as { email: string }).email;
    await sendStewardChangeNotification(email, page?.name ?? "your memorial page", change);
  }
}
