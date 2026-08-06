create function public.provision_workspace_owner_membership()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.workspace_memberships (workspace_id, profile_id, membership_role)
  values (new.id, new.owner_profile_id, 'owner')
  on conflict do nothing;
  return new;
end;
$$;

create trigger on_workspace_created
  after insert on public.workspaces
  for each row execute procedure public.provision_workspace_owner_membership();

create function public.enforce_workspace_owner_membership()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.membership_role = 'owner'
    and (tg_op = 'delete' or new.membership_role <> 'owner')
    and not exists (
      select 1
      from public.workspace_memberships membership
      where membership.workspace_id = old.workspace_id
        and membership.profile_id <> old.profile_id
        and membership.membership_role = 'owner'
    ) then
    raise exception 'A Workspace must retain an owner membership.';
  end if;
  return coalesce(new, old);
end;
$$;

create trigger enforce_workspace_owner_membership
  before update or delete on public.workspace_memberships
  for each row execute procedure public.enforce_workspace_owner_membership();

create function public.enforce_delegated_project_access()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  party_workspace_id uuid;
  party_kind_value text;
begin
  select workspace_id, party_kind into party_workspace_id, party_kind_value
  from public.contract_parties
  where id = new.contract_party_id;

  if party_kind_value <> 'workspace' then
    raise exception 'Delegated Project Access is granted only by a Workspace Contract Party.';
  end if;

  if not exists (
    select 1
    from public.workspace_memberships membership
    where membership.workspace_id = party_workspace_id
      and membership.profile_id = new.profile_id
  ) then
    raise exception 'A delegated Profile must be a member of the Workspace Contract Party.';
  end if;

  if not exists (
    select 1
    from public.workspace_memberships membership
    where membership.workspace_id = party_workspace_id
      and membership.profile_id = new.granted_by_profile_id
      and membership.membership_role in ('owner', 'administrator')
  ) then
    raise exception 'Delegated Project Access must be granted by a Workspace owner or administrator.';
  end if;

  return new;
end;
$$;

create trigger enforce_delegated_project_access
  before insert or update on public.delegated_project_access
  for each row execute procedure public.enforce_delegated_project_access();

create function public.can_manage_contract_party(target_contract_party_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.contract_parties party
    where party.id = target_contract_party_id
      and party.party_kind = 'workspace'
      and public.can_manage_workspace(party.workspace_id)
  );
$$;

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
    where party.contract_id = target_contract_id
      and delegation.profile_id = auth.uid()
      and delegation.revoked_at is null
  );
$$;

create function public.enforce_authority_case_assignment()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  case_authority_id uuid;
begin
  select authority_id into case_authority_id
  from public.dispute_cases
  where id = new.dispute_case_id;

  if case_authority_id is null or new.authority_id <> case_authority_id then
    raise exception 'A Case Officer assignment must use the dispute case Resolution Authority.';
  end if;

  return new;
end;
$$;

create trigger enforce_authority_case_assignment
  before insert or update on public.authority_case_assignments
  for each row execute procedure public.enforce_authority_case_assignment();

create or replace function public.provision_simulated_case_officer(case_officer_email text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  case_officer_id uuid;
  simulation_authority_id uuid;
begin
  select profile.id into case_officer_id
  from public.profiles profile
  join auth.users user_record on user_record.id = profile.id
  where lower(profile.email) = lower(trim(case_officer_email))
    and user_record.email_confirmed_at is not null;

  if case_officer_id is null then
    raise exception 'No verified PactFlow Profile exists for %.', case_officer_email;
  end if;

  select id into simulation_authority_id
  from public.resolution_authorities
  where slug = 'pactflow-simulation' and status = 'published' and is_simulated;

  if simulation_authority_id is null then
    raise exception 'The PactFlow Simulation Authority is unavailable.';
  end if;

  insert into public.authority_case_officers (authority_id, profile_id)
  values (simulation_authority_id, case_officer_id)
  on conflict do nothing;

  return case_officer_id;
end;
$$;

revoke all on function public.provision_simulated_case_officer(text) from public;
revoke all on function public.provision_simulated_case_officer(text) from anon;
revoke all on function public.provision_simulated_case_officer(text) from authenticated;

alter table public.contract_versions
  alter column authority_snapshot set not null,
  add constraint contract_version_authority_snapshot_shape check (
    authority_snapshot ? 'authority_name'
    and authority_snapshot ? 'jurisdiction_label'
    and authority_snapshot ? 'ruleset_version'
  );

create function public.prevent_contract_version_authority_snapshot_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.authority_snapshot is distinct from old.authority_snapshot then
    raise exception 'A Contract Version authority snapshot is immutable.';
  end if;
  return new;
end;
$$;

create trigger prevent_contract_version_authority_snapshot_change
  before update on public.contract_versions
  for each row execute procedure public.prevent_contract_version_authority_snapshot_change();

create function public.enforce_contract_invitation_relationships()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.contract_versions version
    where version.id = new.contract_version_id and version.contract_id = new.contract_id
  ) or not exists (
    select 1 from public.contract_parties party
    where party.id = new.inviter_party_id and party.contract_id = new.contract_id
  ) then
    raise exception 'Contract invitations must reference a Version and inviter from the same Contract.';
  end if;
  return new;
