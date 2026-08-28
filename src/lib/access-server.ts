import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  accessCookieName,
  approvalAdmits,
  decideAccess,
  isGated,
  readAccessCookie,
  type AccessPage,
  type AccessView,
} from "@/lib/access";

/**
 * Server-side half of the access model (PRD v2 §1): who is standing at the
 * door. The decision itself is pure and lives in `src/lib/access.ts`; this file
 * is the part that has to touch cookies and the database.
 */

export type Viewer = {
  /** A steward of this page, or a platform admin. */
  steward: boolean;
  /** Holds a valid visitor cookie, still backed by an approval where one is needed. */
  admitted: boolean;
  /** The verified email behind an approved-mode admission, when there is one. */
  email: string | null;
};

/** True for a steward of the page or a platform admin. */
export async function isPageSteward(pageId: string): Promise<boolean> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;

  const admin = createAdminClient();
  const { data: steward } = await admin
    .from("stewards")
    .select("id")
    .eq("page_id", pageId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (steward) return true;

  const { data: profile } = await admin
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .maybeSingle();
  return profile?.is_admin === true;
}

/**
 * Whether an approved-mode visitor is still approved. Re-checked on every view
 * rather than trusted from the cookie, so a steward who withdraws an approval
 * doesn't have to wait six months for the cookie to lapse.
 */
export async function approvalStillStands(pageId: string, email: string): Promise<boolean> {
  if (!email) return false;
  const admin = createAdminClient();
  const { data } = await admin
    .from("access_requests")
    .select("status, verified_at")
    .eq("page_id", pageId)
    .eq("email", email)
    .maybeSingle();
  return data ? approvalAdmits(data) : false;
}

export async function resolveViewer(page: AccessPage): Promise<Viewer> {
  const steward = await isPageSteward(page.id);
  if (!isGated(page)) return { steward, admitted: true, email: null };
  if (steward) return { steward: true, admitted: true, email: null };

  const jar = await cookies();
  const claim = readAccessCookie(jar.get(accessCookieName(page.random_id))?.value, page);
  if (!claim) return { steward: false, admitted: false, email: null };

  if (claim.mode === "approved") {
    const stillApproved = await approvalStillStands(page.id, claim.email);
    return { steward: false, admitted: stillApproved, email: stillApproved ? claim.email : null };
  }
  return { steward: false, admitted: true, email: null };
}

export async function resolveAccess(
  page: AccessPage,
): Promise<{ viewer: Viewer; access: AccessView }> {
  const viewer = await resolveViewer(page);
  return { viewer, access: decideAccess(page, viewer) };
}

/**
 * Guard for the API routes and media routes that serve memorial-only content.
 * Mirrors `resolveAccess`, but answers a yes/no rather than choosing a view.
 */
export async function canReadMemorial(page: AccessPage): Promise<boolean> {
  const viewer = await resolveViewer(page);
  return viewer.steward || viewer.admitted;
}

/**
 * Events are the one thing that can be public on an otherwise gated page: an
 * announcement whose whole job is "the service is at eleven" has to hand out
 * the service details, and the calendar file with them.
 */
export async function canSeeEvent(
  page: AccessPage,
  event: { on_announcement: boolean },
): Promise<boolean> {
  if (!isGated(page)) return true;
  if (event.on_announcement && page.announcement_enabled) return true;
  return canReadMemorial(page);
}
