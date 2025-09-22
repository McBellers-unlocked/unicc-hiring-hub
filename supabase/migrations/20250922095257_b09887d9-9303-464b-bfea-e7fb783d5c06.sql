-- Add missing fields to candidates table
ALTER TABLE public.candidates 
ADD COLUMN IF NOT EXISTS has_security_clearance BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS languages JSONB DEFAULT '{"un_languages": {}, "other_languages": []}'::jsonb;