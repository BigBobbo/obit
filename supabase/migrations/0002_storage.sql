-- Storage buckets.
--   photos    — public: web-size, EXIF-stripped renditions only.
--   originals — private: full-resolution uploads. Never served to non-stewards.

insert into storage.buckets (id, name, public)
values ('photos', 'photos', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('originals', 'originals', false)
on conflict (id) do nothing;

-- All uploads happen server-side with the service role (the sharp pipeline),
-- so no insert policies are granted to anon/authenticated.

-- Public read of web renditions (the bucket is public; this covers signed access too).
create policy "photos bucket: public read"
on storage.objects for select
using (bucket_id = 'photos');

-- Originals are only readable through the API, which checks stewardship
-- before creating a signed URL with the service role. No direct policies.
