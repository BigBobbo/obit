import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { rateLimit, clientIp } from "@/lib/rate-limit";

const schema = z.object({
  token: z.string().min(1),
  response: z.string().trim().min(1).max(4000),
});

/**
 * The reporter answering the admin's follow-up question (PRD §4.6).
 *
 * Answering is what stops the 30-day auto-close clock: the report goes back
 * into the escalation queue with the new detail appended, rather than ageing
 * out unread.
 */
export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Please write a reply first." }, { status: 400 });
  }

  const allowed = await rateLimit(`report-response:ip:${clientIp(request)}`, 20, 86400);
  if (!allowed) {
    return NextResponse.json({ error: "Too many replies. Please try again later." }, { status: 429 });
  }

  const admin = createAdminClient();
  const { data: report } = await admin
    .from("reports")
    .select("id, status, response_token, evidence_text")
    .eq("id", id)
    .maybeSingle();

  if (!report || !tokensMatch(report.response_token, parsed.data.token)) {
    return NextResponse.json({ error: "This link is not valid." }, { status: 404 });
  }
  if (report.status === "resolved") {
    return NextResponse.json({ error: "This report has already been resolved." }, { status: 409 });
  }

  const appended = [
    report.evidence_text ?? "",
    `\n\n--- Reporter reply (${new Date().toISOString()}) ---\n${parsed.data.response}`,
  ]
    .join("")
    .trim();

  await admin
    .from("reports")
    .update({
      evidence_text: appended,
      // Back to the admin queue, and the auto-close clock stops with it.
      status: "escalated",
      escalated_at: new Date().toISOString(),
      follow_up_sent_at: null,
    })
    .eq("id", id);

  return NextResponse.json({ ok: true });
}

function tokensMatch(expected: string, provided: string): boolean {
  const a = Buffer.from(expected);
  const b = Buffer.from(provided);
  return a.length === b.length && timingSafeEqual(a, b);
}
