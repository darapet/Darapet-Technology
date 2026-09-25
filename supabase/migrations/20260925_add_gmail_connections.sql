-- Gmail OAuth connections are readable only by Supabase Edge Functions using
-- the service role. The browser never receives refresh_token_encrypted.
create table if not exists public.gmail_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  google_email text not null,
  refresh_token_encrypted text not null,
  scopes text not null default 'https://www.googleapis.com/auth/gmail.send',
  connected_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.gmail_connections enable row level security;

create table if not exists public.gmail_oauth_states (
  state text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

alter table public.gmail_oauth_states enable row level security;

create index if not exists gmail_oauth_states_expires_idx
  on public.gmail_oauth_states(expires_at);