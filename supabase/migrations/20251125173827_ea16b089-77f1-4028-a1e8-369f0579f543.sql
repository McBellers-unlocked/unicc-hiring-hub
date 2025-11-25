-- Add feedback_submitted_at column to video_assignments table
ALTER TABLE video_assignments ADD COLUMN feedback_submitted_at TIMESTAMPTZ;