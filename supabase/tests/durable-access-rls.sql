begin;

insert into auth.users (
  id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  is_super_admin, is_sso_user, is_anonymous
)
values
  ('00000000-0000-4000-8000-000000000101', 'authenticated', 'authenticated', 'party@example.test', '', now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Party"}', now(), now(), false, false, false),
  ('00000000-0000-4000-8000-000000000102', 'authenticated', 'authenticated', 'other@example.test', '', now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Other"}', now(), now(), false, false, false),
  ('00000000-0000-4000-8000-000000000103', 'authenticated', 'authenticated', 'officer@example.test', '', now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Case Officer"}', now(), now(), false, false, false);

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
  if not exists (select 1 from public.contracts where id = '00000000-0000-4000-8000-000000000301') then
    raise exception 'A Contract Party must see its contract.';
  end if;
  if not exists (select 1 from public.dispute_cases where id = '00000000-0000-4000-8000-000000000501') then
    raise exception 'A Contract Party must see its contract dispute.';
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
