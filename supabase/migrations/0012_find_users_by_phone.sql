-- Add friends by phone number.
--
-- Exposes a SECURITY DEFINER function that looks up users by phone WITHOUT ever
-- returning phone numbers. Matching is on the last 10 digits (US numbers) after
-- stripping all non-digits from both sides, so any format the user typed at
-- signup — "(555) 123-4567", "555.123.4567", "+1 555 123 4567" — still matches.
--
-- Privacy: the caller must supply a full 10-digit number to get a hit (no partial
-- prefix matching), so this behaves like WhatsApp/Signal "add by number" rather
-- than an enumerable directory. Only id / username / avatar are returned.

create or replace function public.find_users_by_phone(p text)
returns table (id uuid, username text, avatar_initial text)
language sql
stable
security definer
set search_path = public
as $$
  select pr.id, pr.username, pr.avatar_initial
  from public.profiles pr
  where pr.phone is not null
    and length(regexp_replace(p, '\D', '', 'g')) >= 10
    and right(regexp_replace(pr.phone, '\D', '', 'g'), 10)
      = right(regexp_replace(p,        '\D', '', 'g'), 10)
  limit 10;
$$;

grant execute on function public.find_users_by_phone(text) to authenticated, anon;
