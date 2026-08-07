begin;

insert into auth.users (
  id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  is_super_admin, is_sso_user, is_anonymous
)
values
  ('00000000-0000-4000-8000-000000000101', 'authenticated', 'authenticated', 'party@example.test', '', now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Party"}', now(), now(), false, false, false),
  ('00000000-0000-4000-8000-000000000102', 'authenticated', 'authenticated', 'other@example.test', '', now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Other"}', now(), now(), false, false, false),
  ('00000000-0000-4000-8000-000000000103', 'authenticated', 'authenticated', 'officer@example.test', '', now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Case Officer"}', now(), now(), false, false, false),
  ('00000000-0000-4000-8000-000000000104', 'authenticated', 'authenticated', 'invitee@example.test', '', now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Invitee"}', now(), now(), false, false, false);

select public.provision_simulated_case_officer('officer@example.test');

insert into public.resolution_authorities (id, slug, display_name, jurisdiction_label, ruleset_version, status, is_simulated)
values ('00000000-0000-4000-8000-000000000201', 'rls-test-simulation', 'RLS Test Simulation Authority', 'Testnet simulation', 'v1', 'published', true);

insert into public.authority_case_officers (authority_id, profile_id)
values ('00000000-0000-4000-8000-000000000201', '00000000-0000-4000-8000-000000000103');

insert into public.contracts (id, created_by_profile_id, status)
values ('00000000-0000-4000-8000-000000000301', '00000000-0000-4000-8000-000000000101', 'active');

insert into public.contract_parties (id, contract_id, party_kind, profile_id)
values ('00000000-0000-4000-8000-000000000401', '00000000-0000-4000-8000-000000000301', 'profile', '00000000-0000-4000-8000-000000000101');

insert into public.contract_versions (id, contract_id, version_number, version_hash, authority_snapshot, selected_authority_id, created_by_profile_id)
values (
  '00000000-0000-4000-8000-000000000351',
  '00000000-0000-4000-8000-000000000301',
  1,
  'rls-test-contract-v1',
  '{"authority_name":"RLS Test Simulation Authority","jurisdiction_label":"Testnet simulation","ruleset_version":"v1"}',
  '00000000-0000-4000-8000-000000000201',
  '00000000-0000-4000-8000-000000000101'
);

insert into public.dispute_cases (id, contract_id, contract_version_id, authority_id, milestone_key, status)
values ('00000000-0000-4000-8000-000000000501', '00000000-0000-4000-8000-000000000301', '00000000-0000-4000-8000-000000000351', '00000000-0000-4000-8000-000000000201', 'milestone-2', 'open');

insert into public.authority_case_assignments (dispute_case_id, authority_id, case_officer_profile_id, assigned_by_profile_id)
values ('00000000-0000-4000-8000-000000000501', '00000000-0000-4000-8000-000000000201', '00000000-0000-4000-8000-000000000103', '00000000-0000-4000-8000-000000000101');

insert into public.private_evidence_references (id, contract_id, dispute_case_id, milestone_key, reference_hash, created_by_profile_id)
values ('00000000-0000-4000-8000-000000000701', '00000000-0000-4000-8000-000000000301', '00000000-0000-4000-8000-000000000501', 'milestone-2', 'private-evidence-hash', '00000000-0000-4000-8000-000000000101');

insert into public.contracts (id, created_by_profile_id, status)
values ('00000000-0000-4000-8000-000000000303', '00000000-0000-4000-8000-000000000101', 'private_draft');

insert into public.contract_parties (contract_id, party_kind, profile_id)
values ('00000000-0000-4000-8000-000000000303', 'profile', '00000000-0000-4000-8000-000000000101');

insert into public.contract_versions (id, contract_id, version_number, version_hash, authority_snapshot, selected_authority_id, created_by_profile_id)
values (
  '00000000-0000-4000-8000-000000000353',
  '00000000-0000-4000-8000-000000000303',
  1,
  'rls-test-draft-v1',
  '{"authority_name":"RLS Test Simulation Authority","jurisdiction_label":"Testnet simulation","ruleset_version":"v1"}',
  '00000000-0000-4000-8000-000000000201',
  '00000000-0000-4000-8000-000000000101'
);

insert into public.contract_sections (contract_version_id, section_type, position, terms)
values
  ('00000000-0000-4000-8000-000000000353', 'parties', 1, '{"proposer_profile_id":"00000000-0000-4000-8000-000000000101","counterparty_email":"invitee@example.test"}'::jsonb),
  ('00000000-0000-4000-8000-000000000353', 'change_control', 2, '{"rule":"Future uncompleted work changes only through bilateral amendment."}'::jsonb),
  ('00000000-0000-4000-8000-000000000353', 'evidence', 5, '{"rule":"Evidence must use a private Contract reference."}'::jsonb),
  ('00000000-0000-4000-8000-000000000353', 'intellectual_property', 6, '{"outcome":"provider_retains_ownership_with_client_license","license_scope":"Project delivery use"}'::jsonb),
  ('00000000-0000-4000-8000-000000000353', 'dispute_resolution', 7, '{"authority":"RLS Test Simulation Authority","ruleset":"v1"}'::jsonb),
  ('00000000-0000-4000-8000-000000000353', 'notices', 8, '{"acknowledgement":"Acceptance applies to this exact Version."}'::jsonb);

insert into public.private_evidence_references (id, contract_id, milestone_key, reference_hash, created_by_profile_id)
values ('00000000-0000-4000-8000-000000000702', '00000000-0000-4000-8000-000000000303', 'draft-evidence', 'private-draft-evidence-hash', '00000000-0000-4000-8000-000000000101');

do $$
begin
  begin
    insert into public.delegated_project_access (contract_party_id, profile_id, granted_by_profile_id)
    values ('00000000-0000-4000-8000-000000000401', '00000000-0000-4000-8000-000000000102', '00000000-0000-4000-8000-000000000101');
    raise exception 'A Profile Contract Party unexpectedly accepted a delegation.';
  exception
    when others then
      if position('only by a Workspace Contract Party' in sqlerrm) = 0 then
        raise;
      end if;
  end;

  begin
    update public.authority_case_assignments
    set authority_id = (select id from public.resolution_authorities where slug = 'pactflow-simulation')
    where dispute_case_id = '00000000-0000-4000-8000-000000000501';
    raise exception 'A Case Officer was assigned through the wrong Resolution Authority.';
  exception
    when others then
      if position('must use the dispute case Resolution Authority' in sqlerrm) = 0 then
        raise;
      end if;
  end;

  insert into public.contracts (id, created_by_profile_id, status)
  values ('00000000-0000-4000-8000-000000000302', '00000000-0000-4000-8000-000000000102', 'private_draft');
  begin
    insert into public.private_evidence_references (contract_id, dispute_case_id, milestone_key, reference_hash, created_by_profile_id)
    values ('00000000-0000-4000-8000-000000000302', '00000000-0000-4000-8000-000000000501', 'milestone-2', 'cross-contract-evidence', '00000000-0000-4000-8000-000000000102');
    raise exception 'Evidence was linked to a dispute case from another Contract.';
  exception
    when others then
      if position('must belong to the same Contract' in sqlerrm) = 0 then
        raise;
      end if;
  end;

  begin
    insert into public.private_evidence_references (contract_id, dispute_case_id, milestone_key, reference_hash, created_by_profile_id)
    values ('00000000-0000-4000-8000-000000000301', '00000000-0000-4000-8000-000000000501', 'milestone-3', 'cross-milestone-evidence', '00000000-0000-4000-8000-000000000101');
    raise exception 'Evidence was linked to a dispute case for another milestone.';
  exception
    when others then
      if position('must belong to the dispute case milestone' in sqlerrm) = 0 then
        raise;
      end if;
  end;

  begin
    insert into public.contract_parties (contract_id, party_kind, profile_id)
    values ('00000000-0000-4000-8000-000000000301', 'profile', '00000000-0000-4000-8000-000000000103');
    raise exception 'An assigned Case Officer became a Contract Party.';
  exception
    when others then
      if position('cannot become a Contract Party' in sqlerrm) = 0 then
        raise;
      end if;
  end;
end;
$$;

set local role authenticated;

select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000101', true);
do $$
declare
  invitation_id uuid;
begin
  if (select count(*) from public.workspaces) <> 1 then
    raise exception 'A party must see only its provisioned personal workspace.';
  end if;
  insert into public.workspaces (owner_profile_id, name, kind)
  values ('00000000-0000-4000-8000-000000000101', 'Party collaboration', 'collaborative');
  if not exists (
    select 1
    from public.workspace_memberships membership
    join public.workspaces workspace on workspace.id = membership.workspace_id
    where workspace.name = 'Party collaboration'
      and membership.profile_id = '00000000-0000-4000-8000-000000000101'
      and membership.membership_role = 'owner'
  ) then
    raise exception 'A collaborative Workspace creator must receive its owner membership.';
  end if;
  begin
    update public.workspaces
    set owner_profile_id = '00000000-0000-4000-8000-000000000102'
    where name = 'Party collaboration';
    raise exception 'A Workspace owner changed without an explicit ownership-transfer flow.';
  exception
    when others then
      if position('ownership is immutable' in sqlerrm) = 0 then
        raise;
      end if;
  end;
  if not exists (select 1 from public.contracts where id = '00000000-0000-4000-8000-000000000301') then
    raise exception 'A Contract Party must see its contract.';
  end if;
  if not exists (select 1 from public.dispute_cases where id = '00000000-0000-4000-8000-000000000501') then
    raise exception 'A Contract Party must see its contract dispute.';
  end if;
  perform public.update_contract_draft(
    '00000000-0000-4000-8000-000000000303',
    '{"parties":{"buyer":{"partyRef":"initiating_party","responsibility":"Funds the agreed allocation."},"serviceProvider":{"partyRef":"counterparty","responsibility":"Delivers the agreed outcomes."}},"scope":{"title":"RLS draft","description":"A participant-only durable Contract draft.","outcome":"A documented service handoff.","includedDeliverables":["Discovery findings","Handoff"],"excludedWork":["Ongoing operations"],"projectStartDateUtc":"2030-01-02T09:00:00.000Z","clientDependencies":[]},"milestones":{"items":[{"title":"Discovery","deliveryOutcome":"Annotated findings","allocation":400,"evidenceRequirement":"Annotated findings","deliveryDeadlineUtc":"2030-01-10T09:00:00.000Z","reviewWindowHours":72},{"title":"Handoff","deliveryOutcome":"Production-ready handoff","allocation":600,"evidenceRequirement":"Production-ready handoff","deliveryDeadlineUtc":"2030-01-24T09:00:00.000Z","reviewWindowHours":72}]},"payment":{"settlementToken":"eUSD testnet demonstration token","network":"Base Sepolia","totalAllocation":1000,"fundingDeadlineUtc":"2030-01-05T09:00:00.000Z","successFeeBps":250,"feeRecipient":"PactFlow demonstration fee recipient"},"evidence":{"reviewDecision":"Buyer records acceptance or a specific change request.","dependencyAcknowledgementRequired":false},"intellectual_property":{"outcome":"provider_retains_ownership_with_client_license","licenseScope":"Project delivery use","confidentiality":"mutual_confidentiality","confidentialityDuration":"Two years"},"change_control":{"proposalProcess":"Either Contract Party may propose a written change request.","bilateralAmendmentOnly":true},"notices":{"buyerContact":"party@example.test","serviceProviderContact":"invitee@example.test","exactVersionAcknowledgement":true}}'::jsonb,
    '00000000-0000-4000-8000-000000000201'
  );
  if not exists (
    select 1 from public.contract_sections section
    join public.contract_versions version on version.id = section.contract_version_id
    where version.contract_id = '00000000-0000-4000-8000-000000000303'
      and version.version_number = 2
      and section.section_type = 'milestones'
      and jsonb_array_length(section.terms -> 'items') = 2
  ) then
    raise exception 'A Contract Party must be able to save its validated durable milestone schedule.';
  end if;
  invitation_id := public.create_contract_invitation('00000000-0000-4000-8000-000000000303', 'invitee@example.test');
  perform set_config('test.invitation_id', invitation_id::text, true);
end;
$$;

select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000102', true);
do $$
begin
  begin
    perform public.accept_contract_invitation(current_setting('test.invitation_id')::uuid);
    raise exception 'An unrelated Profile unexpectedly accepted a private Contract invitation.';
  exception
    when others then
      if position('invalid, expired, or addressed to another Profile' in sqlerrm) = 0 then
        raise;
      end if;
  end;
  if exists (select 1 from public.contracts where id = '00000000-0000-4000-8000-000000000303') then
    raise exception 'An unrelated Profile unexpectedly read a private Contract after changing the invitation identifier.';
  end if;
  if exists (select 1 from public.contract_versions where contract_id = '00000000-0000-4000-8000-000000000303')
    or exists (select 1 from public.contract_sections section join public.contract_versions version on version.id = section.contract_version_id where version.contract_id = '00000000-0000-4000-8000-000000000303')
    or exists (select 1 from public.private_evidence_references where id = '00000000-0000-4000-8000-000000000702')
    or exists (select 1 from public.contract_invitations where id = current_setting('test.invitation_id')::uuid) then
    raise exception 'An unrelated Profile unexpectedly read private Contract coordination data.';
  end if;
  begin
    perform public.update_contract_draft(
      '00000000-0000-4000-8000-000000000303',
      '{}'::jsonb,
      '00000000-0000-4000-8000-000000000201'
    );
    raise exception 'An unrelated Profile unexpectedly updated a Contract draft.';
  exception
    when others then
      if position('Only a Contract Party can edit this draft' in sqlerrm) = 0 then
        raise;
      end if;
  end;
  begin
    perform public.record_wallet_contract_acceptance(
      '00000000-0000-4000-8000-000000000303',
      (select id from public.contract_versions where contract_id = '00000000-0000-4000-8000-000000000303' order by version_number desc limit 1),
      (select version_hash from public.contract_versions where contract_id = '00000000-0000-4000-8000-000000000303' order by version_number desc limit 1),
      '0x0000000000000000000000000000000000000002',
      '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      '00000000-0000-4000-8000-000000000102'
    );
    raise exception 'An unrelated Profile unexpectedly accepted a private Contract Version.';
  exception
    when others then
      if position('permission denied' in sqlerrm) = 0 then
        raise;
      end if;
  end;
end;
$$;

select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000104', true);
do $$
begin
  perform public.accept_contract_invitation(current_setting('test.invitation_id')::uuid);
  if not exists (select 1 from public.contracts where id = '00000000-0000-4000-8000-000000000303') then
    raise exception 'The invited Profile could not read its accepted private Contract.';
  end if;
  if not exists (
    select 1 from public.contract_parties
    where contract_id = '00000000-0000-4000-8000-000000000303'
      and profile_id = '00000000-0000-4000-8000-000000000104'
  ) then
    raise exception 'Accepting the invitation did not create the invited Profile Contract Party.';
  end if;
  if not exists (select 1 from public.contract_versions where contract_id = '00000000-0000-4000-8000-000000000303')
    or not exists (select 1 from public.contract_sections section join public.contract_versions version on version.id = section.contract_version_id where version.contract_id = '00000000-0000-4000-8000-000000000303')
    or not exists (select 1 from public.private_evidence_references where id = '00000000-0000-4000-8000-000000000702') then
    raise exception 'The invited Profile could not read private Contract coordination data after acceptance.';
  end if;
  begin
    perform public.record_wallet_contract_acceptance(
      '00000000-0000-4000-8000-000000000303',
      (select id from public.contract_versions where contract_id = '00000000-0000-4000-8000-000000000303' order by version_number desc limit 1),
      (select version_hash from public.contract_versions where contract_id = '00000000-0000-4000-8000-000000000303' order by version_number desc limit 1),
      '0x0000000000000000000000000000000000000004',
      '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      '00000000-0000-4000-8000-000000000104'
    );
    raise exception 'A browser-authenticated Contract Party unexpectedly bypassed the signature-verifying server boundary.';
  exception when others then
    if position('permission denied' in sqlerrm) = 0 then raise; end if;
  end;
end;
$$;

select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000101', true);
do $$
declare
  reviewed_version_id uuid;
  replacement_version_id uuid;
begin
  select id into reviewed_version_id from public.contract_versions
  where contract_id = '00000000-0000-4000-8000-000000000303' order by version_number desc limit 1;
  perform public.update_contract_draft(
    '00000000-0000-4000-8000-000000000303',
    '{"parties":{"buyer":{"partyRef":"initiating_party","responsibility":"Funds the agreed allocation."},"serviceProvider":{"partyRef":"counterparty","responsibility":"Delivers the agreed outcomes."}},"scope":{"title":"RLS draft revision","description":"A corrected participant-only durable Contract draft.","outcome":"A documented service handoff.","includedDeliverables":["Discovery findings","Handoff"],"excludedWork":["Ongoing operations"],"projectStartDateUtc":"2030-01-02T09:00:00.000Z","clientDependencies":[]},"milestones":{"items":[{"title":"Discovery","deliveryOutcome":"Annotated findings","allocation":400,"evidenceRequirement":"Annotated findings","deliveryDeadlineUtc":"2030-01-10T09:00:00.000Z","reviewWindowHours":72},{"title":"Handoff","deliveryOutcome":"Production-ready handoff","allocation":600,"evidenceRequirement":"Production-ready handoff","deliveryDeadlineUtc":"2030-01-24T09:00:00.000Z","reviewWindowHours":72}]},"payment":{"settlementToken":"eUSD testnet demonstration token","network":"Base Sepolia","totalAllocation":1000,"fundingDeadlineUtc":"2030-01-05T09:00:00.000Z","successFeeBps":250,"feeRecipient":"PactFlow demonstration fee recipient"},"evidence":{"reviewDecision":"Buyer records acceptance or a specific change request.","dependencyAcknowledgementRequired":false},"intellectual_property":{"outcome":"provider_retains_ownership_with_client_license","licenseScope":"Project delivery use","confidentiality":"mutual_confidentiality","confidentialityDuration":"Two years"},"change_control":{"proposalProcess":"Either Contract Party may propose a written change request.","bilateralAmendmentOnly":true},"notices":{"buyerContact":"party@example.test","serviceProviderContact":"invitee@example.test","exactVersionAcknowledgement":true}}'::jsonb,
    '00000000-0000-4000-8000-000000000201'
  );
  select id into replacement_version_id from public.contract_versions
  where contract_id = '00000000-0000-4000-8000-000000000303' order by version_number desc limit 1;
  if replacement_version_id = reviewed_version_id
    or exists (select 1 from public.contract_acceptances where contract_version_id = replacement_version_id) then
    raise exception 'A corrected Contract Version must not carry prior acceptances forward.';
  end if;
end;
$$;

select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000103', true);
do $$
begin
  if (select count(*) from public.workspaces) <> 1 then
    raise exception 'A Case Officer must see only its provisioned personal workspace.';
  end if;
  if exists (select 1 from public.contracts where id = '00000000-0000-4000-8000-000000000301') then
    raise exception 'A Case Officer must not see general contract records.';
  end if;
  if not exists (select 1 from public.dispute_cases where id = '00000000-0000-4000-8000-000000000501') then
    raise exception 'An assigned Case Officer must see its dispute case.';
  end if;
end;
$$;

rollback;
