import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyTurnstile } from "@/lib/turnstile";
import { rateLimit, clientIp, RATE_LIMITS } from "@/lib/rate-limit";
import { generatePageId } from "@/lib/ids";
import { limitsFor } from "@/lib/plan";
import { logEvent } from "@/lib/audit";

const schema = z.object({
  name: z.string().trim().min(1).max(200),
  dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  dateOfDeath: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  bio: z.string().max(10000).optional().default(""),
  obituaryUrl: z.string().url().max(500).optional().or(z.literal("")),
  turnstileToken: z.string().optional().default(""),
  // Creator saw the dedupe warning and chose to proceed anyway.
  confirmDuplicate: z.boolean().optional().default(false),
});

/**
 * Page creation (PRD §4.2) — deliberately higher friction: verified account,
 * required dates, Turnstile, dedupe check, per-account rate limit.
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Please sign in first." }, { status: 401 });

  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Please check the form and try again." }, { status: 400 });
  }
  const input = parsed.data;

  if (new Date(input.dateOfDeath) < new Date(input.dateOfBirth)) {
    return NextResponse.json({ error: "Date of death must be after date of birth." }, { status: 400 });
  }

  const ip = clientIp(request);
  const turnstileOk = await verifyTurnstile(input.turnstileToken || null, ip);
  if (!turnstileOk) {
    return NextResponse.json({ error: "Verification failed. Please reload and try again." }, { status: 403 });
  }

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("plan")
    .eq("id", user.id)
    .single();
  const limits = limitsFor(profile?.plan ?? "free");

  // Plan limit: number of pages owned.
  const { count: ownedCount } = await admin
    .from("stewards")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("role", "owner");
  if ((ownedCount ?? 0) >= limits.maxPages) {
    return NextResponse.json(
      { error: "Your plan includes one memorial page. Upgrade to create more.", code: "plan_limit" },
      { status: 403 },
    );
  }

  // Rate limit: pages per account per 30 days + per-IP.
  const ipOk = await rateLimit(
    `pagecreate:ip:${ip}`,
    RATE_LIMITS.pageCreatePerIpPerDay.max,
    RATE_LIMITS.pageCreatePerIpPerDay.window,
  );
  const accountOk = await rateLimit(
    `pagecreate:user:${user.id}`,
    limits.pagesPer30Days,
    30 * 86400,
  );
  if (!ipOk || !accountOk) {
    return NextResponse.json(
      { error: "You've created the maximum number of pages for now. Please try again later." },
      { status: 429 },
    );
  }

  // Dedupe: same name + DOB + DOD (PRD §4.2). Warn before creating.
  const { data: duplicates } = await admin
    .from("pages")
    .select("id, random_id, name")
    .ilike("name", input.name)
    .eq("date_of_birth", input.dateOfBirth)
    .eq("date_of_death", input.dateOfDeath)
    .neq("status", "soft_deleted")
    .limit(3);
  if ((duplicates?.length ?? 0) > 0 && !input.confirmDuplicate) {
    return NextResponse.json(
      {
        code: "duplicate",
        error:
          "A page for this person may already exist. You can ask to join it as a co-steward, dispute its ownership, or create a separate page anyway.",
        duplicates: duplicates!.map((d) => ({ randomId: d.random_id, name: d.name })),
      },
      { status: 409 },
    );
  }

  const randomId = generatePageId();
  const { data: page, error: insertErr } = await admin
    .from("pages")
    .insert({
      random_id: randomId,
      name: input.name,
      date_of_birth: input.dateOfBirth,
      date_of_death: input.dateOfDeath,
      bio: input.bio,
      obituary_url: input.obituaryUrl || null,
      created_by: user.id,
    })
    .select("id, random_id")
    .single();
  if (insertErr || !page) {
    console.error("page insert failed", insertErr);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }

  await admin.from("stewards").insert({ page_id: page.id, user_id: user.id, role: "owner" });
  await logEvent({ actorUserId: user.id, pageId: page.id, action: "page_created" });

  return NextResponse.json({ pageId: page.id, randomId: page.random_id });
}
