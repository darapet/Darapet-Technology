-- AdminSettings.tsx upserts directly into `settings` and `app_settings` as the
-- logged-in admin user (there is no service-role backend for this app -- the
-- client determines admin-ness purely by comparing auth.email() to a hardcoded
-- ADMIN_EMAIL constant in src/lib/supabase.ts, there is no is_admin/role column
-- tied to auth.uid()). RLS had no insert/update policy on either table at all,
-- so every save was rejected with "new row violates row-level security policy".
--
-- Mirrors the app's own admin check: only the account whose auth email matches
-- ADMIN_EMAIL may write to these singleton settings rows.

drop policy if exists "settings_admin_insert" on public.settings;
create policy "settings_admin_insert"
  on public.settings for insert
  to authenticated
  with check (lower((auth.jwt() ->> 'email')) = lower('Daramolapeter98@gmail.com'));

drop policy if exists "settings_admin_update" on public.settings;
create policy "settings_admin_update"
  on public.settings for update
  to authenticated
  using (lower((auth.jwt() ->> 'email')) = lower('Daramolapeter98@gmail.com'))
  with check (lower((auth.jwt() ->> 'email')) = lower('Daramolapeter98@gmail.com'));

drop policy if exists "app_settings_select_authenticated" on public.app_settings;
create policy "app_settings_select_authenticated"
  on public.app_settings for select
  to authenticated
  using (true);

drop policy if exists "app_settings_admin_insert" on public.app_settings;
create policy "app_settings_admin_insert"
  on public.app_settings for insert
  to authenticated
  with check (lower((auth.jwt() ->> 'email')) = lower('Daramolapeter98@gmail.com'));

drop policy if exists "app_settings_admin_update" on public.app_settings;
create policy "app_settings_admin_update"
  on public.app_settings for update
  to authenticated
  using (lower((auth.jwt() ->> 'email')) = lower('Daramolapeter98@gmail.com'))
  with check (lower((auth.jwt() ->> 'email')) = lower('Daramolapeter98@gmail.com'));
