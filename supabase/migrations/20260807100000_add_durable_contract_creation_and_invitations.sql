create function public.create_private_contract(contract_name text, contract_scope text, counterparty_email text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_contract_id uuid;
  creator_party_id uuid;
  authority_id uuid;
  version_id uuid;
  normalized_email text := lower(trim(counterparty_email));
begin
  if auth.uid() is null then raise exception 'An authenticated Profile is required.'; end if;
  if char_length(trim(contract_name)) not between 1 and 160 then raise exception 'Contract name is required.'; end if;
  if char_length(trim(contract_scope)) not between 1 and 4000 then raise exception 'Contract scope is required.'; end if;
  if normalized_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then raise exception 'A valid counterparty email is required.'; end if;

  select id into authority_id from public.resolution_authorities where slug = 'pactflow-simulation' and status = 'published';
  if authority_id is null then raise exception 'No published Resolution Authority is available.'; end if;

  insert into public.contracts (created_by_profile_id, status) values (auth.uid(), 'private_draft') returning id into new_contract_id;
  insert into public.contract_parties (contract_id, party_kind, profile_id) values (new_contract_id, 'profile', auth.uid()) returning id into creator_party_id;
  insert into public.contacts (owner_profile_id, display_name, email)
  values (auth.uid(), normalized_email, normalized_email) on conflict (owner_profile_id, email) do nothing;
  insert into public.contract_versions (contract_id, version_number, version_hash, selected_authority_id, authority_snapshot, created_by_profile_id)
  select new_contract_id, 1, md5(new_contract_id::text || now()::text), authority_id,
    jsonb_build_object('authority_name', display_name, 'jurisdiction_label', jurisdiction_label, 'ruleset_version', ruleset_version), auth.uid()
  from public.resolution_authorities where id = authority_id returning id into version_id;
  insert into public.contract_sections (contract_version_id, section_type, position, terms) values
    (version_id, 'scope', 0, jsonb_build_object('title', trim(contract_name), 'description', trim(contract_scope))),
    (version_id, 'parties', 1, jsonb_build_object('proposer_profile_id', auth.uid(), 'counterparty_email', normalized_email)),
    (version_id, 'change_control', 2, jsonb_build_object('rule', 'Future uncompleted work changes only through bilateral amendment.'));
  return new_contract_id;
end;
$$;

create function public.create_contract_invitation(target_contract_id uuid, invitee_email text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  inviter_party_id uuid;
  latest_version_id uuid;
  invitation_id uuid;
  normalized_email text := lower(trim(invitee_email));
begin
  if auth.uid() is null or not public.has_contract_access(target_contract_id) then raise exception 'Only a Contract Party can invite a counterparty.'; end if;
  if normalized_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then raise exception 'A valid counterparty email is required.'; end if;
  select id into inviter_party_id from public.contract_parties where contract_id = target_contract_id and profile_id = auth.uid();
  if inviter_party_id is null then raise exception 'Only an individual Contract Party can invite a counterparty.'; end if;
  select id into latest_version_id from public.contract_versions where contract_id = target_contract_id order by version_number desc limit 1;
  if latest_version_id is null then raise exception 'The Contract has no version to share.'; end if;
  insert into public.contract_invitations (contract_id, contract_version_id, inviter_party_id, invited_email, status, expires_at)
  values (target_contract_id, latest_version_id, inviter_party_id, normalized_email, 'pending', now() + interval '14 days') returning id into invitation_id;
  update public.contracts set status = 'negotiation', updated_at = now() where id = target_contract_id;
  return invitation_id;
end;
$$;

create function public.accept_contract_invitation(target_invitation_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  invitation public.contract_invitations;
  profile_email text;
begin
  if auth.uid() is null then raise exception 'An authenticated Profile is required.'; end if;
  select * into invitation from public.contract_invitations where id = target_invitation_id for update;
  select email into profile_email from public.profiles where id = auth.uid();
  if invitation.id is null or invitation.status <> 'pending' or invitation.expires_at <= now()
    or lower(invitation.invited_email) <> lower(profile_email) then raise exception 'This invitation is invalid, expired, or addressed to another Profile.'; end if;
  insert into public.contract_parties (contract_id, party_kind, profile_id) values (invitation.contract_id, 'profile', auth.uid()) on conflict (contract_id, profile_id) do nothing;
  update public.contract_invitations set status = 'accepted', accepted_by_profile_id = auth.uid(), accepted_at = now() where id = invitation.id;
  update public.contracts set status = 'negotiation', updated_at = now() where id = invitation.contract_id;
  return invitation.id;
end;
$$;

revoke all on function public.create_private_contract(text, text, text) from public, anon;
revoke all on function public.create_contract_invitation(uuid, text) from public, anon;
revoke all on function public.accept_contract_invitation(uuid) from public, anon;
grant execute on function public.create_private_contract(text, text, text) to authenticated;
grant execute on function public.create_contract_invitation(uuid, text) to authenticated;
grant execute on function public.accept_contract_invitation(uuid) to authenticated;
