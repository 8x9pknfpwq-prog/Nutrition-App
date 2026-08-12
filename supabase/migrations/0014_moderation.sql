-- Moderation: report content + block users (App Store Guideline 1.2 for UGC).

-- Reports of a venue, a check-in, or a user, for the admin to review.
create table if not exists public.content_reports (
  id          uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references auth.users(id) on delete cascade,
  target_type text not null check (target_type in ('venue', 'checkin', 'user')),
  target_id   text not null,
  reason      text,
  status      text not null default 'open',
  created_at  timestamptz not null default now()
);
alter table public.content_reports enable row level security;

drop policy if exists content_reports_insert on public.content_reports;
create policy content_reports_insert on public.content_reports
  for insert to authenticated
  with check (reporter_id = auth.uid());

drop policy if exists content_reports_admin_read on public.content_reports;
create policy content_reports_admin_read on public.content_reports
  for select to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin));

drop policy if exists content_reports_admin_update on public.content_reports;
create policy content_reports_admin_update on public.content_reports
  for update to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin));

-- One user blocking another.
create table if not exists public.user_blocks (
  blocker_id uuid not null references auth.users(id) on delete cascade,
  blocked_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id)
);
alter table public.user_blocks enable row level security;

-- You manage (see/create/delete) only the blocks you created. Reads for the
-- "blocked me" direction are handled server-side by the blockedIds() query,
-- which needs to see rows where blocked_id = you too, so allow selecting rows
-- on either side; writes stay restricted to your own blocker_id.
drop policy if exists user_blocks_select on public.user_blocks;
create policy user_blocks_select on public.user_blocks
  for select to authenticated
  using (blocker_id = auth.uid() or blocked_id = auth.uid());

drop policy if exists user_blocks_write on public.user_blocks;
create policy user_blocks_write on public.user_blocks
  for insert to authenticated
  with check (blocker_id = auth.uid());

drop policy if exists user_blocks_delete on public.user_blocks;
create policy user_blocks_delete on public.user_blocks
  for delete to authenticated
  using (blocker_id = auth.uid());
