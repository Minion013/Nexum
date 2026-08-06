create table public.workspaces (
  id uuid primary key default gen_random_uuid(),
  owner_profile_id uuid not null references public.profiles(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 120),
  kind text not null check (kind in ('personal', 'collaborative')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index one_personal_workspace_per_profile
  on public.workspaces(owner_profile_id)
  where kind = 'personal';

create table public.workspace_memberships (
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  membership_role text not null check (membership_role in ('owner', 'administrator', 'member')),
  created_at timestamptz not null default now(),
  primary key (workspace_id, profile_id)
);

create function public.provision_personal_workspace_for_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  personal_workspace_id uuid;
begin
  insert into public.workspaces (owner_profile_id, name, kind)
  values (new.id, new.display_name, 'personal')
  on conflict do nothing
  returning id into personal_workspace_id;

  if personal_workspace_id is null then
    select id into personal_workspace_id
    from public.workspaces
    where owner_profile_id = new.id and kind = 'personal';
  end if;

  insert into public.workspace_memberships (workspace_id, profile_id, membership_role)
  values (personal_workspace_id, new.id, 'owner')
  on conflict do nothing;

  return new;
end;
$$;

create trigger on_profile_created
  after insert on public.profiles
  for each row execute procedure public.provision_personal_workspace_for_profile();

insert into public.workspaces (owner_profile_id, name, kind)
select p.id, p.display_name, 'personal'
from public.profiles p
where not exists (
  select 1
  from public.workspaces w
  where w.owner_profile_id = p.id and w.kind = 'personal'
)
on conflict do nothing;

insert into public.workspace_memberships (workspace_id, profile_id, membership_role)
select w.id, w.owner_profile_id, 'owner'
from public.workspaces w
where w.kind = 'personal'
on conflict do nothing;

create function public.enforce_personal_workspace_membership()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  workspace_kind text;
  workspace_owner uuid;
begin
  select kind, owner_profile_id into workspace_kind, workspace_owner
  from public.workspaces
  where id = new.workspace_id;

  if workspace_kind = 'personal' and (new.profile_id <> workspace_owner or new.membership_role <> 'owner') then
    raise exception 'A personal Workspace has exactly one owner membership.';
  end if;

  return new;
end;
$$;

create trigger enforce_personal_workspace_membership
  before insert or update on public.workspace_memberships
  for each row execute procedure public.enforce_personal_workspace_membership();

create table public.contacts (
  id uuid primary key default gen_random_uuid(),
  owner_profile_id uuid not null references public.profiles(id) on delete cascade,
  display_name text not null check (char_length(trim(display_name)) between 1 and 120),
  email text,
  created_at timestamptz not null default now(),
  unique (owner_profile_id, email)
);

create table public.contracts (
  id uuid primary key default gen_random_uuid(),
  created_by_profile_id uuid not null references public.profiles(id) on delete restrict,
  status text not null check (status in ('private_draft', 'negotiation', 'active', 'complete')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.contract_parties (
  id uuid primary key default gen_random_uuid(),
  contract_id uuid not null references public.contracts(id) on delete cascade,
  party_kind text not null check (party_kind in ('profile', 'workspace')),
  profile_id uuid references public.profiles(id) on delete restrict,
  workspace_id uuid references public.workspaces(id) on delete restrict,
  created_at timestamptz not null default now(),
  check (
    (party_kind = 'profile' and profile_id is not null and workspace_id is null)
    or (party_kind = 'workspace' and workspace_id is not null and profile_id is null)
  ),
  unique (contract_id, profile_id),
  unique (contract_id, workspace_id)
);

create table public.delegated_project_access (
  contract_party_id uuid not null references public.contract_parties(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  granted_by_profile_id uuid not null references public.profiles(id) on delete restrict,
  granted_at timestamptz not null default now(),
  revoked_at timestamptz,
  primary key (contract_party_id, profile_id)
);

create table public.contract_versions (
  id uuid primary key default gen_random_uuid(),
  contract_id uuid not null references public.contracts(id) on delete cascade,
  version_number integer not null check (version_number > 0),
  version_hash text not null check (char_length(trim(version_hash)) > 0),
  authority_snapshot jsonb,
  created_by_profile_id uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  unique (contract_id, version_number),
  unique (contract_id, version_hash)
);

create table public.contract_sections (
  id uuid primary key default gen_random_uuid(),
  contract_version_id uuid not null references public.contract_versions(id) on delete cascade,
  section_type text not null check (section_type in ('parties', 'scope', 'milestones', 'payment', 'intellectual_property', 'evidence', 'change_control', 'dispute_resolution')),
  position integer not null check (position >= 0),
  terms jsonb not null,
  unique (contract_version_id, section_type),
  unique (contract_version_id, position)
);

create table public.contract_invitations (
  id uuid primary key default gen_random_uuid(),
  contract_id uuid not null references public.contracts(id) on delete cascade,
  contract_version_id uuid not null references public.contract_versions(id) on delete cascade,
  inviter_party_id uuid not null references public.contract_parties(id) on delete cascade,
  invitee_contact_id uuid references public.contacts(id) on delete set null,
  invited_email text,
  accepted_by_profile_id uuid references public.profiles(id) on delete restrict,
  status text not null check (status in ('pending', 'accepted', 'revoked', 'expired')),
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  accepted_at timestamptz,
  check (invitee_contact_id is not null or invited_email is not null),
  check ((status = 'accepted') = (accepted_by_profile_id is not null))
);

create table public.contract_acceptances (
  id uuid primary key default gen_random_uuid(),
  contract_version_id uuid not null references public.contract_versions(id) on delete cascade,
  contract_party_id uuid not null references public.contract_parties(id) on delete cascade,
  acting_profile_id uuid not null references public.profiles(id) on delete restrict,
  accepted_at timestamptz not null default now(),
  unique (contract_version_id, contract_party_id)
);

create table public.resolution_authorities (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]+$'),
  display_name text not null check (char_length(trim(display_name)) between 1 and 160),
  jurisdiction_label text not null check (char_length(trim(jurisdiction_label)) between 1 and 160),
  ruleset_version text not null check (char_length(trim(ruleset_version)) between 1 and 80),
  status text not null check (status in ('published', 'retired')),
  is_simulated boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.resolution_authorities (slug, display_name, jurisdiction_label, ruleset_version, status, is_simulated)
values ('pactflow-simulation', 'PactFlow Simulation Authority', 'Testnet simulation', 'v1', 'published', true);

create table public.authority_case_officers (
  authority_id uuid not null references public.resolution_authorities(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  assigned_at timestamptz not null default now(),
  primary key (authority_id, profile_id)
);

create table public.dispute_cases (
  id uuid primary key default gen_random_uuid(),
  contract_id uuid not null references public.contracts(id) on delete restrict,
  authority_id uuid not null references public.resolution_authorities(id) on delete restrict,
  milestone_key text not null check (char_length(trim(milestone_key)) > 0),
  status text not null check (status in ('open', 'resolved')),
  created_at timestamptz not null default now()
);

create table public.authority_case_assignments (
  dispute_case_id uuid primary key references public.dispute_cases(id) on delete cascade,
  authority_id uuid not null,
  case_officer_profile_id uuid not null,
  assigned_by_profile_id uuid references public.profiles(id) on delete restrict,
  assigned_at timestamptz not null default now(),
  check (assigned_by_profile_id is null or assigned_by_profile_id <> case_officer_profile_id),
  foreign key (authority_id, case_officer_profile_id)
    references public.authority_case_officers(authority_id, profile_id)
);

create table public.private_evidence_references (
  id uuid primary key default gen_random_uuid(),
  contract_id uuid not null references public.contracts(id) on delete cascade,
  dispute_case_id uuid references public.dispute_cases(id) on delete set null,
  milestone_key text not null check (char_length(trim(milestone_key)) > 0),
  reference_hash text not null check (char_length(trim(reference_hash)) > 0),
  private_locator text,
  created_by_profile_id uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now()
);

create function public.is_workspace_member(target_workspace_id uuid, target_profile_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.workspace_memberships membership
    where membership.workspace_id = target_workspace_id
      and membership.profile_id = target_profile_id
  );
$$;

create function public.can_manage_workspace(target_workspace_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.workspace_memberships membership
    where membership.workspace_id = target_workspace_id
      and membership.profile_id = auth.uid()
      and membership.membership_role in ('owner', 'administrator')
  );
$$;

create function public.has_contract_access(target_contract_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.contracts contract
    where contract.id = target_contract_id
      and contract.created_by_profile_id = auth.uid()
  )
  or exists (
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

create function public.is_assigned_case_officer(target_dispute_case_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.authority_case_assignments assignment
    where assignment.dispute_case_id = target_dispute_case_id
      and assignment.case_officer_profile_id = auth.uid()
  );
$$;

grant execute on function public.is_workspace_member(uuid, uuid) to authenticated;
grant execute on function public.can_manage_workspace(uuid) to authenticated;
grant execute on function public.has_contract_access(uuid) to authenticated;
grant execute on function public.is_assigned_case_officer(uuid) to authenticated;

alter table public.workspaces enable row level security;
alter table public.workspace_memberships enable row level security;
alter table public.contacts enable row level security;
alter table public.contracts enable row level security;
alter table public.contract_parties enable row level security;
alter table public.delegated_project_access enable row level security;
alter table public.contract_versions enable row level security;
alter table public.contract_sections enable row level security;
alter table public.contract_invitations enable row level security;
alter table public.contract_acceptances enable row level security;
alter table public.resolution_authorities enable row level security;
alter table public.authority_case_officers enable row level security;
alter table public.dispute_cases enable row level security;
alter table public.authority_case_assignments enable row level security;
alter table public.private_evidence_references enable row level security;

create policy "Members can read their workspaces"
  on public.workspaces for select
  using (public.is_workspace_member(id));

create policy "Users can create collaborative workspaces"
  on public.workspaces for insert
  with check (owner_profile_id = (select auth.uid()) and kind = 'collaborative');

create policy "Workspace managers can update workspaces"
  on public.workspaces for update
  using (public.can_manage_workspace(id))
  with check (public.can_manage_workspace(id));

create policy "Members can read workspace membership"
  on public.workspace_memberships for select
  using (public.is_workspace_member(workspace_id));

create policy "Workspace managers can add collaborative members"
  on public.workspace_memberships for insert
  with check (public.can_manage_workspace(workspace_id));

create policy "Workspace managers can update membership"
  on public.workspace_memberships for update
  using (public.can_manage_workspace(workspace_id))
  with check (public.can_manage_workspace(workspace_id));

create policy "Workspace managers can remove membership"
  on public.workspace_memberships for delete
  using (public.can_manage_workspace(workspace_id));

create policy "Owners can manage their contacts"
  on public.contacts for all
  using (owner_profile_id = (select auth.uid()))
  with check (owner_profile_id = (select auth.uid()));

create policy "Contract actors can read contracts"
  on public.contracts for select
  using (public.has_contract_access(id));

create policy "Contract actors can read contract parties"
  on public.contract_parties for select
  using (public.has_contract_access(contract_id));

create policy "Contract actors can read delegations"
  on public.delegated_project_access for select
  using (public.has_contract_access((select contract_id from public.contract_parties where id = contract_party_id)));

create policy "Contract actors can read contract versions"
  on public.contract_versions for select
  using (public.has_contract_access(contract_id));

create policy "Contract actors can read contract sections"
  on public.contract_sections for select
  using (public.has_contract_access((select contract_id from public.contract_versions where id = contract_version_id)));

create policy "Contract actors can read invitations"
  on public.contract_invitations for select
  using (public.has_contract_access(contract_id) or accepted_by_profile_id = (select auth.uid()));

create policy "Contract actors can read acceptances"
  on public.contract_acceptances for select
  using (public.has_contract_access((select contract_id from public.contract_versions where id = contract_version_id)));

create policy "Published authorities are readable"
  on public.resolution_authorities for select
  using (status = 'published');

create policy "Case Officers can read their authority affiliation"
  on public.authority_case_officers for select
  using (profile_id = (select auth.uid()));

create policy "Parties and assigned officers can read dispute cases"
  on public.dispute_cases for select
  using (public.has_contract_access(contract_id) or public.is_assigned_case_officer(id));

create policy "Parties and assigned officers can read case assignments"
  on public.authority_case_assignments for select
  using (public.is_assigned_case_officer(dispute_case_id));

create policy "Parties and assigned officers can read private evidence references"
  on public.private_evidence_references for select
  using (public.has_contract_access(contract_id) or (dispute_case_id is not null and public.is_assigned_case_officer(dispute_case_id)));
