import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { rateLimit, clientIp, RATE_LIMITS } from "@/lib/rate-limit";
import { verifyTurnstile } from "@/lib/turnstile";
import { findPageByRef } from "@/lib/pages";
import { normalizeEmail } from "@/lib/utils";
import { sendStewardRequestNotification } from "@/lib/email";

const schema = z.object({
  pageRandomId: z.string().min(1),
  name: z.string().trim().min(1).max(100),
  email: z.string().email(),
  relationship: z.string().trim().min(3).max(300),
  message: z.string().max(2000).optional().default(""),
  turnstileToken: z.string().optional().default(""),
});

/**
 * "Request to join as co-steward" (PRD §4.2 dedupe path, §6).
 *
 * This is the half of the dedupe flow that was missing: someone who finds an
 * existing page for their relative can ask that page's family to add them,
 * which is a private matter between them — only a genuine ownership *dispute*
 * belongs in the admin queue.
 */
export async function POST(request: Request) {
  const ip = clientIp(request);
  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Please check the form and try again." }, { status: 400 });
  }
  const input = parsed.data;

  const turnstileOk = await verifyTurnstile(input.turnstileToken || null, ip);
  if (!turnstileOk) {
    return NextResponse.json({ error: "Verification failed. Please reload and try again." }, { status: 403 });
  }

  const email = normalizeEmail(input.email);
  const allowed =
    (await rateLimit(`stewardreq:ip:${ip}`, RATE_LIMITS.reportPerIpPerDay.max, RATE_LIMITS.reportPerIpPerDay.window)) &&
    (await rateLimit(`stewardreq:email:${email}`, RATE_LIMITS.reportPerEmailPerDay.max, RATE_LIMITS.reportPerEmailPerDay.window));
  if (!allowed) {
    return NextResponse.json({ error: "Too many requests. Please try again later." }, { status: 429 });
  }

  const admin = createAdminClient();
  const page = await findPageByRef<{ id: string; name: string; status: string }>(
    admin,
    input.pageRandomId,
    "id, name, status",
  );
  if (!page || page.status === "soft_deleted") {
    return NextResponse.json({ error: "Page not found." }, { status: 404 });
  }

  const { error } = await admin.from("steward_requests").insert({
    page_id: page.id,
    requester_email: email,
    requester_name: input.name,
    relationship: input.relationship,
    message: input.message,
  });
  if (error) {
    // 23505 = the partial unique index on open requests. Re-asking is not an
    // error worth surfacing as one; the family already has the first request.
    if (error.code === "23505") {
      return NextResponse.json({ ok: true, duplicate: true });
    }
    console.error("steward request insert failed", error);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }

  const { data: stewards } = await admin
    .from("stewards")
    .select("profiles!inner(email)")
    .eq("page_id", page.id);
  for (const s of stewards ?? []) {
    await sendStewardRequestNotification((s.profiles as unknown as { email: string }).email, {
      pageName: page.name,
      pageId: page.id,
      requesterName: input.name,
      relationship: input.relationship,
    });
  }

  return NextResponse.json({ ok: true });
}
