create function public.accept_contract_version(target_contract_id uuid, target_version_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  acting_party_id uuid;
  latest_version_id uuid;
  acceptance_id uuid;
begin
  if auth.uid() is null then raise exception 'An authenticated Contract Party is required.'; end if;

  select party.id into acting_party_id
  from public.contract_parties party
  where party.contract_id = target_contract_id
    and (
      party.profile_id = auth.uid()
      or exists (
        select 1
        from public.delegated_project_access delegation
        where delegation.contract_party_id = party.id
          and delegation.profile_id = auth.uid()
          and delegation.revoked_at is null
      )
    )
  limit 1;
  if acting_party_id is null then raise exception 'Only a Contract Party can accept this Version.'; end if;
  if (select count(*) from public.contract_parties where contract_id = target_contract_id) <> 2 then
    raise exception 'This Contract needs exactly two Contract Parties before Version acceptance.';
  end if;

  select id into latest_version_id
  from public.contract_versions
  where contract_id = target_contract_id
  order by version_number desc
  limit 1;
  if latest_version_id is distinct from target_version_id then
    raise exception 'Only the latest immutable Contract Version can be accepted.';
  end if;
  if (select count(distinct section_type) from public.contract_sections where contract_version_id = target_version_id and section_type in ('parties', 'scope', 'milestones', 'payment', 'change_control')) <> 5 then
    raise exception 'This Contract Version is incomplete and cannot be accepted.';
  end if;

  select id into acceptance_id
  from public.contract_acceptances
  where contract_version_id = target_version_id and contract_party_id = acting_party_id;
  if acceptance_id is null then
    insert into public.contract_acceptances (contract_version_id, contract_party_id, acting_profile_id)
    values (target_version_id, acting_party_id, auth.uid())
    returning id into acceptance_id;
  end if;
  return acceptance_id;
end;
$$;

revoke all on function public.accept_contract_version(uuid, uuid) from public, anon;
grant execute on function public.accept_contract_version(uuid, uuid) to authenticated;
