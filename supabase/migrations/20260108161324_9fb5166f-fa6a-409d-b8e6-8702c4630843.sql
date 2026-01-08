-- Fix pd_submitted_at for Senior Software Developer requisition
-- It was incorrectly set to Jan 8, 2026 but should be Dec 18, 2025 (when it was actually submitted)
UPDATE job_requisitions 
SET pd_submitted_at = '2025-12-18 14:20:22.002+00'
WHERE id = '8b45cdd2-945b-4eab-a3d5-5a30249fb7c7';