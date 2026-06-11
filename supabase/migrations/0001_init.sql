-- Memorial Pages — initial schema.
-- Permissions are enforced here with RLS, not only in app code (PRD §7).
-- Roles:
--   anon / authenticated  → public visitors and stewards via the Next.js app
--   service_role          → moderation pipeline, cron jobs, admin actions (server only)

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Profiles (1:1 with auth.users)
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  is_admin boolean not null default false,
  plan text not null default 'free' check (plan in ('free', 'paid')),
  stripe_customer_id text,
  stripe_subscription_id text,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles: read own" on public.profiles
  for select using (auth.uid() = id);
-- All writes go through the service role (Stripe webhook, admin panel).

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email) values (new.id, new.email);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Pages
-- ---------------------------------------------------------------------------
create table public.pages (
  id uuid primary key default gen_random_uuid(),
  -- Non-guessable public identifier; the canonical URL is /m/<random_id> forever.
  random_id text not null unique,
  -- Custom slug (paid). Redirects to the canonical random_id URL.
  slug text unique check (slug ~ '^[a-z0-9][a-z0-9-]{2,80}$'),
  name text not null check (char_length(name) between 1 and 200),
  date_of_birth date not null,
  date_of_death date not null,
  bio text not null default '' check (char_length(bio) <= 10000),
  cover_photo_path text,
  obituary_url text,
  status text not null default 'active'
    check (status in ('active', 'frozen', 'inactivity_hold', 'soft_deleted')),
  -- Steward chose "review everything" — all submissions queue for review.
  review_everything boolean not null default false,
  -- Steward opted out of the 90-day inactivity fail-safe ("keep auto-publishing").
  auto_publish_optout boolean not null default false,
  created_by uuid not null references public.profiles (id),
  last_steward_activity_at timestamptz not null default now(),
  photo_count integer not null default 0,
  deleted_at timestamptz,
  created_at timestamptz not null default now()
);

create index pages_dedupe_idx on public.pages (lower(name), date_of_birth, date_of_death)
  where status <> 'soft_deleted';

alter table public.pages enable row level security;

create or replace function public.is_steward(p_page_id uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from public.stewards s
    where s.page_id = p_page_id and s.user_id = auth.uid()
  );
$$;

create or replace function public.is_admin()
returns boolean language sql security definer stable set search_path = public as $$
  select coalesce((select is_admin from public.profiles where id = auth.uid()), false);
$$;

-- Public can view active pages and pages on inactivity hold (viewing never freezes).
-- Frozen pages stay readable only to stewards/admin; the app shows the neutral
-- "under review" message to everyone else.
create policy "pages: public read" on public.pages
  for select using (
    status in ('active', 'inactivity_hold')
    or public.is_steward(id)
    or public.is_admin()
  );

create policy "pages: steward update" on public.pages
  for update using (public.is_steward(id) or public.is_admin());

-- Inserts go through the API (service role) so dedupe, Turnstile and the
-- per-account rate limit cannot be bypassed.

