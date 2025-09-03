-- Add reason field to stage_events table for tracking override reasons
ALTER TABLE public.stage_events 
ADD COLUMN reason TEXT;