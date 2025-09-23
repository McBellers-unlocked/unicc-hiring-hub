-- Add "Screening" to the application_status enum since it appears to be used in the system
ALTER TYPE application_status ADD VALUE 'Screening' AFTER 'Application';

-- Add "Recommended" to the application_status enum as it appears in the interface
ALTER TYPE application_status ADD VALUE 'Recommended' AFTER 'Panel Interview';