import QRCode from "qrcode";

/**
 * QR codes point ONLY at our own domain at the page's stable canonical URL
 * (PRD §4.4). The random_id URL never changes even after a custom slug is set.
 */
export function canonicalPageUrl(randomId: string): string {
  const base = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  return `${base}/m/${randomId}`;
}

export async function generateQrPng(randomId: string, size = 1024): Promise<Buffer> {
  return QRCode.toBuffer(canonicalPageUrl(randomId), {
    type: "png",
    width: size,
    errorCorrectionLevel: "H",
    margin: 2,
  });
}

export async function generateQrSvg(randomId: string): Promise<string> {
  return QRCode.toString(canonicalPageUrl(randomId), {
    type: "svg",
    errorCorrectionLevel: "H",
    margin: 2,
  });
}
