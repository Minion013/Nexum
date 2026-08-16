begin;

do $$
declare
  buyer_id uuid;
  provider_id uuid := gen_random_uuid();
  outsider_id uuid := gen_random_uuid();
  contract_id uuid := gen_random_uuid();
  version_id uuid := gen_random_uuid();
  buyer_party_id uuid := gen_random_uuid();
  provider_party_id uuid := gen_random_uuid();
  authority_id uuid;
  calculated_version_hash text;
begin
  select id into buyer_id
  from auth.users
  where lower(email) = 'pactflow-wallet-test@local.invalid'
  limit 1;

  if buyer_id is null then
    buyer_id := gen_random_uuid();
    insert into auth.users (
      id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
      is_super_admin, is_sso_user, is_anonymous
    ) values (
      buyer_id, 'authenticated', 'authenticated', 'pactflow-wallet-test@local.invalid', '', now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"Local Wallet Tester"}'::jsonb,
      now(), now(), false, false, false
    );
  end if;

  insert into auth.users (
    id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    is_super_admin, is_sso_user, is_anonymous
  ) values
    (
      provider_id, 'authenticated', 'authenticated', 'milestone-review-provider@example.test', '', now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"Milestone Review Provider"}'::jsonb,
      now(), now(), false, false, false
    ),
    (
      outsider_id, 'authenticated', 'authenticated', 'milestone-review-outsider@example.test', '', now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"Milestone Review Outsider"}'::jsonb,
      now(), now(), false, false, false
    );

  select id into authority_id
  from public.resolution_authorities
  where slug = 'pactflow-simulation' and status = 'published';
  if authority_id is null then
    raise exception 'The simulation Resolution Authority is unavailable.';
  end if;

  insert into public.contracts (id, created_by_profile_id, status)
  values (contract_id, buyer_id, 'private_draft');
  insert into public.contract_parties (id, contract_id, party_kind, profile_id)
  values
    (buyer_party_id, contract_id, 'profile', buyer_id),
    (provider_party_id, contract_id, 'profile', provider_id);
  update public.contracts set status = 'active' where id = contract_id;

  insert into public.contract_versions (
    id, contract_id, version_number, version_hash, authority_snapshot,
    selected_authority_id, created_by_profile_id
  ) values (
    version_id, contract_id, 1, 'milestone-review-test-pending-hash',
    jsonb_build_object(
      'authority_name', 'NEXUM Simulation Authority',
      'jurisdiction_label', 'Testnet simulation',
      'ruleset_version', 'v1'
    ), authority_id, buyer_id
  );
  insert into public.contract_sections (contract_version_id, section_type, position, terms)
  values
    (
      version_id, 'parties', 1,
      '{"buyer":{"partyRef":"initiating_party"},"serviceProvider":{"partyRef":"counterparty"}}'::jsonb
    ),
    (
      version_id, 'milestones', 2,
      '{"items":[
        {"deliveryOutcome":"Milestone one outcome","reviewWindowHours":72,"acceptanceCriteria":[{"description":"Milestone one criterion","required":true}]},
        {"deliveryOutcome":"Milestone two outcome","reviewWindowHours":72,"acceptanceCriteria":[{"description":"Milestone two criterion","required":true}]},
        {"deliveryOutcome":"Milestone three outcome","reviewWindowHours":72,"acceptanceCriteria":[{"description":"Milestone three criterion","required":true}]}
      ]}'::jsonb
    );
  calculated_version_hash := public.contract_version_terms_hash(version_id);
  update public.contract_versions
  set version_hash = calculated_version_hash
  where id = version_id;

  insert into public.contract_acceptances (
    contract_version_id, contract_party_id, acting_profile_id,
    accepted_version_hash, signer_wallet_address, signer_signature
  ) values
    (version_id, buyer_party_id, buyer_id, calculated_version_hash, null, null),
    (version_id, provider_party_id, provider_id, calculated_version_hash, null, null);

  insert into public.milestone_evidence_submissions (
    contract_id, contract_version_id, milestone_key, submitted_by_profile_id,
    resource_metadata, integrity_reference
  ) values
    (contract_id, version_id, 'milestone-1', provider_id, '{"name":"evidence-one","kind":"document","mediaType":"text/plain","sizeBytes":"1","protectedLocator":"vault/evidence-one"}'::jsonb, null),
    (contract_id, version_id, 'milestone-2', provider_id, '{"name":"evidence-two","kind":"document","mediaType":"text/plain","sizeBytes":"1","protectedLocator":"vault/evidence-two"}'::jsonb, null),
    (contract_id, version_id, 'milestone-3', provider_id, '{"name":"evidence-three","kind":"document","mediaType":"text/plain","sizeBytes":"1","protectedLocator":"vault/evidence-three"}'::jsonb, null);

  perform set_config('test.milestone_review.buyer_id', buyer_id::text, true);
  perform set_config('test.milestone_review.provider_id', provider_id::text, true);
  perform set_config('test.milestone_review.outsider_id', outsider_id::text, true);
  perform set_config('test.milestone_review.contract_id', contract_id::text, true);
  perform set_config('test.milestone_review.version_id', version_id::text, true);
end;
$$;

