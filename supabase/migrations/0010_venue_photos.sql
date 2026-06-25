-- Venue photos.
--
-- A nullable image_url on bars, plus a public Storage bucket that admins can
-- upload to and everyone can read. Until a venue has a photo, the app shows a
-- branded placeholder, so the UI looks intentional with no photos set.
--
-- If the storage policy statements error in your project (some projects manage
-- storage policies via the dashboard), create the bucket in Storage → New
-- bucket → "venue-photos" (public) instead; the image_url column is the only
-- strictly required part.

alter table public.bars
  add column if not exists image_url text;

-- Public bucket for venue photos.
insert into storage.buckets (id, name, public)
values ('venue-photos', 'venue-photos', true)
on conflict (id) do nothing;

-- Anyone can view; only admins can add/replace/remove photos.
drop policy if exists "venue_photos_read" on storage.objects;
create policy "venue_photos_read" on storage.objects
  for select using (bucket_id = 'venue-photos');

drop policy if exists "venue_photos_admin_insert" on storage.objects;
create policy "venue_photos_admin_insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'venue-photos' and public.is_admin());

drop policy if exists "venue_photos_admin_update" on storage.objects;
create policy "venue_photos_admin_update" on storage.objects
  for update to authenticated
  using (bucket_id = 'venue-photos' and public.is_admin());

drop policy if exists "venue_photos_admin_delete" on storage.objects;
create policy "venue_photos_admin_delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'venue-photos' and public.is_admin());
