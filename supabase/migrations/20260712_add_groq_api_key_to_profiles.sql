-- Adds a per-user Groq API key column to profiles, so each user can set
-- their own key in Settings instead of relying only on the admin's default.
alter table public.profiles
  add column if not exists groq_api_key text;
