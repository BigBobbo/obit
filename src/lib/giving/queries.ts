import { createAdminClient } from "@/lib/supabase/admin";
import { givingEnabled } from "@/lib/giving/partner";

/**
 * Everything the giving block renders (PRD v2 §3.2), assembled with the service
 * role.
 *
 * Not because it is secret — the charities are public — but because the
 * *amounts* are. `donations` has no read policy at all, so a per-donor amount
 * is unreachable with the anon key by construction; the only number that ever
 * leaves this module is the aggregate.
 */
export type PageCharity = {
  id: string;
  ein: string;
  name: string;
  partnerSlug: string;
};

export type DonorWallEntry = {
  id: string;
  name: string | null;
  message: string | null;
  createdAt: string;
};

export type GivingBlock = {
  charities: PageCharity[];
  totalCents: number;
  donors: DonorWallEntry[];
};

const MAX_WALL = 50;

export async function loadGivingBlock(pageId: string): Promise<GivingBlock | null> {
  if (!givingEnabled()) return null;

  const admin = createAdminClient();
  const { data: charities } = await admin
    .from("page_charities")
    .select("id, ein, name, partner_slug")
    .eq("page_id", pageId)
    .order("created_at", { ascending: true });

  if (!charities || charities.length === 0) return null;

  const ids = charities.map((c) => c.id as string);
  const { data: donations } = await admin
    .from("donations")
    .select("id, amount_cents, donor_name, donor_message, status, created_at")
    .in("page_charity_id", ids)
    .order("created_at", { ascending: false })
    .limit(500);

  // The total counts every confirmed donation. What the family did with a
  // donor's *message* never changes what was given.
  const totalCents = (donations ?? []).reduce(
    (sum, d) => sum + ((d.amount_cents as number) ?? 0),
    0,
  );

  const donors: DonorWallEntry[] = (donations ?? [])
    .filter((d) => d.status === "published")
    .filter((d) => d.donor_name || d.donor_message)
    .slice(0, MAX_WALL)
    .map((d) => ({
      id: d.id as string,
      name: (d.donor_name as string | null) ?? null,
      message: (d.donor_message as string | null) ?? null,
      createdAt: d.created_at as string,
    }));

  return {
    charities: charities.map((c) => ({
      id: c.id as string,
      ein: c.ein as string,
      name: c.name as string,
      partnerSlug: c.partner_slug as string,
    })),
    totalCents,
    donors,
  };
}

/** The steward's view: the same rows, plus the ones waiting on their decision. */
export async function loadGivingAdmin(pageId: string) {
  const admin = createAdminClient();
  const { data: charities } = await admin
    .from("page_charities")
    .select("id, ein, name, partner_slug, created_at")
    .eq("page_id", pageId)
    .order("created_at", { ascending: true });

  const ids = (charities ?? []).map((c) => c.id as string);
  const { data: donations } = ids.length
    ? await admin
        .from("donations")
        .select("id, page_charity_id, amount_cents, donor_name, donor_message, status, created_at")
        .in("page_charity_id", ids)
        .order("created_at", { ascending: false })
        .limit(500)
    : { data: [] };

  return {
    charities: (charities ?? []).map((c) => ({
      id: c.id as string,
      ein: c.ein as string,
      name: c.name as string,
      partnerSlug: c.partner_slug as string,
    })),
    donations: (donations ?? []).map((d) => ({
      id: d.id as string,
      pageCharityId: d.page_charity_id as string,
      amountCents: (d.amount_cents as number) ?? 0,
      donorName: (d.donor_name as string | null) ?? null,
      donorMessage: (d.donor_message as string | null) ?? null,
      status: d.status as string,
      createdAt: d.created_at as string,
    })),
  };
}
