-- Sets up the cron job that fires the process-scheduled-sends Edge Function
-- every minute so scheduled campaigns are sent on time.
--
-- Prerequisites:
--   1. Deploy the `process-scheduled-sends` Edge Function first (see SCHEDULER_DEPLOY.md).
--   2. Set the CRON_SECRET Edge Function secret in Supabase Dashboard.
--   3. Replace <YOUR_SUPABASE_PROJECT_REF> with your real project ref below
--      (the part between "supabase.co" and ".supabase.co" in your project URL,
--       e.g. "abcdefghijklmnop").
--   4. Replace <YOUR_CRON_SECRET> with the same secret value you set above.
--   5. Run this SQL in Supabase Dashboard → SQL Editor.

-- Add sent_count to scheduled_sends if it doesn't exist yet
ALTER TABLE public.scheduled_sends
  ADD COLUMN IF NOT EXISTS sent_count integer DEFAULT 0;

-- Add a 'sending' status to cover the in-progress window (prevents double-fire)
-- The app already uses 'scheduled' | 'sent' | 'failed' | 'cancelled'.
-- 'sending' is now a valid transient state set by the Edge Function.

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Remove any previous version of this cron job (safe to re-run)
SELECT cron.unschedule('process-scheduled-sends')
WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'process-scheduled-sends'
);

-- Schedule the Edge Function to run every minute.
-- Replace the two placeholders before running this.
SELECT cron.schedule(
  'process-scheduled-sends',
  '* * * * *',
  $$
  SELECT net.http_post(
    url := 'https://<YOUR_SUPABASE_PROJECT_REF>.supabase.co/functions/v1/process-scheduled-sends',
    headers := '{"Content-Type": "application/json", "x-cron-secret": "<YOUR_CRON_SECRET>"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);
