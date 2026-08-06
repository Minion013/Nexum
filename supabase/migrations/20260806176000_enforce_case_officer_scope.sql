create or replace function public.enforce_private_evidence_case_contract()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  case_contract_id uuid;
  case_milestone_key text;
begin
  if new.dispute_case_id is null then
    return new;
  end if;

  select contract_id, milestone_key into case_contract_id, case_milestone_key
  from public.dispute_cases
  where id = new.dispute_case_id;

  if case_contract_id is null or case_contract_id <> new.contract_id then
    raise exception 'Private evidence and its dispute case must belong to the same Contract.';
  end if;
  if case_milestone_key <> new.milestone_key then
    raise exception 'Private evidence and its dispute case must belong to the dispute case milestone.';
  end if;

  return new;
end;
$$;

create function public.enforce_case_officer_contract_party_boundary()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.party_kind = 'profile' and exists (
    select 1
    from public.authority_case_assignments assignment
    join public.dispute_cases dispute_case on dispute_case.id = assignment.dispute_case_id
    where dispute_case.contract_id = new.contract_id
      and assignment.case_officer_profile_id = new.profile_id
  ) then
    raise exception 'An assigned Case Officer cannot become a Contract Party.';
  end if;
  return new;
end;
$$;

create trigger enforce_case_officer_contract_party_boundary
  before insert or update on public.contract_parties
  for each row execute procedure public.enforce_case_officer_contract_party_boundary();

create function public.enforce_case_officer_delegation_boundary()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  delegation_contract_id uuid;
begin
  select contract_id into delegation_contract_id
  from public.contract_parties
  where id = new.contract_party_id;

  if exists (
    select 1
    from public.authority_case_assignments assignment
    join public.dispute_cases dispute_case on dispute_case.id = assignment.dispute_case_id
    where dispute_case.contract_id = delegation_contract_id
      and assignment.case_officer_profile_id = new.profile_id
  ) then
    raise exception 'An assigned Case Officer cannot receive Delegated Project Access.';
  end if;
  return new;
end;
$$;

create trigger enforce_case_officer_delegation_boundary
  before insert or update on public.delegated_project_access
  for each row execute procedure public.enforce_case_officer_delegation_boundary();

create or replace function public.enforce_authority_case_assignment()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  case_authority_id uuid;
  case_contract_id uuid;
begin
  select authority_id, contract_id into case_authority_id, case_contract_id
  from public.dispute_cases
  where id = new.dispute_case_id;

  if case_authority_id is null or new.authority_id <> case_authority_id then
    raise exception 'A Case Officer assignment must use the dispute case Resolution Authority.';
  end if;
  if exists (
    select 1
    from public.contract_parties party
    where party.contract_id = case_contract_id
      and party.profile_id = new.case_officer_profile_id
  ) or exists (
    select 1
    from public.delegated_project_access delegation
    join public.contract_parties party on party.id = delegation.contract_party_id
    join public.workspace_memberships membership
      on membership.workspace_id = party.workspace_id
      and membership.profile_id = delegation.profile_id
    where party.contract_id = case_contract_id
      and delegation.profile_id = new.case_officer_profile_id
      and delegation.revoked_at is null
  ) then
    raise exception 'A Contract Party or delegate cannot be assigned as its Case Officer.';
  end if;

  return new;
end;
$$;
