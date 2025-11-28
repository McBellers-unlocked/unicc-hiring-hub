-- Add candidate_type and affiliate_subtype columns to candidates table
ALTER TABLE candidates ADD COLUMN candidate_type text DEFAULT 'External';
ALTER TABLE candidates ADD COLUMN affiliate_subtype text;

-- Add comment for documentation
COMMENT ON COLUMN candidates.candidate_type IS 'Type of candidate: External, Internal, or Affiliate';
COMMENT ON COLUMN candidates.affiliate_subtype IS 'Subtype for Affiliate candidates: Consultant, Intern, or UNV';