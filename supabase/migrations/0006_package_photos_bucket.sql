-- Bucket public pour les photos de colis + politiques RLS Storage

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'package-photos',
  'package-photos',
  true,
  5242880,
  array['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Lecture publique
drop policy if exists "package_photos_public_read" on storage.objects;
create policy "package_photos_public_read"
  on storage.objects for select
  to public
  using (bucket_id = 'package-photos');

-- Upload authentifié dans son propre dossier userId/...
drop policy if exists "package_photos_auth_insert" on storage.objects;
create policy "package_photos_auth_insert"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'package-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Mise à jour / suppression de ses propres fichiers
drop policy if exists "package_photos_auth_update" on storage.objects;
create policy "package_photos_auth_update"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'package-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "package_photos_auth_delete" on storage.objects;
create policy "package_photos_auth_delete"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'package-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
