create or replace function public.list_my_notifications()
returns table (id uuid, category text, title text, body text, href text, created_at timestamptz, read_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select notification.id, notification.category, notification.title, notification.body, notification.href, notification.created_at, notification.read_at
  from public.profile_notifications notification
  where notification.profile_id = auth.uid()
  order by notification.created_at desc
  limit 100;
$$;
