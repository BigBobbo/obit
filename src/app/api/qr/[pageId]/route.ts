import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateQrPng, generateQrSvg } from "@/lib/qr";
import { generatePlaquePdf } from "@/lib/pdf";
import { limitsFor } from "@/lib/plan";

/**
 * QR download (PRD §4.4). PNG/SVG are free; print-ready plaque/card PDFs are
 * paid. Steward-only — the QR encodes the page's stable canonical URL.
 */
export async function GET(request: Request, ctx: { params: Promise<{ pageId: string }> }) {
  const { pageId } = await ctx.params;
  const url = new URL(request.url);
  const format = url.searchParams.get("format") ?? "png";

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

  const { data: page } = await admin
    .from("pages")
    .select("random_id, name, date_of_birth, date_of_death")
    .eq("id", pageId)
    .single();
  if (!page) return NextResponse.json({ error: "Page not found" }, { status: 404 });

  const filenameBase = `memorial-qr-${page.random_id}`;

  if (format === "svg") {
    const svg = await generateQrSvg(page.random_id);
    return new NextResponse(svg, {
      headers: {
        "Content-Type": "image/svg+xml",
        "Content-Disposition": `attachment; filename="${filenameBase}.svg"`,
      },
    });
  }

  if (format === "pdf") {
    const { data: profile } = await admin.from("profiles").select("plan").eq("id", user.id).single();
    if (!limitsFor(profile?.plan ?? "free").plaquePdf) {
      return NextResponse.json(
        { error: "Print-ready plaque PDFs are a paid feature.", code: "plan_limit" },
        { status: 403 },
      );
    }
    const design = (url.searchParams.get("design") ?? "classic") as "classic" | "minimal" | "card";
    const pdf = await generatePlaquePdf({
      randomId: page.random_id,
      name: page.name,
      dob: page.date_of_birth,
      dod: page.date_of_death,
      design,
    });
    return new NextResponse(Buffer.from(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filenameBase}-${design}.pdf"`,
      },
    });
  }

  const png = await generateQrPng(page.random_id);
  return new NextResponse(new Uint8Array(png), {
    headers: {
      "Content-Type": "image/png",
      "Content-Disposition": `attachment; filename="${filenameBase}.png"`,
    },
  });
}
