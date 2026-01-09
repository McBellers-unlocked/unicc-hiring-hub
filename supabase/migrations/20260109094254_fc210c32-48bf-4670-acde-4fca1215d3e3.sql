-- Add separate fields for full PD chief approval (distinct from initial request approval)
ALTER TABLE job_requisitions ADD COLUMN IF NOT EXISTS chief_pd_approval BOOLEAN DEFAULT false;
ALTER TABLE job_requisitions ADD COLUMN IF NOT EXISTS chief_pd_approved_by UUID REFERENCES users(id);
ALTER TABLE job_requisitions ADD COLUMN IF NOT EXISTS chief_pd_approved_at TIMESTAMPTZ;
ALTER TABLE job_requisitions ADD COLUMN IF NOT EXISTS chief_pd_comments TEXT;

COMMENT ON COLUMN job_requisitions.chief_pd_approval IS 'Full PD approval by Chief of Division (separate from initial request approval)';

-- Fix stuck requisitions: reset chief_pd_approval for any that are awaiting full PD review
UPDATE job_requisitions
SET chief_pd_approval = false
WHERE status = 'chief_of_division_review'
  AND hr_final_review_completed = true
  AND chief_of_division_approval = true
  AND (director_approval IS NULL OR director_approval = false);