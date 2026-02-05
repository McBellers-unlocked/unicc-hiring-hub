-- Add linking columns for CB workflow automation
ALTER TABLE hr_appointments 
  ADD COLUMN IF NOT EXISTS linked_separation_id UUID REFERENCES hr_separations(id);

ALTER TABLE hr_separations 
  ADD COLUMN IF NOT EXISTS linked_appointment_id UUID REFERENCES hr_appointments(id);

-- Add indexes for efficient lookups
CREATE INDEX IF NOT EXISTS idx_hr_appointments_linked_separation ON hr_appointments(linked_separation_id);
CREATE INDEX IF NOT EXISTS idx_hr_separations_linked_appointment ON hr_separations(linked_appointment_id);