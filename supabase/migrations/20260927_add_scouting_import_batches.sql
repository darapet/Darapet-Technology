-- Named lead lists and flexible imported row data.
-- Every upload gets its own list; raw_data preserves every source column without
-- forcing future files into a fixed schema.
create table if not exists public.scout_imports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  original_file_name text not null default '',
  source_file_path text,
  source_file_type text,
  source_file_size bigint,
  columns jsonb not null default '[]'::jsonb,
  row_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.scout_imports enable row level security;

drop policy if exists "scout_imports_select_own" on public.scout_imports;
create policy "scout_imports_select_own" on public.scout_imports
  for select to authenticated using (user_id = auth.uid());

drop policy if exists "scout_imports_insert_own" on public.scout_imports;
create policy "scout_imports_insert_own" on public.scout_imports
  for insert to authenticated with check (user_id = auth.uid());

drop policy if exists "scout_imports_update_own" on public.scout_imports;
create policy "scout_imports_update_own" on public.scout_imports
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "scout_imports_delete_own" on public.scout_imports;
create policy "scout_imports_delete_own" on public.scout_imports
  for delete to authenticated using (user_id = auth.uid());

alter table public.scout_leads
  add column if not exists import_id uuid references public.scout_imports(id) on delete set null,
  add column if not exists raw_data jsonb not null default '{}'::jsonb,
  add column if not exists source_headers jsonb not null default '[]'::jsonb;

create index if not exists scout_imports_user_created_idx
  on public.scout_imports(user_id, created_at desc);

create index if not exists scout_leads_import_idx
  on public.scout_leads(import_id, created_at desc);
