-- Admin-controlled OTP delivery settings.
-- Brevo is the default free-tier provider; Braze remains available as an option.

alter table public.app_settings
  add column if not exists otp_enabled boolean not null default false,
  add column if not exists otp_provider text not null default 'brevo';

alter table public.app_settings
  drop constraint if exists app_settings_otp_provider_check;

alter table public.app_settings
  add constraint app_settings_otp_provider_check
  check (otp_provider in ('brevo', 'braze'));