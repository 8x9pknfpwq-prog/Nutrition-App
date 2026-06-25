-- Venue type: a second mode ("froyo") alongside bars, same infrastructure.
-- Existing rows default to 'bar'.

alter table public.bars
  add column if not exists venue_type text not null default 'bar';

alter table public.bars
  drop constraint if exists bars_venue_type_check;
alter table public.bars
  add constraint bars_venue_type_check check (venue_type in ('bar', 'froyo'));

create index if not exists bars_venue_type_idx on public.bars (venue_type);

-- ─────────────────────────────────────────────────────────────────────────────
-- Seed froyo venues.
-- ⚠️ PLACEHOLDERS — replace the name/address/lat/lng with the real 4 venues
-- before launch (coordinates here are approximate East Village placeholders).
-- ─────────────────────────────────────────────────────────────────────────────
insert into public.bars (name, address, latitude, longitude, rating, distance, verified, approved, venue_type) values
  ('16 Handles',        '153 2nd Ave',     40.72940, -73.98680, 4.4, 0.3, true, true, 'froyo'),
  ('froyo placeholder 2','REPLACE ADDRESS', 40.72760, -73.98990, 4.2, 0.4, true, true, 'froyo'),
  ('froyo placeholder 3','REPLACE ADDRESS', 40.72610, -73.98520, 4.3, 0.5, true, true, 'froyo'),
  ('froyo placeholder 4','REPLACE ADDRESS', 40.72420, -73.99240, 4.1, 0.5, true, true, 'froyo')
on conflict do nothing;
