-- Real per-venue opening hours.
--
-- `hours` is a JSON array of 7 entries, index 0 = Sunday … 6 = Saturday.
-- Each entry is either null (closed that day) or { "open": <minutes>, "close":
-- <minutes> } where minutes are from local midnight (0–1439) and `close` may
-- exceed 1440 to mean past midnight (e.g. a bar open 16:00–02:00 → open 960,
-- close 1560).
--
-- When `hours` is null the app falls back to sensible per-venue-type defaults
-- (bars 4 PM–4 AM, froyo 11 AM–11 PM), so existing rows keep working until an
-- admin sets real hours.

alter table public.bars
  add column if not exists hours jsonb;
