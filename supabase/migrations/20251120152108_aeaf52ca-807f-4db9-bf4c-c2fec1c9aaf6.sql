-- Update the can_approve_as_chief function to properly handle DD division units
CREATE OR REPLACE FUNCTION can_approve_as_chief(p_user_id uuid, p_requisition_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
       v_req_unit LIKE '%CISO%' THEN
      v_req_division := 'CS';
    ELSIF v_req_unit LIKE '%CYBER%' OR v_req_unit LIKE '%CSA%' THEN
      v_req_division := 'CS';
    ELSIF v_req_unit LIKE '%MS%' OR v_req_unit LIKE '%MSHT%' THEN
      v_req_division := 'MS';
    ELSIF v_req_unit LIKE '%DO%' OR v_req_unit LIKE '%DOP%' OR v_req_unit LIKE '%DDAM%' THEN
      v_req_division := 'DO';
    ELSIF v_req_unit LIKE '%OP%' THEN
      v_req_division := 'OP';
    ELSIF v_req_unit LIKE '%DS%' THEN
      v_req_division := 'DS';
    ELSIF v_req_unit LIKE '%(DD%' OR v_req_unit LIKE '%DDHA%' OR v_req_unit LIKE '%DD)%' THEN
      -- Extract DD division from patterns like "Unit (DDHA)" or "Unit (DD)"
      v_req_division := 'DD';
    END IF;
  END IF;
  
  -- Fallback: If we couldn't determine division from unit, use creator's division
  IF v_req_division IS NULL AND v_creator_division IS NOT NULL THEN
    v_req_division := v_creator_division;
  END IF;
  
  -- Check if user is a known chief
  IF v_user_email IN ('negyesi@unicc.org', 'soni@unicc.org', 'liuzzi@unicc.org', 'sethi@unicc.org', 'chauhan@unicc.org', 'grecuccio@unicc.org') THEN
    -- Milena (grecuccio) covers MS and OP
    IF v_user_email = 'grecuccio@unicc.org' AND v_req_division IN ('MS', 'OP') THEN
      RETURN true;
    END IF;
    
    -- MS chiefs also cover OP
    IF v_user_division = 'MS' AND v_req_division IN ('MS', 'OP') THEN
      RETURN true;
    END IF;
    
    -- Other chiefs match their division
    IF v_user_division = v_req_division THEN
      RETURN true;
    END IF;
  END IF;
  
  RETURN false;
END;
$$;