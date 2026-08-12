create function public.get_contract_invitation_acceptance_state(target_invitation_id uuid)
returns table (state text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  invitation public.contract_invitations;
  profile_email text;
begin
  if auth.uid() is null then
    raise exception 'An authenticated Profile is required.';
  end if;

  select email into profile_email from public.profiles where id = auth.uid();
  select * into invitation
  from public.contract_invitations
  where id = target_invitation_id
    and lower(invited_email) = lower(profile_email);

  if invitation.id is null then
    raise exception 'This invitation is invalid or addressed to another Profile.';
  end if;

  return query select case
    when invitation.status = 'pending' and invitation.expires_at <= now() then 'expired'
    when invitation.status = 'pending' then 'eligible'
    else 'resolved'
  end;
end;
$$;

revoke all on function public.get_contract_invitation_acceptance_state(uuid) from public, anon;
grant execute on function public.get_contract_invitation_acceptance_state(uuid) to authenticated;
