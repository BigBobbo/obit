import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Full-resolution original, for stewards only (PRD §6).
 *
 * Originals live in a private bucket and are never served publicly — the feed
 * only ever gets the web renditions. A steward moderating a photo, or keeping
 * the family's copy, needs the real thing, so they get a short-lived signed
 * URL minted server-side after the stewardship check.
 */
export async function GET(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const admin = createAdminClient();
  const { data: photo } = await admin
    .from("photos")
    .select("id, page_id, original_path")
    .eq("id", id)
    .maybeSingle();
  if (!photo) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { data: steward } = await admin
    .from("stewards")
    .select("id")
    .eq("page_id", photo.page_id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!steward) return NextResponse.json({ error: "Not a steward of this page" }, { status: 403 });

  // Short expiry: the link is for the person who just clicked it, not
  // something to paste around.
  const { data: signed, error } = await admin.storage
    .from("originals")
    .createSignedUrl(photo.original_path, 60);
  if (error || !signed) {
    console.error("failed to sign original", error);
    return NextResponse.json({ error: "Could not open that photo." }, { status: 500 });
  }

  return NextResponse.redirect(signed.signedUrl, 302);
}
