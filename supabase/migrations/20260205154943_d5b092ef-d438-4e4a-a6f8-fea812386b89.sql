-- Update status constraint to replace "On hold" with "Not started"
-- First update existing data
UPDATE hr_appointments SET status = 'Not started' WHERE status = 'On hold';

-- Drop old constraint and add new one
ALTER TABLE hr_appointments DROP CONSTRAINT IF EXISTS hr_appointments_status_check;
ALTER TABLE hr_appointments ADD CONSTRAINT hr_appointments_status_check 
  CHECK (status = ANY (ARRAY['Not started', 'In progress', 'Completed', 'Cancelled']));

-- Create comments table for HR appointments
CREATE TABLE hr_appointment_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id UUID NOT NULL REFERENCES hr_appointments(id) ON DELETE CASCADE,
  author_id UUID REFERENCES auth.users(id),
  comment_text TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE hr_appointment_comments ENABLE ROW LEVEL SECURITY;

-- Policy for HR users to manage comments
CREATE POLICY "HR users can manage appointment comments" ON hr_appointment_comments
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('Admin', 'HR Assistant', 'Chief of HR'))
  );

-- Indexes for efficient querying
CREATE INDEX idx_appointment_comments_appointment ON hr_appointment_comments(appointment_id);
CREATE INDEX idx_appointment_comments_created ON hr_appointment_comments(created_at DESC);

-- Trigger to update updated_at
CREATE TRIGGER update_hr_appointment_comments_updated_at
  BEFORE UPDATE ON hr_appointment_comments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();