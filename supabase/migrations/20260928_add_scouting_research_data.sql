-- Persist website research findings and one draft for every discovered email address.
alter table public.scout_leads
  add column if not exists research_data jsonb not null default '{}'::jsonb,
  add column if not exists email_drafts jsonb not null default '[]'::jsonb;
