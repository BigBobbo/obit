-- Post-apply assertions. Each one raises an exception on failure, so psql with
-- ON_ERROR_STOP=1 exits non-zero and CI goes red.

-- Every table the app reads or writes.
do $$
declare
  expected text[] := array[
    'access_requests', 'audit_log', 'bans', 'contributor_page_blocks',
    'contributors', 'event_rsvps', 'events',
    'memories', 'moderation_config', 'pages', 'photos',
    'processed_stripe_events', 'profiles', 'rate_limits', 'reports',
    'steward_requests', 'stewards'
  ];
  missing text[];
begin
  select array_agg(t) into missing
  from unnest(expected) t
  where to_regclass('public.' || t) is null;

  if missing is not null then
    raise exception 'missing tables: %', missing;
  end if;
end
$$;

-- Row-level security must be on everywhere. A table that lost it would be
-- world-readable through the anon key.
do $$
declare
  unprotected text[];
begin
  select array_agg(c.relname::text) into unprotected
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity;

  if unprotected is not null then
    raise exception 'tables without RLS enabled: %', unprotected;
  end if;
end
$$;

-- The functions the app calls by name. is_steward is the one that shipped
-- broken: `language sql`, referencing a table created later in the same file.
do $$
declare
  expected text[] := array[
    'is_steward', 'is_admin', 'handle_new_user',
    'bump_rate_limit', 'bump_approved_count', 'unbump_approved_count'
  ];
  missing text[];
begin
  select array_agg(f) into missing
  from unnest(expected) f
  where not exists (
    select 1 from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = f
  );

  if missing is not null then
    raise exception 'missing functions: %', missing;
  end if;
end
$$;

-- is_steward must actually run. Creating it proves the body parsed; calling it
-- proves the table it reads is really there.
do $$
begin
  perform public.is_steward(gen_random_uuid());
  perform public.is_admin();
end
$$;

-- The atomic counter added in 0003 must increment rather than overwrite.
do $$
declare
  first_call integer;
  second_call integer;
begin
  delete from public.contributors where email = 'schema-check@example.com';
  first_call  := public.bump_approved_count('schema-check@example.com');
  second_call := public.bump_approved_count('schema-check@example.com');
  if first_call <> 1 or second_call <> 2 then
    raise exception 'bump_approved_count returned % then %, expected 1 then 2',
      first_call, second_call;
  end if;
  delete from public.contributors where email = 'schema-check@example.com';
end
$$;

-- Reversing an approval must be atomic too, and must never go negative: a
-- negative count would read as "trusted contributor" nowhere but would corrupt
-- every later comparison.
do $$
declare
  after_down integer;
  floored integer;
begin
  delete from public.contributors where email = 'schema-check@example.com';
  perform public.bump_approved_count('schema-check@example.com');
  perform public.bump_approved_count('schema-check@example.com');
  after_down := public.unbump_approved_count('schema-check@example.com');
  floored    := public.unbump_approved_count('schema-check@example.com');
  floored    := public.unbump_approved_count('schema-check@example.com');
  if after_down <> 1 or floored <> 0 then
    raise exception 'unbump_approved_count returned % then floored at %, expected 1 then 0',
      after_down, floored;
  end if;
  delete from public.contributors where email = 'schema-check@example.com';
end
$$;

-- The rate limiter counts within a window.
do $$
declare
  n integer;
begin
  perform public.bump_rate_limit('schema-check', 60);
  n := public.bump_rate_limit('schema-check', 60);
  if n <> 2 then
    raise exception 'bump_rate_limit returned % on the second call, expected 2', n;
  end if;
  delete from public.rate_limits where key = 'schema-check';
end
$$;

-- 0003 drops this; if it comes back, the dashboard will read a dead column.
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'pages' and column_name = 'photo_count'
  ) then
    raise exception 'pages.photo_count still exists — 0003 should have dropped it';
  end if;
end
$$;

-- 0004's report lifecycle. Without these columns the cron job silently stops
-- escalating steward non-response and stops closing unanswered follow-ups.
do $$
declare
  expected text[] := array['escalated_at', 'follow_up_sent_at', 'response_token'];
  missing text[];
begin
  select array_agg(c) into missing
  from unnest(expected) c
  where not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'reports' and column_name = c
  );
  if missing is not null then
    raise exception 'reports is missing columns: %', missing;
  end if;
end
$$;

