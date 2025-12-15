-- Add status column to skill_definitions
ALTER TABLE skill_definitions 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'established' 
  CHECK (status IN ('new', 'emerging', 'established', 'legacy', 'retired'));

-- Add ai_suggested_category and ai_suggested_status for review workflow
ALTER TABLE skill_definitions 
ADD COLUMN IF NOT EXISTS ai_suggested_category TEXT,
ADD COLUMN IF NOT EXISTS ai_suggested_status TEXT,
ADD COLUMN IF NOT EXISTS ai_review_pending BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS ai_reviewed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS ai_reviewed_by UUID REFERENCES auth.users(id);