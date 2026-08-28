import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { rateLimit, clientIp, RATE_LIMITS } from "@/lib/rate-limit";
import {
  ACCESS_COLUMNS,
  accessCookieMaxAge,
  accessCookieName,
  accessMode,
  createAccessCookieValue,
  verifyAccessCode,
  type AccessPage,
} from "@/lib/access";

const schema = z.object({ code: z.string().min(1).max(100) });

/**
 * Code entry (PRD v2 §1.1). One field, no account, no password rules — the
 * whole interaction is "type what's printed on the order of service".
 *
 * Wrong codes are rate-limited per IP and per page. That is what keeps a soft
 * gate a gate: a human reading a code off a card gets in first try, a scraper
 * working through a wordlist gets ten attempts an hour.
 */
export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid request." }, { status: 400 });

  const ip = clientIp(request);
  const allowed =
    (await rateLimit(
      `access:code:ip:${ip}`,
      RATE_LIMITS.accessCodePerIpPerHour.max,
      RATE_LIMITS.accessCodePerIpPerHour.window,
    )) &&
    (await rateLimit(
      `access:code:page:${id}`,
      RATE_LIMITS.accessCodePerPagePerHour.max,
      RATE_LIMITS.accessCodePerPagePerHour.window,
    ));
  if (!allowed) {
    return NextResponse.json(
      { error: "Too many attempts. Please wait a little and try again." },
      { status: 429 },
    );
  }

  const admin = createAdminClient();
  const { data: page } = await admin
    .from("pages")
    .select(`id, random_id, status, access_code_hash, ${ACCESS_COLUMNS}`)
    .eq("id", id)
    .maybeSingle<AccessPage & { status: string; access_code_hash: string | null }>();

  if (!page || page.status === "soft_deleted") {
    return NextResponse.json({ error: "Page not found." }, { status: 404 });
  }
  if (accessMode(page) !== "code") {
    return NextResponse.json({ error: "This page doesn't use an access code." }, { status: 400 });
  }

  if (!verifyAccessCode(parsed.data.code, page.access_code_hash)) {
    return NextResponse.json(
      { error: "That code didn't work. Check the spelling and try again." },
      { status: 403 },
    );
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(
    accessCookieName(page.random_id),
    createAccessCookieValue({
      pageId: page.id,
      mode: "code",
      rotatedAt: page.access_code_rotated_at,
      email: "",
    }),
    {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      maxAge: accessCookieMaxAge(),
      path: "/",
    },
  );
  return response;
}
