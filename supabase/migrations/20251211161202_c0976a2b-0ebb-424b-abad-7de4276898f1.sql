-- Add slug column to job_requisitions table
ALTER TABLE job_requisitions ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE;

-- Create index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_job_requisitions_slug ON job_requisitions(slug);

-- Function to generate unique requisition slug
CREATE OR REPLACE FUNCTION generate_requisition_slug(title TEXT, req_id UUID)
RETURNS TEXT AS $$
DECLARE
  base_slug TEXT;
  final_slug TEXT;
  counter INTEGER := 0;
BEGIN
  -- Convert title to slug: "External Relations Intern" -> "external-relations-intern"
  base_slug := LOWER(REGEXP_REPLACE(COALESCE(title, ''), '[^a-zA-Z0-9]+', '-', 'g'));
  base_slug := TRIM(BOTH '-' FROM base_slug);
  
  -- If empty, use UUID prefix
  IF base_slug = '' OR base_slug IS NULL THEN
    base_slug := LEFT(req_id::TEXT, 8);
  END IF;
  
  final_slug := base_slug;
  
  -- Check for collisions and append number if needed
  WHILE EXISTS (SELECT 1 FROM job_requisitions WHERE slug = final_slug AND id != req_id) LOOP
    counter := counter + 1;
    final_slug := base_slug || '-' || counter;
  END LOOP;
  
  RETURN final_slug;
END;
$$ LANGUAGE plpgsql;

-- Update all existing requisitions with slugs
UPDATE job_requisitions 
SET slug = generate_requisition_slug(position_title, id)
WHERE slug IS NULL;