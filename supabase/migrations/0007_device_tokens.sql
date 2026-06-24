-- Device push tokens for native (iOS) push notifications.
-- One row per device; the send-push Edge Function looks these up by user_id.

create table if not exists public.device_tokens (
  token      text primary key,
  user_id    uuid not null references public.profiles (id) on delete cascade,
  platform   text not null default 'ios',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists device_tokens_user_idx on public.device_tokens (user_id);

alter table public.device_tokens enable row level security;

-- Users manage only their own device tokens.
create policy "device_tokens_select" on public.device_tokens
  for select to authenticated using (auth.uid() = user_id);
create policy "device_tokens_insert" on public.device_tokens
  for insert to authenticated with check (auth.uid() = user_id);
create policy "device_tokens_update" on public.device_tokens
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "device_tokens_delete" on public.device_tokens
  for delete to authenticated using (auth.uid() = user_id);
