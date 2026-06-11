import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { logEvent } from "@/lib/audit";
import { normalizeEmail } from "@/lib/utils";

const schema = z.object({
  action: z.enum([
    "freeze_page",
    "unfreeze_page",
    "ban_email",
    "ban_ip",
    "transfer_ownership",
    "resolve_report",
  ]),
  reportId: z.string().uuid().optional(),
  pageId: z.string().uuid().optional(),
  email: z.string().email().optional(),
  ip: z.string().optional(),
  resolution: z.string().max(2000).optional(),
});

/** Admin actions (PRD §4.6): freeze, ban, ownership transfer, resolution. */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();
  if (!profile?.is_admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  const input = parsed.data;

  switch (input.action) {
    case "freeze_page": {
      if (!input.pageId) return NextResponse.json({ error: "pageId required" }, { status: 400 });
      // Freeze hides the page from the public but preserves all data.
      await admin.from("pages").update({ status: "frozen" }).eq("id", input.pageId);
      break;
    }
    case "unfreeze_page": {
      if (!input.pageId) return NextResponse.json({ error: "pageId required" }, { status: 400 });
      await admin.from("pages").update({ status: "active" }).eq("id", input.pageId);
      break;
    }
    case "ban_email": {
      if (!input.email) return NextResponse.json({ error: "email required" }, { status: 400 });
      const email = normalizeEmail(input.email);
      await admin.from("bans").insert({ email, reason: `admin action (report ${input.reportId ?? "-"})` });
      await admin.from("contributors").upsert({ email, blocked: true });
      break;
    }
    case "ban_ip": {
      if (!input.ip) return NextResponse.json({ error: "ip required" }, { status: 400 });
      await admin.from("bans").insert({ ip: input.ip, reason: `admin action (report ${input.reportId ?? "-"})` });
      break;
    }
    case "transfer_ownership": {
      // Ownership disputes are never auto-resolved — always this human decision.
      if (!input.pageId || !input.email) {
        return NextResponse.json({ error: "pageId and email required" }, { status: 400 });
      }
      const email = normalizeEmail(input.email);
      const { data: newOwner } = await admin
        .from("profiles")
        .select("id")
        .eq("email", email)
        .maybeSingle();
      if (!newOwner) return NextResponse.json({ error: "No account with that email." }, { status: 404 });

      // Demote the current owner to co-steward, promote (or add) the new owner.
      await admin
        .from("stewards")
        .update({ role: "co_steward" })
        .eq("page_id", input.pageId)
        .eq("role", "owner");
      const { data: existing } = await admin
        .from("stewards")
        .select("id")
        .eq("page_id", input.pageId)
        .eq("user_id", newOwner.id)
        .maybeSingle();
      if (existing) {
        await admin.from("stewards").update({ role: "owner" }).eq("id", existing.id);
      } else {
        await admin
          .from("stewards")
          .insert({ page_id: input.pageId, user_id: newOwner.id, role: "owner" });
      }
      break;
    }
    case "resolve_report":
      break; // handled below
  }

  if (input.reportId && (input.action === "resolve_report" || input.resolution)) {
    await admin
      .from("reports")
      .update({
        status: "resolved",
        resolution: input.resolution ?? `resolved via ${input.action}`,
        resolved_at: new Date().toISOString(),
      })
      .eq("id", input.reportId);
  }

  await logEvent({
    actorUserId: user.id,
    pageId: input.pageId ?? null,
    action: `admin_${input.action}`,
    meta: { reportId: input.reportId, email: input.email, ip: input.ip },
  });

  return NextResponse.json({ ok: true });
}
