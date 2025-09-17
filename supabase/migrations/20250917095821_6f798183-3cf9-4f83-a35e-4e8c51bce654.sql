-- Fix the generate_position_description_reference function
CREATE OR REPLACE FUNCTION public.generate_position_description_reference(p_nature_of_position text, p_duty_station text)
 RETURNS text
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
  IF p_duty_station IS NULL OR p_duty_station = '[]' OR p_duty_station = '' THEN
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
        COUNT(CASE WHEN location ILIKE '%new york%' THEN 1 END) as ny_count,
        COUNT(CASE WHEN location ILIKE '%rome%' THEN 1 END) as rome_count
      FROM locations
    )
    SELECT 
      CASE 
        WHEN total_locations > 1 THEN 'MUL'
        WHEN valencia_count > 0 THEN 'VAL'
        WHEN brindisi_count > 0 THEN 'BSI'
        WHEN geneva_count > 0 THEN 'GVA'
        WHEN ny_count > 0 THEN 'NY'
        WHEN rome_count > 0 THEN 'ROM'
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
        AND length(split_part(reference_number, '/', 4)) > 0
        AND split_part(reference_number, '/', 4) ~ '^[0-9]+$';
      
      reference := base_pattern || sequence_num::TEXT;
      
    WHEN 'Temporary' THEN
      base_pattern := 'ICC/' || year_str || '/' || location_code || '/';
      -- Get next sequence number for this pattern
      SELECT COALESCE(MAX(CAST(split_part(reference_number, '/', 4) AS INTEGER)), 0) + 1
      INTO sequence_num
      FROM public.job_requisitions
      WHERE reference_number LIKE base_pattern || '%'
        AND length(split_part(reference_number, '/', 4)) > 0
        AND split_part(reference_number, '/', 4) ~ '^[0-9]+$';
      
      reference := base_pattern || sequence_num::TEXT;
      
    WHEN 'STDA' THEN
      base_pattern := 'STDA/' || year_str || '/' || location_code || '/';
      SELECT COALESCE(MAX(CAST(split_part(reference_number, '/', 4) AS INTEGER)), 0) + 1
      INTO sequence_num
      FROM public.job_requisitions
      WHERE reference_number LIKE base_pattern || '%'
        AND length(split_part(reference_number, '/', 4)) > 0
        AND split_part(reference_number, '/', 4) ~ '^[0-9]+$';
        
      reference := base_pattern || sequence_num::TEXT;
      
    WHEN 'Individual Consultant' THEN
      base_pattern := 'ICC/' || year_str || '/Cons/';
      -- Get next sequence number for consultant pattern
      SELECT COALESCE(MAX(CAST(split_part(reference_number, '/', 4) AS INTEGER)), 0) + 1
      INTO sequence_num
      FROM public.job_requisitions
      WHERE reference_number LIKE base_pattern || '%'
        AND length(split_part(reference_number, '/', 4)) > 0
        AND split_part(reference_number, '/', 4) ~ '^[0-9]+$';
      
      reference := base_pattern || sequence_num::TEXT;
      
    WHEN 'Intern' THEN
      base_pattern := 'ICC/' || year_str || '/Intern/';
      -- Get next sequence number for intern pattern
      SELECT COALESCE(MAX(CAST(split_part(reference_number, '/', 4) AS INTEGER)), 0) + 1
      INTO sequence_num
      FROM public.job_requisitions
      WHERE reference_number LIKE base_pattern || '%'
        AND length(split_part(reference_number, '/', 4)) > 0
        AND split_part(reference_number, '/', 4) ~ '^[0-9]+$';
      
      reference := base_pattern || sequence_num::TEXT;
      
    ELSE
      -- Default to fixed term pattern
      base_pattern := 'ICC/' || year_str || '/' || location_code || '/';
      SELECT COALESCE(MAX(CAST(split_part(reference_number, '/', 4) AS INTEGER)), 0) + 1
      INTO sequence_num
      FROM public.job_requisitions
      WHERE reference_number LIKE base_pattern || '%'
        AND length(split_part(reference_number, '/', 4)) > 0
        AND split_part(reference_number, '/', 4) ~ '^[0-9]+$';
      
      reference := base_pattern || sequence_num::TEXT;
  END CASE;
  
  RETURN reference;
END;
$function$