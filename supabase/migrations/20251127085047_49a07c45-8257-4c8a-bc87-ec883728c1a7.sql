-- Add estimated_minutes column to job_interview_questions table
ALTER TABLE job_interview_questions 
ADD COLUMN estimated_minutes NUMERIC(3,1) DEFAULT 4.0;

COMMENT ON COLUMN job_interview_questions.estimated_minutes IS 'Estimated duration in minutes for answering this question (default 4.0, range 3.5-5.0)';