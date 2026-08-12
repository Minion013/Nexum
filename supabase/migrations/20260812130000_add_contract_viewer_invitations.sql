-- View-only access is separate from the two Contract Parties who accept terms.
alter table public.contract_invitations
  add column if not exists access_kind text not null default 'counterparty'
  check (access_kind in ('counterparty', 'viewer'));

create or replace function public.create_contract_viewer_invitation(target_contract_id uuid, invitee_email text)
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
  if auth.uid() is null or not public.has_contract_access(target_contract_id) then
    raise exception 'Only a Contract Party can invite a viewer.';
  end if;
  if normalized_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then
    raise exception 'A valid viewer email is required.';
  end if;
  select id into inviter_party_id
  from public.contract_parties
  where contract_id = target_contract_id and profile_id = auth.uid();
  if inviter_party_id is null then
    raise exception 'Only an individual Contract Party can invite a viewer.';
  end if;
  select id into latest_version_id
  from public.contract_versions
  where contract_id = target_contract_id
  order by version_number desc limit 1;
  if latest_version_id is null then raise exception 'The Contract has no version to share.'; end if;

  insert into public.contract_invitations (contract_id, contract_version_id, inviter_party_id, invited_email, status, expires_at, access_kind)
  values (target_contract_id, latest_version_id, inviter_party_id, normalized_email, 'pending', now() + interval '14 days', 'viewer')
  returning id into invitation_id;
  return invitation_id;
end;
$$;

create or replace function public.accept_contract_invitation(target_invitation_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  invitation public.contract_invitations;
  profile_email text;
  inviter_profile_id uuid;
begin
  if auth.uid() is null then raise exception 'An authenticated Profile is required.'; end if;
  select * into invitation from public.contract_invitations where id = target_invitation_id for update;
  select email into profile_email from public.profiles where id = auth.uid();
  if invitation.id is null or invitation.status <> 'pending' or invitation.expires_at <= now()
    or lower(invitation.invited_email) <> lower(profile_email) then
    raise exception 'This invitation is invalid, expired, or addressed to another Profile.';
  end if;

  if invitation.access_kind = 'viewer' then
    select profile_id into inviter_profile_id from public.contract_parties where id = invitation.inviter_party_id;
    insert into public.delegated_project_access (contract_party_id, profile_id, granted_by_profile_id)
    values (invitation.inviter_party_id, auth.uid(), inviter_profile_id)
    on conflict (contract_party_id, profile_id) do update set revoked_at = null, granted_at = now(), granted_by_profile_id = excluded.granted_by_profile_id;
  else
    insert into public.contract_parties (contract_id, party_kind, profile_id)
    values (invitation.contract_id, 'profile', auth.uid()) on conflict (contract_id, profile_id) do nothing;
  end if;

  update public.contract_invitations set status = 'accepted', accepted_by_profile_id = auth.uid(), accepted_at = now() where id = invitation.id;
  update public.contracts set status = 'negotiation', updated_at = now() where id = invitation.contract_id;
  return invitation.id;
end;
$$;

revoke all on function public.create_contract_viewer_invitation(uuid, text) from public, anon;
grant execute on function public.create_contract_viewer_invitation(uuid, text) to authenticated;
