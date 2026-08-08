create table public.profile_notifications (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  event_key text not null check (char_length(trim(event_key)) between 1 and 240),
  category text not null check (category in ('invitation', 'approval', 'contract_activity', 'connection')),
  title text not null check (char_length(trim(title)) between 1 and 180),
  body text not null check (char_length(trim(body)) between 1 and 600),
  href text not null check (href ~ '^/[A-Za-z0-9_/?=&.-]*$'),
  created_at timestamptz not null default now(),
  read_at timestamptz,
  unique (profile_id, event_key)
);

create index profile_notifications_inbox_order
  on public.profile_notifications (profile_id, read_at, created_at desc);

alter table public.profile_notifications enable row level security;

create policy "Profiles can read only their own notifications"
  on public.profile_notifications for select
  using (profile_id = (select auth.uid()));

create function public.create_profile_notification(
  recipient_profile_id uuid,
  notification_event_key text,
  notification_category text,
  notification_title text,
  notification_body text,
  notification_href text
)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.profile_notifications (profile_id, event_key, category, title, body, href)
  values (recipient_profile_id, notification_event_key, notification_category, notification_title, notification_body, notification_href)
  on conflict (profile_id, event_key) do nothing;
$$;

create function public.notify_exact_email_contract_invitee()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.invited_email is not null then
    perform public.create_profile_notification(
      profile.id,
      'contract-invitation:' || new.id::text,
      'invitation',
      'Private Contract invitation',
      'You have a private Contract invitation to review.',
      '/invitations/' || new.id::text
    )
    from public.profiles profile
    where lower(profile.email) = lower(new.invited_email);
  end if;
  return new;
end;
$$;

create trigger notify_exact_email_contract_invitee
  after insert on public.contract_invitations
  for each row execute procedure public.notify_exact_email_contract_invitee();

create function public.notify_contract_invitation_accepted()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status = 'accepted' and old.status is distinct from 'accepted' then
    perform public.create_profile_notification(
      party.profile_id,
      'contract-invitation-accepted:' || new.id::text,
      'contract_activity',
      'Contract invitation accepted',
      'A counterparty accepted a private Contract invitation.',
      '/contracts/' || new.contract_id::text
    )
    from public.contract_parties party
    where party.id = new.inviter_party_id
      and party.profile_id is not null
      and party.profile_id <> new.accepted_by_profile_id;
  end if;
  return new;
end;
$$;

create trigger notify_contract_invitation_accepted
  after update of status on public.contract_invitations
  for each row execute procedure public.notify_contract_invitation_accepted();

create function public.notify_contract_version_ready_for_review()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.acceptance_ready_at is not null and old.acceptance_ready_at is null then
    perform public.create_profile_notification(
      party.profile_id,
      'contract-version-ready:' || new.id::text,
      'approval',
      'Contract Version ready for review',
      'A Contract Version is ready for your wallet-backed review and acceptance.',
      '/contracts/' || new.contract_id::text
    )
    from public.contract_parties party
    where party.contract_id = new.contract_id
      and party.profile_id is not null;
  end if;
  return new;
end;
$$;

create trigger notify_contract_version_ready_for_review
  after update of acceptance_ready_at on public.contract_versions
  for each row execute procedure public.notify_contract_version_ready_for_review();

create function public.notify_contract_acceptance()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_contract_id uuid;
begin
  select version.contract_id into target_contract_id
  from public.contract_versions version
  where version.id = new.contract_version_id;

  perform public.create_profile_notification(
    party.profile_id,
    'contract-acceptance:' || new.contract_version_id::text || ':' || new.contract_party_id::text,
    'approval',
    'Counterparty accepted a Contract Version',
    'A counterparty recorded wallet-backed acceptance for the current Contract Version.',
    '/contracts/' || target_contract_id::text
  )
  from public.contract_parties party
  where party.contract_id = target_contract_id
    and party.profile_id is not null
    and party.profile_id <> new.acting_profile_id;
  return new;
end;
$$;

create trigger notify_contract_acceptance
  after insert on public.contract_acceptances
  for each row execute procedure public.notify_contract_acceptance();

create function public.list_my_notifications()
returns table (id uuid, category text, title text, body text, href text, created_at timestamptz, read_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select notification.id, notification.category, notification.title, notification.body, notification.href, notification.created_at, notification.read_at
  from public.profile_notifications notification
  where notification.profile_id = auth.uid()
  order by notification.read_at nulls first, notification.created_at desc
  limit 100;
$$;

create function public.mark_my_notification_read(target_notification_id uuid)
returns table (id uuid, read_at timestamptz)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then raise exception 'An authenticated Profile is required.'; end if;
  return query
    update public.profile_notifications notification
    set read_at = coalesce(notification.read_at, now())
    where notification.id = target_notification_id
      and notification.profile_id = auth.uid()
    returning notification.id, notification.read_at;
end;
$$;

revoke all on table public.profile_notifications from public, anon, authenticated;
revoke all on function public.create_profile_notification(uuid, text, text, text, text, text) from public, anon, authenticated;
revoke all on function public.list_my_notifications() from public, anon;
revoke all on function public.mark_my_notification_read(uuid) from public, anon;
grant select on table public.profile_notifications to authenticated;
grant execute on function public.list_my_notifications() to authenticated;
grant execute on function public.mark_my_notification_read(uuid) to authenticated;
