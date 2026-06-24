-- NYC Lines — suggestions / admin approval.
-- User submissions are stored as Google-verified but UNAPPROVED bars; they only
-- appear on the map once an admin approves them. Run this after 0001_init.sql.

-- Approval gate + who suggested it.
alter table public.bars add column if not exists approved boolean not null default false;
alter table public.bars add column if not exists submitted_by uuid references public.profiles (id) on delete set null;

-- Existing seeded bars are live.
update public.bars set approved = true where approved = false;

-- The map only shows approved places: replace the read policy.
drop policy if exists "bars_read" on public.bars;
drop policy if exists "bars_read_approved" on public.bars;
create policy "bars_read_approved" on public.bars
  for select to authenticated
  using (approved = true);

-- (Inserts still happen only via the submit-place Edge Function using the
--  service role, so there is no client insert/update policy. Approve a pending
--  suggestion from the Supabase Table Editor by setting approved = true.)
