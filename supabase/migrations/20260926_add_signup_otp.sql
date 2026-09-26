-- OTP challenges created during new account registration.
-- Service-role-only access keeps verification codes out of the client.

create table if not exists public.signup_otp_challenges (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid not null references auth.users(id) on delete cascade,
  app_user_id uuid not null references public.app_users(id) on delete cascade,
  recipient_email text not null,
  code_hash text not null,
  expires_at timestamptz not null,
  consumed_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.signup_otp_challenges enable row level security;

create index if not exists signup_otp_challenges_user_idx
  on public.signup_otp_challenges (auth_user_id, created_at desc);
