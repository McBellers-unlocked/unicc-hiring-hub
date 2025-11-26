-- Add bullet_index column to job_interview_question_requirements to preserve which bullet point was selected
ALTER TABLE job_interview_question_requirements 
ADD COLUMN bullet_index integer;