-- Delete all test jobs except the Associate Policy (Legal) Officer with 143 applications
-- Job ID to keep: aacafec6-4d2b-4a3b-826a-5608ec28418e

-- First, delete all applications for jobs we're removing
DELETE FROM applications 
WHERE job_id != 'aacafec6-4d2b-4a3b-826a-5608ec28418e';

-- Delete related data for jobs being removed
DELETE FROM job_competencies 
WHERE job_id != 'aacafec6-4d2b-4a3b-826a-5608ec28418e';

DELETE FROM job_requirements 
WHERE job_id != 'aacafec6-4d2b-4a3b-826a-5608ec28418e';

DELETE FROM job_language_requirements 
WHERE job_id != 'aacafec6-4d2b-4a3b-826a-5608ec28418e';

DELETE FROM job_interview_questions 
WHERE job_id != 'aacafec6-4d2b-4a3b-826a-5608ec28418e';

DELETE FROM job_interview_panel_members 
WHERE job_id != 'aacafec6-4d2b-4a3b-826a-5608ec28418e';

DELETE FROM job_review_committee_members 
WHERE job_id != 'aacafec6-4d2b-4a3b-826a-5608ec28418e';

DELETE FROM job_hiring_managers 
WHERE job_id != 'aacafec6-4d2b-4a3b-826a-5608ec28418e';

DELETE FROM feedback_form_templates 
WHERE job_id != 'aacafec6-4d2b-4a3b-826a-5608ec28418e';

DELETE FROM killer_questions 
WHERE job_id != 'aacafec6-4d2b-4a3b-826a-5608ec28418e';

DELETE FROM panel_interview_time_slots 
WHERE job_id != 'aacafec6-4d2b-4a3b-826a-5608ec28418e';

-- Delete all test jobs except the one to keep
DELETE FROM jobs 
WHERE id != 'aacafec6-4d2b-4a3b-826a-5608ec28418e';

-- Delete ALL job requisitions (all are test data)
-- First delete related data
DELETE FROM requisition_field_comments;

-- Then delete all requisitions
DELETE FROM job_requisitions;

-- The numbering system will automatically reset since it counts existing records
-- When the next requisition is created, it will start from 1 again