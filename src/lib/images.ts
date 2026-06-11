import sharp from "sharp";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Upload pipeline (PRD §6):
 *  - re-encode every image server-side, which strips EXIF/GPS metadata
 *  - generate web sizes; originals go to a private bucket and are never
 *    served at full resolution to non-stewards
 */
const WEB_SIZES = [
  { name: "thumb", width: 320 },
  { name: "medium", width: 800 },
  { name: "large", width: 1600 },
] as const;

export type ProcessedImage = {
  originalPath: string;
  sizes: Record<string, { path: string; width: number; height: number }>;
};

const MAX_UPLOAD_BYTES = 15 * 1024 * 1024;
const ALLOWED_FORMATS = new Set(["jpeg", "png", "webp", "heif", "avif", "tiff"]);

export async function processAndStoreImage(
  buffer: Buffer,
  keyPrefix: string,
): Promise<ProcessedImage> {
  if (buffer.byteLength > MAX_UPLOAD_BYTES) {
    throw new Error("Image is too large (max 15 MB).");
  }

  const meta = await sharp(buffer).metadata();
  if (!meta.format || !ALLOWED_FORMATS.has(meta.format)) {
    throw new Error("Unsupported image format.");
  }

  const supabase = createAdminClient();
  const originalPath = `${keyPrefix}/original.jpg`;

  // Re-encode the original too: stored at full resolution but with metadata
  // stripped (sharp drops EXIF unless withMetadata() is called).
  const originalJpeg = await sharp(buffer).rotate().jpeg({ quality: 92 }).toBuffer();
  const { error: origErr } = await supabase.storage
    .from("originals")
    .upload(originalPath, originalJpeg, { contentType: "image/jpeg", upsert: true });
  if (origErr) throw new Error(`Failed to store original: ${origErr.message}`);

  const sizes: ProcessedImage["sizes"] = {};
  for (const size of WEB_SIZES) {
    const resized = sharp(buffer)
      .rotate()
      .resize({ width: size.width, withoutEnlargement: true })
      .jpeg({ quality: 82 });
    const { data, info } = await resized.toBuffer({ resolveWithObject: true });
    const path = `${keyPrefix}/${size.name}.jpg`;
    const { error } = await supabase.storage
      .from("photos")
      .upload(path, data, { contentType: "image/jpeg", upsert: true });
    if (error) throw new Error(`Failed to store ${size.name}: ${error.message}`);
    sizes[size.name] = { path, width: info.width, height: info.height };
  }

  return { originalPath, sizes };
}

export function publicPhotoUrl(path: string): string {
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/photos/${path}`;
}

/** First web rendition as a base64 data block for the Sightengine check. */
export async function toModerationJpeg(buffer: Buffer): Promise<Buffer> {
  return sharp(buffer).rotate().resize({ width: 800, withoutEnlargement: true }).jpeg().toBuffer();
}
