-- The auth trigger creates profiles for new users. This function also repairs
-- a verified user whose profile was absent because the trigger was added later
-- or failed previously. It runs only with the caller's authenticated JWT.
create or replace function public.ensure_profile()
returns public.profiles
language plpgsql
security definer
set search_path = ''
as $$
declare
  profile public.profiles;
  user_email text := coalesce(auth.jwt() ->> 'email', '');
begin
  if auth.uid() is null then
    raise exception 'An authenticated user is required.';
  end if;

  insert into public.profiles (id, email, display_name)
  values (
    auth.uid(),
    user_email,
    coalesce(
      nullif(auth.jwt() -> 'user_metadata' ->> 'full_name', ''),
      nullif(split_part(user_email, '@', 1), ''),
      'PactFlow participant'
    )
  )
  on conflict (id) do nothing;

  select * into profile
  from public.profiles
  where id = auth.uid();

  return profile;
end;
$$;

revoke all on function public.ensure_profile() from public;
grant execute on function public.ensure_profile() to authenticated;
