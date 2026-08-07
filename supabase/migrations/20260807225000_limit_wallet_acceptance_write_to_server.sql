create or replace function public.record_wallet_contract_acceptance(
  target_contract_id uuid,
  target_version_id uuid,
  expected_version_hash text,
  signer_wallet_address text,
  signer_signature text,
  acting_profile_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
#variable_conflict use_variable
declare
  acting_party_id uuid;
  latest_version public.contract_versions;
  acceptance_id uuid;
begin
  if acting_profile_id is null then raise exception 'An authenticated Contract Party is required.'; end if;
  if signer_wallet_address !~* '^0x[0-9a-f]{40}$' or signer_signature !~* '^0x[0-9a-f]{130}$' then raise exception 'A valid wallet acceptance is required.'; end if;
  select party.id into acting_party_id from public.contract_parties party
  where party.contract_id = target_contract_id and (party.profile_id = acting_profile_id or exists (
    select 1 from public.delegated_project_access delegation where delegation.contract_party_id = party.id and delegation.profile_id = acting_profile_id and delegation.revoked_at is null
  )) limit 1;
  if acting_party_id is null then raise exception 'Only a Contract Party can accept this Version.'; end if;
  if (select count(*) from public.contract_parties where contract_id = target_contract_id) <> 2 then raise exception 'This Contract needs exactly two Contract Parties before Version acceptance.'; end if;
  select * into latest_version from public.contract_versions where contract_id = target_contract_id order by version_number desc limit 1;
  if latest_version.id is distinct from target_version_id or latest_version.version_hash <> expected_version_hash or latest_version.version_hash <> public.contract_version_terms_hash(target_version_id) or not public.is_complete_contract_version(target_version_id) then raise exception 'The supplied wallet signature does not cover the latest immutable Contract Version.'; end if;
  select id into acceptance_id from public.contract_acceptances where contract_version_id = target_version_id and contract_party_id = acting_party_id;
  if acceptance_id is null then
    insert into public.contract_acceptances (contract_version_id, contract_party_id, acting_profile_id, accepted_version_hash, signer_wallet_address, signer_signature)
    values (target_version_id, acting_party_id, acting_profile_id, latest_version.version_hash, lower(signer_wallet_address), signer_signature) returning id into acceptance_id;
  else
    update public.contract_acceptances acceptance set accepted_at = now(), acting_profile_id = record_wallet_contract_acceptance.acting_profile_id, accepted_version_hash = latest_version.version_hash, signer_wallet_address = lower(record_wallet_contract_acceptance.signer_wallet_address), signer_signature = record_wallet_contract_acceptance.signer_signature where acceptance.id = acceptance_id;
  end if;
  return acceptance_id;
end;
$$;

revoke all on function public.record_wallet_contract_acceptance(uuid, uuid, text, text, text, uuid) from public, anon, authenticated;
revoke all on function public.accept_contract_version(uuid, uuid, text, text, text) from authenticated;
