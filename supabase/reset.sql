-- Memorial Pages — reset before re-running setup.
--
-- Run this FIRST if an earlier setup attempt failed part-way through, then run
-- supabase-setup.sql. Safe on a clean database too: every drop is `if exists`.
--
-- This removes only objects the app creates. It does not touch auth.users, so
-- any account you already signed up with survives.

drop trigger if exists on_auth_user_created on auth.users;

drop function if exists public.handle_new_user() cascade;
drop function if exists public.is_steward(uuid) cascade;
drop function if exists public.is_admin() cascade;
drop function if exists public.bump_rate_limit(text, integer) cascade;
drop function if exists public.bump_approved_count(text) cascade;
drop function if exists public.unbump_approved_count(text) cascade;

drop table if exists public.event_rsvps cascade;
drop table if exists public.events cascade;
drop table if exists public.access_requests cascade;
drop table if exists public.steward_requests cascade;
drop table if exists public.processed_stripe_events cascade;
drop table if exists public.moderation_config cascade;
drop table if exists public.rate_limits cascade;
drop table if exists public.bans cascade;
drop table if exists public.audit_log cascade;
drop table if exists public.reports cascade;
drop table if exists public.photos cascade;
drop table if exists public.memories cascade;
drop table if exists public.contributor_page_blocks cascade;
drop table if exists public.contributors cascade;
drop table if exists public.stewards cascade;
drop table if exists public.pages cascade;
drop table if exists public.profiles cascade;

-- The storage policy has to go, because 0002 recreates it and CREATE POLICY is
-- not idempotent.
drop policy if exists "photos bucket: public read" on storage.objects;

-- The buckets themselves are deliberately left alone. Supabase blocks direct
-- DELETE on storage tables ("Use the Storage API instead"), and there is no
-- need: 0002 inserts them with `on conflict do nothing`, so re-running setup
-- over existing buckets is a no-op. Delete them by hand in Storage if you ever
-- really need to.
