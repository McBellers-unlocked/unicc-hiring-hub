-- Fix video_assignments token generation to use hex encoding instead of base64url
-- PostgreSQL doesn't recognize base64url encoding

ALTER TABLE public.video_assignments 
  ALTER COLUMN token SET DEFAULT encode(gen_random_bytes(32), 'hex');