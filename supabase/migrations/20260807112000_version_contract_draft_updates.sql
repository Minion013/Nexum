drop function public.update_contract_draft(uuid, jsonb, jsonb, bigint, integer);

create function public.update_contract_draft(
  target_contract_id uuid,
  draft_scope jsonb,
  draft_milestones jsonb,
  total_allocation bigint,
  disclosed_success_fee_bps integer,
  selected_authority_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  latest_version public.contract_versions;
  new_version_id uuid;
  selected_authority public.resolution_authorities;
  milestone jsonb;
  allocation_sum bigint := 0;
  previous_deadline timestamptz;
  deadline timestamptz;
  invitation public.contract_invitations;
begin
  if auth.uid() is null then raise exception 'An authenticated Contract Party is required.'; end if;
  if not exists (
    select 1 from public.contract_parties party
    where party.contract_id = target_contract_id
      and (party.profile_id = auth.uid() or exists (
        select 1 from public.delegated_project_access delegation
        join public.workspace_memberships membership on membership.workspace_id = party.workspace_id and membership.profile_id = delegation.profile_id
        where delegation.contract_party_id = party.id and delegation.profile_id = auth.uid() and delegation.revoked_at is null
      ))
  ) then raise exception 'Only a Contract Party can edit this draft.'; end if;
  if not exists (select 1 from public.contracts where id = target_contract_id and status in ('private_draft', 'negotiation')) then
    raise exception 'Only an unsigned Contract draft can be edited.';
  end if;
  if jsonb_typeof(draft_scope) <> 'object'
    or char_length(trim(coalesce(draft_scope ->> 'title', ''))) not between 1 and 160
    or char_length(trim(coalesce(draft_scope ->> 'description', ''))) not between 1 and 4000 then raise exception 'A Contract title and scope are required.'; end if;
  if jsonb_typeof(draft_milestones) <> 'array' or jsonb_array_length(draft_milestones) not between 2 and 3 then raise exception 'A Contract needs two or three milestones.'; end if;
  if total_allocation <= 0 then raise exception 'The Contract total allocation must be positive.'; end if;
  if disclosed_success_fee_bps not between 0 and 10000 then raise exception 'The success fee must be between 0 and 10,000 basis points.'; end if;
  select * into selected_authority from public.resolution_authorities where id = selected_authority_id and status = 'published';
  if selected_authority.id is null then raise exception 'Select a published Resolution Authority.'; end if;
  for milestone in select value from jsonb_array_elements(draft_milestones) loop
    if jsonb_typeof(milestone) <> 'object' or char_length(trim(coalesce(milestone ->> 'title', ''))) not between 1 and 160
      or char_length(trim(coalesce(milestone ->> 'evidenceRequirement', ''))) not between 1 and 4000
      or coalesce(milestone ->> 'allocation', '') !~ '^[1-9][0-9]*$'
      or coalesce(milestone ->> 'reviewWindowHours', '') !~ '^[1-9][0-9]*$'
      or (milestone ->> 'reviewWindowHours')::integer > 720
      or coalesce(milestone ->> 'deliveryDeadlineUtc', '') !~ '^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$' then
      raise exception 'Each milestone must contain a title, allocation, evidence requirement, UTC deadline, and review window.';
    end if;
    deadline := (milestone ->> 'deliveryDeadlineUtc')::timestamptz;
    if deadline <= now() then raise exception 'Each milestone deadline must be in the future.'; end if;
    if previous_deadline is not null and deadline <= previous_deadline then raise exception 'Milestone deadlines must be in order.'; end if;
    previous_deadline := deadline;
    allocation_sum := allocation_sum + (milestone ->> 'allocation')::bigint;
  end loop;
  if allocation_sum <> total_allocation then raise exception 'Milestone allocations must equal the Contract total allocation.'; end if;

  select * into latest_version from public.contract_versions where contract_id = target_contract_id order by version_number desc limit 1;
  if latest_version.id is null then raise exception 'The Contract has no draft Version.'; end if;
  insert into public.contract_versions (contract_id, version_number, version_hash, selected_authority_id, authority_snapshot, created_by_profile_id)
  values (target_contract_id, latest_version.version_number + 1, md5(target_contract_id::text || now()::text || random()::text), selected_authority.id,
    jsonb_build_object('authority_name', selected_authority.display_name, 'jurisdiction_label', selected_authority.jurisdiction_label, 'ruleset_version', selected_authority.ruleset_version), auth.uid())
  returning id into new_version_id;
  insert into public.contract_sections (contract_version_id, section_type, position, terms)
  select new_version_id, section_type, position, terms from public.contract_sections
  where contract_version_id = latest_version.id and section_type in ('parties', 'change_control');
  insert into public.contract_sections (contract_version_id, section_type, position, terms) values
    (new_version_id, 'scope', 0, draft_scope),
    (new_version_id, 'milestones', 3, jsonb_build_object('items', draft_milestones)),
    (new_version_id, 'payment', 4, jsonb_build_object('settlement_token', 'eUSD testnet demonstration token', 'total_allocation', total_allocation, 'success_fee_bps', disclosed_success_fee_bps, 'payment_authority', 'not_configured'));

  for invitation in select * from public.contract_invitations where contract_id = target_contract_id and status = 'pending' for update loop
    update public.contract_invitations set status = 'revoked' where id = invitation.id;
    insert into public.contract_invitations (contract_id, contract_version_id, inviter_party_id, invitee_contact_id, invited_email, status, expires_at)
    values (target_contract_id, new_version_id, invitation.inviter_party_id, invitation.invitee_contact_id, invitation.invited_email, 'pending', now() + interval '14 days');
  end loop;
  update public.contracts set updated_at = now() where id = target_contract_id;
  return new_version_id;
end;
$$;

revoke all on function public.update_contract_draft(uuid, jsonb, jsonb, bigint, integer, uuid) from public, anon;
grant execute on function public.update_contract_draft(uuid, jsonb, jsonb, bigint, integer, uuid) to authenticated;
