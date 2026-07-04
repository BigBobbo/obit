-- Local-development seed data. Runs after migrations on `supabase db reset`.
-- Creates one demo steward (also flagged admin so you can see the admin panel),
-- a browsable memorial page, and a few memories including one pending item so
-- the moderation queue is non-empty.
--
-- NOT for production — this inserts directly into auth.users with a fixed UUID.

-- Demo steward / admin. The handle_new_user trigger creates the matching
-- profiles row automatically. Sign in locally by requesting a magic link for
-- this address and reading it in Inbucket (http://localhost:54324).
insert into auth.users (
  instance_id, id, aud, role, email,
  encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at
) values (
  '00000000-0000-0000-0000-000000000000',
  '11111111-1111-1111-1111-111111111111',
  'authenticated', 'authenticated', 'steward@example.com',
  '', now(),
  '{"provider":"email","providers":["email"]}', '{}',
  now(), now()
) on conflict (id) do nothing;

update public.profiles set is_admin = true where id = '11111111-1111-1111-1111-111111111111';

-- Demo memorial page.
insert into public.pages (
  id, random_id, name, date_of_birth, date_of_death, bio, created_by,
  last_steward_activity_at
) values (
  '22222222-2222-2222-2222-222222222222',
  'Demo7pageXyz',
  'Eleanor M. Hartley',
  '1938-04-12', '2023-11-03',
  'A schoolteacher for forty years, a fierce gardener, and grandmother to nine. This page is seeded for local development.',
  '11111111-1111-1111-1111-111111111111',
  now()
) on conflict (id) do nothing;

insert into public.stewards (page_id, user_id, role)
values ('22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 'owner')
on conflict (page_id, user_id) do nothing;

-- A returning verified contributor (approval history → future submissions from
-- this email can auto-publish).
insert into public.contributors (email, verified_at, approved_count)
values ('friend@example.com', now(), 2)
on conflict (email) do nothing;

-- Two approved memories (visible on the public page) and one pending (shows in
-- the steward queue).
insert into public.memories (page_id, contributor_email, contributor_name, body, status, approved_at)
values
  ('22222222-2222-2222-2222-222222222222', 'friend@example.com', 'Margaret',
   'Mrs. Hartley taught me to read when I was six and never let me quit anything. I think of her every autumn.',
   'approved', now()),
  ('22222222-2222-2222-2222-222222222222', 'friend@example.com', 'The Delgado family',
   'Her tomatoes were legendary on our street. We still use the trellis design she sketched for us.',
   'approved', now())
on conflict do nothing;

insert into public.memories (page_id, contributor_email, contributor_name, body, status, moderation_scores)
values
  ('22222222-2222-2222-2222-222222222222', 'newperson@example.com', 'A former student',
   'She once drove across the county in a snowstorm to bring a sick student his homework. First time I have shared this.',
   'pending',
   '{"routing":{"reasons":["first_time_contributor"]}}'::jsonb)
on conflict do nothing;
