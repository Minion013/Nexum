create function public.refresh_contract_version_terms_hash_when_ready()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.acceptance_ready_at is null and new.acceptance_ready_at is not null then
    update public.contract_versions
    set version_hash = public.contract_version_terms_hash(new.id)
    where id = new.id;
  end if;
  return new;
end;
$$;

create trigger refresh_contract_version_terms_hash_after_readiness_change
after update of acceptance_ready_at on public.contract_versions
for each row execute procedure public.refresh_contract_version_terms_hash_when_ready();
