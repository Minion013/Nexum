alter table public.contract_versions
  add column selected_authority_id uuid references public.resolution_authorities(id) on delete restrict;

alter table public.contract_versions
  alter column selected_authority_id set not null;

create function public.enforce_contract_version_authority_binding()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  authority_name text;
  authority_jurisdiction text;
  authority_ruleset_version text;
begin
  select display_name, jurisdiction_label, ruleset_version
  into authority_name, authority_jurisdiction, authority_ruleset_version
  from public.resolution_authorities
  where id = new.selected_authority_id and status = 'published';

  if authority_name is null
    or new.authority_snapshot ->> 'authority_name' <> authority_name
    or new.authority_snapshot ->> 'jurisdiction_label' <> authority_jurisdiction
    or new.authority_snapshot ->> 'ruleset_version' <> authority_ruleset_version then
    raise exception 'A Contract Version authority snapshot must match its published selected Resolution Authority.';
  end if;

  if tg_op = 'update' and new.selected_authority_id <> old.selected_authority_id then
    raise exception 'A Contract Version selected Resolution Authority is immutable.';
  end if;

  return new;
end;
$$;

create trigger enforce_contract_version_authority_binding
  before insert or update on public.contract_versions
  for each row execute procedure public.enforce_contract_version_authority_binding();

alter table public.dispute_cases
  add column contract_version_id uuid references public.contract_versions(id) on delete restrict;

alter table public.dispute_cases
  alter column contract_version_id set not null;

create function public.enforce_dispute_case_version_authority()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  version_contract_id uuid;
  version_authority_id uuid;
begin
  select contract_id, selected_authority_id
  into version_contract_id, version_authority_id
  from public.contract_versions
  where id = new.contract_version_id;

  if version_contract_id is null
    or new.contract_id <> version_contract_id
    or new.authority_id <> version_authority_id then
    raise exception 'A dispute case must use the Contract Version and Resolution Authority selected by its Contract.';
  end if;

  return new;
end;
$$;

create trigger enforce_dispute_case_version_authority
  before insert or update on public.dispute_cases
  for each row execute procedure public.enforce_dispute_case_version_authority();

create function public.enforce_private_evidence_case_contract()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  case_contract_id uuid;
begin
  if new.dispute_case_id is null then
    return new;
  end if;

  select contract_id into case_contract_id
  from public.dispute_cases
  where id = new.dispute_case_id;

  if case_contract_id is null or case_contract_id <> new.contract_id then
    raise exception 'Private evidence and its dispute case must belong to the same Contract.';
  end if;

  return new;
end;
$$;

create trigger enforce_private_evidence_case_contract
  before insert or update on public.private_evidence_references
  for each row execute procedure public.enforce_private_evidence_case_contract();

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
  )
  or exists (
    select 1
    from public.delegated_project_access delegation
    join public.contract_parties party on party.id = delegation.contract_party_id
    join public.workspace_memberships membership
      on membership.workspace_id = party.workspace_id
      and membership.profile_id = delegation.profile_id
    where party.contract_id = target_contract_id
      and delegation.profile_id = auth.uid()
      and delegation.revoked_at is null
  );
$$;

create or replace function public.enforce_contract_acceptance_relationships()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  acceptance_contract_id uuid;
  party_contract_id uuid;
  party_kind_value text;
  party_profile_id uuid;
  party_workspace_id uuid;
begin
  select contract_id into acceptance_contract_id
  from public.contract_versions where id = new.contract_version_id;
  select contract_id, party_kind, profile_id, workspace_id
  into party_contract_id, party_kind_value, party_profile_id, party_workspace_id
  from public.contract_parties where id = new.contract_party_id;

  if acceptance_contract_id is null or acceptance_contract_id <> party_contract_id then
    raise exception 'A Contract Acceptance must reference a Version and Party from the same Contract.';
  end if;
  if party_kind_value = 'profile' and party_profile_id <> new.acting_profile_id then
    raise exception 'An individual Profile accepts only for itself.';
  end if;
  if party_kind_value = 'workspace' and not exists (
    select 1
    from public.delegated_project_access delegation
    join public.workspace_memberships membership
      on membership.workspace_id = party_workspace_id
      and membership.profile_id = delegation.profile_id
    where delegation.contract_party_id = new.contract_party_id
      and delegation.profile_id = new.acting_profile_id
      and delegation.revoked_at is null
  ) then
    raise exception 'A Workspace acceptance requires active Delegated Project Access from a current Workspace member.';
  end if;
  return new;
end;
$$;
