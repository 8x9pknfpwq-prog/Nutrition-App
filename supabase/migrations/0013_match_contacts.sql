-- Find which of the user's phone contacts are already on NYC Lines.
--
-- Takes a batch of phone numbers (any format), matches on the last 10 digits
-- like find_users_by_phone, and returns the registered users — id / username /
-- avatar only, never a phone number. SECURITY DEFINER so it can match against
-- the phone column without exposing it. Excludes the caller themselves.
--
-- We never store the submitted numbers; this is a stateless lookup.

create or replace function public.match_contacts(phones text[])
returns table (id uuid, username text, avatar_initial text)
language sql
stable
security definer
set search_path = public
as $$
  select pr.id, pr.username, pr.avatar_initial
  from public.profiles pr
  where pr.phone is not null
    and pr.id <> auth.uid()
    and right(regexp_replace(pr.phone, '\D', '', 'g'), 10) in (
      select right(regexp_replace(x, '\D', '', 'g'), 10)
      from unnest(phones) as x
      where length(regexp_replace(x, '\D', '', 'g')) >= 10
    )
  limit 500;
$$;

grant execute on function public.match_contacts(text[]) to authenticated;
