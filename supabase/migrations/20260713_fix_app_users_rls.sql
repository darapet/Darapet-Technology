-- app_users only had a single RLS policy ("select own row"). With no INSERT
-- policy, new signups could never actually create their app_users row from
-- the client (registration's upsert was silently rejected by RLS), and with
-- no admin-wide SELECT/UPDATE/DELETE policy, the admin dashboard could only
-- ever see/manage its own row -- never any other user's, new or old.
--
-- Fix: let users insert/update their own row, and let the admin (matched by
-- email, mirroring the client-side ADMIN_EMAIL check) select/update/delete
-- any row.

create policy "app_users_insert_own" on public.app_users
  for insert to authenticated
  with check (auth_user_id = auth.uid());

create policy "app_users_update_own" on public.app_users
  for update to authenticated
  using (auth_user_id = auth.uid())
  with check (auth_user_id = auth.uid());

create policy "app_users_select_admin" on public.app_users
  for select to authenticated
  using (lower((auth.jwt() ->> 'email')) = lower('Daramolapeter98@gmail.com'));

create policy "app_users_update_admin" on public.app_users
  for update to authenticated
  using (lower((auth.jwt() ->> 'email')) = lower('Daramolapeter98@gmail.com'))
  with check (lower((auth.jwt() ->> 'email')) = lower('Daramolapeter98@gmail.com'));

create policy "app_users_delete_admin" on public.app_users
  for delete to authenticated
  using (lower((auth.jwt() ->> 'email')) = lower('Daramolapeter98@gmail.com'));
