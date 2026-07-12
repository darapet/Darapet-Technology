# Scheduled Campaigns — Deployment Guide

This guide walks you through deploying the scheduler that makes your automated
campaigns actually send at the right time.

---

## What was built

| File | Purpose |
|------|---------|
| `supabase/functions/process-scheduled-sends/index.ts` | Edge Function — runs every minute, finds overdue scheduled sends, sends the emails, marks them done |
| `supabase/migrations/20260712_add_scheduler_cron.sql` | SQL — enables pg_cron, sets up the every-minute trigger |

---

## Step 1 — Install the Supabase CLI (if you haven't already)

```bash
npm install -g supabase
```

Then log in:

```bash
supabase login
```

---

## Step 2 — Link your project

In the root of your repo:

```bash
supabase link --project-ref <YOUR_SUPABASE_PROJECT_REF>
```

Your project ref is the random string in your Supabase project URL:
`https://supabase.com/dashboard/project/YOUR_PROJECT_REF`

---

## Step 3 — Set the CRON_SECRET

Pick any random string (e.g. a UUID). This protects the function from being
called by anyone other than your cron job.

```bash
supabase secrets set CRON_SECRET=your-random-secret-here
```

Write this value down — you'll need it in Step 5.

---

## Step 4 — Deploy the Edge Function

```bash
supabase functions deploy process-scheduled-sends
```

You should see a success message. You can verify it's live in:
Supabase Dashboard → Edge Functions → process-scheduled-sends

---

## Step 5 — Run the SQL migration

1. Open your Supabase Dashboard → **SQL Editor**
2. Open `supabase/migrations/20260712_add_scheduler_cron.sql`
3. **Before running**, replace the two placeholders at the bottom of the file:
   - `<YOUR_SUPABASE_PROJECT_REF>` → your actual project ref (same one from Step 2)
   - `<YOUR_CRON_SECRET>` → the secret you set in Step 3
4. Run the SQL

---

## Step 6 — Verify it's working

In Supabase Dashboard → **SQL Editor**, run:

```sql
SELECT * FROM cron.job WHERE jobname = 'process-scheduled-sends';
```

You should see one row. To check recent runs:

```sql
SELECT * FROM cron.job_run_details
WHERE jobname = 'process-scheduled-sends'
ORDER BY start_time DESC
LIMIT 10;
```

Schedule a test campaign for 2 minutes from now and watch the `scheduled_sends`
table — the row's status should flip from `scheduled` → `sent` within a minute
of the scheduled time.

---

## How it works (overview)

```
Every minute:
  pg_cron → HTTP POST → process-scheduled-sends Edge Function
                               ↓
               SELECT from scheduled_sends WHERE status='scheduled'
                        AND scheduled_at <= now()
                               ↓
               For each row:
                 • Mark status = 'sending'  (prevents double-fire)
                 • Fetch user's profile (SMTP / Brevo credentials)
                 • Send email to each recipient
                 • Insert rows into email_sends
                 • Mark status = 'sent' or 'failed'
```

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| Function returns 401 | Wrong CRON_SECRET — re-run `supabase secrets set CRON_SECRET=...` and update the SQL |
| Emails not sending | Check the user's SMTP/Brevo config in Settings — same issue as manual sends |
| Cron job not appearing | Make sure `pg_cron` extension is enabled in Supabase Dashboard → Database → Extensions |
| `pg_net` not found | Enable it in Supabase Dashboard → Database → Extensions |
