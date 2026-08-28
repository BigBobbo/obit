-- PRD v2 §1–§2 — access modes, the announcement surface, and the week-one kit.
--
-- v1's privacy model was "the URL is the secret": anyone holding /m/<random_id>
-- saw everything. v2 splits *knowing the page exists* from *seeing the
-- memories*, so a family can circulate an announcement widely in the funeral
-- week without circulating the memories with it.
--
--   link      the URL is still the secret (today's behaviour, still the default)
--   code      a short family-chosen code opens the memorial; a soft gate
--   approved  the steward admits visitors one by one, or pre-approves emails
--
-- The reading side is what changes. Writing is untouched: sharing a memory
-- still needs email verification and still runs the whole moderation pipeline,
-- whatever the mode.

-- ---------------------------------------------------------------------------
-- 1. Access modes + the announcement surface
-- ---------------------------------------------------------------------------
alter table public.pages
  -- The public doorway: portrait, name, dates, a short notice, the services the
  -- steward marked visible — and the gate. Off by default; a page that opts out
  -- shows nothing but the gate.
  add column if not exists announcement_enabled boolean not null default false,
  -- The death notice, not the life story: deliberately short, and separate from
  -- `bio` so the announcement never leaks the biography a family wrote for
  -- people who are already inside.
  add column if not exists announcement_text text not null default ''
    check (char_length(announcement_text) <= 600),
  add column if not exists access_mode text not null default 'link'
    check (access_mode in ('link', 'code', 'approved')),
  -- scrypt, per-page salt (see src/lib/access.ts). Codes are short and human
  -- ("nana-rose"), so a fast digest would be trivially reversible from a dump.
  add column if not exists access_code_hash text,
  -- Rotation invalidates every visitor cookie: the timestamp is signed into the
  -- cookie, so changing the code changes what a valid cookie must claim.
  add column if not exists access_code_rotated_at timestamptz;

-- A page in code mode with no code is a page nobody can open, including the
-- family. The API sets mode and code in one update; this is the backstop.
alter table public.pages drop constraint if exists pages_code_mode_needs_code;
alter table public.pages add constraint pages_code_mode_needs_code
  check (access_mode <> 'code' or access_code_hash is not null);

-- Two columns on `pages` stop being public. The rest of the row has to stay
-- readable with the anon key — the announcement is built from it — but the anon
-- key ships in every browser bundle, so anything left in the grant is readable
-- by exactly the population we are gating against: has the link, lacks the code.
--
--   access_code_hash  a short human code behind a fast lookup is an offline
--                     brute-force target. scrypt makes grinding it expensive;
--                     not handing it over makes it impossible.
--   bio               the life story, written for the people inside the gate.
--                     The announcement has its own short notice precisely so
--                     the biography is not the thing that goes out with the
--                     link (PRD v2 §1.2).
--
-- Column-level REVOKE cannot narrow a table-level GRANT, so the table grant
-- goes and every other column is granted back by name. `schema-assertions.sql`
-- fails if a later migration adds a column and forgets to grant it, so this
-- stays loud rather than silently hiding data from the app.
revoke select on public.pages from anon, authenticated;
grant select (
  id, random_id, slug, name, date_of_birth, date_of_death,
  cover_photo_path, obituary_url, status, review_everything, auto_publish_optout,
  created_by, last_steward_activity_at, deleted_at, created_at,
  announcement_enabled, announcement_text, access_mode, access_code_rotated_at
) on public.pages to anon, authenticated;

-- ---------------------------------------------------------------------------
-- 2. Access requests (mode = 'approved')
-- ---------------------------------------------------------------------------
-- One row per (page, email), covering both directions:
--   'preapproved' — the steward pasted the address in advance; the first
--                   verified visit from it is admitted with no wait.
--   'pending'     — a stranger asked; the steward decides.
-- Declines are silent: the requester is never told, so there is no rejection
-- notification for a grieving family to manage.
create table if not exists public.access_requests (
  id uuid primary key default gen_random_uuid(),
  page_id uuid not null references public.pages (id) on delete cascade,
  email text not null check (email = lower(email)),
  -- Empty for a steward's pre-approval: nobody has told us their name yet.
  name text not null default '' check (char_length(name) <= 100),
  relationship text check (char_length(relationship) <= 300),
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'declined', 'preapproved')),
  -- Email verification, same idea as a memory submission: nothing reaches the
  -- steward's queue until the address is proven.
  verified_at timestamptz,
  -- Capability token for the "confirm your email" and "you're in" links.
  verify_token uuid not null default gen_random_uuid(),
  decided_by uuid references public.profiles (id),
  decided_at timestamptz,
  created_at timestamptz not null default now(),
  unique (page_id, email)
);

create index if not exists access_requests_page_status_idx
  on public.access_requests (page_id, status, created_at);
create unique index if not exists access_requests_token_idx
  on public.access_requests (verify_token);

