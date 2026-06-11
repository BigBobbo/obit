import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { runModerationPipeline } from "@/lib/moderation/pipeline";
import { sendMemoryReceipt } from "@/lib/email";
import {
  createContributorCookieValue,
  contributorCookieName,
  contributorCookieMaxAge,
} from "@/lib/contributor-cookie";

export const maxDuration = 60;

const schema = z.object({
  memoryId: z.string().uuid(),
  code: z.string().regex(/^\d{6}$/),
});

/**
 * Confirms the 6-digit email verification code, then runs the Tier 1/2
 * moderation pipeline (PRD §4.3, §5).
 */
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  const { memoryId, code } = parsed.data;

  const supabase = createAdminClient();
  const { data: memory } = await supabase
    .from("memories")
    .select(
      "id, page_id, contributor_email, status, verification_code, verification_expires_at, verification_attempts, removal_token",
    )
    .eq("id", memoryId)
    .single();

  if (!memory || memory.status !== "pending_verification") {
    return NextResponse.json({ error: "This submission can no longer be verified." }, { status: 410 });
  }
  if (memory.verification_attempts >= 5) {
    return NextResponse.json({ error: "Too many attempts. Please submit again." }, { status: 429 });
  }
  if (!memory.verification_expires_at || new Date(memory.verification_expires_at) < new Date()) {
    return NextResponse.json({ error: "That code has expired. Please submit again." }, { status: 410 });
  }

  if (memory.verification_code !== code) {
    await supabase
      .from("memories")
      .update({ verification_attempts: memory.verification_attempts + 1 })
      .eq("id", memoryId);
    return NextResponse.json({ error: "That code didn't match. Please try again." }, { status: 400 });
  }

  // Verified: mark contributor, advance the memory into the pipeline.
  await supabase
    .from("contributors")
    .upsert({ email: memory.contributor_email, verified_at: new Date().toISOString() });
  await supabase
    .from("memories")
    .update({ status: "pending", verification_code: null })
    .eq("id", memoryId);

  const outcome = await runModerationPipeline(memoryId);

  const { data: page } = await supabase
    .from("pages")
    .select("name")
    .eq("id", memory.page_id)
    .single();
  await sendMemoryReceipt(
    memory.contributor_email,
    page?.name ?? "the memorial page",
    memory.id,
    memory.removal_token,
    outcome === "approved",
  );

  const response = NextResponse.json({ status: outcome });
  response.cookies.set(contributorCookieName(), createContributorCookieValue(memory.contributor_email), {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: contributorCookieMaxAge(),
    path: "/",
  });
  return response;
}