set local role authenticated;
select set_config('request.jwt.claim.sub', current_setting('test.milestone_review.buyer_id'), true);

do $$
declare
  activity_id bigint;
  expected_error boolean := false;
  target_contract_id uuid := current_setting('test.milestone_review.contract_id')::uuid;
  version_id uuid := current_setting('test.milestone_review.version_id')::uuid;
begin
  begin
    perform public.record_milestone_review_decision(target_contract_id, 'milestone-1', 'accept');
    raise exception 'Acceptance bypassed an unchecked required criterion.';
  exception
    when others then
      if position('Every required Acceptance Criterion must be checked' in sqlerrm) = 0 then
        raise;
      end if;
      expected_error := true;
  end;
  if not expected_error then
    raise exception 'Premature acceptance did not fail.';
  end if;

  select public.record_milestone_review_decision(
    target_contract_id, 'milestone-2', 'request_revision', null, null,
    'Please add the missing handoff note.'
  ) into activity_id;
  if not exists (
    select 1 from public.milestone_activity
    where id = activity_id
      and contract_version_id = version_id
      and event_type = 'revision_requested'
      and actor_profile_id = auth.uid()
      and payload ->> 'reason' = 'Please add the missing handoff note.'
  ) then
    raise exception 'The reasoned revision decision was not appended to activity.';
  end if;

  select public.record_milestone_review_decision(
    target_contract_id, 'milestone-3', 'open_dispute', null, null,
    'The delivered result conflicts with the agreed outcome.'
  ) into activity_id;
  if not exists (
    select 1 from public.milestone_activity
    where id = activity_id
      and event_type = 'dispute_opened'
      and actor_profile_id = auth.uid()
      and dispute_case_id is not null
      and payload ->> 'reason' = 'The delivered result conflicts with the agreed outcome.'
  ) then
    raise exception 'The reasoned dispute decision was not appended to activity.';
  end if;
  if not exists (
    select 1 from public.dispute_cases dispute
    where dispute.contract_id = target_contract_id and dispute.milestone_key = 'milestone-3' and dispute.status = 'open'
  ) then
    raise exception 'The dispute decision did not create an open Contract-scoped case.';
  end if;

  select public.record_milestone_review_decision(
    target_contract_id, 'milestone-1', 'check_criterion', 1, true, null
  ) into activity_id;
  if not exists (
    select 1 from public.milestone_activity
    where id = activity_id
      and event_type = 'criterion_checked'
      and actor_profile_id = auth.uid()
      and (payload ->> 'criterionId')::integer = 1
      and (payload ->> 'checked')::boolean = true
  ) then
    raise exception 'The criterion check was not appended to activity.';
  end if;

  select public.record_milestone_review_decision(target_contract_id, 'milestone-1', 'accept') into activity_id;
  if not exists (
    select 1 from public.milestone_activity
    where id = activity_id and event_type = 'accepted' and actor_profile_id = auth.uid()
  ) then
    raise exception 'The accepted decision was not appended to activity.';
  end if;

  begin
    update public.milestone_activity set payload = '{}'::jsonb where id = activity_id;
  exception
    when others then
      if position('permission denied' in sqlerrm) = 0
        and position('append-only' in sqlerrm) = 0 then
        raise;
      end if;
  end;
  if not exists (
    select 1 from public.milestone_activity
    where id = activity_id and event_type = 'accepted'
  ) then
    raise exception 'Milestone activity history was mutable by an authenticated caller.';
  end if;
end;
$$;

select set_config('request.jwt.claim.sub', current_setting('test.milestone_review.provider_id'), true);
do $$
declare
  contract_id uuid := current_setting('test.milestone_review.contract_id')::uuid;
begin
  begin
    perform public.record_milestone_review_decision(contract_id, 'milestone-1', 'check_criterion', 1, true, null);
    raise exception 'The Service Provider could make a Buyer-only review decision.';
  exception
    when others then
      if position('Only the authorised Buyer can make milestone review decisions' in sqlerrm) = 0 then
        raise;
      end if;
  end;
end;
$$;

select set_config('request.jwt.claim.sub', current_setting('test.milestone_review.outsider_id'), true);
do $$
declare
  target_contract_id uuid := current_setting('test.milestone_review.contract_id')::uuid;
begin
  if (select count(*) from public.milestone_activity activity where activity.contract_id = target_contract_id) <> 0 then
    raise exception 'An unrelated Profile could read protected milestone activity.';
  end if;
  if (select count(*) from public.milestone_evidence_submissions evidence where evidence.contract_id = target_contract_id) <> 0 then
    raise exception 'An unrelated Profile could read protected milestone evidence.';
  end if;
end;
$$;

set local role anon;
select set_config('request.jwt.claim.sub', '', true);
do $$
declare
  contract_id uuid := current_setting('test.milestone_review.contract_id')::uuid;
begin
  begin
    perform public.record_milestone_review_decision(contract_id, 'milestone-1', 'accept');
    raise exception 'An anonymous caller could execute the milestone review RPC.';
  exception
    when others then
      if position('permission denied' in sqlerrm) = 0 then
        raise;
      end if;
  end;
end;
$$;

select 'milestone-review-decisions-live-pass' as result;
rollback;
