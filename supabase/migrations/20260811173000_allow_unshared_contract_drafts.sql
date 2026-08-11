-- A creator may persist a private Contract Draft before identifying the second
-- Contract Party. The existing invitation RPC remains the only sharing path.
create or replace function public.create_profile_owned_contract(
  contract_name text,
  contract_scope text,
  counterparty_email text,
  initiator_responsibility text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_contract_id uuid;
  version_id uuid;
  authority_id uuid;
  normalized_email text := nullif(lower(trim(counterparty_email)), '');
  counterparty_responsibility text;
begin
  if auth.uid() is null then
    raise exception 'An authenticated User Profile is required.';
  end if;
  if initiator_responsibility not in ('buyer', 'service_provider') then
    raise exception 'Choose whether you are hiring or providing the service.';
  end if;
  if char_length(trim(contract_name)) not between 1 and 160
    or char_length(trim(contract_scope)) not between 1 and 4000 then
    raise exception 'Contract name and scope are required.';
  end if;
  if normalized_email is not null and normalized_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then
    raise exception 'A valid counterparty email is required.';
  end if;

  select id into authority_id
  from public.resolution_authorities
  where slug = 'pactflow-simulation' and status = 'published';
  if authority_id is null then
    raise exception 'No published Resolution Authority is available.';
  end if;

  counterparty_responsibility := case initiator_responsibility
    when 'buyer' then 'service_provider'
    else 'buyer'
  end;

  insert into public.contracts (created_by_profile_id, status)
  values (auth.uid(), 'private_draft')
  returning id into new_contract_id;
  insert into public.contract_parties (contract_id, party_kind, profile_id)
  values (new_contract_id, 'profile', auth.uid());

  if normalized_email is not null then
    insert into public.contacts (owner_profile_id, display_name, email)
    values (auth.uid(), normalized_email, normalized_email)
    on conflict (owner_profile_id, email) do nothing;
  end if;

  insert into public.contract_versions (contract_id, version_number, version_hash, selected_authority_id, authority_snapshot, created_by_profile_id)
  select new_contract_id, 1, md5(new_contract_id::text || now()::text), authority_id,
    jsonb_build_object('authority_name', display_name, 'jurisdiction_label', jurisdiction_label, 'ruleset_version', ruleset_version), auth.uid()
  from public.resolution_authorities
  where id = authority_id
  returning id into version_id;
  insert into public.contract_sections (contract_version_id, section_type, position, terms)
  values
    (version_id, 'scope', 0, jsonb_build_object('title', trim(contract_name), 'description', trim(contract_scope))),
    (version_id, 'parties', 1, jsonb_build_object('initiator_profile_id', auth.uid(), 'counterparty_email', normalized_email, 'initiator_responsibility', initiator_responsibility, 'counterparty_responsibility', counterparty_responsibility)),
    (version_id, 'change_control', 2, jsonb_build_object('rule', 'Future uncompleted work changes only through bilateral amendment.'));
  return new_contract_id;
end;
$$;

revoke all on function public.create_profile_owned_contract(text, text, text, text) from public, anon;
grant execute on function public.create_profile_owned_contract(text, text, text, text) to authenticated;
