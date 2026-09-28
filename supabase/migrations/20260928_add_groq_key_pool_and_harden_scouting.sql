-- Multiple per-user Groq keys with safe rotation across research and drafting.
create table if not exists public.groq_api_keys (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  label text not null default '',
  api_key text not null,
  enabled boolean not null default true,
  priority integer not null default 100,
  last_used_at timestamptz,
  last_error_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.groq_api_keys enable row level security;

drop policy if exists "groq_api_keys_select_own" on public.groq_api_keys;
create policy "groq_api_keys_select_own" on public.groq_api_keys for select to authenticated using (user_id = auth.uid());

drop policy if exists "groq_api_keys_insert_own" on public.groq_api_keys;
create policy "groq_api_keys_insert_own" on public.groq_api_keys for insert to authenticated with check (user_id = auth.uid());

drop policy if exists "groq_api_keys_update_own" on public.groq_api_keys;
create policy "groq_api_keys_update_own" on public.groq_api_keys for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "groq_api_keys_delete_own" on public.groq_api_keys;
create policy "groq_api_keys_delete_own" on public.groq_api_keys for delete to authenticated using (user_id = auth.uid());

create index if not exists groq_api_keys_user_priority_idx on public.groq_api_keys(user_id, enabled, priority, last_used_at);

-- Ensure the existing scouting rollout is safe to re-run against older projects.
alter table public.scout_leads
  add column if not exists import_id uuid references public.scout_imports(id) on delete set null,
  add column if not exists raw_data jsonb not null default '{}'::jsonb,
  add column if not exists source_headers jsonb not null default '[]'::jsonb,
  add column if not exists source_file_path text,
  add column if not exists source_file_type text,
  add column if not exists source_file_size bigint,
  add column if not exists research_data jsonb not null default '{}'::jsonb,
  add column if not exists email_drafts jsonb not null default '[]'::jsonb;

notify pgrst, 'reload schema';
