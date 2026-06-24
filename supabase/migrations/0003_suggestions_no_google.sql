-- NYC Lines — suggestions WITHOUT Google (admin approves manually).
-- Self-contained + idempotent: safe to run after 0001 (supersedes 0002).
-- Users insert pending places directly; only an admin makes them live.

-- Approval gate + who suggested it.
alter table public.bars add column if not exists approved boolean not null default false;
alter table public.bars add column if not exists submitted_by uuid references public.profiles (id) on delete set null;

-- Existing seeded bars are live.
update public.bars set approved = true where verified = true and approved = false;

-- The map shows only approved places.
drop policy if exists "bars_read" on public.bars;
drop policy if exists "bars_read_approved" on public.bars;
create policy "bars_read_approved" on public.bars
  for select to authenticated using (approved = true);

-- Authenticated users may submit PENDING suggestions as themselves. They cannot
-- self-approve or mark a place verified — only an admin can (via the dashboard).
drop policy if exists "bars_insert_suggestion" on public.bars;
create policy "bars_insert_suggestion" on public.bars
  for insert to authenticated
  with check (auth.uid() = submitted_by and approved = false and verified = false);

-- Prevent duplicate places (case-insensitive name + address).
create unique index if not exists bars_name_addr_uniq on public.bars (lower(name), lower(address));
