-- Make admin authorization revocable and database-backed.
--
-- The previous policies compared auth.jwt()->>'email' to a hard-coded
-- address. That made the client and database depend on the same immutable
-- email string. The existing owner account is bootstrapped once below; from
-- then on, toggling profiles.is_admin controls access.

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and is_admin is true
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

-- Bootstrap the current owner account without storing a password or relying
-- on the frontend to grant privileges.
update public.profiles as p
set is_admin = true
where lower(coalesce(p.email, '')) = lower('Daramolapeter98@gmail.com')
   or exists (
     select 1
     from auth.users as u
     where u.id = p.id
       and lower(coalesce(u.email, '')) = lower('Daramolapeter98@gmail.com')
   );

drop policy if exists "app_users_select_admin" on public.app_users;
create policy "app_users_select_admin"
  on public.app_users for select
  to authenticated
  using (public.is_admin());

drop policy if exists "app_users_update_admin" on public.app_users;
create policy "app_users_update_admin"
  on public.app_users for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "app_users_delete_admin" on public.app_users;
create policy "app_users_delete_admin"
  on public.app_users for delete
  to authenticated
  using (public.is_admin());

drop policy if exists "settings_admin_insert" on public.settings;
create policy "settings_admin_insert"
  on public.settings for insert
  to authenticated
  with check (public.is_admin());

drop policy if exists "settings_admin_update" on public.settings;
create policy "settings_admin_update"
  on public.settings for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "app_settings_admin_insert" on public.app_settings;
create policy "app_settings_admin_insert"
  on public.app_settings for insert
  to authenticated
  with check (public.is_admin());

drop policy if exists "app_settings_admin_update" on public.app_settings;
create policy "app_settings_admin_update"
  on public.app_settings for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());