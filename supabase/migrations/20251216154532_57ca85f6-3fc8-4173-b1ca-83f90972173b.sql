-- Add tracking fields for sections submitted and discussions
ALTER TABLE workplans 
  ADD COLUMN IF NOT EXISTS begin_year_submitted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS mid_year_submitted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS end_year_submitted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS begin_year_discussion_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS mid_year_discussion_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS end_year_discussion_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS end_year_staff_acknowledgment_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS end_year_supervisor2_signed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS end_year_staff_final_signed_at TIMESTAMPTZ;