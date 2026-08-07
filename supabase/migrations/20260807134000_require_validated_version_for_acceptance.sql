alter table public.contract_versions add column acceptance_ready_at timestamptz;

create or replace function public.is_complete_contract_version(target_version_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select version.acceptance_ready_at is not null
    and (select count(distinct section_type) = 9 from public.contract_sections where contract_version_id = version.id and section_type in ('parties', 'scope', 'milestones', 'payment', 'evidence', 'intellectual_property', 'change_control', 'dispute_resolution', 'notices'))
  from public.contract_versions version
  where version.id = target_version_id;
$$;
