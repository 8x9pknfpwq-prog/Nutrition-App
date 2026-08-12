-- Collect first name, last name, and (optional) phone at signup.
-- These arrive in the auth user's metadata and are copied into the profile by
-- the signup trigger. Phone is optional; name is required in the UI.

alter table public.profiles
  add column if not exists first_name text,
  add column if not exists last_name  text,
  add column if not exists phone      text;

-- Recreate the signup trigger to also persist the new fields from metadata.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, username, avatar_initial, first_name, last_name, phone)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'username', split_part(new.email, '@', 1)),
    upper(left(coalesce(new.raw_user_meta_data ->> 'username', new.email), 1)),
    nullif(new.raw_user_meta_data ->> 'first_name', ''),
    nullif(new.raw_user_meta_data ->> 'last_name', ''),
    nullif(new.raw_user_meta_data ->> 'phone', '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;
