import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { rateLimit, clientIp, RATE_LIMITS } from "@/lib/rate-limit";
import { verifyTurnstile } from "@/lib/turnstile";
import { sendAccessApproved, sendAccessVerification } from "@/lib/email";
import { normalizeEmail } from "@/lib/utils";
import { ACCESS_COLUMNS, accessMode, type AccessPage } from "@/lib/access";

const schema = z.object({
  name: z.string().trim().min(1).max(100),
  email: z.string().email(),
  relationship: z.string().trim().max(300).optional(),
  turnstileToken: z.string().optional(),
});

/**
 * "Ask the family to let me in" (PRD v2 §1.1).
 *
 * The reply is the same sentence in every case — asked, already asked, already
 * declined, never heard of you. Declines are silent by design: a grieving
 * family should not have to compose a rejection, and a requester should not
 * receive one.
 */
export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Please check the form and try again." }, { status: 400 });
  }
  const { name, relationship } = parsed.data;
  const email = normalizeEmail(parsed.data.email);
  const ip = clientIp(request);

  const turnstileOk = await verifyTurnstile(parsed.data.turnstileToken ?? null, ip);
  if (!turnstileOk) {
    return NextResponse.json(
      { error: "Verification failed. Please reload and try again." },
      { status: 403 },
    );
  }

  const allowed =
    (await rateLimit(
      `access:req:ip:${ip}`,
      RATE_LIMITS.accessRequestPerIpPerDay.max,
      RATE_LIMITS.accessRequestPerIpPerDay.window,
    )) &&
    (await rateLimit(
      `access:req:page:${id}`,
      RATE_LIMITS.accessRequestPerPagePerDay.max,
      RATE_LIMITS.accessRequestPerPagePerDay.window,
    ));
  if (!allowed) {
    return NextResponse.json(
      { error: "Too many requests right now. Please try again later." },
      { status: 429 },
    );
  }

  const admin = createAdminClient();
  const { data: page } = await admin
    .from("pages")
    .select(`id, random_id, name, status, ${ACCESS_COLUMNS}`)
    .eq("id", id)
    .maybeSingle<AccessPage & { name: string; status: string }>();

  if (!page || page.status === "soft_deleted") {
    return NextResponse.json({ error: "Page not found." }, { status: 404 });
  }
  if (accessMode(page) !== "approved") {
    return NextResponse.json(
      { error: "This page isn't accepting access requests." },
      { status: 400 },
    );
  }

  // The same answer whatever happens next. Nothing below changes it.
  const acknowledgement = NextResponse.json({ ok: true });

  // Banned addresses get the acknowledgement and nothing else — no row, no
  // email, no place in the family's queue.
  const [{ data: emailBan }, { data: ipBan }] = await Promise.all([
    admin.from("bans").select("id").eq("email", email).limit(1).maybeSingle(),
    admin.from("bans").select("id").eq("ip", ip).limit(1).maybeSingle(),
  ]);
  if (emailBan || ipBan) return acknowledgement;

  const { data: existing } = await admin
    .from("access_requests")
    .select("id, status, verify_token, verified_at")
    .eq("page_id", page.id)
    .eq("email", email)
    .maybeSingle();

  if (existing) {
    // Already approved and simply on a new device: re-send the door key.
    if (existing.status === "approved") {
      await admin
        .from("access_requests")
        .update({ name, relationship: relationship ?? null })
        .eq("id", existing.id);
      await sendAccessApproved(email, {
        pageName: page.name,
        randomId: page.random_id,
        token: existing.verify_token as string,
      });
      return acknowledgement;
    }

    // Pending, pre-approved, or previously declined. The first two need the
    // verification link again; the third gets it too, because a declined
    // requester must not be able to tell they were declined.
    await admin
      .from("access_requests")
      .update({ name, relationship: relationship ?? null })
      .eq("id", existing.id);
    await sendAccessVerification(email, {
      pageName: page.name,
      randomId: page.random_id,
      token: existing.verify_token as string,
      preapproved: existing.status === "preapproved",
    });
    return acknowledgement;
  }

  const { data: created } = await admin
    .from("access_requests")
    .insert({ page_id: page.id, email, name, relationship: relationship ?? null })
    .select("verify_token")
    .single();
  if (!created) return acknowledgement;

  await sendAccessVerification(email, {
    pageName: page.name,
    randomId: page.random_id,
    token: created.verify_token as string,
    preapproved: false,
  });
  return acknowledgement;
}
