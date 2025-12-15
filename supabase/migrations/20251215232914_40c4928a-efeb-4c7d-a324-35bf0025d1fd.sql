-- Add skill_type to skill_definitions (proficiency vs credential)
ALTER TABLE skill_definitions 
ADD COLUMN skill_type TEXT DEFAULT 'proficiency' 
  CHECK (skill_type IN ('proficiency', 'credential'));

-- Add has_credential to skill_assessments for credential-type skills
ALTER TABLE skill_assessments 
ADD COLUMN has_credential BOOLEAN DEFAULT NULL;

-- Update existing categories to the new 4-category system
-- We'll use a function to categorize based on keywords

-- First, create a function to categorize skills
CREATE OR REPLACE FUNCTION categorize_skill(skill_name TEXT) 
RETURNS TABLE(category TEXT, skill_type TEXT) AS $$
DECLARE
  lower_name TEXT := lower(skill_name);
BEGIN
  -- Certifications (& Licenses) - externally validated credentials
  IF lower_name LIKE '%certif%' 
     OR lower_name LIKE '%cissp%' 
     OR lower_name LIKE '%cism%' 
     OR lower_name LIKE '%crisc%' 
     OR lower_name LIKE '%ccna%' 
     OR lower_name LIKE '%ccnp%' 
     OR lower_name LIKE '%ccsp%' 
     OR lower_name LIKE '%pmp%' 
     OR lower_name LIKE '%prince2%' 
     OR lower_name LIKE '%giac%'
     OR lower_name LIKE '%foundation%certificate%'
     OR lower_name LIKE '%certified%'
     OR lower_name LIKE '%itil%foundation%'
     OR lower_name LIKE '%license%'
  THEN
    RETURN QUERY SELECT 'Certifications & Licenses'::TEXT, 'credential'::TEXT;
    RETURN;
  END IF;
  
  -- Methods & Processes - practices and methodologies
  IF lower_name LIKE '%itil%' 
     OR lower_name LIKE '%agile%' 
     OR lower_name LIKE '%scrum%' 
     OR lower_name LIKE '%kanban%'
     OR lower_name LIKE '%waterfall%'
     OR lower_name LIKE '%lean%'
     OR lower_name LIKE '%six sigma%'
     OR lower_name LIKE '%devops%'
     OR lower_name LIKE '%project management%'
     OR lower_name LIKE '%service management%'
     OR lower_name LIKE '%change management%'
     OR lower_name LIKE '%risk management%'
     OR lower_name LIKE '%incident management%'
     OR lower_name LIKE '%problem management%'
     OR lower_name LIKE '%cobit%'
     OR lower_name LIKE '%togaf%'
     OR lower_name LIKE '%framework%'
     OR lower_name LIKE '%methodology%'
     OR lower_name LIKE '%governance%'
  THEN
    RETURN QUERY SELECT 'Methods & Processes'::TEXT, 'proficiency'::TEXT;
    RETURN;
  END IF;
  
  -- Behavioral (Soft Skills) - interpersonal skills
  IF lower_name LIKE '%communication%'
     OR lower_name LIKE '%leadership%'
     OR lower_name LIKE '%teamwork%'
     OR lower_name LIKE '%collaboration%'
     OR lower_name LIKE '%adaptability%'
     OR lower_name LIKE '%listening%'
     OR lower_name LIKE '%assertiveness%'
     OR lower_name LIKE '%interpersonal%'
     OR lower_name LIKE '%negotiation%'
     OR lower_name LIKE '%empathy%'
     OR lower_name LIKE '%resilience%'
     OR lower_name LIKE '%emotional intelligence%'
     OR lower_name LIKE '%conflict resolution%'
     OR lower_name LIKE '%mentoring%'
     OR lower_name LIKE '%coaching%'
     OR lower_name LIKE '%presentation%'
     OR lower_name LIKE '%facilitation%'
     OR lower_name LIKE '%stakeholder%'
     OR lower_name LIKE '%time management%'
     OR lower_name LIKE '%problem solving%'
     OR lower_name LIKE '%critical thinking%'
     OR lower_name LIKE '%decision making%'
     OR lower_name LIKE '%attention to detail%'
     OR lower_name LIKE '%advocacy%'
     OR lower_name LIKE '%writing%'
     OR lower_name LIKE '%reporting%'
  THEN
    RETURN QUERY SELECT 'Behavioral'::TEXT, 'proficiency'::TEXT;
    RETURN;
  END IF;
  
  -- Default to Technical & Domain for everything else
  RETURN QUERY SELECT 'Technical & Domain'::TEXT, 'proficiency'::TEXT;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Now update all existing skills with their categories
UPDATE skill_definitions sd
SET 
  category = cat.category,
  skill_type = cat.skill_type
FROM (
  SELECT id, (categorize_skill(name)).*
  FROM skill_definitions
) cat
WHERE sd.id = cat.id;

-- Add an index on category for faster filtering
CREATE INDEX IF NOT EXISTS idx_skill_definitions_category ON skill_definitions(category);
CREATE INDEX IF NOT EXISTS idx_skill_definitions_skill_type ON skill_definitions(skill_type);