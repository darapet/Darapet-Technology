-- Preserve every imported source file and its metadata, even when the file
-- contains no email address or no text that can be extracted in the browser.
alter table public.scout_leads
  add column if not exists source_file_path text,
  add column if not exists source_file_type text,
  add column if not exists source_file_size bigint;

insert into storage.buckets (id, name, public)
values ('scouting-imports', 'scouting-imports', false)
on conflict (id) do nothing;

drop policy if exists "scouting_imports_upload_own" on storage.objects;
create policy "scouting_imports_upload_own"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'scouting-imports'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "scouting_imports_read_own" on storage.objects;
create policy "scouting_imports_read_own"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'scouting-imports'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "scouting_imports_update_own" on storage.objects;
create policy "scouting_imports_update_own"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'scouting-imports'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'scouting-imports'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "scouting_imports_delete_own" on storage.objects;
create policy "scouting_imports_delete_own"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'scouting-imports'
    and (storage.foldername(name))[1] = auth.uid()::text
  );