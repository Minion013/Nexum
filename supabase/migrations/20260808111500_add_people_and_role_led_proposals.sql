alter table public.profiles
  add column if not exists professional_headline text,
  add column if not exists discoverable boolean not null default false;

alter table public.profiles
  add constraint profiles_professional_headline_length
  check (professional_headline is null or char_length(trim(professional_headline)) between 1 and 160);

create table public.profile_connections (
  id uuid primary key default gen_random_uuid(),
  requester_profile_id uuid not null references public.profiles(id) on delete cascade,
  recipient_profile_id uuid not null references public.profiles(id) on delete cascade,
  status text not null check (status in ('pending', 'accepted', 'declined', 'withdrawn', 'blocked')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (requester_profile_id <> recipient_profile_id),
  unique (requester_profile_id, recipient_profile_id)
);

create table public.proposal_workspace_access (
  contract_id uuid primary key references public.contracts(id) on delete cascade,
  workspace_id uuid not null references public.workspaces(id) on delete cascade
);

alter table public.proposal_workspace_access enable row level security;
create policy "Members can read their Proposal workspace access"
  on public.proposal_workspace_access for select
  using (public.is_workspace_member(workspace_id));

create unique index profile_connections_one_relationship
  on public.profile_connections (least(requester_profile_id, recipient_profile_id), greatest(requester_profile_id, recipient_profile_id));

alter table public.profile_connections enable row level security;

create policy "Users can read their own connections"
  on public.profile_connections for select
  using (requester_profile_id = (select auth.uid()) or recipient_profile_id = (select auth.uid()));

create policy "Users can send their own connection requests"
  on public.profile_connections for insert
  with check (requester_profile_id = (select auth.uid()) and status = 'pending');

create function public.discover_people(search_text text default '')
returns table (id uuid, display_name text, professional_headline text)
language sql
stable
security definer
set search_path = ''
as $$
  select profile.id, profile.display_name, profile.professional_headline
  from public.profiles profile
  where profile.discoverable
    and profile.id <> auth.uid()
    and (coalesce(trim(search_text), '') = ''
      or profile.display_name ilike '%' || trim(search_text) || '%'
      or coalesce(profile.professional_headline, '') ilike '%' || trim(search_text) || '%')
  order by profile.display_name
  limit 50;
$$;

create function public.create_role_led_proposal(
  owning_workspace_id uuid,
  contract_name text,
  contract_scope text,
  counterparty_email text,
  initiator_responsibility text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_contract_id uuid;
  version_id uuid;
  authority_id uuid;
  normalized_email text := lower(trim(counterparty_email));
  counterparty_responsibility text;
begin
  if auth.uid() is null or not public.is_workspace_member(owning_workspace_id) then
    raise exception 'Choose a Workspace you belong to.';
  end if;
  if initiator_responsibility not in ('buyer', 'service_provider') then
    raise exception 'Choose whether you are hiring or providing the service.';
  end if;
  if char_length(trim(contract_name)) not between 1 and 160 or char_length(trim(contract_scope)) not between 1 and 4000 then
    raise exception 'Proposal name and scope are required.';
  end if;
  if normalized_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then
    raise exception 'A valid counterparty email is required.';
  end if;
  select id into authority_id from public.resolution_authorities where slug = 'pactflow-simulation' and status = 'published';
  if authority_id is null then raise exception 'No published Resolution Authority is available.'; end if;
  counterparty_responsibility := case initiator_responsibility when 'buyer' then 'service_provider' else 'buyer' end;
  insert into public.contracts (created_by_profile_id, status) values (auth.uid(), 'private_draft') returning id into new_contract_id;
  insert into public.proposal_workspace_access (contract_id, workspace_id) values (new_contract_id, owning_workspace_id);
  insert into public.contract_parties (contract_id, party_kind, profile_id) values (new_contract_id, 'profile', auth.uid());
  insert into public.contacts (owner_profile_id, display_name, email) values (auth.uid(), normalized_email, normalized_email)
    on conflict (owner_profile_id, email) do nothing;
  insert into public.contract_versions (contract_id, version_number, version_hash, selected_authority_id, authority_snapshot, created_by_profile_id)
  select new_contract_id, 1, md5(new_contract_id::text || now()::text), authority_id,
    jsonb_build_object('authority_name', display_name, 'jurisdiction_label', jurisdiction_label, 'ruleset_version', ruleset_version), auth.uid()
  from public.resolution_authorities where id = authority_id returning id into version_id;
  insert into public.contract_sections (contract_version_id, section_type, position, terms) values
    (version_id, 'scope', 0, jsonb_build_object('title', trim(contract_name), 'description', trim(contract_scope))),
    (version_id, 'parties', 1, jsonb_build_object('initiator_profile_id', auth.uid(), 'owning_workspace_id', owning_workspace_id, 'counterparty_email', normalized_email, 'initiator_responsibility', initiator_responsibility, 'counterparty_responsibility', counterparty_responsibility)),
    (version_id, 'change_control', 2, jsonb_build_object('rule', 'Future uncompleted work changes only through bilateral amendment.'));
  return new_contract_id;
end;
$$;

create function public.list_people_connections()
returns table (id uuid, other_profile_id uuid, display_name text, email text, professional_headline text, status text, direction text)
language sql stable security definer set search_path = '' as $$
  select connection.id,
    case when connection.requester_profile_id = auth.uid() then connection.recipient_profile_id else connection.requester_profile_id end,
    profile.display_name, profile.email, profile.professional_headline, connection.status,
    case when connection.requester_profile_id = auth.uid() then 'outgoing' else 'incoming' end
  from public.profile_connections connection
  join public.profiles profile on profile.id = case when connection.requester_profile_id = auth.uid() then connection.recipient_profile_id else connection.requester_profile_id end
  where connection.requester_profile_id = auth.uid() or connection.recipient_profile_id = auth.uid()
  order by connection.updated_at desc;
$$;

create function public.manage_profile_connection(target_profile_id uuid, action text)
returns uuid
language plpgsql security definer set search_path = '' as $$
declare connection public.profile_connections;
begin
  if auth.uid() is null or target_profile_id = auth.uid() then raise exception 'A different Profile is required.'; end if;
  select * into connection from public.profile_connections
    where least(requester_profile_id, recipient_profile_id) = least(auth.uid(), target_profile_id)
      and greatest(requester_profile_id, recipient_profile_id) = greatest(auth.uid(), target_profile_id)
    for update;
  if action = 'send' then
    if connection.id is not null then raise exception 'A connection already exists.'; end if;
    if not exists (select 1 from public.profiles where id = target_profile_id and discoverable) then raise exception 'This Profile is not available for discovery.'; end if;
    insert into public.profile_connections (requester_profile_id, recipient_profile_id, status) values (auth.uid(), target_profile_id, 'pending') returning id into connection.id;
    return connection.id;
  end if;
  if connection.id is null then raise exception 'This connection is unavailable.'; end if;
  if action = 'accept' and connection.recipient_profile_id = auth.uid() and connection.status = 'pending' then update public.profile_connections set status = 'accepted', updated_at = now() where id = connection.id;
  elsif action = 'decline' and connection.recipient_profile_id = auth.uid() and connection.status = 'pending' then update public.profile_connections set status = 'declined', updated_at = now() where id = connection.id;
  elsif action = 'withdraw' and connection.requester_profile_id = auth.uid() and connection.status = 'pending' then update public.profile_connections set status = 'withdrawn', updated_at = now() where id = connection.id;
  elsif action = 'block' then update public.profile_connections set status = 'blocked', updated_at = now() where id = connection.id;
  elsif action = 'remove' and connection.status = 'accepted' then delete from public.profile_connections where id = connection.id;
  else raise exception 'This connection action is not available.';
  end if;
  return connection.id;
end;

create or replace function public.has_contract_access(target_contract_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.contracts contract where contract.id = target_contract_id and contract.created_by_profile_id = auth.uid())
    or exists (select 1 from public.contract_parties party where party.contract_id = target_contract_id and party.profile_id = auth.uid())
    or exists (select 1 from public.proposal_workspace_access access where access.contract_id = target_contract_id and public.is_workspace_member(access.workspace_id))
    or exists (select 1 from public.delegated_project_access delegation join public.contract_parties party on party.id = delegation.contract_party_id where party.contract_id = target_contract_id and delegation.profile_id = auth.uid() and delegation.revoked_at is null);
$$;

revoke all on function public.discover_people(text) from public, anon;
revoke all on function public.create_role_led_proposal(uuid, text, text, text, text) from public, anon;
grant execute on function public.discover_people(text) to authenticated;
grant execute on function public.create_role_led_proposal(uuid, text, text, text, text) to authenticated;
grant execute on function public.list_people_connections() to authenticated;
grant execute on function public.manage_profile_connection(uuid, text) to authenticated;