-- ---------------------------------------------------------------------------
-- Stewards
-- ---------------------------------------------------------------------------
create table public.stewards (
  id uuid primary key default gen_random_uuid(),
  page_id uuid not null references public.pages (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role text not null default 'co_steward' check (role in ('owner', 'co_steward')),
  created_at timestamptz not null default now(),
  unique (page_id, user_id)
);

create index stewards_user_idx on public.stewards (user_id);

alter table public.stewards enable row level security;

create policy "stewards: read own pages" on public.stewards
  for select using (public.is_steward(page_id) or public.is_admin());
-- Steward management goes through the API (service role) so the
-- "co-steward cannot remove the owner" rule is enforced in one place.

-- ---------------------------------------------------------------------------
-- Contributors (per verified email)
-- ---------------------------------------------------------------------------
create table public.contributors (
  email text primary key check (email = lower(email)),
  verified_at timestamptz,
  approved_count integer not null default 0,
  blocked boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.contributors enable row level security;
-- Service role only.

create table public.contributor_page_blocks (
  page_id uuid not null references public.pages (id) on delete cascade,
  email text not null,
  created_at timestamptz not null default now(),
  primary key (page_id, email)
);

alter table public.contributor_page_blocks enable row level security;
-- Service role only.

-- ---------------------------------------------------------------------------
-- Memories
-- ---------------------------------------------------------------------------
create table public.memories (
  id uuid primary key default gen_random_uuid(),
  page_id uuid not null references public.pages (id) on delete cascade,
  contributor_email text not null,
  contributor_name text not null check (char_length(contributor_name) between 1 and 100),
  body text not null default '' check (char_length(body) <= 2000),
  status text not null default 'pending_verification'
    check (status in ('pending_verification', 'pending', 'approved', 'rejected', 'auto_rejected')),
  moderation_scores jsonb,
  -- Email verification per submission (6-digit code).
  verification_code text,
  verification_expires_at timestamptz,
  verification_attempts integer not null default 0,
  -- Token in the contributor's confirmation email that lets them remove their memory.
  removal_token uuid not null default gen_random_uuid(),
  approved_by uuid references public.profiles (id),
  approved_at timestamptz,
  created_at timestamptz not null default now()
);

create index memories_page_status_idx on public.memories (page_id, status, created_at desc);
create index memories_email_idx on public.memories (contributor_email);

alter table public.memories enable row level security;

create policy "memories: public read approved" on public.memories
  for select using (
    (status = 'approved' and exists (
      select 1 from public.pages p
      where p.id = page_id and p.status in ('active', 'inactivity_hold')
    ))
    or public.is_steward(page_id)
    or public.is_admin()
  );

create policy "memories: steward moderate" on public.memories
  for update using (public.is_steward(page_id) or public.is_admin());

-- Inserts only via service role after email verification + Tier 0 checks.

-- ---------------------------------------------------------------------------
-- Photos
-- ---------------------------------------------------------------------------
create table public.photos (
  id uuid primary key default gen_random_uuid(),
  page_id uuid not null references public.pages (id) on delete cascade,
  memory_id uuid references public.memories (id) on delete cascade,
  is_cover boolean not null default false,
  -- Path of the original (private bucket) and generated web sizes (public bucket).
  original_path text not null,
  sizes jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index photos_memory_idx on public.photos (memory_id);
create index photos_page_idx on public.photos (page_id);

alter table public.photos enable row level security;

create policy "photos: public read" on public.photos
  for select using (
    (
      exists (
        select 1 from public.pages p
        where p.id = page_id and p.status in ('active', 'inactivity_hold')
      )
      and (
        is_cover
        or exists (select 1 from public.memories m where m.id = memory_id and m.status = 'approved')
      )
    )
    or public.is_steward(page_id)
    or public.is_admin()
  );

-- ---------------------------------------------------------------------------
-- Reports
-- ---------------------------------------------------------------------------
create table public.reports (
  id uuid primary key default gen_random_uuid(),
  target_type text not null check (target_type in ('page', 'memory')),
  page_id uuid not null references public.pages (id) on delete cascade,
  memory_id uuid references public.memories (id) on delete set null,
  category text not null check (category in (
    'fake_memorial', 'impersonation_or_ownership', 'harassment',
    'inappropriate', 'spam', 'copyright', 'csam_or_illegal'
  )),
  reporter_email text not null,
  reporter_relationship text,
  evidence_text text,
  status text not null default 'open'
    check (status in ('open', 'steward', 'escalated', 'resolved', 'auto_closed')),
  resolution text,
  -- CSAM / illegal-content reports never auto-close.
  never_autoclose boolean not null default false,
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

create index reports_status_idx on public.reports (status, created_at);

alter table public.reports enable row level security;

create policy "reports: steward read memory reports" on public.reports
  for select using (
    (target_type = 'memory' and public.is_steward(page_id)) or public.is_admin()
  );
-- Inserts and resolution via service role.

-- ---------------------------------------------------------------------------
-- Audit log (feeds the 90-day inactivity clock, admin trail)
-- ---------------------------------------------------------------------------
create table public.audit_log (
  id bigint generated always as identity primary key,
  actor_user_id uuid,
  actor_email text,
  page_id uuid,
  action text not null,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index audit_log_page_idx on public.audit_log (page_id, created_at desc);

alter table public.audit_log enable row level security;
-- Service role only.

-- ---------------------------------------------------------------------------
-- Bans (email / IP)
-- ---------------------------------------------------------------------------
create table public.bans (
  id uuid primary key default gen_random_uuid(),
  email text,
  ip text,
  reason text,
  created_at timestamptz not null default now(),
  check (email is not null or ip is not null)
);

create index bans_email_idx on public.bans (email);
create index bans_ip_idx on public.bans (ip);

alter table public.bans enable row level security;
-- Service role only.

-- ---------------------------------------------------------------------------
-- Rate limiting (fixed-window counters)
-- ---------------------------------------------------------------------------
create table public.rate_limits (
  key text not null,
  window_start timestamptz not null,
  count integer not null default 0,
  primary key (key, window_start)
);

alter table public.rate_limits enable row level security;
-- Service role only.

-- Atomically increments the counter for the current window and returns the
-- new count. Callers compare against their max.
create or replace function public.bump_rate_limit(p_key text, p_window_seconds integer)
returns integer language plpgsql security definer set search_path = public as $$
declare
  v_window timestamptz;
  v_count integer;
begin
  v_window := to_timestamp(floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds);
  insert into public.rate_limits as rl (key, window_start, count)
  values (p_key, v_window, 1)
  on conflict (key, window_start) do update set count = rl.count + 1
  returning count into v_count;
  -- Opportunistic cleanup of stale windows for this key.
  delete from public.rate_limits where key = p_key and window_start < now() - interval '7 days';
  return v_count;
end;
$$;

revoke all on function public.bump_rate_limit(text, integer) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Moderation config (thresholds + prompt live in data, not code — PRD §5)
-- ---------------------------------------------------------------------------
create table public.moderation_config (
  id integer primary key default 1 check (id = 1),
  config jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.moderation_config enable row level security;
-- Service role only.

insert into public.moderation_config (id, config) values (1, '{
  "thresholds": {
    "toxicity_reject": 0.9,
    "toxicity_review": 0.4,
    "spam_reject": 0.9,
    "spam_review": 0.5,
    "relevance_review_below": 0.2
  },
  "sightengine": {
    "nudity_reject": 0.6,
    "gore_reject": 0.5,
    "violence_reject": 0.6
  },
  "prompt": "You are a content moderator for a memorial website where friends and family share written memories of a deceased person. Score the following submission. Respond with JSON only.\n\nScoring guidance:\n- toxicity: 0 (kind/neutral) to 1 (harassment, slurs, cruelty about the deceased or the family)\n- spam: 0 (genuine memory) to 1 (advertising, scams, link bait, off-platform solicitation)\n- relevance: 0 (clearly unrelated to remembering a person) to 1 (a genuine memory or condolence)\n- mentions_living_person_negatively: true if the text attacks, accuses or disparages a living person (family member, caregiver, etc.)\n- flags: short machine-readable strings for anything a human moderator should know (e.g. \"grief_argument\", \"possible_dispute\", \"mentions_cause_of_death\")"
}'::jsonb);
