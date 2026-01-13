-- Migrate all Shortlist candidates to Pre-Recorded Video status
-- This is part of removing the Shortlist phase from the workflow
UPDATE applications 
SET status = 'Pre-Recorded Video', 
    updated_at = NOW() 
WHERE status = 'Shortlist';