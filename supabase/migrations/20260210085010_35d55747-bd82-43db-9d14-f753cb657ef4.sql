-- Clear foreign key references from appointments first
UPDATE hr_appointments SET linked_separation_id = NULL WHERE linked_separation_id IS NOT NULL;

-- Now delete all separations
DELETE FROM hr_separations;