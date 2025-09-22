-- Phase 1: Enhance candidates table to support all PHF-required fields

-- Add all missing PHF fields to candidates table
ALTER TABLE public.candidates 
ADD COLUMN IF NOT EXISTS phf_work_experience jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS phf_education jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS dependants_detailed jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS relatives_detailed jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS unemployment_periods jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS fellowships jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS personal_references jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS supervisor_contact_consent boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS government_employment boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS motivation_letter text,

-- Enhanced personal details that PHF requires
ADD COLUMN IF NOT EXISTS family_name text,
ADD COLUMN IF NOT EXISTS maiden_name_detailed text,
ADD COLUMN IF NOT EXISTS place_of_birth_detailed text,
ADD COLUMN IF NOT EXISTS country_of_birth_detailed text,
ADD COLUMN IF NOT EXISTS present_nationality_detailed text,
ADD COLUMN IF NOT EXISTS nationality_change_details_detailed text,
ADD COLUMN IF NOT EXISTS marital_status_detailed text DEFAULT 'Single',
ADD COLUMN IF NOT EXISTS permanent_address_detailed text,
ADD COLUMN IF NOT EXISTS present_address_detailed text,
ADD COLUMN IF NOT EXISTS telephone_detailed text,
ADD COLUMN IF NOT EXISTS us_green_card_detailed boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS us_green_card_details_detailed text,

-- Work preference details
ADD COLUMN IF NOT EXISTS remote_work_preference text,
ADD COLUMN IF NOT EXISTS travel_availability text,
ADD COLUMN IF NOT EXISTS contract_type_preference text,

-- Enhanced availability
ADD COLUMN IF NOT EXISTS availability_date_detailed date,
ADD COLUMN IF NOT EXISTS notice_period_detailed text,
ADD COLUMN IF NOT EXISTS availability_mode_detailed text DEFAULT 'date';

-- Create indexes for better performance on JSONB columns
CREATE INDEX IF NOT EXISTS idx_candidates_phf_work_experience ON public.candidates USING gin(phf_work_experience);
CREATE INDEX IF NOT EXISTS idx_candidates_phf_education ON public.candidates USING gin(phf_education);

-- Update the update_updated_at_column trigger to work with new columns
-- (The trigger should already exist and work automatically)

COMMENT ON COLUMN public.candidates.phf_work_experience IS 'Enhanced work experience data compatible with PHF format';
COMMENT ON COLUMN public.candidates.phf_education IS 'Enhanced education data compatible with PHF format';
COMMENT ON COLUMN public.candidates.dependants_detailed IS 'Detailed dependants information for PHF';
COMMENT ON COLUMN public.candidates.relatives_detailed IS 'Detailed relatives information for PHF';
COMMENT ON COLUMN public.candidates.motivation_letter IS 'User motivation letter for applications';