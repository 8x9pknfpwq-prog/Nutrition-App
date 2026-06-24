-- NYC Lines — admin role + approval permissions.
-- Run after 0003. Then make yourself an admin (replace with your username):
--   update public.profiles set is_admin = true where username = 'yourname';

alter table public.profiles add column if not exists is_admin boolean not null default false;

-- Helper used by policies (SECURITY DEFINER avoids any RLS recursion).
create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select is_admin from public.profiles where id = auth.uid()), false);
$$;

-- Admins can see ALL bars (incl. pending), approve/verify them, and reject
-- (delete). Normal users keep the approved-only read from 0003 — multiple
-- SELECT policies are OR'd, so admins additionally see pending rows.
drop policy if exists "bars_admin_select" on public.bars;
create policy "bars_admin_select" on public.bars
  for select to authenticated using (public.is_admin());

drop policy if exists "bars_admin_update" on public.bars;
create policy "bars_admin_update" on public.bars
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "bars_admin_delete" on public.bars;
create policy "bars_admin_delete" on public.bars
  for delete to authenticated using (public.is_admin());
