create or replace function public.refresh_contract_version_terms_hash()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_version_id uuid := coalesce(new.contract_version_id, old.contract_version_id);
begin
  if (select count(distinct section_type) from public.contract_sections where contract_version_id = target_version_id and section_type in ('parties', 'scope', 'milestones', 'payment', 'evidence', 'intellectual_property', 'change_control', 'dispute_resolution', 'notices')) = 9 then
    update public.contract_versions
    set version_hash = public.contract_version_terms_hash(target_version_id)
    where id = target_version_id;
  end if;
  return coalesce(new, old);
end;
$$;
