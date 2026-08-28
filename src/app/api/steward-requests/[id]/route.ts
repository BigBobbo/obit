import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { limitsFor } from "@/lib/plan";
import { approvalOutcome, isOpenRequest } from "@/lib/steward-requests";
import { sendStewardRequestOutcome, sendStewardChangeNotification } from "@/lib/email";
import { touchStewardActivity } from "@/lib/audit";

const schema = z.object({ action: z.enum(["approve", "decline"]) });

/** A steward approving or declining a request to join their page (PRD §6). */
export async function PATCH(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const admin = createAdminClient();
  const { data: req } = await admin
    .from("steward_requests")
    .select("id, page_id, requester_email, requester_name, status, pages!inner(name)")
    .eq("id", id)
    .maybeSingle();
  if (!req) return NextResponse.json({ error: "Request not found" }, { status: 404 });
  if (!isOpenRequest(req.status)) {
    return NextResponse.json({ error: "This request has already been decided." }, { status: 409 });
  }

  const { data: me } = await admin
    .from("stewards")
    .select("role")
    .eq("page_id", req.page_id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!me) return NextResponse.json({ error: "Not a steward of this page" }, { status: 403 });

  const pageName = (req.pages as unknown as { name: string }).name;
  const now = new Date().toISOString();

  if (parsed.data.action === "decline") {
    await admin
      .from("steward_requests")
      .update({ status: "declined", resolved_at: now, resolved_by: user.id })
      .eq("id", id);
    await sendStewardRequestOutcome(req.requester_email, { pageName, outcome: "declined" });
    await touchStewardActivity(req.page_id, user.id, "steward_request_declined");
    return NextResponse.json({ ok: true, outcome: "declined" });
  }

  const { data: owner } = await admin
    .from("stewards")
    .select("profiles!inner(plan)")
    .eq("page_id", req.page_id)
    .eq("role", "owner")
    .single();
  const ownerPlan = (owner?.profiles as unknown as { plan: string })?.plan ?? "free";

  const { data: account } = await admin
    .from("profiles")
    .select("id")
    .eq("email", req.requester_email)
    .maybeSingle();

  const outcome = approvalOutcome({
    ownerAllowsCoStewards: limitsFor(ownerPlan).coStewards,
    requesterHasAccount: Boolean(account),
  });

  if (outcome === "plan_limit") {
    return NextResponse.json(
      { error: "Co-stewards are a paid feature. Upgrade to accept this request.", code: "plan_limit" },
      { status: 403 },
    );
  }

  if (outcome === "awaiting_signup") {
    // The approval is not lost: the request parks until they have an account,
    // and the steward can approve again to finish it.
    await admin.from("steward_requests").update({ status: "awaiting_signup" }).eq("id", id);
    await sendStewardRequestOutcome(req.requester_email, { pageName, outcome: "awaiting_signup" });
    await touchStewardActivity(req.page_id, user.id, "steward_request_awaiting_signup");
    return NextResponse.json({
      ok: true,
      outcome,
      message: `${req.requester_email} needs an account first. We've emailed them; approve again once they've signed up.`,
    });
  }

  const { error: insertErr } = await admin
    .from("stewards")
    .insert({ page_id: req.page_id, user_id: account!.id, role: "co_steward" });
  if (insertErr && insertErr.code !== "23505") {
    console.error("co-steward insert failed", insertErr);
    return NextResponse.json({ error: "Could not add them. Please try again." }, { status: 500 });
  }

  await admin
    .from("steward_requests")
    .update({ status: "approved", resolved_at: now, resolved_by: user.id })
    .eq("id", id);

  await sendStewardRequestOutcome(req.requester_email, { pageName, outcome: "approved" });

  // Steward-role changes notify every steward (PRD §6, account-takeover defense).
  const { data: stewards } = await admin
    .from("stewards")
    .select("profiles!inner(email)")
    .eq("page_id", req.page_id);
  for (const s of stewards ?? []) {
    await sendStewardChangeNotification(
      (s.profiles as unknown as { email: string }).email,
      pageName,
      `${req.requester_email} was added as a co-steward after requesting access.`,
    );
  }

  await touchStewardActivity(req.page_id, user.id, "steward_request_approved");
  return NextResponse.json({ ok: true, outcome: "approved" });
}
