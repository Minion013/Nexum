update public.resolution_authorities
set display_name = 'NEXUM Simulation Authority'
where slug = 'pactflow-simulation'
  and display_name = 'PactFlow Simulation Authority';

update public.profiles
set display_name = 'NEXUM participant'
where display_name = 'PactFlow participant';

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, email, display_name, username)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(coalesce(new.email, ''), '@', 1), 'NEXUM participant'),
    'pf-' || right(replace(new.id::text, '-', ''), 12)
  );
  return new;
end;
$$;

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

  insert into public.profiles (id, email, display_name, username)
  values (
    auth.uid(),
    user_email,
    coalesce(nullif(auth.jwt() -> 'user_metadata' ->> 'full_name', ''), nullif(split_part(user_email, '@', 1), ''), 'NEXUM participant'),
    'pf-' || right(replace(auth.uid()::text, '-', ''), 12)
  )
  on conflict (id) do nothing;

  select * into profile from public.profiles where id = auth.uid();
  return profile;
end;
$$;

create or replace function public.prevent_profile_username_change()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.username is distinct from old.username then
    raise exception 'A NEXUM username cannot be changed.';
  end if;
  return new;
end;
$$;
