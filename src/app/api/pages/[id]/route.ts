import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { limitsFor } from "@/lib/plan";
import { touchStewardActivity, logEvent } from "@/lib/audit";
import { hashAccessCode, isValidAccessCode, normalizeAccessCode } from "@/lib/access";

const patchSchema = z.object({
  name: z.string().trim().min(1).max(200).optional(),
  bio: z.string().max(10000).optional(),
  reviewEverything: z.boolean().optional(),
  // Opting out of the inactivity fail-safe sits behind a warning dialog in the UI.
  autoPublishOptout: z.boolean().optional(),
  slug: z
    .string()
    .regex(/^[a-z0-9][a-z0-9-]{2,80}$/)
    .nullable()
    .optional(),
  // PRD v2 §1: the access model.
  accessMode: z.enum(["link", "code", "approved"]).optional(),
  // Setting this sets *or rotates* the code; rotating invalidates every
  // visitor cookie, which is the point of having a rotate button at all.
  accessCode: z.string().max(100).optional(),
  announcementEnabled: z.boolean().optional(),
  announcementText: z.string().max(600).optional(),
});

async function requireSteward(pageId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: NextResponse.json({ error: "Not signed in" }, { status: 401 }) };

  const admin = createAdminClient();
  const { data: steward } = await admin
    .from("stewards")
    .select("role")
    .eq("page_id", pageId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!steward) {
    return { error: NextResponse.json({ error: "Not a steward of this page" }, { status: 403 }) };
  }
  return { user, role: steward.role as "owner" | "co_steward", admin };
}

/** Page settings (PRD §4.5). */
export async function PATCH(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const auth = await requireSteward(id);
  if ("error" in auth) return auth.error;
  const { user, admin } = auth;

  const body = await request.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  const input = parsed.data;

  const updates: Record<string, unknown> = {};
  if (input.name !== undefined) updates.name = input.name;
  if (input.bio !== undefined) updates.bio = input.bio;
  if (input.reviewEverything !== undefined) updates.review_everything = input.reviewEverything;
  if (input.autoPublishOptout !== undefined) updates.auto_publish_optout = input.autoPublishOptout;

  if (input.slug !== undefined) {
    // Custom slugs are a paid feature (PRD §8).
    const { data: profile } = await admin.from("profiles").select("plan").eq("id", user.id).single();
    if (!limitsFor(profile?.plan ?? "free").customSlug) {
      return NextResponse.json(
        { error: "Custom links are a paid feature.", code: "plan_limit" },
        { status: 403 },
      );
    }
    if (input.slug) {
      const { data: taken } = await admin
        .from("pages")
        .select("id")
        .eq("slug", input.slug)
        .neq("id", id)
        .maybeSingle();
      if (taken) return NextResponse.json({ error: "That link is already taken." }, { status: 409 });
    }
    updates.slug = input.slug;
  }

  if (input.announcementEnabled !== undefined) {
    updates.announcement_enabled = input.announcementEnabled;
  }
  if (input.announcementText !== undefined) updates.announcement_text = input.announcementText;

  // The access code and the mode move together: a page can never be left in
  // code mode with no code, and rotating the code has to invalidate the
  // cookies minted under the old one.
  if (input.accessCode !== undefined && input.accessCode !== "") {
    const normalized = normalizeAccessCode(input.accessCode);
    if (!isValidAccessCode(normalized)) {
      return NextResponse.json(
        {
          error:
            "Choose a code of at least four letters or numbers — words and dashes are fine, like “nana-rose”.",
        },
        { status: 400 },
      );
    }
    updates.access_code_hash = hashAccessCode(normalized);
    updates.access_code_rotated_at = new Date().toISOString();
  }

  if (input.accessMode !== undefined) {
    if (input.accessMode === "code" && updates.access_code_hash === undefined) {
      const { data: existing } = await admin
        .from("pages")
        .select("access_code_hash")
        .eq("id", id)
        .single();
      if (!existing?.access_code_hash) {
        return NextResponse.json(
          { error: "Choose an access code before switching this page to code access." },
          { status: 400 },
        );
      }
    }
    updates.access_mode = input.accessMode;
  }

  if (Object.keys(updates).length > 0) {
    const { error } = await admin.from("pages").update(updates).eq("id", id);
    if (error) return NextResponse.json({ error: "Update failed." }, { status: 500 });
  }

  await touchStewardActivity(id, user.id, "page_settings_updated");
  return NextResponse.json({ ok: true });
}

/**
 * Soft delete (PRD §6): 30-day recovery window, purged by the cron job after.
 * Only the original steward (owner) can delete the page.
 */
export async function DELETE(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const auth = await requireSteward(id);
  if ("error" in auth) return auth.error;
  const { user, role, admin } = auth;

  if (role !== "owner") {
    return NextResponse.json({ error: "Only the page owner can delete the page." }, { status: 403 });
  }

  await admin
    .from("pages")
    .update({ status: "soft_deleted", deleted_at: new Date().toISOString() })
    .eq("id", id);
  await logEvent({ actorUserId: user.id, pageId: id, action: "page_soft_deleted" });

  return NextResponse.json({ ok: true });
}
