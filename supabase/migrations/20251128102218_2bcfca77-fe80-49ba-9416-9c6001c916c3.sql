-- Fix applications where PHF is completed but status is still Draft
UPDATE applications 
SET status = 'Application', 
    updated_at = NOW()
WHERE phf_completed = true 
  AND status = 'Draft';