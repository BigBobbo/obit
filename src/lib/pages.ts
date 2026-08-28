import type { SupabaseClient } from "@supabase/supabase-js";
import { isValidPageRef } from "@/lib/ids";

/**
 * Resolves a page from a URL reference — either the canonical `random_id` or a
 * custom slug, which redirects to the canonical URL.
 *
 * Two exact-match lookups rather than one interpolated `or()` filter. PostgREST
 * filter strings are not parameterised, so a reference interpolated into one can
 * inject extra predicates (`zzz,name.like.A*`) and turn a point lookup into a
 * search across the table — which would defeat the "unreachable by enumeration"
 * property the 12-character random ids exist to provide (PRD §2, §6).
 *
 * Callers pass the client they should be using: the RLS-scoped server client for
 * public reads, the admin client only where a deliberate service-side peek is
 * intended (the frozen-page check).
 */
export async function findPageByRef<T>(
  client: SupabaseClient,
  ref: string,
  columns: string,
): Promise<T | null> {
  if (!isValidPageRef(ref)) return null;

  const { data: byRandomId } = await client
    .from("pages")
    .select(columns)
    .eq("random_id", ref)
    .maybeSingle();
  if (byRandomId) return byRandomId as unknown as T;

  const { data: bySlug } = await client
    .from("pages")
    .select(columns)
    .eq("slug", ref)
    .maybeSingle();
  return (bySlug as unknown as T) ?? null;
}
