-- Busyness forecast from past reports.
--
-- A view that aggregates every report into average wait + sample count, bucketed
-- by NYC weekday (0=Sun … 6=Sat) and hour (0–23). The app reads:
--   • the current weekday/hour rows for the map ("forecast now")
--   • all rows for one bar for the "best time to go" strip
-- The client blends these averages toward a generic prior (Bayesian shrinkage),
-- so sparse cells stay sensible and dense cells reflect real history.
--
-- Reports are already public-readable (the live wait needs them), so exposing
-- aggregates here adds no new disclosure.

create or replace view public.bar_forecast as
select
  bar_id,
  extract(dow  from (created_at at time zone 'America/New_York'))::int as dow,
  extract(hour from (created_at at time zone 'America/New_York'))::int as hour,
  avg(wait_min)::numeric(6,2) as avg_wait,
  count(*)::int               as n
from public.reports
group by bar_id,
         extract(dow  from (created_at at time zone 'America/New_York')),
         extract(hour from (created_at at time zone 'America/New_York'));

grant select on public.bar_forecast to anon, authenticated;
