import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { processAndStoreImage, toModerationJpeg } from "@/lib/images";
import { tier0Image } from "@/lib/moderation/tier0";
import { touchStewardActivity } from "@/lib/audit";

export const maxDuration = 60;

/** Cover photo upload (steward only). Same sharp + Tier 0 pipeline. */
export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id: pageId } = await ctx.params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const admin = createAdminClient();
  const { data: steward } = await admin
    .from("stewards")
    .select("id")
    .eq("page_id", pageId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!steward) return NextResponse.json({ error: "Not a steward of this page" }, { status: 403 });

  const form = await request.formData().catch(() => null);
  const file = form?.get("photo");
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "No photo provided" }, { status: 400 });
  }

  const buf = Buffer.from(await file.arrayBuffer());
  let moderationJpeg: Buffer;
  try {
    moderationJpeg = await toModerationJpeg(buf);
  } catch {
    return NextResponse.json({ error: "That image could not be read." }, { status: 422 });
  }
  const check = await tier0Image(moderationJpeg);
  if (!check.ok) {
    return NextResponse.json({ error: check.userMessage }, { status: 422 });
  }

  try {
    const processed = await processAndStoreImage(buf, `pages/${pageId}/cover/${Date.now()}`);
    await admin.from("photos").insert({
      page_id: pageId,
      is_cover: true,
      original_path: processed.originalPath,
      sizes: processed.sizes,
    });
    await admin
      .from("pages")
      .update({ cover_photo_path: processed.sizes.large?.path ?? processed.sizes.medium?.path })
      .eq("id", pageId);
  } catch (err) {
    console.error("cover upload failed", err);
    return NextResponse.json({ error: "Upload failed. Please try again." }, { status: 500 });
  }

  await touchStewardActivity(pageId, user.id, "cover_photo_updated");
  return NextResponse.json({ ok: true });
}
