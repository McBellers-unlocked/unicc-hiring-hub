-- Add missing fields to users table and rename section to unit
ALTER TABLE users 
  ADD COLUMN IF NOT EXISTS worker_type TEXT,
  ADD COLUMN IF NOT EXISTS line_manager TEXT;

-- Rename section to unit
ALTER TABLE users 
  RENAME COLUMN section TO unit;