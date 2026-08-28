-- PRD v2 §3 — charity giving ("in lieu of flowers").
--
-- The highest-compliance-weight feature in the product, accepted with eyes
-- open. Three constraints from the research shape every line below, and none of
-- them is a preference:
--
--   1. Named, verified 501(c)(3) charities only. Never a free-form cash ask,
--      never a personal beneficiary — that is the scam ecosystem's favourite
--      surface, and somebody else's business model.
--   2. 0% platform fee. A for-profit cut of funeral donations is
--      reputationally radioactive and the consumer expectation is settled.
--   3. We never hold funds. Donor → regulated processor → charity. This single
--      constraint is what keeps us out of money-transmitter and charitable-
--      solicitation territory, and it is why there is no balance, no payout and
--      no ledger anywhere in this schema.
--
-- What is stored here is therefore a *record of something that happened
-- elsewhere*: the partner's confirmation webhook, kept so the family can see
-- the total and thank the people who gave.

-- ---------------------------------------------------------------------------
-- 1. The charities a family has chosen
-- ---------------------------------------------------------------------------
create table if not exists public.page_charities (
  id uuid primary key default gen_random_uuid(),
  page_id uuid not null references public.pages (id) on delete cascade,
  -- Verified against the partner's registry before the row is written; a free
  -- text field here would be the whole feature's failure mode.
  ein text not null check (ein ~ '^[0-9]{2}-?[0-9]{7}$'),
  name text not null check (char_length(name) between 1 and 200),
  partner_slug text not null check (char_length(partner_slug) between 1 and 200),
  created_at timestamptz not null default now(),
  unique (page_id, ein)
);

create index if not exists page_charities_page_idx on public.page_charities (page_id, created_at);

alter table public.page_charities enable row level security;

-- The giving block belongs on the announcement, so the charity itself is public
-- on any page that publishes one. Which charity a family chose is not private
-- information; what people gave is (below).
drop policy if exists "page_charities: public read" on public.page_charities;
create policy "page_charities: public read" on public.page_charities
  for select using (
    exists (
      select 1 from public.pages p
      where p.id = page_id and p.status in ('active', 'inactivity_hold')
    )
    or public.is_steward(page_id)
    or public.is_admin()
  );

-- ---------------------------------------------------------------------------
-- 2. Donations (a record of the partner's confirmation, not money we hold)
-- ---------------------------------------------------------------------------
create table if not exists public.donations (
  id uuid primary key default gen_random_uuid(),
  page_charity_id uuid not null references public.page_charities (id) on delete cascade,
  amount_cents integer not null check (amount_cents >= 0),
  currency text not null default 'usd',
  -- Both run through the moderation pipeline before they are displayed, exactly
  -- like a memory: a donor wall is a wall, and people write on walls.
  donor_name text check (char_length(donor_name) <= 100),
  donor_message text check (char_length(donor_message) <= 500),
  -- The partner's charge id. Unique, because webhooks are retried and a replay
  -- must not double the family's total.
  partner_ref text not null unique,
  -- Display status only. It never hides the money — the total is the total.
  status text not null default 'pending' check (status in ('pending', 'published', 'hidden')),
  moderation_scores jsonb,
  created_at timestamptz not null default now()
);

create index if not exists donations_charity_idx
  on public.donations (page_charity_id, created_at desc);

alter table public.donations enable row level security;

-- Service role only, deliberately: no select policy at all.
--
-- Per-donor amounts are never displayed (PRD v2 §3.2), and "never displayed" is
-- worth nothing if the anon key — which ships in every browser bundle — can
-- read the column. The donor wall and the aggregate are both assembled
-- server-side, so there is no read here for a visitor to make.

-- ---------------------------------------------------------------------------
-- 3. Aggregate totals
-- ---------------------------------------------------------------------------
-- One number, computed where the rows live. Moderation status is deliberately
-- not a filter: a donor whose message the family declined still gave the money,
-- and the total is the total.
create or replace function public.page_giving_total(p_page_id uuid)
returns bigint language sql security definer stable set search_path = public as $$
  select coalesce(sum(d.amount_cents), 0)::bigint
  from public.donations d
  join public.page_charities pc on pc.id = d.page_charity_id
  where pc.page_id = p_page_id;
$$;

revoke all on function public.page_giving_total(uuid) from public, anon, authenticated;