-- The report lifecycle and the steward-request state machine, exercised
-- end to end on a fixture this block creates and removes itself — the reset +
-- re-apply pass has no seed data, so depending on it would leave these
-- assertions silently unrun half the time.
do $$
declare
  fixture_user uuid := '99999999-9999-9999-9999-999999999999';
  fixture_page uuid;
  report_id uuid;
  first_request uuid;
begin
  insert into auth.users (id, email) values (fixture_user, 'schema-check@example.com')
  on conflict (id) do nothing;

  insert into public.pages (random_id, name, date_of_birth, date_of_death, created_by)
  values ('SchemaCheck1', 'Schema Check', '1940-01-01', '2020-01-01', fixture_user)
  returning id into fixture_page;

  -- The status a report waits in while the reporter owes us an answer. If the
  -- CHECK constraint rejected it, request_info would fail and nothing would
  -- ever auto-close.
  insert into public.reports (target_type, page_id, category, reporter_email, status)
  values ('page', fixture_page, 'spam', 'schema-check@example.com', 'awaiting_reporter')
  returning id into report_id;

  if (select response_token from public.reports where id = report_id) is null then
    raise exception 'reports.response_token did not default to a token';
  end if;

  -- Only one steward request may be open per person per page.
  insert into public.steward_requests (page_id, requester_email, requester_name, relationship)
  values (fixture_page, 'schema-check@example.com', 'Schema Check', 'cousin')
  returning id into first_request;

  begin
    insert into public.steward_requests (page_id, requester_email, requester_name, relationship)
    values (fixture_page, 'schema-check@example.com', 'Schema Check', 'cousin');
    raise exception 'a second open steward request was allowed for the same email';
  exception when unique_violation then
    null; -- expected
  end;

  -- Deciding the first one frees the slot again.
  update public.steward_requests set status = 'declined' where id = first_request;
  insert into public.steward_requests (page_id, requester_email, requester_name, relationship)
  values (fixture_page, 'schema-check@example.com', 'Schema Check', 'cousin');

  delete from public.pages where id = fixture_page;
  delete from auth.users where id = fixture_user;
end
$$;

-- 0005's access model. The whole v2 privacy story rests on these columns and on
-- the two policies below; a migration that dropped either would silently return
-- a gated page to "the URL is the secret".
do $$
declare
  expected text[] := array[
    'announcement_enabled', 'announcement_text', 'access_mode',
    'access_code_hash', 'access_code_rotated_at'
  ];
  missing text[];
begin
  select array_agg(c) into missing
  from unnest(expected) c
  where not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'pages' and column_name = c
  );
  if missing is not null then
    raise exception 'pages is missing access columns: %', missing;
  end if;
end
$$;

-- The access code hash is the one column on `pages` the anon key may not read,
-- and every other column is one the app does read. Both halves are assertions:
-- a leaked hash is an offline brute-force target, and an ungranted column is a
-- page that renders blank.
do $$
declare
  leaked text;
  ungranted text[];
begin
  if has_column_privilege('anon', 'public.pages', 'access_code_hash', 'SELECT') then
    leaked := 'access_code_hash';
    raise exception 'anon can read pages.% — revoke it', leaked;
  end if;

  select array_agg(column_name::text) into ungranted
  from information_schema.columns
  where table_schema = 'public' and table_name = 'pages'
    and column_name <> 'access_code_hash'
    and not has_column_privilege('anon', 'public.pages', column_name, 'SELECT');

  if ungranted is not null then
    raise exception
      'anon cannot read pages columns %, so the public page will render without them — add them to the grant in 0005',
      ungranted;
  end if;
end
$$;

-- Reading a gated page must not be a public read. Both policies have to filter
-- on access_mode; without it the anon key still returns every memory.
do $$
declare
  memories_qual text;
  photos_qual text;
begin
  select qual into memories_qual from pg_policies
  where schemaname = 'public' and tablename = 'memories' and policyname = 'memories: public read approved';
  select qual into photos_qual from pg_policies
  where schemaname = 'public' and tablename = 'photos' and policyname = 'photos: public read';

  if memories_qual is null or memories_qual not like '%access_mode%' then
    raise exception 'the memories public-read policy no longer checks access_mode: %', memories_qual;
  end if;
  if photos_qual is null or photos_qual not like '%access_mode%' then
    raise exception 'the photos public-read policy no longer checks access_mode: %', photos_qual;
  end if;
end
$$;

