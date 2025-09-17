-- Drop the existing function
DROP FUNCTION IF EXISTS public.generate_requisition_reference();

-- Create new function with updated naming convention
CREATE OR REPLACE FUNCTION public.generate_position_description_reference(
  p_nature_of_position TEXT,
  p_duty_station TEXT
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  year_str TEXT;
  location_code TEXT;
  sequence_num INTEGER;
  reference TEXT;
  base_pattern TEXT;
BEGIN
  -- Get current year (2 digits)
  year_str := to_char(now(), 'YY');
  
  -- Parse duty station JSON array to determine location code
  IF p_duty_station IS NULL OR p_duty_station = '[]' THEN
    location_code := 'VAL'; -- Default to Valencia
  ELSE
    -- Extract locations from JSON array
    WITH locations AS (
      SELECT json_array_elements_text(p_duty_station::json) as location
    ),
    location_counts AS (
      SELECT 
        COUNT(DISTINCT location) as total_locations,
        COUNT(CASE WHEN location ILIKE '%valencia%' THEN 1 END) as valencia_count,
        COUNT(CASE WHEN location ILIKE '%brindisi%' THEN 1 END) as brindisi_count,
        COUNT(CASE WHEN location ILIKE '%geneva%' THEN 1 END) as geneva_count,
        COUNT(CASE WHEN location ILIKE '%new york%' THEN 1 END) as ny_count
      FROM locations
    )
    SELECT 
      CASE 
        WHEN total_locations > 1 THEN 'MUL'
        WHEN valencia_count > 0 THEN 'VAL'
        WHEN brindisi_count > 0 THEN 'BSI'
        WHEN geneva_count > 0 THEN 'GVA'
        WHEN ny_count > 0 THEN 'NY'
        ELSE 'VAL'
      END
    INTO location_code
    FROM location_counts;
  END IF;
  
  -- Determine base pattern and sequence logic based on position type
  CASE p_nature_of_position
    WHEN 'Fixed term' THEN
      base_pattern := 'ICC/' || year_str || '/' || location_code || '/';
      -- Get next sequence number for this pattern
      SELECT COALESCE(MAX(CAST(split_part(reference_number, '/', 4) AS INTEGER)), 0) + 1
      INTO sequence_num
      FROM public.job_requisitions
      WHERE reference_number LIKE base_pattern || '%'
        AND reference_number ~ '^ICC/[0-9]{2}/' || location_code || '/[0-9]+$';
      
      reference := base_pattern || LPAD(sequence_num::TEXT, 3, '0');
      
    WHEN 'STDA' THEN
      base_pattern := 'STDA/' || year_str || '/' || location_code || '/';
      reference := base_pattern || '1';
      
    WHEN 'Individual Consultant' THEN
      base_pattern := 'ICC/' || year_str || '/Cons/';
      -- Get next sequence number for consultant pattern
      SELECT COALESCE(MAX(CAST(split_part(reference_number, '/', 4) AS INTEGER)), 0) + 1
      INTO sequence_num
      FROM public.job_requisitions
      WHERE reference_number LIKE base_pattern || '%'
        AND reference_number ~ '^ICC/[0-9]{2}/Cons/[0-9]+$';
      
      reference := base_pattern || LPAD(sequence_num::TEXT, 3, '0');
      
    WHEN 'Intern' THEN
      base_pattern := 'ICC/' || year_str || '/Intern/';
      -- Get next sequence number for intern pattern
      SELECT COALESCE(MAX(CAST(split_part(reference_number, '/', 4) AS INTEGER)), 0) + 1
      INTO sequence_num
      FROM public.job_requisitions
      WHERE reference_number LIKE base_pattern || '%'
        AND reference_number ~ '^ICC/[0-9]{2}/Intern/[0-9]+$';
      
      reference := base_pattern || LPAD(sequence_num::TEXT, 3, '0');
      
    ELSE
      -- Default to temporary pattern
      base_pattern := 'ICC/' || year_str || '/' || location_code || '/';
      SELECT COALESCE(MAX(CAST(split_part(reference_number, '/', 4) AS INTEGER)), 0) + 1
      INTO sequence_num
      FROM public.job_requisitions
      WHERE reference_number LIKE base_pattern || '%';
      
      reference := base_pattern || LPAD(sequence_num::TEXT, 3, '0');
  END CASE;
  
  RETURN reference;
END;
$function$