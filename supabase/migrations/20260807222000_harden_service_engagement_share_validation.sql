create function public.validate_service_engagement_draft_extra(draft_sections jsonb)
returns void
language plpgsql
set search_path = ''
as $$
begin
  if exists (select 1 from jsonb_array_elements(draft_sections #> '{scope,includedDeliverables}') item where jsonb_typeof(item) <> 'string' or char_length(trim(item #>> '{}')) = 0)
    or exists (select 1 from jsonb_array_elements(draft_sections #> '{scope,excludedWork}') item where jsonb_typeof(item) <> 'string' or char_length(trim(item #>> '{}')) = 0)
    or (jsonb_typeof(draft_sections #> '{scope,clientDependencies}') = 'array' and exists (select 1 from jsonb_array_elements(draft_sections #> '{scope,clientDependencies}') item where jsonb_typeof(item) <> 'string' or char_length(trim(item #>> '{}')) = 0)) then
    raise exception 'Scope lists must contain meaningful text items.';
  end if;
  if coalesce(draft_sections #>> '{payment,fundingWindowHours}', '48') <> '48' then raise exception 'The funding window must be 48 hours after the second Contract Acceptance.'; end if;
  if jsonb_typeof(draft_sections #> '{evidence,dependencyAcknowledgementRequired}') <> 'boolean'
    or jsonb_typeof(draft_sections #> '{change_control,bilateralAmendmentOnly}') <> 'boolean'
    or jsonb_typeof(draft_sections #> '{notices,exactVersionAcknowledgement}') <> 'boolean' then
    raise exception 'Service Engagement acknowledgement fields must be boolean.';
  end if;
end;
$$;

create or replace function public.update_contract_draft(target_contract_id uuid, draft_sections jsonb, selected_authority_id uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare latest_version public.contract_versions; new_version_id uuid; selected_authority public.resolution_authorities; invitation public.contract_invitations;
begin
  if auth.uid() is null then raise exception 'An authenticated Contract Party is required.'; end if;
  if not exists (select 1 from public.contract_parties party where party.contract_id = target_contract_id and (party.profile_id = auth.uid() or exists (select 1 from public.delegated_project_access delegation where delegation.contract_party_id = party.id and delegation.profile_id = auth.uid() and delegation.revoked_at is null))) then raise exception 'Only a Contract Party can edit this draft.'; end if;
  if not exists (select 1 from public.contracts where id = target_contract_id and status in ('private_draft', 'negotiation')) then raise exception 'Only an unsigned Contract draft can be edited.'; end if;
  perform public.validate_service_engagement_draft(draft_sections);
  perform public.validate_service_engagement_draft_extra(draft_sections);
  select * into selected_authority from public.resolution_authorities where id = selected_authority_id and status = 'published';
  if selected_authority.id is null then raise exception 'Select a published Resolution Authority.'; end if;
  perform 1 from public.contracts where id = target_contract_id for update;
  select * into latest_version from public.contract_versions where contract_id = target_contract_id order by version_number desc limit 1;
  if latest_version.id is null then raise exception 'The Contract has no draft Version.'; end if;
  insert into public.contract_versions (contract_id, version_number, version_hash, selected_authority_id, authority_snapshot, created_by_profile_id)
  values (target_contract_id, latest_version.version_number + 1, md5(target_contract_id::text || now()::text || random()::text), selected_authority.id, jsonb_build_object('authority_name', selected_authority.display_name, 'jurisdiction_label', selected_authority.jurisdiction_label, 'ruleset_version', selected_authority.ruleset_version), auth.uid()) returning id into new_version_id;
  insert into public.contract_sections (contract_version_id, section_type, position, terms) values
    (new_version_id, 'parties', 0, draft_sections -> 'parties'), (new_version_id, 'scope', 1, draft_sections -> 'scope'), (new_version_id, 'milestones', 2, draft_sections -> 'milestones'), (new_version_id, 'payment', 3, jsonb_set(draft_sections -> 'payment', '{paymentAuthority}', '"not_configured"'::jsonb)), (new_version_id, 'evidence', 4, draft_sections -> 'evidence'), (new_version_id, 'intellectual_property', 5, draft_sections -> 'intellectual_property'), (new_version_id, 'change_control', 6, draft_sections -> 'change_control'), (new_version_id, 'dispute_resolution', 7, jsonb_build_object('authority_name', selected_authority.display_name, 'jurisdiction_label', selected_authority.jurisdiction_label, 'ruleset_version', selected_authority.ruleset_version)), (new_version_id, 'notices', 8, draft_sections -> 'notices');
  update public.contract_versions set acceptance_ready_at = now() where id = new_version_id;
  for invitation in select * from public.contract_invitations where contract_id = target_contract_id and status = 'pending' for update loop
    update public.contract_invitations set status = 'revoked' where id = invitation.id;
    insert into public.contract_invitations (contract_id, contract_version_id, inviter_party_id, invitee_contact_id, invited_email, status, expires_at) values (target_contract_id, new_version_id, invitation.inviter_party_id, invitation.invitee_contact_id, invitation.invited_email, 'pending', now() + interval '14 days');
  end loop;
  update public.contracts set updated_at = now() where id = target_contract_id;
  return new_version_id;
end;
$$;

revoke all on function public.validate_service_engagement_draft_extra(jsonb) from public, anon;
