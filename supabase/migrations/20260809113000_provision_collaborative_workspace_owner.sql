create function public.provision_collaborative_workspace_owner()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.kind = 'collaborative' then
    insert into public.workspace_memberships (workspace_id, profile_id, membership_role)
    values (new.id, new.owner_profile_id, 'owner')
    on conflict do nothing;
  end if;

  return new;
end;
$$;

create trigger on_collaborative_workspace_created
  after insert on public.workspaces
  for each row execute procedure public.provision_collaborative_workspace_owner();
