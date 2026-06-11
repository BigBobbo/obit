/** Client-safe public photo URL (uses the NEXT_PUBLIC_ env var). */
export function publicPhotoUrlClient(path: string): string {
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/photos/${path}`;
}
