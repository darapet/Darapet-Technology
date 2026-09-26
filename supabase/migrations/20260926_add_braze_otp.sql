-- Server-only configuration and audit storage for admin-triggered OTP email.
-- These tables intentionally have no client-facing RLS policies. The
-- Supabase Edge Functions access them with the service-role key after checking
-- that the caller is an admin.

create table if not exists public.platform_secrets (
  key text primary key,
  value text not null,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null
);

alter table public.platform_secrets enable row level security;

create table if not exists public.admin_otp_challenges (
  id uuid primary key default gen_random_uuid(),
  app_user_id uuid not null references public.app_users(id) on delete cascade,
  auth_user_id uuid references auth.users(id) on delete cascade,
  recipient_email text not null,
  code_hash text not null,
  expires_at timestamptz not null,
  consumed_at timestamptz,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now()
);

alter table public.admin_otp_challenges enable row level security;

create index if not exists admin_otp_challenges_recipient_idx
  on public.admin_otp_challenges (app_user_id, created_at desc);

comment on table public.platform_secrets is
  'Service-only platform credentials. Read and write through Supabase Edge Functions.';

comment on table public.admin_otp_challenges is
  'Hashed, short-lived OTP challenges created by an authorized admin.';