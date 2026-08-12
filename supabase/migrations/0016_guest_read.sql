-- Guideline 5.1.1(v): let anyone browse the public map without an account.
-- Grant anonymous (not-logged-in) read access to the non-account data only:
-- venues and their crowd-sourced wait reports + forecast. Everything account-
-- based (friends, check-in notifications, writing reports, profiles) stays
-- gated to authenticated users.

drop policy if exists "bars_read_anon" on public.bars;
create policy "bars_read_anon" on public.bars for select to anon using (true);

drop policy if exists "reports_read_anon" on public.reports;
create policy "reports_read_anon" on public.reports for select to anon using (true);

-- Forecast view (created in 0006 if present). Safe to grant even if unused.
do $$
begin
  if exists (select 1 from pg_class where relname = 'bar_forecast' and relkind in ('v','m')) then
    execute 'grant select on public.bar_forecast to anon';
  end if;
end $$;
