alter table public.profiles add column if not exists username text;

update public.profiles
set username = 'pf-' || right(replace(id::text, '-', ''), 12)
where username is null;

alter table public.profiles alter column username set not null;

alter table public.profiles
  add constraint profiles_username_format
  check (username ~ '^[a-z0-9][a-z0-9-]{2,62}$');

create unique index profiles_username_unique on public.profiles (lower(username));

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
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(coalesce(new.email, ''), '@', 1), 'PactFlow participant'),
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
    coalesce(nullif(auth.jwt() -> 'user_metadata' ->> 'full_name', ''), nullif(split_part(user_email, '@', 1), ''), 'PactFlow participant'),
    'pf-' || right(replace(auth.uid()::text, '-', ''), 12)
  )
  on conflict (id) do nothing;

  select * into profile from public.profiles where id = auth.uid();
  return profile;
end;
$$;

drop function public.discover_people(text);

create function public.discover_people(search_text text default '')
returns table (id uuid, display_name text, username text, professional_headline text)
language sql
stable
security definer
set search_path = ''
as $$
  select profile.id, profile.display_name, profile.username, profile.professional_headline
  from public.profiles profile
  where profile.discoverable
    and profile.id <> auth.uid()
    and not exists (
      select 1
      from public.profile_connections connection
      where least(connection.requester_profile_id, connection.recipient_profile_id) = least(auth.uid(), profile.id)
        and greatest(connection.requester_profile_id, connection.recipient_profile_id) = greatest(auth.uid(), profile.id)
        and connection.status = 'blocked'
    )
    and (coalesce(trim(search_text), '') = ''
      or profile.display_name ilike '%' || trim(search_text) || '%'
      or profile.username ilike '%' || trim(search_text) || '%'
      or coalesce(profile.professional_headline, '') ilike '%' || trim(search_text) || '%')
  order by lower(profile.display_name), lower(profile.username), profile.id
  limit 20;
$$;

revoke all on function public.discover_people(text) from public, anon;
grant execute on function public.discover_people(text) to authenticated;

create function public.prevent_profile_username_change()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.username is distinct from old.username then
    raise exception 'A PactFlow username cannot be changed.';
  end if;
  return new;
end;
$$;

create trigger profiles_username_is_immutable
  before update of username on public.profiles
  for each row execute procedure public.prevent_profile_username_change();
