import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { rateLimit, clientIp, RATE_LIMITS } from "@/lib/rate-limit";
import { verifyTurnstile } from "@/lib/turnstile";
import { normalizeEmail } from "@/lib/utils";

const CATEGORIES = [
  "fake_memorial",
  "impersonation_or_ownership",
  "harassment",
  "inappropriate",
  "spam",
  "copyright",
  "csam_or_illegal",
] as const;

const schema = z.object({
  pageRandomId: z.string().min(1),
  memoryId: z.string().uuid().optional(),
  category: z.enum(CATEGORIES),
  reporterEmail: z.string().email(),
  relationship: z.string().max(300).optional().default(""),
  evidence: z.string().max(4000).optional().default(""),
  turnstileToken: z.string().optional().default(""),
});

/**
 * Reporting (PRD §4.6).
 * - Memory reports route to stewards; page-level reports escalate to admin.
 * - Fake-memorial / ownership reports require relationship + evidence text —
 *   this keeps frivolous reports out of the admin queue.
 * - CSAM/illegal reports never auto-close and escalate immediately.
 */
export async function POST(request: Request) {
  const ip = clientIp(request);
  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid report." }, { status: 400 });
  const input = parsed.data;

  const turnstileOk = await verifyTurnstile(input.turnstileToken || null, ip);
  if (!turnstileOk) {
    return NextResponse.json({ error: "Verification failed. Please reload and try again." }, { status: 403 });
  }

  const email = normalizeEmail(input.reporterEmail);
  const allowed =
    (await rateLimit(`report:ip:${ip}`, RATE_LIMITS.reportPerIpPerDay.max, RATE_LIMITS.reportPerIpPerDay.window)) &&
    (await rateLimit(`report:email:${email}`, RATE_LIMITS.reportPerEmailPerDay.max, RATE_LIMITS.reportPerEmailPerDay.window));
  if (!allowed) {
    return NextResponse.json({ error: "Too many reports submitted. Please try again later." }, { status: 429 });
  }

  // Evidence requirement for serious accusations (PRD §4.6).
  if (
    (input.category === "fake_memorial" || input.category === "impersonation_or_ownership") &&
    (input.relationship.trim().length < 3 || input.evidence.trim().length < 20)
  ) {
    return NextResponse.json(
      {
        error:
          "For this kind of report, please describe your relationship to the person and provide some detail we can verify.",
      },
      { status: 400 },
    );
  }

  const supabase = createAdminClient();
  const { data: page } = await supabase
    .from("pages")
    .select("id")
    .or(`random_id.eq.${input.pageRandomId},slug.eq.${input.pageRandomId}`)
    .maybeSingle();
  if (!page) return NextResponse.json({ error: "Page not found." }, { status: 404 });

  if (input.memoryId) {
    const { data: memory } = await supabase
      .from("memories")
      .select("id")
      .eq("id", input.memoryId)
      .eq("page_id", page.id)
      .maybeSingle();
    if (!memory) return NextResponse.json({ error: "Memory not found." }, { status: 404 });
  }

  const isMemoryReport = Boolean(input.memoryId);
  const isCsam = input.category === "csam_or_illegal";
  // Memory reports go to stewards first; page-level and CSAM go to the admin
  // escalation queue (PRD §4.6, §5).
  const status = isCsam ? "escalated" : isMemoryReport ? "steward" : "escalated";

  await supabase.from("reports").insert({
    target_type: isMemoryReport ? "memory" : "page",
    page_id: page.id,
    memory_id: input.memoryId ?? null,
    category: input.category,
    reporter_email: email,
    reporter_relationship: input.relationship || null,
    evidence_text: input.evidence || null,
    status,
    never_autoclose: isCsam,
  });

  return NextResponse.json({ ok: true });
}
