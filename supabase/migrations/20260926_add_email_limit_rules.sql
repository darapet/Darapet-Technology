-- Flexible email limits for new accounts. A rule applies while the account
-- age is within its inclusive day range; NULL max means no upper bound.

create table if not exists public.email_limit_rules (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  min_account_age_days integer not null default 0 check (min_account_age_days >= 0),
  max_account_age_days integer check (
    max_account_age_days is null or max_account_age_days >= min_account_age_days
  ),
  daily_limit integer not null default 0 check (daily_limit >= 0),
  weekly_limit integer not null default 0 check (weekly_limit >= 0),
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.email_limit_rules enable row level security;

drop policy if exists "email_limit_rules_admin_select" on public.email_limit_rules;
create policy "email_limit_rules_admin_select"
  on public.email_limit_rules for select
  to authenticated
  using (public.is_admin());

drop policy if exists "email_limit_rules_admin_insert" on public.email_limit_rules;
create policy "email_limit_rules_admin_insert"
  on public.email_limit_rules for insert
  to authenticated
  with check (public.is_admin());

drop policy if exists "email_limit_rules_admin_update" on public.email_limit_rules;
create policy "email_limit_rules_admin_update"
  on public.email_limit_rules for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "email_limit_rules_admin_delete" on public.email_limit_rules;
create policy "email_limit_rules_admin_delete"
  on public.email_limit_rules for delete
  to authenticated
  using (public.is_admin());