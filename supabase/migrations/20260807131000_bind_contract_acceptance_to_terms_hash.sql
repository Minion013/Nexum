alter table public.contract_sections
  drop constraint contract_sections_section_type_check,
  add constraint contract_sections_section_type_check check (section_type in ('parties', 'scope', 'milestones', 'payment', 'intellectual_property', 'evidence', 'change_control', 'dispute_resolution', 'notices'));

create function public.contract_version_terms_hash(target_version_id uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select md5(jsonb_build_object(
    'authority_snapshot', version.authority_snapshot,
    'selected_authority_id', version.selected_authority_id,
    'sections', coalesce((
      select jsonb_agg(jsonb_build_object('section_type', section.section_type, 'position', section.position, 'terms', section.terms) order by section.position)
      from public.contract_sections section
      where section.contract_version_id = version.id
    ), '[]'::jsonb)
  )::text)
  from public.contract_versions version
  where version.id = target_version_id;
$$;

create function public.refresh_contract_version_terms_hash()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.contract_versions
  set version_hash = public.contract_version_terms_hash(coalesce(new.contract_version_id, old.contract_version_id))
  where id = coalesce(new.contract_version_id, old.contract_version_id);
  return coalesce(new, old);
end;
$$;

create trigger refresh_contract_version_terms_hash_after_section_change
after insert or update or delete on public.contract_sections
for each row execute procedure public.refresh_contract_version_terms_hash();

create function public.carry_forward_noneditable_contract_sections()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.contract_sections (contract_version_id, section_type, position, terms)
  select new.id, section.section_type, section.position, section.terms
  from public.contract_versions previous_version
  join public.contract_sections section on section.contract_version_id = previous_version.id
  where previous_version.contract_id = new.contract_id
    and previous_version.version_number = new.version_number - 1
    and section.section_type in ('evidence', 'intellectual_property', 'dispute_resolution', 'notices');
  return new;
end;
$$;

create trigger carry_forward_noneditable_contract_sections_after_version_create
after insert on public.contract_versions
for each row execute procedure public.carry_forward_noneditable_contract_sections();

update public.contract_versions
set version_hash = public.contract_version_terms_hash(id);

alter table public.contract_acceptances add column accepted_version_hash text;
update public.contract_acceptances acceptance
set accepted_version_hash = version.version_hash
from public.contract_versions version
where version.id = acceptance.contract_version_id;
alter table public.contract_acceptances alter column accepted_version_hash set not null;

create or replace function public.accept_contract_version(target_contract_id uuid, target_version_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  acting_party_id uuid;
  latest_version public.contract_versions;
  acceptance_id uuid;
begin
  if auth.uid() is null then raise exception 'An authenticated Contract Party is required.'; end if;
  select party.id into acting_party_id
  from public.contract_parties party
  where party.contract_id = target_contract_id
    and (party.profile_id = auth.uid() or exists (
      select 1 from public.delegated_project_access delegation
      where delegation.contract_party_id = party.id and delegation.profile_id = auth.uid() and delegation.revoked_at is null
    ))
  limit 1;
  if acting_party_id is null then raise exception 'Only a Contract Party can accept this Version.'; end if;
  if (select count(*) from public.contract_parties where contract_id = target_contract_id) <> 2 then
    raise exception 'This Contract needs exactly two Contract Parties before Version acceptance.';
  end if;
  select * into latest_version from public.contract_versions where contract_id = target_contract_id order by version_number desc limit 1;
  if latest_version.id is distinct from target_version_id then raise exception 'Only the latest immutable Contract Version can be accepted.'; end if;
  if latest_version.version_hash <> public.contract_version_terms_hash(target_version_id) then
    raise exception 'This Contract Version hash does not match its immutable terms.';
  end if;
  if (select count(distinct section_type) from public.contract_sections where contract_version_id = target_version_id and section_type in ('parties', 'scope', 'milestones', 'payment', 'evidence', 'intellectual_property', 'change_control', 'dispute_resolution', 'notices')) <> 9 then
    raise exception 'This Contract Version is incomplete and cannot be accepted.';
  end if;
  select id into acceptance_id from public.contract_acceptances where contract_version_id = target_version_id and contract_party_id = acting_party_id;
  if acceptance_id is null then
    insert into public.contract_acceptances (contract_version_id, contract_party_id, acting_profile_id, accepted_version_hash)
    values (target_version_id, acting_party_id, auth.uid(), latest_version.version_hash)
    returning id into acceptance_id;
  end if;
  return acceptance_id;
end;
$$;

revoke all on function public.contract_version_terms_hash(uuid) from public, anon;
revoke all on function public.accept_contract_version(uuid, uuid) from public, anon;
grant execute on function public.accept_contract_version(uuid, uuid) to authenticated;
