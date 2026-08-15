create table public.milestone_evidence_submissions (
  id uuid primary key default gen_random_uuid(),
  contract_id uuid not null references public.contracts(id) on delete cascade,
  contract_version_id uuid not null references public.contract_versions(id) on delete restrict,
  milestone_key text not null check (milestone_key ~ '^milestone-[1-9][0-9]*$'),
  submitted_by_profile_id uuid not null references public.profiles(id) on delete restrict,
  submitted_at timestamptz not null default now(),
  resource_metadata jsonb not null,
  integrity_reference text,
  dispute_case_id uuid references public.dispute_cases(id) on delete set null,
  check (jsonb_typeof(resource_metadata) = 'object'),
  check (char_length(trim(coalesce(resource_metadata ->> 'name', ''))) between 1 and 160),
  check ((resource_metadata ->> 'kind') in ('document', 'repository', 'design', 'other')),
  check (char_length(trim(coalesce(resource_metadata ->> 'mediaType', ''))) between 1 and 160),
  check (coalesce(resource_metadata ->> 'sizeBytes', '') ~ '^[1-9][0-9]*$'),
  check (coalesce(resource_metadata ->> 'protectedLocator', '') ~ '^[A-Za-z0-9][A-Za-z0-9._/-]*$'),
  check (resource_metadata::text !~* '(https?|ftp)://'),
  check (resource_metadata::text !~* '(password|private[[:space:]]+key|api[[:space:]]*key|secret|bearer[[:space:]]+token|credential)'),
  check (integrity_reference is null or integrity_reference ~ '^sha(256|512):[0-9a-f]+$'),
  unique (contract_id, milestone_key)
);

create index milestone_evidence_submissions_contract_milestone_idx
  on public.milestone_evidence_submissions(contract_id, milestone_key, submitted_at);

create table public.milestone_activity (
  id bigint generated always as identity primary key,
  contract_id uuid not null references public.contracts(id) on delete cascade,
  contract_version_id uuid not null references public.contract_versions(id) on delete restrict,
  milestone_key text not null check (milestone_key ~ '^milestone-[1-9][0-9]*$'),
  event_type text not null check (event_type in ('contract_activated', 'evidence_submitted', 'criterion_checked', 'revision_requested', 'dispute_opened', 'accepted', 'review_window_expired', 'release_eligible', 'settlement_recorded')),
  actor_profile_id uuid references public.profiles(id) on delete restrict,
  occurred_at timestamptz not null default now(),
  payload jsonb not null default '{}'::jsonb check (jsonb_typeof(payload) = 'object'),
  dispute_case_id uuid references public.dispute_cases(id) on delete set null
);

create index milestone_activity_contract_milestone_order_idx
  on public.milestone_activity(contract_id, milestone_key, occurred_at, id);

create function public.enforce_milestone_evidence_case_boundary()
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
  from public.dispute_cases where id = new.dispute_case_id;
  if case_contract_id is null or case_contract_id <> new.contract_id or case_milestone_key <> new.milestone_key then
    raise exception 'Milestone evidence and activity must belong to the dispute case Contract and milestone.';
  end if;
  return new;
end;
$$;

create trigger enforce_milestone_evidence_case_boundary
  before insert or update on public.milestone_evidence_submissions
  for each row execute procedure public.enforce_milestone_evidence_case_boundary();

create trigger enforce_milestone_activity_case_boundary
  before insert or update on public.milestone_activity
  for each row execute procedure public.enforce_milestone_evidence_case_boundary();

create function public.prevent_milestone_evidence_mutation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  raise exception 'Milestone evidence and activity history are append-only.';
end;
$$;

create trigger prevent_milestone_evidence_update
  before update or delete on public.milestone_evidence_submissions
  for each row execute procedure public.prevent_milestone_evidence_mutation();

create trigger prevent_milestone_activity_update
  before update or delete on public.milestone_activity
  for each row execute procedure public.prevent_milestone_evidence_mutation();

alter table public.milestone_evidence_submissions enable row level security;
alter table public.milestone_activity enable row level security;

create policy "Contract Parties and assigned Case Officers can read milestone evidence"
  on public.milestone_evidence_submissions for select
  using (public.has_contract_access(contract_id) or (dispute_case_id is not null and public.is_assigned_case_officer(dispute_case_id)));

create policy "Contract Parties and assigned Case Officers can read milestone activity"
  on public.milestone_activity for select
  using (public.has_contract_access(contract_id) or (dispute_case_id is not null and public.is_assigned_case_officer(dispute_case_id)));

revoke all on table public.milestone_evidence_submissions from anon;
revoke all on table public.milestone_activity from anon;
grant select on table public.milestone_evidence_submissions to authenticated;
grant select on table public.milestone_activity to authenticated;