alter table public.access_requests enable row level security;

drop policy if exists "access_requests: steward read" on public.access_requests;
create policy "access_requests: steward read" on public.access_requests
  for select using (public.is_steward(page_id) or public.is_admin());
-- Inserts and decisions go through the API (service role): Turnstile, rate
-- limits, verification and the silent-decline rule live in one place.

-- ---------------------------------------------------------------------------
-- 3. Service & event block
-- ---------------------------------------------------------------------------
create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  page_id uuid not null references public.pages (id) on delete cascade,
  kind text not null check (kind in ('visitation', 'service', 'burial', 'celebration', 'other')),
  title text not null check (char_length(title) between 1 and 200),
  starts_at timestamptz not null,
  -- IANA zone. A funeral is a local event; rendering it in the reader's zone
  -- would tell half the family the wrong time.
  tz text not null check (char_length(tz) between 1 and 100),
  venue text check (char_length(venue) <= 200),
  locality text check (char_length(locality) <= 200),
  map_url text check (char_length(map_url) <= 2000),
  livestream_url text check (char_length(livestream_url) <= 2000),
  notes text check (char_length(notes) <= 1000),
  -- Steward's choice, per event: on the public announcement, or only inside.
  on_announcement boolean not null default true,
  rsvp_enabled boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists events_page_starts_idx on public.events (page_id, starts_at);

alter table public.events enable row level security;

-- Announcement-visible events are as public as the announcement itself. Every
-- other event follows the memorial: visible while the page is ungated,
-- otherwise served through the access-checked routes.
drop policy if exists "events: public read" on public.events;
create policy "events: public read" on public.events
  for select using (
    exists (
      select 1 from public.pages p
      where p.id = page_id
        and p.status in ('active', 'inactivity_hold')
        and (
          (on_announcement and p.announcement_enabled)
          or p.access_mode = 'link'
        )
    )
    or public.is_steward(page_id)
    or public.is_admin()
  );

-- Light RSVP: a head count for the family, never a public guest list. No
-- accounts, no message field — messages belong in memories.
create table if not exists public.event_rsvps (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 100),
  party_size integer not null default 1 check (party_size between 1 and 12),
  created_at timestamptz not null default now()
);

create index if not exists event_rsvps_event_idx on public.event_rsvps (event_id, created_at);

alter table public.event_rsvps enable row level security;

drop policy if exists "event_rsvps: steward read" on public.event_rsvps;
create policy "event_rsvps: steward read" on public.event_rsvps
  for select using (
    exists (
      select 1 from public.events e
      where e.id = event_id and (public.is_steward(e.page_id) or public.is_admin())
    )
  );
-- Inserts via service role only (Turnstile + rate limits).

-- ---------------------------------------------------------------------------
-- 4. Reading a gated page stops being a public read
-- ---------------------------------------------------------------------------
-- The point of the access modes. On a gated page the anon key must not return
-- memory text or contributed photos at all; those reads go through server
-- routes that check the visitor cookie or the steward's approval first.
--
-- Cover photos are deliberately still public: the portrait is announcement
-- content, and the share card has to render it for a scraper with no cookie.
drop policy if exists "memories: public read approved" on public.memories;
create policy "memories: public read approved" on public.memories
  for select using (
    (status = 'approved' and exists (
      select 1 from public.pages p
      where p.id = page_id
        and p.status in ('active', 'inactivity_hold')
        and p.access_mode = 'link'
    ))
    or public.is_steward(page_id)
    or public.is_admin()
  );

drop policy if exists "photos: public read" on public.photos;
create policy "photos: public read" on public.photos
  for select using (
    (
      exists (
        select 1 from public.pages p
        where p.id = page_id and p.status in ('active', 'inactivity_hold')
      )
      and (
        is_cover
        or exists (
          select 1
          from public.memories m
          join public.pages p2 on p2.id = m.page_id
          where m.id = memory_id
            and m.status = 'approved'
            and p2.access_mode = 'link'
        )
      )
    )
    or public.is_steward(page_id)
    or public.is_admin()
  );

-- ---------------------------------------------------------------------------
-- 5. Moderation as care
-- ---------------------------------------------------------------------------
-- `decided_at` is half of the approval-latency measurement the PRD asks for
-- (created_at → decided_at); `approved_at` remains the published-at timestamp.
-- Latency is the conversion risk in this product, so it gets measured from day
-- one rather than optimised from a hunch.
alter table public.memories
  add column if not exists decided_at timestamptz,
  -- What the contributor is told when their memory is declined. Never a bare
  -- rejection: unexplained removal is what stops people coming back.
  add column if not exists decline_reason text check (char_length(decline_reason) <= 1000);

-- Everything already decided keeps its history rather than reading as pending
-- forever in the latency tile.
update public.memories
   set decided_at = coalesce(approved_at, created_at)
 where decided_at is null
   and status in ('approved', 'rejected', 'auto_rejected');
