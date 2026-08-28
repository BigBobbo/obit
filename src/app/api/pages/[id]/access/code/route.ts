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
 * The metering below is deliberately two-part, because the obvious version gets
 * this wrong. A funeral is exactly the situation where dozens of people arrive
 * through one carrier NAT within an hour: if correct entries counted against
 * the same quota as guesses, the gate would lock out the mourners rather than
 * the scraper.
 *
 *   - every request costs one *attempt*, which bounds the scrypt work a
 *     stranger can make us do;
 *   - only a *wrong* code costs a guess, and guesses are what run out.
 *
 * A human reading a code off a card gets in first try; a wordlist gets twenty
 * tries an hour from one address, and a hundred against one page.
 */
export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid request." }, { status: 400 });

  const ip = clientIp(request);
  const rl = RATE_LIMITS;
  const tooBusy = !(await rateLimit(
    `access:code:attempt:${ip}`,
    rl.accessCodeAttemptsPerIpPerHour.max,
    rl.accessCodeAttemptsPerIpPerHour.window,
  ));
  if (tooBusy) {
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
    // Only now is a guess spent.
    const withinBudget =
      (await rateLimit(
        `access:code:wrong:ip:${ip}`,
        rl.wrongAccessCodePerIpPerHour.max,
        rl.wrongAccessCodePerIpPerHour.window,
      )) &&
      (await rateLimit(
        `access:code:wrong:page:${id}`,
        rl.wrongAccessCodePerPagePerHour.max,
        rl.wrongAccessCodePerPagePerHour.window,
      ));
    return NextResponse.json(
      {
        error: withinBudget
          ? "That code didn't work. Check the spelling and try again."
          : "Too many attempts. Please wait a little and try again.",
      },
      { status: withinBudget ? 403 : 429 },
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
