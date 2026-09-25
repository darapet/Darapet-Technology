-- Scouting workspace: imported leads, browser-assisted research, and reviewed drafts.
-- This stays in the user's Supabase project; the GitHub Pages app remains static.
create table if not exists public.scout_leads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  business_name text not null default '',
  app_name text not null default '',
  owner_name text not null default '',
  email text not null default '',
  website text not null default '',
  source_url text not null default '',
  source_notes text not null default '',
  research_status text not null default 'pending',
  research_summary text not null default '',
  pain_points jsonb not null default '[]'::jsonb,
  personalization_status text not null default 'draft',
  email_subject text not null default '',
  email_body text not null default '',
  opted_out boolean not null default false,
  send_status text not null default 'not_sent',
  sent_at timestamptz,
  source_file_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.scout_leads enable row level security;

drop policy if exists "scout_leads_select_own" on public.scout_leads;
create policy "scout_leads_select_own" on public.scout_leads
  for select to authenticated using (user_id = auth.uid());

drop policy if exists "scout_leads_insert_own" on public.scout_leads;
create policy "scout_leads_insert_own" on public.scout_leads
  for insert to authenticated with check (user_id = auth.uid());

drop policy if exists "scout_leads_update_own" on public.scout_leads;
create policy "scout_leads_update_own" on public.scout_leads
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "scout_leads_delete_own" on public.scout_leads;
create policy "scout_leads_delete_own" on public.scout_leads
  for delete to authenticated using (user_id = auth.uid());

create index if not exists scout_leads_user_created_idx
  on public.scout_leads(user_id, created_at desc);