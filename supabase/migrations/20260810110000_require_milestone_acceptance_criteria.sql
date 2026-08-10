create or replace function public.validate_service_engagement_draft_extra(draft_sections jsonb)
returns void
language plpgsql
set search_path = ''
as $$
declare
  milestone jsonb;
begin
  if exists (select 1 from jsonb_array_elements(draft_sections #> '{scope,includedDeliverables}') item where jsonb_typeof(item) <> 'string' or char_length(trim(item #>> '{}')) = 0)
    or exists (select 1 from jsonb_array_elements(draft_sections #> '{scope,excludedWork}') item where jsonb_typeof(item) <> 'string' or char_length(trim(item #>> '{}')) = 0)
    or (jsonb_typeof(draft_sections #> '{scope,clientDependencies}') = 'array' and exists (select 1 from jsonb_array_elements(draft_sections #> '{scope,clientDependencies}') item where jsonb_typeof(item) <> 'string' or char_length(trim(item #>> '{}')) = 0)) then
    raise exception 'Scope lists must contain meaningful text items.';
  end if;
  if coalesce(draft_sections #>> '{payment,fundingWindowHours}', '48') <> '48' then raise exception 'The funding window must be 48 hours after the second Contract Acceptance.'; end if;
  if jsonb_typeof(draft_sections #> '{evidence,dependencyAcknowledgementRequired}') <> 'boolean'
    or jsonb_typeof(draft_sections #> '{change_control,bilateralAmendmentOnly}') <> 'boolean'
    or jsonb_typeof(draft_sections #> '{notices,exactVersionAcknowledgement}') <> 'boolean' then
    raise exception 'Service Engagement acknowledgement fields must be boolean.';
  end if;
  for milestone in select value from jsonb_array_elements(draft_sections #> '{milestones,items}') loop
    if jsonb_typeof(milestone -> 'acceptanceCriteria') <> 'array'
      or jsonb_array_length(milestone -> 'acceptanceCriteria') = 0
      or exists (select 1 from jsonb_array_elements(milestone -> 'acceptanceCriteria') criterion where jsonb_typeof(criterion) <> 'object' or char_length(trim(coalesce(criterion ->> 'description', ''))) not between 1 and 500 or jsonb_typeof(criterion -> 'required') <> 'boolean')
      or not exists (select 1 from jsonb_array_elements(milestone -> 'acceptanceCriteria') criterion where criterion ->> 'required' = 'true') then
      raise exception 'Each milestone needs at least one required Acceptance Criterion.';
    end if;
  end loop;
end;
$$;

revoke all on function public.validate_service_engagement_draft_extra(jsonb) from public, anon;
