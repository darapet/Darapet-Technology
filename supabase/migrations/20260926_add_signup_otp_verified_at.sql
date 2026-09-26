-- Require the custom registration OTP before protected app access.
-- Existing accounts predate this gate and remain trusted; newly created accounts
-- receive NULL until signup-otp verifies their code.

alter table public.app_users
  add column if not exists signup_otp_verified_at timestamptz;

update public.app_users
set signup_otp_verified_at = coalesce(created_at, now())
where signup_otp_verified_at is null;