create function public.submit_milestone_evidence(
  target_contract_id uuid,
  target_milestone_key text,
  resource_metadata jsonb,
  integrity_reference text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  contract_record public.contracts;
  latest_version_id uuid;
  milestone_terms jsonb;
  parties_terms jsonb;
  milestone_number integer;
  evidence_id uuid;
begin
  if auth.uid() is null then
    raise exception 'An authenticated Profile is required.';
  end if;
  if target_milestone_key !~ '^milestone-[1-9][0-9]*$' then
    raise exception 'Milestone identifiers must use the milestone-N format.';
  end if;
  milestone_number := substring(target_milestone_key from '^milestone-([1-9][0-9]*)$')::integer;
  if jsonb_typeof(resource_metadata) <> 'object'
    or char_length(trim(coalesce(resource_metadata ->> 'name', ''))) not between 1 and 160
    or coalesce(resource_metadata ->> 'kind', '') not in ('document', 'repository', 'design', 'other')
    or char_length(trim(coalesce(resource_metadata ->> 'mediaType', ''))) not between 1 and 160
    or coalesce(resource_metadata ->> 'sizeBytes', '') !~ '^[1-9][0-9]*$'
    or coalesce(resource_metadata ->> 'protectedLocator', '') !~ '^[A-Za-z0-9][A-Za-z0-9._/-]*$'
    or resource_metadata::text ~* '(https?|ftp)://'
    or resource_metadata::text ~* '(password|private[[:space:]]+key|api[[:space:]]*key|secret|bearer[[:space:]]+token|credential)' then
    raise exception 'Evidence metadata must identify a protected resource without credentials or raw private URLs.';
  end if;
  if integrity_reference is not null and integrity_reference !~ '^sha(256|512):[0-9a-f]+$' then
    raise exception 'Evidence integrity reference must use a supported sha256 or sha512 format.';
  end if;

  select * into contract_record from public.contracts where id = target_contract_id;
  if contract_record.id is null then raise exception 'This Contract is unavailable.'; end if;
  if contract_record.status <> 'active' then raise exception 'Evidence can only be submitted for an active Contract milestone.'; end if;
  if not public.has_contract_access(target_contract_id) then raise exception 'Only an authorised Contract Party can submit milestone evidence.'; end if;

  select id into latest_version_id
  from public.contract_versions
  where contract_id = target_contract_id
  order by version_number desc limit 1;
  select terms into parties_terms from public.contract_sections where contract_version_id = latest_version_id and section_type = 'parties';
  select terms -> 'items' -> (milestone_number - 1) into milestone_terms
  from public.contract_sections where contract_version_id = latest_version_id and section_type = 'milestones';
  if milestone_terms is null or jsonb_typeof(milestone_terms) <> 'object' then raise exception 'This milestone is not present in the active Contract Version.'; end if;
  if coalesce(milestone_terms ->> 'deliveryDeadlineUtc', '') !~ '^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$'
    or (milestone_terms ->> 'deliveryDeadlineUtc')::timestamptz <= now() then
    raise exception 'The milestone delivery window has closed.';
  end if;
  if coalesce(parties_terms #>> '{serviceProvider,partyRef}', '') = 'initiating_party' then
    if not exists (select 1 from public.contract_parties where contract_id = target_contract_id and party_kind = 'profile' and profile_id = contract_record.created_by_profile_id and profile_id = auth.uid()) then
      raise exception 'Only the authorised Service Provider can submit milestone evidence.';
    end if;
  elsif coalesce(parties_terms #>> '{serviceProvider,partyRef}', 'counterparty') = 'counterparty' then
    if not exists (select 1 from public.contract_parties where contract_id = target_contract_id and party_kind = 'profile' and profile_id = auth.uid() and profile_id <> contract_record.created_by_profile_id) then
      raise exception 'Only the authorised Service Provider can submit milestone evidence.';
    end if;
  else
    raise exception 'The active Contract Version has no authorised Service Provider.';
  end if;
  if exists (select 1 from public.milestone_evidence_submissions where contract_id = target_contract_id and milestone_key = target_milestone_key) then
    raise exception 'Final evidence has already been submitted for this milestone.';
  end if;
  if milestone_number > 1 and exists (
    select 1 from generate_series(1, milestone_number - 1) previous_number
    where not exists (select 1 from public.milestone_evidence_submissions where contract_id = target_contract_id and milestone_key = 'milestone-' || previous_number)
  ) then
    raise exception 'This milestone is not active until earlier milestone evidence is submitted.';
  end if;

  insert into public.milestone_evidence_submissions (contract_id, contract_version_id, milestone_key, submitted_by_profile_id, resource_metadata, integrity_reference)
  values (target_contract_id, latest_version_id, target_milestone_key, auth.uid(), resource_metadata, integrity_reference)
  returning id into evidence_id;
  insert into public.milestone_activity (contract_id, contract_version_id, milestone_key, event_type, actor_profile_id, payload)
  values (target_contract_id, latest_version_id, target_milestone_key, 'evidence_submitted', auth.uid(), jsonb_build_object('detail', 'Private evidence was submitted for review.', 'evidenceId', evidence_id, 'resourceName', resource_metadata ->> 'name'));
  return evidence_id;
end;
$$;

revoke all on function public.submit_milestone_evidence(uuid, text, jsonb, text) from public, anon;
grant execute on function public.submit_milestone_evidence(uuid, text, jsonb, text) to authenticated;
