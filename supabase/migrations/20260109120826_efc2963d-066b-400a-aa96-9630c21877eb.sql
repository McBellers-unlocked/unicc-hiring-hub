-- First drop the existing constraint to allow updates
ALTER TABLE candidates DROP CONSTRAINT IF EXISTS candidates_gender_check;

-- Update existing data from Male/Female to Man/Woman
UPDATE candidates SET gender = 'Man' WHERE gender = 'Male';
UPDATE candidates SET gender = 'Woman' WHERE gender = 'Female';

-- Also handle lowercase variants
UPDATE candidates SET gender = 'Man' WHERE LOWER(gender) = 'male';
UPDATE candidates SET gender = 'Woman' WHERE LOWER(gender) = 'female';

-- Add new constraint with Man/Woman
ALTER TABLE candidates ADD CONSTRAINT candidates_gender_check 
  CHECK (gender IS NULL OR gender IN ('Man', 'Woman', 'Non-binary', 'Prefer not to say', 'Other'));