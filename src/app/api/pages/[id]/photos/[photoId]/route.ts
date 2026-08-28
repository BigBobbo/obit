import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { canReadMemorial } from "@/lib/access-server";
import { ACCESS_COLUMNS, isGated, type AccessPage } from "@/lib/access";
import { publicPhotoUrl } from "@/lib/images";

/**
 * Contributed photos on a gated page (PRD v2 §2, acceptance criterion 3).
 *
 * Web renditions live in a *public* storage bucket, so a URL is a permanent
 * capability once it has been handed out. On a `code` or `approved` page we
 * therefore never put one in the HTML: the markup points here instead, and this
 * route proxies the bytes only for a visitor who is already inside.
 *
 * `link` pages redirect to the CDN as before — there is nothing to protect, and
 * proxying every image would be a pointless bandwidth tax.
 */
const SIZES = new Set(["thumb", "medium", "large"]);

export async function GET(
  request: Request,
  ctx: { params: Promise<{ id: string; photoId: string }> },
) {
  const { id, photoId } = await ctx.params;
  const size = new URL(request.url).searchParams.get("size") ?? "medium";
  if (!SIZES.has(size)) return NextResponse.json({ error: "Unknown size" }, { status: 400 });

  const admin = createAdminClient();
  const { data: page } = await admin
    .from("pages")
    .select(`id, random_id, status, ${ACCESS_COLUMNS}`)
    .eq("id", id)
    .maybeSingle<AccessPage & { status: string }>();
  if (!page || !["active", "inactivity_hold"].includes(page.status)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { data: photo } = await admin
    .from("photos")
    .select("id, page_id, memory_id, is_cover, sizes, memories(status)")
    .eq("id", photoId)
    .eq("page_id", id)
    .maybeSingle();
  if (!photo) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Never serve a photo whose memory isn't published — the gate is not a way
  // around the moderation queue.
  const memoryStatus = (photo.memories as unknown as { status: string } | null)?.status;
  if (!photo.is_cover && memoryStatus !== "approved") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (isGated(page) && !photo.is_cover && !(await canReadMemorial(page))) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const sizes = (photo.sizes ?? {}) as Record<string, { path: string }>;
  const path = sizes[size]?.path ?? sizes.medium?.path ?? sizes.thumb?.path;
  if (!path) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (!isGated(page) || photo.is_cover) {
    return NextResponse.redirect(publicPhotoUrl(path));
  }

  const { data: blob, error } = await admin.storage.from("photos").download(path);
  if (error || !blob) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return new NextResponse(blob.stream(), {
    headers: {
      "Content-Type": "image/jpeg",
      // Private: a shared cache must not hold a gated page's photo where the
      // next visitor could be handed it without a cookie.
      "Cache-Control": "private, max-age=3600",
      "X-Robots-Tag": "noindex, nofollow, noarchive",
    },
  });
}
