-- Add foreign key constraints for proper joins
-- Note: Some of these may already exist, using IF NOT EXISTS to be safe

DO $$ 
BEGIN
  -- FK from panel_interview_invitations to applications
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'panel_interview_invitations_application_id_fkey'
  ) THEN
    ALTER TABLE panel_interview_invitations
    ADD CONSTRAINT panel_interview_invitations_application_id_fkey
    FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE CASCADE;
  END IF;

  -- FK from panel_interview_invitations to jobs
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'panel_interview_invitations_job_id_fkey'
  ) THEN
    ALTER TABLE panel_interview_invitations
    ADD CONSTRAINT panel_interview_invitations_job_id_fkey
    FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE;
  END IF;

  -- FK from panel_interview_invitations to time slots
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'panel_interview_invitations_booked_slot_id_fkey'
  ) THEN
    ALTER TABLE panel_interview_invitations
    ADD CONSTRAINT panel_interview_invitations_booked_slot_id_fkey
    FOREIGN KEY (booked_slot_id) REFERENCES panel_interview_time_slots(id) ON DELETE SET NULL;
  END IF;

  -- FK from applications to candidates
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'applications_candidate_id_fkey'
  ) THEN
    ALTER TABLE applications
    ADD CONSTRAINT applications_candidate_id_fkey
    FOREIGN KEY (candidate_id) REFERENCES candidates(id) ON DELETE CASCADE;
  END IF;

  -- FK from applications to jobs
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'applications_job_id_fkey'
  ) THEN
    ALTER TABLE applications
    ADD CONSTRAINT applications_job_id_fkey
    FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE;
  END IF;
END $$;