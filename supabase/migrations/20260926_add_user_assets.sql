-- Reusable user-owned assets stored in Cloudinary with searchable metadata in Supabase.

create table if not exists public.user_assets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  original_filename text not null,
  asset_type text not null check (asset_type in ('image', 'pdf', 'video')),
  mime_type text not null,
  size_bytes bigint not null check (size_bytes >= 0),
  cloudinary_public_id text not null,
  cloudinary_url text not null,
  cloudinary_resource_type text not null,
  cloudinary_format text,
  cloudinary_bytes bigint,
  cloudinary_width integer,
  cloudinary_height integer,
  cloudinary_duration numeric,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists user_assets_user_created_idx
  on public.user_assets (user_id, created_at desc);

alter table public.user_assets enable row level security;

drop policy if exists "user_assets_select_own" on public.user_assets;
create policy "user_assets_select_own"
  on public.user_assets for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists "user_assets_insert_own" on public.user_assets;
create policy "user_assets_insert_own"
  on public.user_assets for insert
  to authenticated
  with check (user_id = auth.uid());

drop policy if exists "user_assets_update_own" on public.user_assets;
create policy "user_assets_update_own"
  on public.user_assets for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "user_assets_delete_own" on public.user_assets;
create policy "user_assets_delete_own"
  on public.user_assets for delete
  to authenticated
  using (user_id = auth.uid());