-- Add social_links column to profiles for storing user social media links
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS social_links JSONB DEFAULT '[]'::jsonb;

-- Add website_url for convenience (separate from social_links)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS website_url TEXT DEFAULT NULL;
