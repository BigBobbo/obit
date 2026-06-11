import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { rateLimit, clientIp, RATE_LIMITS } from "@/lib/rate-limit";
import { verifyTurnstile } from "@/lib/turnstile";
import { tier0Text, tier0Image } from "@/lib/moderation/tier0";
import { runModerationPipeline } from "@/lib/moderation/pipeline";
import { processAndStoreImage, toModerationJpeg } from "@/lib/images";
import { sendVerificationCode, sendMemoryReceipt } from "@/lib/email";
import { generateVerificationCode } from "@/lib/ids";
import { normalizeEmail } from "@/lib/utils";
import { readContributorCookie, contributorCookieName } from "@/lib/contributor-cookie";

export const maxDuration = 60;

const MAX_PHOTOS = 10;

const fieldsSchema = z.object({
  pageId: z.string().uuid(),
  name: z.string().trim().min(1).max(100),
  email: z.string().email(),
  body: z.string().max(2000),
});

/**
 * Memory submission (PRD §4.3). Deliberately low friction, but every
 * submission passes Turnstile, rate limits and Tier 0 before anything is
 * stored, and email verification before it enters the Tier 1/2 pipeline.
 */
export async function POST(request: Request) {
  const ip = clientIp(request);
  const form = await request.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  const parsed = fieldsSchema.safeParse({
    pageId: form.get("pageId"),
    name: form.get("name"),
    email: form.get("email"),
    body: form.get("body") ?? "",
  });
  if (!parsed.success) {
    return NextResponse.json({ error: "Please check the form and try again." }, { status: 400 });
  }
  const { pageId, name, body } = parsed.data;
  const email = normalizeEmail(parsed.data.email);

  const photos = form.getAll("photos").filter((f): f is File => f instanceof File && f.size > 0);
  if (photos.length > MAX_PHOTOS) {
    return NextResponse.json({ error: `At most ${MAX_PHOTOS} photos per memory.` }, { status: 400 });
  }
  if (body.trim().length === 0 && photos.length === 0) {
    return NextResponse.json({ error: "Add a memory or at least one photo." }, { status: 400 });
  }

  // --- Bot defense ---
  const turnstileOk = await verifyTurnstile(form.get("turnstileToken") as string | null, ip);
  if (!turnstileOk) {
    return NextResponse.json({ error: "Verification failed. Please reload and try again." }, { status: 403 });
  }

  // --- Rate limits (per email, per IP, per page) ---
  const rl = RATE_LIMITS;
  const allowed =
    (await rateLimit(`submit:email:${email}`, rl.submitPerEmailPerDay.max, rl.submitPerEmailPerDay.window)) &&
    (await rateLimit(`submit:ip:${ip}`, rl.submitPerIpPerDay.max, rl.submitPerIpPerDay.window)) &&
    (await rateLimit(`submit:page:${pageId}`, rl.submitPerPagePerDay.max, rl.submitPerPagePerDay.window));
  if (!allowed) {
    return NextResponse.json(
      { error: "This page has reached today's contribution limit. Please try again tomorrow." },
      { status: 429 },
    );
  }

  const supabase = createAdminClient();

  // Page must exist and accept submissions (soft-deleted pages don't).
  const { data: page } = await supabase
    .from("pages")
    .select("id, name, status")
    .eq("id", pageId)
    .single();
  if (!page || page.status === "soft_deleted") {
    return NextResponse.json({ error: "Page not found." }, { status: 404 });
  }

  // Photo cap: free pages hold ~50 photos (PRD §8) — enforced against the
  // page owner's plan, server-side.
  if (photos.length > 0) {
    const { data: owner } = await supabase
      .from("stewards")
      .select("profiles!inner(plan)")
      .eq("page_id", pageId)
      .eq("role", "owner")
      .single();
    const ownerPlan = (owner?.profiles as unknown as { plan: string })?.plan ?? "free";
    const { limitsFor } = await import("@/lib/plan");
    const cap = limitsFor(ownerPlan).maxPhotosPerPage;
    if (cap !== Infinity) {
      const { count: existing } = await supabase
        .from("photos")
        .select("id", { count: "exact", head: true })
        .eq("page_id", pageId);
      if ((existing ?? 0) + photos.length > cap) {
        return NextResponse.json(
          { error: "This page has reached its photo limit. You can still share a written memory." },
          { status: 403 },
        );
      }
    }
  }

  // Per-page contributor block ("reject + block this contributor from this page").
  const { data: pageBlock } = await supabase
    .from("contributor_page_blocks")
    .select("email")
    .eq("page_id", pageId)
    .eq("email", email)
    .maybeSingle();
  if (pageBlock) {
    return NextResponse.json({ error: "Your submission could not be accepted." }, { status: 403 });
  }

  // --- Tier 0: text ---
  const textCheck = await tier0Text(body, email, ip);
  if (!textCheck.ok) {
    return NextResponse.json({ error: textCheck.userMessage }, { status: 422 });
  }

  // --- Tier 0: images (before anything is stored) ---
  const buffers: Buffer[] = [];
  for (const photo of photos) {
    const buf = Buffer.from(await photo.arrayBuffer());
    let moderationJpeg: Buffer;
    try {
      moderationJpeg = await toModerationJpeg(buf);
    } catch {
      return NextResponse.json({ error: "One of your photos could not be read." }, { status: 422 });
    }
    const imageCheck = await tier0Image(moderationJpeg);
    if (!imageCheck.ok) {
      return NextResponse.json({ error: imageCheck.userMessage }, { status: 422 });
    }
    buffers.push(buf);
  }

  // --- Create the memory (pending email verification) ---
  const code = generateVerificationCode();
  const { data: memory, error: insertErr } = await supabase
    .from("memories")
    .insert({
      page_id: pageId,
      contributor_email: email,
      contributor_name: name,
      body,
      status: "pending_verification",
      verification_code: code,
      verification_expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
    })
    .select("id, removal_token")
    .single();
  if (insertErr || !memory) {
    console.error("memory insert failed", insertErr);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }

  // --- Store photos (EXIF stripped, web sizes generated) ---
  for (let i = 0; i < buffers.length; i++) {
    try {
      const processed = await processAndStoreImage(
        buffers[i],
        `pages/${pageId}/memories/${memory.id}/${i}`,
      );
      await supabase.from("photos").insert({
        page_id: pageId,
        memory_id: memory.id,
        original_path: processed.originalPath,
        sizes: processed.sizes,
      });
    } catch (err) {
      console.error("photo processing failed", err);
      return NextResponse.json(
        { error: "One of your photos could not be processed." },
        { status: 422 },
      );
    }
  }

  await supabase.from("contributors").upsert(
    { email },
    { onConflict: "email", ignoreDuplicates: true },
  );

  // --- Returning contributor skip (signed cookie + approval history) ---
  const cookieStore = await cookies();
  const cookieEmail = readContributorCookie(cookieStore.get(contributorCookieName())?.value);
  if (cookieEmail === email) {
    const { data: contributor } = await supabase
      .from("contributors")
      .select("verified_at, approved_count")
      .eq("email", email)
      .maybeSingle();
    if (contributor?.verified_at && contributor.approved_count >= 1) {
      await supabase
        .from("memories")
        .update({ status: "pending", verification_code: null })
        .eq("id", memory.id);
      const outcome = await runModerationPipeline(memory.id);
      await sendMemoryReceipt(email, page.name, memory.id, memory.removal_token, outcome === "approved");
      return NextResponse.json({ memoryId: memory.id, verified: true, status: outcome });
    }
  }

  // --- Email verification (rate-limited) ---
  const codeAllowed = await rateLimit(
    `verifycode:${email}`,
    RATE_LIMITS.verifyCodePerEmailPerHour.max,
    RATE_LIMITS.verifyCodePerEmailPerHour.window,
  );
  if (!codeAllowed) {
    return NextResponse.json(
      { error: "Too many verification emails requested. Please try again later." },
      { status: 429 },
    );
  }
  await sendVerificationCode(email, code, page.name);

  return NextResponse.json({ memoryId: memory.id, verified: false });
}
