CREATE OR REPLACE FUNCTION public.can_approve_as_chief(p_user_id uuid, p_requisition_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user_email text;
  v_user_division text;
  v_req_division text;
  v_req_unit text;
  v_creator_division text;
BEGIN
  -- Get user info
  SELECT email, division INTO v_user_email, v_user_division
  FROM users
  WHERE id = p_user_id;
  
  -- Get requisition unit and creator's division
  SELECT jr.unit_section_division, u.division 
  INTO v_req_unit, v_creator_division
  FROM job_requisitions jr
  LEFT JOIN users u ON jr.created_by = u.id
  WHERE jr.id = p_requisition_id;
  
  -- Determine requisition division from unit name
  IF v_req_unit IS NOT NULL THEN
    v_req_unit := UPPER(v_req_unit);
    -- Check for CS division first to avoid conflicts
    IF v_req_unit LIKE '%CSI%' OR v_req_unit LIKE '%CSO%' OR v_req_unit LIKE '%CSE%' OR 
       v_req_unit LIKE '%CSN%' OR v_req_unit LIKE '%CSS%' OR v_req_unit LIKE '%CSR%' OR 
       v_req_unit LIKE '%CISO%' OR v_req_unit LIKE '%CYBER%' OR v_req_unit LIKE '%CSA%' THEN
      v_req_division := 'CS';
    -- DD must come BEFORE OP because "DEVELOPMENT" contains "OP"
    ELSIF v_req_unit LIKE '%DDC%' OR v_req_unit LIKE '%DDA%' OR v_req_unit LIKE '%DDD%' OR
          v_req_unit LIKE '%DDAI%' OR v_req_unit LIKE '%DDES%' OR v_req_unit LIKE '%DDE%' OR
          v_req_unit LIKE '%DDHA%' OR v_req_unit LIKE '%DDMS%' OR v_req_unit LIKE '%DDP%' OR
          v_req_unit LIKE '%DDPG%' OR v_req_unit LIKE '%DDPM%' OR v_req_unit LIKE '%DDPO%' OR
          v_req_unit LIKE '%DIGITAL DEVELOPMENT%' OR v_req_unit LIKE '%DIGITAL DELIVERY%' THEN
      v_req_division := 'DD';
    ELSIF v_req_unit LIKE '%MS%' OR v_req_unit LIKE '%MSHT%' OR v_req_unit LIKE '%MSL%' OR
          v_req_unit LIKE '%MSB%' OR v_req_unit LIKE '%MSBP%' OR v_req_unit LIKE '%MSF%' OR
          v_req_unit LIKE '%MSG%' OR v_req_unit LIKE '%MSH%' OR v_req_unit LIKE '%MSP%' THEN
      v_req_division := 'MS';
    ELSIF v_req_unit LIKE '%DO%' OR v_req_unit LIKE '%DOP%' OR v_req_unit LIKE '%DOE%' OR
          v_req_unit LIKE '%DOD%' OR v_req_unit LIKE '%DBR%' OR v_req_unit LIKE '%DIRECTOR%' THEN
      v_req_division := 'DO';
    ELSIF v_req_unit LIKE '%DS%' OR v_req_unit LIKE '%DSDP%' OR v_req_unit LIKE '%DSB%' OR
          v_req_unit LIKE '%DSCS%' OR v_req_unit LIKE '%DSDW%' OR v_req_unit LIKE '%DSL%' OR
          v_req_unit LIKE '%DSPS%' THEN
      v_req_division := 'DS';
    -- OP check must be more specific to avoid matching "DEVELOPMENT"
    ELSIF v_req_unit LIKE '%(OP)%' OR v_req_unit LIKE '%(OP%' OR v_req_unit LIKE '%OP)%' OR
          v_req_unit LIKE '%OPERATIONS%' THEN
      v_req_division := 'OP';
    END IF;
  END IF;
  
  -- Fallback: If we couldn't determine division from unit, use creator's division
  IF v_req_division IS NULL AND v_creator_division IS NOT NULL THEN
    v_req_division := v_creator_division;
  END IF;
  
  -- Check if user is a known chief and match them to their divisions
  CASE v_user_email
    -- Tima Soni approves all CS units
    WHEN 'soni@unicc.org' THEN
      RETURN v_req_division = 'CS';
    
    -- Anish Sethi approves all DS units
    WHEN 'sethi@unicc.org' THEN
      RETURN v_req_division = 'DS';
    
    -- Milena Grecuccio approves all MS and OP units
    WHEN 'grecuccio@unicc.org' THEN
      RETURN v_req_division IN ('MS', 'OP');
    
    -- Marco Liuzzi approves all DD units
    WHEN 'liuzzi@unicc.org' THEN
      RETURN v_req_division = 'DD';
    
    -- Chauhan approves all DO units
    WHEN 'chauhan@unicc.org' THEN
      RETURN v_req_division = 'DO';
    
    -- Anna Negyesi (Admin) can approve all
    WHEN 'negyesi@unicc.org' THEN
      RETURN true;
    
    ELSE
      RETURN false;
  END CASE;
END;
$function$;