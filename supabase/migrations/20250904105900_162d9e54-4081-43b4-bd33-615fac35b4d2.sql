-- Add gender field to candidates table for diversity tracking
ALTER TABLE candidates 
ADD COLUMN gender text CHECK (gender IN ('Male', 'Female', 'Non-binary', 'Prefer not to say', 'Other'));

-- Create index for better performance on gender queries
CREATE INDEX idx_candidates_gender ON candidates(gender);