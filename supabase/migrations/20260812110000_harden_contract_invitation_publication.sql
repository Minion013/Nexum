-- A Contract invitation is the only sharing boundary for a private draft.
-- Require a server-validated Version and the exact email persisted in its
-- parties section before changing the Contract out of private_draft.
create or replace function public.create_contract_invitation(target_contract_id uuid, invitee_email text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  contract_row public.contracts;
  inviter_party_id uuid;
  latest_version public.contract_versions;
  latest_parties jsonb;
  invitation_id uuid;
  normalized_email text := lower(trim(invitee_email));
begin
  if auth.uid() is null or not public.has_contract_access(target_contract_id) then
    raise exception 'Only a Contract Party can invite a counterparty.';
  end if;
  if normalized_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then
    raise exception 'A valid counterparty email is required.';
  end if;

  select * into contract_row from public.contracts where id = target_contract_id for update;
  if contract_row.id is null or contract_row.status not in ('private_draft', 'negotiation') then
    raise exception 'Only an unsigned Contract draft can be published.';
  end if;
  select id into inviter_party_id from public.contract_parties where contract_id = target_contract_id and profile_id = auth.uid();
  if inviter_party_id is null then
    raise exception 'Only an individual Contract Party can invite a counterparty.';
  end if;
  select * into latest_version from public.contract_versions where contract_id = target_contract_id order by version_number desc limit 1;
  if latest_version.id is null or latest_version.acceptance_ready_at is null then
    raise exception 'Complete and save the Contract terms before sending an invitation.';
  end if;
  select terms into latest_parties from public.contract_sections where contract_version_id = latest_version.id and section_type = 'parties';
  if coalesce(lower(trim(latest_parties ->> 'counterparty_email')), '') <> normalized_email then
    raise exception 'The invitation email must match the saved counterparty email.';
  end if;

  insert into public.contract_invitations (contract_id, contract_version_id, inviter_party_id, invited_email, status, expires_at)
  values (target_contract_id, latest_version.id, inviter_party_id, normalized_email, 'pending', now() + interval '14 days')
  returning id into invitation_id;
  update public.contracts set status = 'negotiation', updated_at = now() where id = target_contract_id;
  return invitation_id;
end;
$$;

revoke all on function public.create_contract_invitation(uuid, text) from public, anon;
grant execute on function public.create_contract_invitation(uuid, text) to authenticated;
