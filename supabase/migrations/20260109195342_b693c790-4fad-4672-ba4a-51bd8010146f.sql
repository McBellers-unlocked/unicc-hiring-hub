-- Drop the existing constraint
ALTER TABLE applications DROP CONSTRAINT IF EXISTS applications_longlist_rating_check;

-- Add the updated constraint with new tier-based values
ALTER TABLE applications ADD CONSTRAINT applications_longlist_rating_check 
  CHECK (longlist_rating = ANY (ARRAY['eligible'::text, 'tier_1'::text, 'tier_2'::text]));

-- Migrate any existing data from old values to new
UPDATE applications 
SET longlist_rating = CASE 
  WHEN longlist_rating = 'above_average' THEN 'tier_2'
  WHEN longlist_rating = 'excellent' THEN 'tier_1'
  ELSE longlist_rating 
END
WHERE longlist_rating IN ('above_average', 'excellent');