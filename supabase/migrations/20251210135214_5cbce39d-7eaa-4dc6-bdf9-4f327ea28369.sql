ALTER TABLE skill_assessments 
ADD COLUMN scope TEXT DEFAULT 'team' CHECK (scope IN ('team', 'individual'));