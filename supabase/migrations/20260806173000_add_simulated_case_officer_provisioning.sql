create function public.provision_simulated_case_officer(case_officer_email text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  case_officer_id uuid;
  simulation_authority_id uuid;
begin
  select id into case_officer_id
  from public.profiles
  where lower(email) = lower(trim(case_officer_email));

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
