-- Add slug column to candidates table
ALTER TABLE candidates ADD COLUMN slug TEXT UNIQUE;

-- Create index for efficient lookups
CREATE INDEX idx_candidates_slug ON candidates(slug);

-- Function to generate unique slug from name
CREATE OR REPLACE FUNCTION generate_candidate_slug(candidate_name TEXT, candidate_id UUID)
RETURNS TEXT AS $$
DECLARE
  base_slug TEXT;
  final_slug TEXT;
  counter INTEGER := 0;
BEGIN
  -- Convert name to slug: "Matthew VALENTE" -> "matthew-valente"
  base_slug := LOWER(REGEXP_REPLACE(candidate_name, '[^a-zA-Z0-9]+', '-', 'g'));
  base_slug := TRIM(BOTH '-' FROM base_slug);
  
  -- If empty, use UUID prefix
  IF base_slug = '' OR base_slug IS NULL THEN
    base_slug := LEFT(candidate_id::TEXT, 8);
  END IF;
  
  final_slug := base_slug;
  
  -- Check for collisions and append number if needed
  WHILE EXISTS (SELECT 1 FROM candidates WHERE slug = final_slug AND id != candidate_id) LOOP
    counter := counter + 1;
    final_slug := base_slug || '-' || counter;
  END LOOP;
  
  RETURN final_slug;
END;
$$ LANGUAGE plpgsql;

-- Update all existing candidates with slugs
UPDATE candidates 
SET slug = generate_candidate_slug(name, id)
WHERE slug IS NULL;