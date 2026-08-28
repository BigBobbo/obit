-- Report lifecycle + steward access requests.
--
-- Closes three gaps against the PRD:
--   §4.6 steward non-response escalates to the platform admin, rather than the
--        report quietly auto-closing where nobody ever saw it.
--   §4.6 reports auto-close 30 days after a follow-up request the reporter
--        never answered — not 30 days after they were filed.
--   §6   ownership disputes get a real "request to join as co-steward" path
--        that reaches the family first, instead of only the admin queue.

-- ---------------------------------------------------------------------------
-- 1. Report lifecycle
-- ---------------------------------------------------------------------------
-- `awaiting_reporter` is the state the 30-day clock actually runs in: it starts
-- when the admin asks the reporter a question, and stops when they answer.
alter table public.reports drop constraint if exists reports_status_check;
alter table public.reports add constraint reports_status_check
  check (status in ('open', 'steward', 'escalated', 'awaiting_reporter', 'resolved', 'auto_closed'));

alter table public.reports
  add column if not exists escalated_at timestamptz,
  add column if not exists follow_up_sent_at timestamptz,
  -- Capability token for the reporter's reply link. Unguessable, per report.
  add column if not exists response_token uuid not null default gen_random_uuid();

-- The steward queue and the admin queue are both status-scoped reads.
create index if not exists reports_page_status_idx on public.reports (page_id, status, created_at);

-- ---------------------------------------------------------------------------
-- 2. Steward access requests
-- ---------------------------------------------------------------------------
-- The dedupe screen at page creation offers "request to join as co-steward".
-- That request goes to the existing stewards, who approve or decline it; only
-- a genuine ownership *dispute* goes to the admin.
create table public.steward_requests (
  id uuid primary key default gen_random_uuid(),
  page_id uuid not null references public.pages (id) on delete cascade,
  requester_email text not null check (requester_email = lower(requester_email)),
  requester_name text not null check (char_length(requester_name) between 1 and 100),
  relationship text not null check (char_length(relationship) between 1 and 300),
  message text not null default '' check (char_length(message) <= 2000),
  -- awaiting_signup: the stewards said yes, but the requester has no account
  -- yet. The request stays actionable so they can finish once it exists.
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'awaiting_signup', 'declined')),
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by uuid references public.profiles (id)
);

create index steward_requests_page_idx on public.steward_requests (page_id, status, created_at);

-- One live request per person per page: re-asking should not flood the family.
create unique index steward_requests_open_idx
  on public.steward_requests (page_id, requester_email)
  where status in ('pending', 'awaiting_signup');

alter table public.steward_requests enable row level security;

create policy "steward_requests: steward read" on public.steward_requests
  for select using (public.is_steward(page_id) or public.is_admin());
-- Inserts and decisions go through the API (service role): Turnstile, rate
-- limits and the paid-plan check for co-stewards all live in one place.

-- ---------------------------------------------------------------------------
-- 3. Reversing an approval
-- ---------------------------------------------------------------------------
-- Approved memories are now removable (a report on a published memory has to
-- be actionable), which makes the approval counter reversible for the first
-- time. It gates auto-publish platform-wide, so a contributor whose only
-- approved memory was taken down for being abusive must not keep the credit
-- that would auto-publish their next one on somebody else's page.
--
-- Floored at zero, and atomic for the same reason bump_approved_count is.
create or replace function public.unbump_approved_count(p_email text)
returns integer language plpgsql security definer set search_path = public as $$
declare
  v_count integer;
begin
  update public.contributors
     set approved_count = greatest(approved_count - 1, 0)
   where email = p_email
  returning approved_count into v_count;
  return coalesce(v_count, 0);
end;
$$;

revoke all on function public.unbump_approved_count(text) from public, anon, authenticated;
