import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { generateQrPng } from "@/lib/qr";

/**
 * Print-ready plaque/card PDF (paid feature, PRD §4.4): QR + name + dates in a
 * few tasteful layouts.
 */
export async function generatePlaquePdf(opts: {
  randomId: string;
  name: string;
  dob: string;
  dod: string;
  design?: "classic" | "minimal" | "card";
}): Promise<Uint8Array> {
  const design = opts.design ?? "classic";
  const doc = await PDFDocument.create();

  // Plaque: 5x7in at 72pt/in; card: 3.5x2in business-card size.
  const [w, h] = design === "card" ? [252, 144] : [360, 504];
  const page = doc.addPage([w, h]);

  const serif = await doc.embedFont(StandardFonts.TimesRoman);
  const serifItalic = await doc.embedFont(StandardFonts.TimesRomanItalic);

  const qrPng = await generateQrPng(opts.randomId, 600);
  const qrImage = await doc.embedPng(qrPng);

  const ink = rgb(0.15, 0.15, 0.18);
  const faint = rgb(0.45, 0.45, 0.5);

  const center = (text: string, font = serif, size = 16, y = 0, color = ink) => {
    const tw = font.widthOfTextAtSize(text, size);
    page.drawText(text, { x: (w - tw) / 2, y, size, font, color });
  };

  const dates = `${formatDate(opts.dob)} — ${formatDate(opts.dod)}`;

  if (design === "card") {
    const qrSize = 96;
    page.drawImage(qrImage, { x: 18, y: (h - qrSize) / 2, width: qrSize, height: qrSize });
    const nameSize = fitSize(serif, opts.name, w - qrSize - 54, 16);
    page.drawText(opts.name, { x: qrSize + 36, y: h / 2 + 12, size: nameSize, font: serif, color: ink });
    page.drawText(dates, { x: qrSize + 36, y: h / 2 - 8, size: 9, font: serifItalic, color: faint });
    page.drawText("Scan to share a memory", { x: qrSize + 36, y: h / 2 - 26, size: 8, font: serif, color: faint });
  } else {
    if (design === "classic") {
      // Thin border frame
      page.drawRectangle({
        x: 18, y: 18, width: w - 36, height: h - 36,
        borderColor: faint, borderWidth: 1,
      });
    }
    const nameSize = fitSize(serif, opts.name, w - 72, 26);
    center("In loving memory of", serifItalic, 13, h - 90, faint);
    center(opts.name, serif, nameSize, h - 130);
    center(dates, serifItalic, 13, h - 156, faint);
    const qrSize = 180;
    page.drawImage(qrImage, { x: (w - qrSize) / 2, y: (h - qrSize) / 2 - 60, width: qrSize, height: qrSize });
    center("Scan to view and share memories", serif, 11, 56, faint);
  }

  return doc.save();
}

function fitSize(font: { widthOfTextAtSize(t: string, s: number): number }, text: string, maxWidth: number, start: number): number {
  let size = start;
  while (size > 8 && font.widthOfTextAtSize(text, size) > maxWidth) size -= 1;
  return size;
}

function formatDate(iso: string): string {
  const d = new Date(iso + "T00:00:00Z");
  return d.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric", timeZone: "UTC" });
}
