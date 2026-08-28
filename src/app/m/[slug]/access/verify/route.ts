import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendAccessRequestNotification } from "@/lib/email";
import {
  ACCESS_COLUMNS,
  accessCookieMaxAge,
  accessCookieName,
  approvalAdmits,
  createAccessCookieValue,
  type AccessPage,
} from "@/lib/access";

/**
 * The one link in the access-request email (PRD v2 §1.1). It does both jobs, so
 * the visitor never has to know which state they are in:
 *
 *   - first click  → proves the address, and admits them if the family had
 *                    already pre-approved it
 *   - later clicks → admits them once the family has said yes
 *
 * A click that isn't admitted lands back on the page with the same neutral
 * sentence a declined requester sees. Declines stay silent.
 *
 * A route handler rather than a page because it has to set the visitor cookie,
 * which a Server Component may not do.
 */
export async function GET(request: Request, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  const token = new URL(request.url).searchParams.get("token");
  const back = (suffix = "") => NextResponse.redirect(new URL(`/m/${slug}${suffix}`, request.url));

  if (!token || !/^[0-9a-f-]{36}$/i.test(token)) return back("?access=invalid");

  const admin = createAdminClient();
  const { data: req } = await admin
    .from("access_requests")
    .select("id, page_id, email, name, relationship, status, verified_at")
    .eq("verify_token", token)
    .maybeSingle();
  if (!req) return back("?access=invalid");

  const { data: page } = await admin
    .from("pages")
    .select(`id, random_id, name, status, ${ACCESS_COLUMNS}`)
    .eq("id", req.page_id)
    .maybeSingle<AccessPage & { name: string; status: string }>();
  if (!page || page.status === "soft_deleted") return back("?access=invalid");

  const firstVerification = !req.verified_at;
  if (firstVerification) {
    await admin
      .from("access_requests")
      .update({ verified_at: new Date().toISOString() })
      .eq("id", req.id);
    req.verified_at = new Date().toISOString();
  }

  const admitted = approvalAdmits({ status: req.status, verified_at: req.verified_at });

  // Stewards hear about a request only once, and only after the address is
  // proven — an unverified address never reaches the family's queue.
  if (firstVerification && req.status === "pending") {
    const { data: stewards } = await admin
      .from("stewards")
      .select("profiles!inner(email)")
      .eq("page_id", page.id);
    for (const s of stewards ?? []) {
      await sendAccessRequestNotification((s.profiles as unknown as { email: string }).email, {
        pageName: page.name,
        pageId: page.id,
        requesterName: req.name || req.email,
        relationship: req.relationship ?? "",
      });
    }
  }

  const response = NextResponse.redirect(
    new URL(`/m/${page.random_id}${admitted ? "" : "?access=requested"}`, request.url),
  );
  if (admitted) {
    response.cookies.set(
      accessCookieName(page.random_id),
      createAccessCookieValue({ pageId: page.id, mode: "approved", email: req.email }),
      {
        httpOnly: true,
        secure: true,
        sameSite: "lax",
        maxAge: accessCookieMaxAge(),
        path: "/",
      },
    );
  }
  return response;
}
