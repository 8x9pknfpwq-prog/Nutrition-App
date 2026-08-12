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
-- Seed froyo venues — all NYC locations of Go Greek Yogurt, Culture, Myka, and
-- Madison Fare. Coordinates are best-effort from each street address; nudge any
-- pin in the Table Editor if it's slightly off.
-- ─────────────────────────────────────────────────────────────────────────────
insert into public.bars (name, address, latitude, longitude, rating, distance, verified, approved, venue_type) values
  ('Go Greek Yogurt',                  '683 Broadway',          40.7276, -73.9937, 4.5, 0.1, true, true, 'froyo'),
  ('Culture: An American Yogurt Co.',  '60 W 8th St',           40.7330, -73.9980, 4.4, 0.4, true, true, 'froyo'),
  ('Culture (Park Slope)',             '331 5th Ave, Brooklyn', 40.6718, -73.9875, 4.4, 4.0, true, true, 'froyo'),
  ('Myka',                             '159 7th Ave S',         40.7360, -74.0028, 4.5, 0.6, true, true, 'froyo'),
  ('Madison Fare (Upper East Side)',   '1225 Madison Ave',      40.7825, -73.9558, 4.3, 3.8, true, true, 'froyo'),
  ('Madison Fare (Greenwich Village)', '1 W 8th St',            40.7323, -73.9968, 4.3, 0.4, true, true, 'froyo')
on conflict do nothing;
