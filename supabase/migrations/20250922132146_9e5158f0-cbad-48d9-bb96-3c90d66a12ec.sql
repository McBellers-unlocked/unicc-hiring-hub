-- Add comprehensive personal detail fields to candidates table
-- This allows storing all PHF personal information in the candidate profile

ALTER TABLE public.candidates 
ADD COLUMN IF NOT EXISTS title text DEFAULT 'Mr',
ADD COLUMN IF NOT EXISTS maiden_name text,
ADD COLUMN IF NOT EXISTS date_of_birth date,
ADD COLUMN IF NOT EXISTS place_of_birth text,
ADD COLUMN IF NOT EXISTS country_of_birth text,
ADD COLUMN IF NOT EXISTS present_nationality text,
ADD COLUMN IF NOT EXISTS nationality_changed boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS nationality_change_details text,
ADD COLUMN IF NOT EXISTS marital_status text DEFAULT 'Single',
ADD COLUMN IF NOT EXISTS permanent_address text,
ADD COLUMN IF NOT EXISTS us_green_card boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS us_green_card_details text,
ADD COLUMN IF NOT EXISTS dependants jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS relatives jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS work_preferences jsonb DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS additional_fellowships jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS law_violations_disclosed boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS law_violations_details text,
ADD COLUMN IF NOT EXISTS mobility_medical_reservations text,
ADD COLUMN IF NOT EXISTS references jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS objection_to_contact_present_employer boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS presently_in_government_employ boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS availability_date date,
ADD COLUMN IF NOT EXISTS notice_period_days integer,
ADD COLUMN IF NOT EXISTS availability_mode text DEFAULT 'date';

-- Add check constraints for enum-like fields
ALTER TABLE public.candidates 
ADD CONSTRAINT check_title CHECK (title IN ('Mr', 'Mrs', 'Ms', 'Miss')),
ADD CONSTRAINT check_marital_status CHECK (marital_status IN ('Single', 'Married', 'Divorced', 'Widowed', 'Separated')),
ADD CONSTRAINT check_availability_mode CHECK (availability_mode IN ('date', 'immediately', 'notice_period'));