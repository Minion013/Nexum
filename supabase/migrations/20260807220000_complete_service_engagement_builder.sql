drop trigger if exists carry_forward_noneditable_contract_sections_after_version_create on public.contract_versions;

drop function public.update_contract_draft(uuid, jsonb, jsonb, bigint, integer, uuid);

create function public.validate_service_engagement_draft(draft_sections jsonb)
returns void
language plpgsql
set search_path = ''
as $$
declare
  milestone jsonb;
  allocation_sum bigint := 0;
  previous_deadline timestamptz;
  first_deadline timestamptz;
  deadline timestamptz;
  payment jsonb := draft_sections -> 'payment';
  intellectual_property jsonb := draft_sections -> 'intellectual_property';
begin
  if jsonb_typeof(draft_sections) <> 'object' then raise exception 'A typed Service Engagement template is required.'; end if;
  if jsonb_typeof(draft_sections -> 'parties') <> 'object'
    or draft_sections #>> '{parties,buyer,partyRef}' not in ('initiating_party', 'counterparty')
    or draft_sections #>> '{parties,serviceProvider,partyRef}' not in ('initiating_party', 'counterparty')
    or draft_sections #>> '{parties,buyer,partyRef}' = draft_sections #>> '{parties,serviceProvider,partyRef}'
    or char_length(trim(coalesce(draft_sections #>> '{parties,buyer,responsibility}', ''))) not between 1 and 500
    or char_length(trim(coalesce(draft_sections #>> '{parties,serviceProvider,responsibility}', ''))) not between 1 and 500 then
    raise exception 'The buyer and service provider must be distinct Contract Parties with named responsibilities.';
  end if;
  if jsonb_typeof(draft_sections -> 'scope') <> 'object'
    or char_length(trim(coalesce(draft_sections #>> '{scope,title}', ''))) not between 1 and 160
    or char_length(trim(coalesce(draft_sections #>> '{scope,description}', ''))) not between 1 and 4000
    or char_length(trim(coalesce(draft_sections #>> '{scope,outcome}', ''))) not between 1 and 1000
    or jsonb_typeof(draft_sections #> '{scope,includedDeliverables}') <> 'array' or jsonb_array_length(draft_sections #> '{scope,includedDeliverables}') = 0
    or jsonb_typeof(draft_sections #> '{scope,excludedWork}') <> 'array' or jsonb_array_length(draft_sections #> '{scope,excludedWork}') = 0
    or exists (select 1 from jsonb_array_elements(draft_sections #> '{scope,includedDeliverables}') item where jsonb_typeof(item) <> 'string' or char_length(trim(item #>> '{}')) = 0)
    or exists (select 1 from jsonb_array_elements(draft_sections #> '{scope,excludedWork}') item where jsonb_typeof(item) <> 'string' or char_length(trim(item #>> '{}')) = 0)
    or (draft_sections ? 'clientDependencies' and jsonb_typeof(draft_sections #> '{scope,clientDependencies}') <> 'array')
    or (jsonb_typeof(draft_sections #> '{scope,clientDependencies}') = 'array' and exists (select 1 from jsonb_array_elements(draft_sections #> '{scope,clientDependencies}') item where jsonb_typeof(item) <> 'string' or char_length(trim(item #>> '{}')) = 0))
    or coalesce(draft_sections #>> '{scope,projectStartDateUtc}', '') !~ '^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$'
    or (draft_sections #>> '{scope,projectStartDateUtc}')::timestamptz <= now() then
    raise exception 'Service scope needs a title, outcome, included and excluded work, and a future UTC project start date.';
  end if;
  if jsonb_typeof(draft_sections -> 'milestones') <> 'object'
    or jsonb_typeof(draft_sections #> '{milestones,items}') <> 'array'
    or jsonb_array_length(draft_sections #> '{milestones,items}') not between 2 and 3 then
    raise exception 'A Contract needs two or three milestones.';
  end if;
  for milestone in select value from jsonb_array_elements(draft_sections #> '{milestones,items}') loop
    if jsonb_typeof(milestone) <> 'object'
      or char_length(trim(coalesce(milestone ->> 'title', ''))) not between 1 and 160
      or char_length(trim(coalesce(milestone ->> 'deliveryOutcome', ''))) not between 1 and 1000
      or char_length(trim(coalesce(milestone ->> 'evidenceRequirement', ''))) not between 1 and 4000
      or milestone ->> 'evidenceRequirement' ~* '(private key|password|api[ _-]?key|https?://)'
      or coalesce(milestone ->> 'allocation', '') !~ '^[1-9][0-9]*$'
      or coalesce(milestone ->> 'reviewWindowHours', '') not in ('24', '72', '168')
      or coalesce(milestone ->> 'deliveryDeadlineUtc', '') !~ '^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$' then
      raise exception 'Each milestone needs a measurable outcome, positive allocation, private-safe evidence requirement, UTC deadline, and 24, 72, or 168-hour review window.';
    end if;
    deadline := (milestone ->> 'deliveryDeadlineUtc')::timestamptz;
    if deadline <= now() then raise exception 'Each milestone deadline must be in the future.'; end if;
    if previous_deadline is not null and deadline <= previous_deadline then raise exception 'Milestone deadlines must be in order.'; end if;
    previous_deadline := deadline;
    first_deadline := coalesce(first_deadline, deadline);
    allocation_sum := allocation_sum + (milestone ->> 'allocation')::bigint;
  end loop;
  if jsonb_typeof(payment) <> 'object'
    or char_length(trim(coalesce(payment ->> 'settlementToken', ''))) not between 1 and 160
    or payment ->> 'network' <> 'Base Sepolia'
    or coalesce(payment ->> 'totalAllocation', '') !~ '^[1-9][0-9]*$'
    or (payment ->> 'totalAllocation')::bigint <> allocation_sum
    or coalesce(payment ->> 'successFeeBps', '') !~ '^(0|[1-9][0-9]{0,3})$'
    or (payment ->> 'successFeeBps')::integer > 1000
    or payment ->> 'fundingWindowHours' <> '48'
    or coalesce(payment ->> 'fundingDeadlineUtc', '') !~ '^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$'
    or (payment ->> 'fundingDeadlineUtc')::timestamptz <= now()
    or (payment ->> 'fundingDeadlineUtc')::timestamptz >= first_deadline
    or ((payment ->> 'successFeeBps')::integer > 0 and char_length(trim(coalesce(payment ->> 'feeRecipient', ''))) not between 1 and 320)
    or ((payment ->> 'successFeeBps')::integer = 0 and char_length(trim(coalesce(payment ->> 'feeRecipient', ''))) > 320) then
    raise exception 'Payment must use Base Sepolia, conserve allocations, disclose a 0–1,000 bps fee, and have a funding deadline before first delivery.';
  end if;
  if jsonb_typeof(draft_sections -> 'evidence') <> 'object'
    or char_length(trim(coalesce(draft_sections #>> '{evidence,reviewDecision}', ''))) not between 1 and 1000
    or jsonb_typeof(draft_sections #> '{evidence,dependencyAcknowledgementRequired}') <> 'boolean' then
    raise exception 'Evidence and review terms are required.';
  end if;
  if jsonb_typeof(intellectual_property) <> 'object'
    or intellectual_property ->> 'outcome' not in ('client_owns_project_deliverables_on_final_settlement', 'provider_retains_ownership_with_client_license')
    or intellectual_property ->> 'confidentiality' not in ('not_requested', 'mutual_confidentiality')
    or (intellectual_property ->> 'outcome' = 'provider_retains_ownership_with_client_license' and char_length(trim(coalesce(intellectual_property ->> 'licenseScope', ''))) not between 1 and 1000)
    or (intellectual_property ->> 'confidentiality' = 'mutual_confidentiality' and char_length(trim(coalesce(intellectual_property ->> 'confidentialityDuration', ''))) not between 1 and 160) then
    raise exception 'Intellectual-property and confidentiality terms are incomplete.';
  end if;
  if jsonb_typeof(draft_sections -> 'change_control') <> 'object'
    or char_length(trim(coalesce(draft_sections #>> '{change_control,proposalProcess}', ''))) not between 1 and 1000
    or jsonb_typeof(draft_sections #> '{change_control,bilateralAmendmentOnly}') <> 'boolean'
    or draft_sections #>> '{change_control,bilateralAmendmentOnly}' <> 'true' then
    raise exception 'Change control must require a bilateral amendment for future uncompleted milestones.';
  end if;
  if jsonb_typeof(draft_sections -> 'notices') <> 'object'
    or coalesce(draft_sections #>> '{notices,buyerContact}', '') !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
    or coalesce(draft_sections #>> '{notices,serviceProviderContact}', '') !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
    or jsonb_typeof(draft_sections #> '{notices,exactVersionAcknowledgement}') <> 'boolean'
    or draft_sections #>> '{notices,exactVersionAcknowledgement}' <> 'true' then
    raise exception 'Each Contract Party needs a notice address and must acknowledge the exact Version.';
  end if;
end;
$$;

create function public.update_contract_draft(
  target_contract_id uuid,
  draft_sections jsonb,
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
  invitation public.contract_invitations;
begin
  if auth.uid() is null then raise exception 'An authenticated Contract Party is required.'; end if;
  if not exists (
    select 1 from public.contract_parties party
    where party.contract_id = target_contract_id
      and (party.profile_id = auth.uid() or exists (
        select 1 from public.delegated_project_access delegation
        where delegation.contract_party_id = party.id and delegation.profile_id = auth.uid() and delegation.revoked_at is null
      ))
  ) then raise exception 'Only a Contract Party can edit this draft.'; end if;
  if not exists (select 1 from public.contracts where id = target_contract_id and status in ('private_draft', 'negotiation')) then raise exception 'Only an unsigned Contract draft can be edited.'; end if;
  perform public.validate_service_engagement_draft(draft_sections);
  select * into selected_authority from public.resolution_authorities where id = selected_authority_id and status = 'published';
  if selected_authority.id is null then raise exception 'Select a published Resolution Authority.'; end if;
  select * into latest_version from public.contract_versions where contract_id = target_contract_id order by version_number desc limit 1;
  if latest_version.id is null then raise exception 'The Contract has no draft Version.'; end if;

  insert into public.contract_versions (contract_id, version_number, version_hash, selected_authority_id, authority_snapshot, created_by_profile_id)
  values (target_contract_id, latest_version.version_number + 1, md5(target_contract_id::text || now()::text || random()::text), selected_authority.id,
    jsonb_build_object('authority_name', selected_authority.display_name, 'jurisdiction_label', selected_authority.jurisdiction_label, 'ruleset_version', selected_authority.ruleset_version), auth.uid())
  returning id into new_version_id;
  insert into public.contract_sections (contract_version_id, section_type, position, terms) values
    (new_version_id, 'parties', 0, draft_sections -> 'parties'),
    (new_version_id, 'scope', 1, draft_sections -> 'scope'),
    (new_version_id, 'milestones', 2, draft_sections -> 'milestones'),
    (new_version_id, 'payment', 3, jsonb_set(draft_sections -> 'payment', '{paymentAuthority}', '"not_configured"'::jsonb)),
    (new_version_id, 'evidence', 4, draft_sections -> 'evidence'),
    (new_version_id, 'intellectual_property', 5, draft_sections -> 'intellectual_property'),
    (new_version_id, 'change_control', 6, draft_sections -> 'change_control'),
    (new_version_id, 'dispute_resolution', 7, jsonb_build_object('authority_name', selected_authority.display_name, 'jurisdiction_label', selected_authority.jurisdiction_label, 'ruleset_version', selected_authority.ruleset_version)),
    (new_version_id, 'notices', 8, draft_sections -> 'notices');
  update public.contract_versions set acceptance_ready_at = now() where id = new_version_id;
  for invitation in select * from public.contract_invitations where contract_id = target_contract_id and status = 'pending' for update loop
    update public.contract_invitations set status = 'revoked' where id = invitation.id;
    insert into public.contract_invitations (contract_id, contract_version_id, inviter_party_id, invitee_contact_id, invited_email, status, expires_at)
    values (target_contract_id, new_version_id, invitation.inviter_party_id, invitation.invitee_contact_id, invitation.invited_email, 'pending', now() + interval '14 days');
  end loop;
  update public.contracts set updated_at = now() where id = target_contract_id;
  return new_version_id;
end;
$$;

revoke all on function public.validate_service_engagement_draft(jsonb) from public, anon;
revoke all on function public.update_contract_draft(uuid, jsonb, uuid) from public, anon;
grant execute on function public.update_contract_draft(uuid, jsonb, uuid) to authenticated;
