-- The original `campaigns` table was built for a lead-scraping feature and had
-- NOT NULL constraints on `name` and `niche` columns. The email campaign UI
-- never sets these fields, so every INSERT was silently rejected by Postgres,
-- causing the Campaign History page to always appear empty.
--
-- Fix: make both columns nullable so email campaign inserts succeed.

ALTER TABLE public.campaigns ALTER COLUMN name DROP NOT NULL;
ALTER TABLE public.campaigns ALTER COLUMN niche DROP NOT NULL;
