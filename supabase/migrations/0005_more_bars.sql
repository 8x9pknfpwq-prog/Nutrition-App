-- More NYC bars — West Village / Greenwich Village + Tribeca / FiDi.
-- Inserted as live (approved + verified). Run after 0003. Coordinates are
-- best-effort; nudge any pin in Table Editor if it's slightly off.

alter table public.bars add column if not exists approved boolean not null default false; -- safety if 0003 not yet run

insert into public.bars (name, address, latitude, longitude, rating, distance, verified, approved) values
  ('Employees Only',          '510 Hudson St',      40.7339, -74.0058, 4.6, 0.7, true, true),
  ('The Spaniard',            '190 W 4th St',       40.7331, -74.0021, 4.4, 0.5, true, true),
  ('Down the Hatch',          '179 W 4th St',       40.7325, -74.0008, 4.1, 0.5, true, true),
  ('Due West',                '189 W 10th St',      40.7344, -74.0021, 4.0, 0.6, true, true),
  ('Angel''s Share',          '45 Grove St',        40.7331, -74.0030, 4.5, 0.6, true, true),
  ('Do Not Disturb',          '285 W 12th St',      40.7382, -74.0048, 4.3, 0.9, true, true),
  ('Bleecker Street Bar',     '648 Broadway',       40.7268, -73.9947, 4.2, 0.1, true, true),
  ('Rocco''s Sports & Rec',   '1 W 3rd St',         40.7288, -73.9942, 4.1, 0.1, true, true),
  ('Brickyard',               '23 Park Pl',         40.7136, -74.0080, 4.7, 1.2, true, true),
  ('Greenwich Street Tavern', '399 Greenwich St',   40.7203, -74.0095, 4.3, 1.0, true, true),
  ('The Dead Rabbit',         '30 Water St',        40.7033, -74.0114, 4.7, 1.9, true, true),
  ('Holywater',               '112 Reade St',       40.7160, -74.0090, 4.4, 1.1, true, true)
on conflict do nothing;
