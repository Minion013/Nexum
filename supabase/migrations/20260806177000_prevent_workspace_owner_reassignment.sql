create function public.prevent_workspace_owner_reassignment()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.owner_profile_id <> old.owner_profile_id then
    raise exception 'Workspace ownership is immutable; use an explicit ownership-transfer flow.';
  end if;
  return new;
end;
$$;

create trigger prevent_workspace_owner_reassignment
  before update on public.workspaces
  for each row execute procedure public.prevent_workspace_owner_reassignment();
