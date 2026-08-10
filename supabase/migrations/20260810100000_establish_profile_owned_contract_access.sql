-- Expand-and-contract migration: retain legacy tables for the retirement ticket,
-- while making direct User Profile parties the only Contract access authority.

insert into public.contract_parties (contract_id, party_kind, profile_id)
select contract.id, 'profile', contract.created_by_profile_id
from public.contracts contract
where not exists (
  select 1
  from public.contract_parties party
  where party.contract_id = contract.id
    and party.profile_id = contract.created_by_profile_id
)
on conflict (contract_id, profile_id) do nothing;

insert into public.contract_parties (contract_id, party_kind, profile_id)
select party.contract_id, 'profile', workspace.owner_profile_id
from public.contract_parties party
join public.workspaces workspace on workspace.id = party.workspace_id
where party.party_kind = 'workspace'
  and not exists (
    select 1
    from public.contract_parties existing_party
    where existing_party.contract_id = party.contract_id
      and existing_party.profile_id = workspace.owner_profile_id
  )
on conflict (contract_id, profile_id) do nothing;

delete from public.contract_parties party
where party.party_kind = 'workspace';

update public.delegated_project_access
set revoked_at = coalesce(revoked_at, now());

alter table public.contract_parties
  drop constraint if exists contract_parties_check,
  add constraint contract_parties_profile_only
    check (party_kind = 'profile' and profile_id is not null and workspace_id is null);

create or replace function public.enforce_profile_owned_contract_party()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  party_count integer;
begin
  if new.party_kind <> 'profile' or new.profile_id is null or new.workspace_id is not null then
    raise exception 'A Contract Party must be a User Profile.';
  end if;

  select count(*) into party_count
  from public.contract_parties
  where contract_id = new.contract_id
    and id <> coalesce(new.id, '00000000-0000-0000-0000-000000000000'::uuid);

  if party_count >= 2 then
    raise exception 'A Contract has exactly two User Profile parties.';
  end if;

  return new;
end;
$$;

drop trigger if exists enforce_profile_owned_contract_party on public.contract_parties;
create trigger enforce_profile_owned_contract_party
  before insert or update on public.contract_parties
  for each row execute procedure public.enforce_profile_owned_contract_party();

create or replace function public.enforce_binding_contract_party_count()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status in ('active', 'complete') and (
    select count(*) from public.contract_parties where contract_id = new.id
  ) <> 2 then
    raise exception 'A binding Contract requires exactly two User Profile parties.';
  end if;
  return new;
end;
$$;

drop trigger if exists enforce_binding_contract_party_count on public.contracts;
create trigger enforce_binding_contract_party_count
  before insert or update of status on public.contracts
  for each row execute procedure public.enforce_binding_contract_party_count();

create or replace function public.has_contract_access(target_contract_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.contract_parties party
    where party.contract_id = target_contract_id
      and party.profile_id = auth.uid()
  );
$$;

create or replace function public.enforce_delegated_project_access()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  raise exception 'Delegated Project Access cannot grant Profile-owned Contract access.';
end;
$$;

create or replace function public.create_profile_owned_contract(
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
  if auth.uid() is null then
    raise exception 'An authenticated User Profile is required.';
  end if;
  if initiator_responsibility not in ('buyer', 'service_provider') then
    raise exception 'Choose whether you are hiring or providing the service.';
  end if;
  if char_length(trim(contract_name)) not between 1 and 160
    or char_length(trim(contract_scope)) not between 1 and 4000 then
    raise exception 'Contract name and scope are required.';
  end if;
  if normalized_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then
    raise exception 'A valid counterparty email is required.';
  end if;

  select id into authority_id
  from public.resolution_authorities
  where slug = 'pactflow-simulation' and status = 'published';
  if authority_id is null then
    raise exception 'No published Resolution Authority is available.';
  end if;

  counterparty_responsibility := case initiator_responsibility
    when 'buyer' then 'service_provider'
    else 'buyer'
  end;

  insert into public.contracts (created_by_profile_id, status)
  values (auth.uid(), 'private_draft')
  returning id into new_contract_id;
  insert into public.contract_parties (contract_id, party_kind, profile_id)
  values (new_contract_id, 'profile', auth.uid());
  insert into public.contacts (owner_profile_id, display_name, email)
  values (auth.uid(), normalized_email, normalized_email)
  on conflict (owner_profile_id, email) do nothing;
  insert into public.contract_versions (contract_id, version_number, version_hash, selected_authority_id, authority_snapshot, created_by_profile_id)
  select new_contract_id, 1, md5(new_contract_id::text || now()::text), authority_id,
    jsonb_build_object('authority_name', display_name, 'jurisdiction_label', jurisdiction_label, 'ruleset_version', ruleset_version), auth.uid()
  from public.resolution_authorities
  where id = authority_id
  returning id into version_id;
  insert into public.contract_sections (contract_version_id, section_type, position, terms)
  values
    (version_id, 'scope', 0, jsonb_build_object('title', trim(contract_name), 'description', trim(contract_scope))),
    (version_id, 'parties', 1, jsonb_build_object('initiator_profile_id', auth.uid(), 'counterparty_email', normalized_email, 'initiator_responsibility', initiator_responsibility, 'counterparty_responsibility', counterparty_responsibility)),
    (version_id, 'change_control', 2, jsonb_build_object('rule', 'Future uncompleted work changes only through bilateral amendment.'));
  return new_contract_id;
end;
$$;

revoke all on function public.create_profile_owned_contract(text, text, text, text) from public, anon;
grant execute on function public.create_profile_owned_contract(text, text, text, text) to authenticated;
