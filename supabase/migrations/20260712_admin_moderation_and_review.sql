-- Adds time-based ban/suspend/restrict support and a proper review-request
-- workflow (submit -> pending -> admin accept/reject) on top of the existing
-- `review_request` JSON column, which previously only stored the admin's form
-- definition with no queryable status.

-- `scheduled_sends` was created ad hoc in the Supabase dashboard and never
-- gained a `recipients` column, even though the app has always tried to
-- read/write one when scheduling a campaign — this silently broke scheduled
-- campaign history (rows either failed to insert or showed 0 recipients).
alter table public.scheduled_sends
  add column if not exists recipients jsonb;

alter table public.app_users
  add column if not exists restriction_expires_at timestamptz,
  add column if not exists review_status text not null default 'none',
  add column if not exists review_rejection_note text;

alter table public.app_users
  drop constraint if exists app_users_review_status_check;
alter table public.app_users
  add constraint app_users_review_status_check check (review_status in ('none', 'pending', 'rejected'));

-- Storage bucket used for review-request attachments (documents, pictures, camera captures).
insert into storage.buckets (id, name, public)
values ('documents', 'documents', true)
on conflict (id) do nothing;

drop policy if exists "documents_authenticated_upload" on storage.objects;
create policy "documents_authenticated_upload"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'documents');

drop policy if exists "documents_authenticated_update" on storage.objects;
create policy "documents_authenticated_update"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'documents');

drop policy if exists "documents_public_read" on storage.objects;
create policy "documents_public_read"
  on storage.objects for select
  to public
  using (bucket_id = 'documents');
