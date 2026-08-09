alter table public.profiles
  add column if not exists bio text,
  add column if not exists avatar_seed text not null default 'indigo',
  add column if not exists avatar_path text;

alter table public.profiles
  add constraint profiles_bio_length
  check (bio is null or char_length(trim(bio)) between 1 and 1_000),
  add constraint profiles_avatar_seed
  check (avatar_seed in ('indigo', 'teal', 'amber', 'rose', 'slate', 'violet'));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('profile-images', 'profile-images', false, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

create policy "Profiles manage their own private images"
  on storage.objects for all to authenticated
  using (
    bucket_id = 'profile-images'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  )
  with check (
    bucket_id = 'profile-images'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );
