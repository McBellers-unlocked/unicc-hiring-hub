-- Add new combined prep and read time field to video_question_sets
ALTER TABLE video_question_sets 
ADD COLUMN prep_and_read_secs integer DEFAULT 60;

-- Update existing records to combine their read_secs and prep_secs
UPDATE video_question_sets 
SET prep_and_read_secs = COALESCE(read_secs, 30) + COALESCE(prep_secs, 30);