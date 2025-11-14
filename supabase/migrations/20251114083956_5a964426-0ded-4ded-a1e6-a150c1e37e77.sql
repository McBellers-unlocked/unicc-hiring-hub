-- Add assigned_to column to job_interview_questions table
ALTER TABLE job_interview_questions 
ADD COLUMN assigned_to uuid REFERENCES users(id);

-- Add index for better query performance
CREATE INDEX idx_job_interview_questions_assigned_to 
ON job_interview_questions(assigned_to);