-- Access modes, the code-mode backstop, one live request per person per page,
-- and the event/RSVP shape — on a fixture this block creates and removes.
do $$
declare
  fixture_user uuid := '88888888-8888-8888-8888-888888888888';
  fixture_page uuid;
  fixture_event uuid;
begin
  insert into auth.users (id, email) values (fixture_user, 'access-check@example.com')
  on conflict (id) do nothing;

  insert into public.pages (random_id, name, date_of_birth, date_of_death, created_by)
  values ('AccessCheck1', 'Access Check', '1940-01-01', '2020-01-01', fixture_user)
  returning id into fixture_page;

  if (select access_mode from public.pages where id = fixture_page) <> 'link' then
    raise exception 'new pages must default to link mode';
  end if;

  -- Code mode without a code would lock the family out of their own page.
  begin
    update public.pages set access_mode = 'code' where id = fixture_page;
    raise exception 'code mode was allowed with no access_code_hash';
  exception when check_violation then
    null; -- expected
  end;

  update public.pages
     set access_mode = 'code', access_code_hash = 'scrypt$deadbeef$cafe',
         access_code_rotated_at = now()
   where id = fixture_page;

  begin
    update public.pages set access_mode = 'nonsense' where id = fixture_page;
    raise exception 'an unknown access mode was accepted';
  exception when check_violation then
    null; -- expected
  end;

  -- One access request per person per page, in either direction.
  insert into public.access_requests (page_id, email, name, status)
  values (fixture_page, 'access-check@example.com', 'Access Check', 'preapproved');
  begin
    insert into public.access_requests (page_id, email, name)
    values (fixture_page, 'access-check@example.com', 'Access Check');
    raise exception 'a second access request was allowed for the same email';
  exception when unique_violation then
    null; -- expected
  end;

  if (select verify_token from public.access_requests
      where page_id = fixture_page and email = 'access-check@example.com') is null then
    raise exception 'access_requests.verify_token did not default to a token';
  end if;

  insert into public.events (page_id, kind, title, starts_at, tz, venue)
  values (fixture_page, 'service', 'Funeral service', now() + interval '2 days',
          'America/New_York', 'St Anne''s, Rye')
  returning id into fixture_event;

  begin
    insert into public.event_rsvps (event_id, name, party_size)
    values (fixture_event, 'A friend', 99);
    raise exception 'an out-of-range party size was accepted';
  exception when check_violation then
    null; -- expected
  end;

  insert into public.event_rsvps (event_id, name, party_size) values (fixture_event, 'A friend', 3);

  delete from public.pages where id = fixture_page;
  delete from auth.users where id = fixture_user;
end
$$;

-- Approval latency needs both ends of the clock, and a decline needs somewhere
-- to carry its reason.
do $$
declare
  expected text[] := array['decided_at', 'decline_reason'];
  missing text[];
begin
  select array_agg(c) into missing
  from unnest(expected) c
  where not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'memories' and column_name = c
  );
  if missing is not null then
    raise exception 'memories is missing columns: %', missing;
  end if;
end
$$;

-- Both storage buckets, with the public/private split the photo pipeline needs.
do $$
declare
  photos_public boolean;
  originals_public boolean;
begin
  select public into photos_public from storage.buckets where id = 'photos';
  select public into originals_public from storage.buckets where id = 'originals';

  if photos_public is null or originals_public is null then
    raise exception 'storage buckets missing (photos: %, originals: %)',
      photos_public, originals_public;
  end if;
  if not photos_public then
    raise exception 'the photos bucket must be public — web renditions are served from it';
  end if;
  if originals_public then
    raise exception 'the originals bucket must be private — it holds full-resolution uploads';
  end if;
end
$$;

-- The moderation config row must exist and carry a full threshold set. A
-- missing key here is the failure that silently turns moderation off.
do $$
declare
  cfg jsonb;
  required text[] := array[
    'toxicity_reject', 'toxicity_review', 'spam_reject',
    'spam_review', 'relevance_review_below'
  ];
  k text;
begin
  select config into cfg from public.moderation_config where id = 1;
  if cfg is null then
    raise exception 'moderation_config row 1 is missing';
  end if;
  foreach k in array required loop
    if cfg -> 'thresholds' -> k is null then
      raise exception 'moderation_config is missing thresholds.%', k;
    end if;
  end loop;
  if cfg ->> 'prompt' is null then
    raise exception 'moderation_config is missing the Tier 1 prompt';
  end if;
end
$$;

select 'schema assertions passed' as result;
