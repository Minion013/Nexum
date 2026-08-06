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

insert into public.dispute_cases (id, contract_id, authority_id, milestone_key, status)
values ('00000000-0000-4000-8000-000000000501', '00000000-0000-4000-8000-000000000301', '00000000-0000-4000-8000-000000000201', 'milestone-2', 'open');

insert into public.authority_case_assignments (dispute_case_id, authority_id, case_officer_profile_id, assigned_by_profile_id)
values ('00000000-0000-4000-8000-000000000501', '00000000-0000-4000-8000-000000000201', '00000000-0000-4000-8000-000000000103', '00000000-0000-4000-8000-000000000101');

set local role authenticated;

select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000101', true);
do $$
begin
  if (select count(*) from public.workspaces) <> 1 then
    raise exception 'A party must see only its provisioned personal workspace.';
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
