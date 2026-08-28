import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { removeMemory } from "@/lib/moderation/removal";
import { logEvent } from "@/lib/audit";

/**
 * Contributor-initiated removal (PRD §6 data deletion): the link in the
 * confirmation email carries the per-memory removal token.
 *
 * POST, not GET. Mail scanners, corporate link rewriters and link previewers
 * fetch URLs in email without a human involved, and a destructive GET means a
 * memory can vanish because a security appliance opened the receipt. The link
 * in the email points at /memories/[id]/remove, which confirms and then posts
 * here.
 */
export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const token = new URL(request.url).searchParams.get("token");
  if (!token) {
    return NextResponse.json({ error: "Missing token" }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { data: memory } = await supabase
    .from("memories")
    .select("id, removal_token, contributor_email, status")
    .eq("id", id)
    .single();

  if (!memory || !tokensMatch(memory.removal_token, token)) {
    return NextResponse.json({ error: "This removal link is not valid." }, { status: 404 });
  }

  // Already removed — report success so a double-submit is not an error.
  if (memory.status !== "rejected") {
    await removeMemory(id);
    await logEvent({
      actorEmail: memory.contributor_email,
      action: "memory_removed_by_contributor",
      meta: { memory_id: id },
    });
  }

  return NextResponse.json({ ok: true });
}

function tokensMatch(expected: string, provided: string): boolean {
  const a = Buffer.from(expected);
  const b = Buffer.from(provided);
  return a.length === b.length && timingSafeEqual(a, b);
}
