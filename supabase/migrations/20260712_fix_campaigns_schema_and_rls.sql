-- The `campaigns` table only had columns for an old, unused lead-scraping
-- feature (name, niche, channels, countries, states, total_leads, scraped_at).
-- The current email-campaign UI (New Campaign, Campaign History, Dashboard)
-- reads/writes subject, body, recipients, sent_count and scheduled_at, which
-- never existed -- every insert/select against those columns failed with a
-- 400 from PostgREST, so campaigns were never actually being recorded.
alter table public.campaigns
  add column if not exists subject text,
  add column if not exists body text,
  add column if not exists recipients jsonb,
  add column if not exists sent_count integer default 0,
  add column if not exists scheduled_at timestamptz;

-- RLS: authenticated users could not read their own app_users row (no
-- policy matched auth_user_id = auth.uid()), which caused a 406 on every
-- page load since AuthContext queries app_users with .single().
drop policy if exists "app_users_select_own" on public.app_users;
create policy "app_users_select_own"
  on public.app_users for select
  to authenticated
  using (auth_user_id = auth.uid());

-- RLS: the global `settings` row (holds the admin's default Groq key, etc.)
-- was not readable by regular authenticated users, causing a 406 whenever
-- the app tried to fall back to the admin's Groq key.
drop policy if exists "settings_select_authenticated" on public.settings;
create policy "settings_select_authenticated"
  on public.settings for select
  to authenticated
  using (true);

-- Make sure users can read/write their own campaigns (belt-and-suspenders --
-- if these policies already exist this is a harmless no-op).
drop policy if exists "campaigns_select_own" on public.campaigns;
create policy "campaigns_select_own"
  on public.campaigns for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists "campaigns_insert_own" on public.campaigns;
create policy "campaigns_insert_own"
  on public.campaigns for insert
  to authenticated
  with check (user_id = auth.uid());

drop policy if exists "campaigns_update_own" on public.campaigns;
create policy "campaigns_update_own"
  on public.campaigns for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
