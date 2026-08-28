-- Minimal stand-ins for the parts of a Supabase project that our migrations
-- depend on but do not create: the auth and storage schemas, the four roles,
-- and auth.uid().
--
-- This exists so the migrations can be applied to a plain Postgres in CI. It is
-- NOT part of the application schema and must never run against a real project
-- — Supabase provides all of this already.

create extension if not exists pgcrypto;

-- Roles. Supabase creates these; policies and grants reference them by name.
do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then
    create role anon nologin noinherit;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then
    create role authenticated nologin noinherit;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then
    create role service_role nologin noinherit bypassrls;
  end if;
end
$$;

-- Supabase hands the API roles blanket privileges on everything created in
-- `public` afterwards, and leaves RLS to do the actual gatekeeping. Reproduced
-- here because a migration that *narrows* a grant — 0005 takes the access code
-- hash away from anon — is a no-op against a database where the grant was
-- never there, and would pass CI while doing nothing in production.
grant usage on schema public to anon, authenticated, service_role;
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;

-- auth schema: only the columns our trigger and foreign keys touch.
create schema if not exists auth;

create table if not exists auth.users (
  instance_id uuid,
  id uuid primary key default gen_random_uuid(),
  aud text,
  role text,
  email text,
  encrypted_password text,
  email_confirmed_at timestamptz,
  raw_app_meta_data jsonb,
  raw_user_meta_data jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Returns the current user in Supabase. Stubbed as null so RLS predicates that
-- call it evaluate rather than error; tests that need a specific user set
-- request.jwt.claim.sub.
create or replace function auth.uid()
returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
$$;

-- storage schema: buckets and objects, enough for 0002 to apply.
create schema if not exists storage;

create table if not exists storage.buckets (
  id text primary key,
  name text not null,
  public boolean not null default false,
  created_at timestamptz default now()
);

create table if not exists storage.objects (
  id uuid primary key default gen_random_uuid(),
  bucket_id text references storage.buckets (id),
  name text,
  owner uuid,
  created_at timestamptz default now()
);

alter table storage.objects enable row level security;

-- Supabase guards its storage tables with a trigger that refuses direct
-- DELETEs, pointing you at the Storage API instead. Reproduced here so a
-- migration or reset script that tries one fails in CI rather than in
-- somebody's dashboard.
create or replace function storage.protect_delete()
returns trigger language plpgsql as $$
begin
  raise exception 'Direct deletion from storage tables is not allowed. Use the Storage API instead.'
    using errcode = '42501',
          hint = 'This prevents accidental data loss from orphaned objects.';
end;
$$;

create trigger protect_buckets_delete
  before delete on storage.buckets
  for each statement execute function storage.protect_delete();

create trigger protect_objects_delete
  before delete on storage.objects
  for each statement execute function storage.protect_delete();
