-- Add availability window to written_assessments
ALTER TABLE public.written_assessments 
ADD COLUMN IF NOT EXISTS availability_window_hours INTEGER DEFAULT 24;

-- Add availability window columns to assessment_slots
ALTER TABLE public.assessment_slots 
ADD COLUMN IF NOT EXISTS available_from TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS available_until TIMESTAMP WITH TIME ZONE;

-- Add comment explaining the two-stage timing
COMMENT ON COLUMN public.written_assessments.availability_window_hours IS 'Hours candidates have to start the assessment after it becomes available (default 24 hours)';
COMMENT ON COLUMN public.assessment_slots.available_from IS 'When the assessment becomes available to the candidate';
COMMENT ON COLUMN public.assessment_slots.available_until IS 'Deadline by which candidate must start the assessment';