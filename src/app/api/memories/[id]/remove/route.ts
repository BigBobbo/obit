import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { logEvent } from "@/lib/audit";

/**
 * Contributor-initiated removal (PRD §6 data deletion): the link in the
 * confirmation email carries the per-memory removal token.
 */
export async function GET(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const token = new URL(request.url).searchParams.get("token");
  if (!token) return new NextResponse("Missing token", { status: 400 });

  const supabase = createAdminClient();
  const { data: memory } = await supabase
    .from("memories")
    .select("id, removal_token, contributor_email, status")
    .eq("id", id)
    .single();

  if (!memory || memory.removal_token !== token) {
    return new NextResponse("This removal link is not valid.", { status: 404 });
  }

  await supabase.from("memories").update({ status: "rejected" }).eq("id", id);
  await logEvent({
    actorEmail: memory.contributor_email,
    action: "memory_removed_by_contributor",
    meta: { memory_id: id },
  });

  return new NextResponse(
    `<html><body style="font-family: Georgia, serif; max-width: 480px; margin: 80px auto; text-align: center;">
      <h1 style="font-size: 22px;">Your memory has been removed</h1>
      <p style="color:#666;">It is no longer visible on the memorial page.</p>
    </body></html>`,
    { headers: { "Content-Type": "text/html" } },
  );
}
