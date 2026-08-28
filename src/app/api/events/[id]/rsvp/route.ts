import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { canSeeEvent } from "@/lib/access-server";
import { loadEvent } from "@/lib/event-access";
import { clientIp, rateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { verifyTurnstile } from "@/lib/turnstile";

const schema = z.object({
  name: z.string().trim().min(1).max(100),
  partySize: z.coerce.number().int().min(1).max(12).default(1),
  turnstileToken: z.string().optional(),
});

/**
 * Light RSVP (PRD v2 §2.1): a head count for the family, nothing more.
 *
 * No accounts and no message field — a message on an RSVP is a memory in the
 * wrong place, and the family would then have two queues to read. The list is
 * steward-visible only: a funeral guest list is not public information.
 */
export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Please check the form and try again." }, { status: 400 });
  }

  const ip = clientIp(request);
  const turnstileOk = await verifyTurnstile(parsed.data.turnstileToken ?? null, ip);
  if (!turnstileOk) {
    return NextResponse.json(
      { error: "Verification failed. Please reload and try again." },
      { status: 403 },
    );
  }

  const loaded = await loadEvent(id);
  if (!loaded) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const { event, page } = loaded;

  if (!event.rsvp_enabled) {
    return NextResponse.json({ error: "This event isn't taking RSVPs." }, { status: 400 });
  }
  if (!["active", "inactivity_hold"].includes(page.status)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (!(await canSeeEvent(page, event))) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const allowed =
    (await rateLimit(`rsvp:ip:${ip}`, RATE_LIMITS.rsvpPerIpPerDay.max, RATE_LIMITS.rsvpPerIpPerDay.window)) &&
    (await rateLimit(
      `rsvp:event:${id}`,
      RATE_LIMITS.rsvpPerEventPerDay.max,
      RATE_LIMITS.rsvpPerEventPerDay.window,
    ));
  if (!allowed) {
    return NextResponse.json(
      { error: "Too many responses right now. Please try again later." },
      { status: 429 },
    );
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("event_rsvps")
    .insert({ event_id: id, name: parsed.data.name, party_size: parsed.data.partySize });
  if (error) {
    console.error("rsvp insert failed", error);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
