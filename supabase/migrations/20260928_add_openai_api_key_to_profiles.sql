-- Store one OpenAI API key per authenticated user.
alter table public.profiles
  add column if not exists openai_api_key text;
