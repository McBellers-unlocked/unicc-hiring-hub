-- Update address fields to separate components
ALTER TABLE public.candidates 
ADD COLUMN present_address_line1 TEXT,
ADD COLUMN present_address_line2 TEXT,
ADD COLUMN present_city TEXT,
ADD COLUMN present_country TEXT,
ADD COLUMN permanent_address_line1 TEXT,
ADD COLUMN permanent_address_line2 TEXT,
ADD COLUMN permanent_city TEXT,
ADD COLUMN permanent_country TEXT;