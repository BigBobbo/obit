import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { clientIp, rateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { logEvent } from "@/lib/audit";
import { isValidPageRef } from "@/lib/ids";

const schema = z.object({
  pageRef: z.string().max(80),
  surface: z.enum(["announcement", "memorial", "steward"]),
  action: z.enum(["share", "copy_link", "copy_message"]),
});

/**
 * Share-sheet taps (PRD v2 §7) — the first success metric on the list, because
 * week-one sharing is the only distribution loop this product has.
 *
 * Deliberately thin: a page, a surface and which button. No visitor id, no
 * fingerprint, no session — we are counting taps to learn whether the kit
 * works, not building an audience profile on people at a funeral.
 */
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ ok: true });

  const { pageRef, surface, action } = parsed.data;
  if (!isValidPageRef(pageRef)) return NextResponse.json({ ok: true });

  // A metric is never worth a 500 or a retry loop on the visitor's side, so
  // every failure below is still a 200.
  const allowed = await rateLimit(
    `metric:share:${clientIp(request)}`,
    RATE_LIMITS.shareMetricPerIpPerDay.max,
    RATE_LIMITS.shareMetricPerIpPerDay.window,
  );
  if (!allowed) return NextResponse.json({ ok: true });

  const admin = createAdminClient();
  const { data: page } = await admin
    .from("pages")
    .select("id")
    .eq("random_id", pageRef)
    .maybeSingle();
  if (!page) return NextResponse.json({ ok: true });

  await logEvent({ pageId: page.id as string, action: "share_sheet_used", meta: { surface, action } });
  return NextResponse.json({ ok: true });
}