end;
$$;

create trigger enforce_contract_invitation_relationships
  before insert or update on public.contract_invitations
  for each row execute procedure public.enforce_contract_invitation_relationships();

create function public.enforce_contract_acceptance_relationships()
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
begin
  select contract_id into acceptance_contract_id
  from public.contract_versions where id = new.contract_version_id;
  select contract_id, party_kind, profile_id into party_contract_id, party_kind_value, party_profile_id
  from public.contract_parties where id = new.contract_party_id;

  if acceptance_contract_id is null or acceptance_contract_id <> party_contract_id then
    raise exception 'A Contract Acceptance must reference a Version and Party from the same Contract.';
  end if;
  if party_kind_value = 'profile' and party_profile_id <> new.acting_profile_id then
    raise exception 'An individual Profile accepts only for itself.';
  end if;
  if party_kind_value = 'workspace' and not exists (
    select 1 from public.delegated_project_access delegation
    where delegation.contract_party_id = new.contract_party_id
      and delegation.profile_id = new.acting_profile_id
      and delegation.revoked_at is null
  ) then
    raise exception 'A Workspace acceptance requires active Delegated Project Access.';
  end if;
  return new;
end;
$$;

create trigger enforce_contract_acceptance_relationships
  before insert or update on public.contract_acceptances
  for each row execute procedure public.enforce_contract_acceptance_relationships();

alter table public.contacts add column workspace_id uuid references public.workspaces(id) on delete cascade;

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete restrict,
  contract_id uuid unique references public.contracts(id) on delete set null,
  name text not null check (char_length(trim(name)) between 1 and 160),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.projects enable row level security;

drop policy "Owners can manage their contacts" on public.contacts;

create policy "Owners and workspace members can read contacts"
  on public.contacts for select
  using (
    owner_profile_id = (select auth.uid())
    or (workspace_id is not null and public.is_workspace_member(workspace_id))
  );

create policy "Owners and workspace managers can create contacts"
  on public.contacts for insert
  with check (
    owner_profile_id = (select auth.uid())
    and (workspace_id is null or public.can_manage_workspace(workspace_id))
  );

create policy "Owners and workspace managers can update contacts"
  on public.contacts for update
  using (owner_profile_id = (select auth.uid()) or (workspace_id is not null and public.can_manage_workspace(workspace_id)))
  with check (owner_profile_id = (select auth.uid()) and (workspace_id is null or public.can_manage_workspace(workspace_id)));

create policy "Owners and workspace managers can delete contacts"
  on public.contacts for delete
  using (owner_profile_id = (select auth.uid()) or (workspace_id is not null and public.can_manage_workspace(workspace_id)));

create policy "Members can read projects"
  on public.projects for select
  using (public.is_workspace_member(workspace_id) or (contract_id is not null and public.has_contract_access(contract_id)));

create policy "Workspace managers can manage projects"
  on public.projects for all
  using (public.can_manage_workspace(workspace_id))
  with check (public.can_manage_workspace(workspace_id));

create policy "Workspace managers can grant delegations"
  on public.delegated_project_access for insert
  with check (
    public.can_manage_contract_party(contract_party_id)
    and granted_by_profile_id = (select auth.uid())
  );

create policy "Workspace managers can revoke delegations"
  on public.delegated_project_access for update
  using (public.can_manage_contract_party(contract_party_id))
  with check (public.can_manage_contract_party(contract_party_id));

create policy "Workspace managers can remove delegations"
  on public.delegated_project_access for delete
  using (public.can_manage_contract_party(contract_party_id));

grant execute on function public.can_manage_contract_party(uuid) to authenticated;
