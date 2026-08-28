import { NextResponse } from "next/server";
import { canSeeEvent } from "@/lib/access-server";
import { loadEvent } from "@/lib/event-access";
import { buildIcs } from "@/lib/events";

/**
 * "Add to calendar" (PRD v2 §2.1). One file, no account, works on every phone
 * and every desktop mail client — the cheapest elder-friendly thing in the kit.
 */
export async function GET(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const loaded = await loadEvent(id);
  if (!loaded) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { event, page } = loaded;
  if (!(await canSeeEvent(page, event))) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const body = buildIcs(event, {
    pageName: page.name,
    url: `${appUrl}/m/${page.random_id}`,
  });

  return new NextResponse(body, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="${event.kind}.ics"`,
      "X-Robots-Tag": "noindex, nofollow, noarchive",
    },
  });
}
