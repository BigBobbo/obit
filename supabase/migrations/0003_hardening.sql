-- Follow-up hardening on the initial schema.
--   1. Atomic approved_count increment (was read-then-write in app code).
--   2. Stripe webhook idempotency (Stripe retries; replays must be no-ops).
--   3. Drop pages.photo_count, which nothing ever wrote to.

-- ---------------------------------------------------------------------------
-- 1. Atomic contributor approval counter
-- ---------------------------------------------------------------------------
-- The pipeline used to SELECT approved_count, add one, and upsert. Two
-- approvals landing together lost one of them, and that counter is what
-- promotes a contributor to auto-publish — so an undercount kept an
-- established contributor stuck in the review queue.
create or replace function public.bump_approved_count(p_email text)
returns integer language plpgsql security definer set search_path = public as $$
declare
  v_count integer;
begin
  insert into public.contributors as c (email, approved_count)
  values (p_email, 1)
  on conflict (email) do update set approved_count = c.approved_count + 1
  returning approved_count into v_count;
  return v_count;
end;
$$;

revoke all on function public.bump_approved_count(text) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 2. Stripe webhook idempotency
-- ---------------------------------------------------------------------------
-- Stripe redelivers events on any non-2xx and on its own retry schedule. A
-- replayed subscription.deleted arriving after a customer re-subscribed would
-- downgrade a paying account, so every event id is recorded and repeats are
-- ignored.
create table public.processed_stripe_events (
  event_id text primary key,
  event_type text not null,
  processed_at timestamptz not null default now()
);

create index processed_stripe_events_processed_idx
  on public.processed_stripe_events (processed_at);

alter table public.processed_stripe_events enable row level security;
-- Service role only.

-- ---------------------------------------------------------------------------
-- 3. Drop the dead photo counter
-- ---------------------------------------------------------------------------
-- Declared in 0001 and selected by the steward dashboard, but never written by
-- anything — permanently 0. The photo cap counts rows in public.photos, which
-- is the real source of truth.
alter table public.pages drop column if exists photo_count;
