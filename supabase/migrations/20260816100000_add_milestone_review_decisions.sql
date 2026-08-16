create function public.record_milestone_review_decision(
  target_contract_id uuid,
  target_milestone_key text,
  decision_action text,
  criterion_id integer default null,
  criterion_checked boolean default null,
  decision_reason text default null
)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  contract_record public.contracts;
  latest_version_id uuid;
  latest_authority_id uuid;
  milestone_terms jsonb;
  parties_terms jsonb;
  criteria_terms jsonb;
  buyer_profile_id uuid;
  dispute_case_id uuid;
  activity_id bigint;
  criterion_index integer;
  criterion_is_checked boolean;
  has_required_criterion boolean := false;
  criterion jsonb;
  reason text := nullif(trim(decision_reason), '');
begin
  if auth.uid() is null then
    raise exception 'An authenticated Profile is required.';
  end if;
  if decision_action not in ('check_criterion', 'request_revision', 'open_dispute', 'accept') then
    raise exception 'This milestone review action is unavailable.';
  end if;
  if target_milestone_key !~ '^milestone-[1-9][0-9]*$' then
    raise exception 'Milestone identifiers must use the milestone-N format.';
  end if;
  if decision_action in ('request_revision', 'open_dispute') and (reason is null or char_length(reason) > 2000) then
    raise exception 'A recorded reason is required for this review decision.';
  end if;
  if decision_action = 'check_criterion' and (criterion_id is null or criterion_checked is null) then
    raise exception 'A criterion identifier and checked state are required.';
  end if;

  select * into contract_record from public.contracts where id = target_contract_id;
  if contract_record.id is null then raise exception 'This Contract is unavailable.'; end if;
  if not public.has_contract_access(target_contract_id) then
    raise exception 'Only an authorised Contract Party can make milestone review decisions.';
  end if;
  if contract_record.status <> 'active' then
    raise exception 'This milestone is not open for review decisions.';
  end if;

  select contract_version.id, contract_version.selected_authority_id into latest_version_id, latest_authority_id
  from public.contract_versions contract_version
  where contract_version.contract_id = target_contract_id
    and (select count(*) from public.contract_acceptances acceptance where acceptance.contract_version_id = contract_version.id) >= 2
  order by contract_version.version_number desc
  limit 1;
  if latest_version_id is null then raise exception 'This Milestone Review has no readable Contract Version.'; end if;
  select terms into parties_terms from public.contract_sections where contract_version_id = latest_version_id and section_type = 'parties';
  select terms -> 'items' -> (substring(target_milestone_key from '^milestone-([1-9][0-9]*)$')::integer - 1)
    into milestone_terms
  from public.contract_sections where contract_version_id = latest_version_id and section_type = 'milestones';
  if milestone_terms is null or jsonb_typeof(milestone_terms) <> 'object' then
    raise exception 'This milestone is not present in the active Contract Version.';
  end if;
  criteria_terms := coalesce(milestone_terms -> 'acceptanceCriteria', '[]'::jsonb);
  if jsonb_typeof(criteria_terms) <> 'array' then raise exception 'This milestone has no readable Acceptance Criteria.'; end if;

  if coalesce(parties_terms #>> '{buyer,partyRef}', '') = 'initiating_party' then
    buyer_profile_id := contract_record.created_by_profile_id;
  elsif coalesce(parties_terms #>> '{buyer,partyRef}', '') = 'counterparty' then
    select profile_id into buyer_profile_id
    from public.contract_parties
    where contract_id = target_contract_id
      and party_kind = 'profile'
      and profile_id <> contract_record.created_by_profile_id
    order by id
    limit 1;
  end if;
  if buyer_profile_id is null or buyer_profile_id <> auth.uid() then
    raise exception 'Only the authorised Buyer can make milestone review decisions.';
  end if;
  if not exists (select 1 from public.milestone_evidence_submissions where contract_id = target_contract_id and milestone_key = target_milestone_key) then
    raise exception 'A Buyer can make a review decision only after final evidence is submitted.';
  end if;

  if decision_action = 'check_criterion' then
    if criterion_id < 1 or criterion_id > jsonb_array_length(criteria_terms) then
      raise exception 'This Acceptance Criterion is not part of the active Contract Version.';
    end if;
    criterion := criteria_terms -> (criterion_id - 1);
    if coalesce((criterion ->> 'required')::boolean, true) is not true then
      raise exception 'Only required Acceptance Criteria can be checked.';
    end if;
    insert into public.milestone_activity (contract_id, contract_version_id, milestone_key, event_type, actor_profile_id, payload)
    values (target_contract_id, latest_version_id, target_milestone_key, 'criterion_checked', auth.uid(), jsonb_build_object(
      'criterionId', criterion_id,
      'checked', criterion_checked,
      'detail', format('Acceptance Criterion %s was marked %s.', criterion_id, case when criterion_checked then 'complete' else 'incomplete' end)
    ))
    returning id into activity_id;
    return activity_id;
  end if;

  if exists (select 1 from public.milestone_activity where contract_id = target_contract_id and milestone_key = target_milestone_key and event_type = 'accepted') then
    raise exception 'This milestone has already been accepted.';
  end if;

  if decision_action = 'request_revision' then
    insert into public.milestone_activity (contract_id, contract_version_id, milestone_key, event_type, actor_profile_id, payload)
    values (target_contract_id, latest_version_id, target_milestone_key, 'revision_requested', auth.uid(), jsonb_build_object('reason', reason, 'detail', reason))
    returning id into activity_id;
    return activity_id;
  end if;

  if decision_action = 'open_dispute' then
    if exists (select 1 from public.dispute_cases where contract_id = target_contract_id and milestone_key = target_milestone_key and status = 'open') then
      raise exception 'This milestone already has an open dispute.';
    end if;
    if latest_authority_id is null then raise exception 'This Contract Version has no Resolution Authority.'; end if;
    insert into public.dispute_cases (contract_id, contract_version_id, authority_id, milestone_key, status)
    values (target_contract_id, latest_version_id, latest_authority_id, target_milestone_key, 'open')
    returning id into dispute_case_id;
    insert into public.milestone_activity (contract_id, contract_version_id, milestone_key, event_type, actor_profile_id, payload, dispute_case_id)
    values (target_contract_id, latest_version_id, target_milestone_key, 'dispute_opened', auth.uid(), jsonb_build_object('reason', reason, 'detail', reason, 'disputeCaseId', dispute_case_id), dispute_case_id)
    returning id into activity_id;
    return activity_id;
  end if;

  if exists (
    select 1 from public.dispute_cases
    where contract_id = target_contract_id and milestone_key = target_milestone_key and status = 'open'
  ) then
    raise exception 'A disputed milestone cannot be accepted.';
  end if;
  if not exists (
    select 1 from public.milestone_evidence_submissions
    where contract_id = target_contract_id
      and milestone_key = target_milestone_key
      and submitted_at + ((milestone_terms ->> 'reviewWindowHours')::integer * interval '1 hour') > now()
  ) then
    raise exception 'The milestone review window is closed.';
  end if;
  for criterion_index in 0 .. jsonb_array_length(criteria_terms) - 1 loop
    criterion := criteria_terms -> criterion_index;
    if coalesce((criterion ->> 'required')::boolean, true) then
      has_required_criterion := true;
      select coalesce((select (payload ->> 'checked')::boolean
        from public.milestone_activity
        where contract_id = target_contract_id
          and milestone_key = target_milestone_key
          and event_type = 'criterion_checked'
          and (payload ->> 'criterionId')::integer = criterion_index + 1
        order by occurred_at desc, id desc
        limit 1), false)
      into criterion_is_checked;
      if not criterion_is_checked then
        raise exception 'Every required Acceptance Criterion must be checked before acceptance.';
      end if;
    end if;
  end loop;
  if not has_required_criterion then
    raise exception 'This milestone has no required Acceptance Criteria.';
  end if;
  insert into public.milestone_activity (contract_id, contract_version_id, milestone_key, event_type, actor_profile_id, payload)
  values (target_contract_id, latest_version_id, target_milestone_key, 'accepted', auth.uid(), jsonb_build_object('detail', 'The Buyer accepted the milestone after completing every required Acceptance Criterion.'))
  returning id into activity_id;
  return activity_id;
end;
$$;

revoke all on function public.record_milestone_review_decision(uuid, text, text, integer, boolean, text) from public, anon;
grant execute on function public.record_milestone_review_decision(uuid, text, text, integer, boolean, text) to authenticated;
