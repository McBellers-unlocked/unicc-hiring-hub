-- Fix division mapping: CSI belongs to CS, not DS
CREATE OR REPLACE FUNCTION public.can_approve_as_chief(p_user_id uuid, p_requisition_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_email text;
  v_user_division text;
  v_req_division text;
  v_req_unit text;
BEGIN
  -- Get user info
  SELECT email, division INTO v_user_email, v_user_division
  FROM users
  WHERE id = p_user_id;
  
  -- Get requisition unit
  SELECT unit_section_division INTO v_req_unit
  FROM job_requisitions
  WHERE id = p_requisition_id;
  
  -- Determine requisition division from unit name
  IF v_req_unit IS NOT NULL THEN
    v_req_unit := UPPER(v_req_unit);
    IF v_req_unit LIKE '%MS%' OR v_req_unit LIKE '%MSHT%' THEN
      v_req_division := 'MS';
    ELSIF v_req_unit LIKE '%DO%' OR v_req_unit LIKE '%DOP%' OR v_req_unit LIKE '%DDAM%' THEN
      v_req_division := 'DO';
    ELSIF v_req_unit LIKE '%OP%' THEN
      v_req_division := 'OP';
    ELSIF v_req_unit LIKE '%CSI%' THEN
      -- CSI (Cybersecurity Investigation) belongs to CS division
      v_req_division := 'CS';
    ELSIF v_req_unit LIKE '%DS%' OR v_req_unit LIKE '%CSA%' OR v_req_unit LIKE '%CYBER%' THEN
      -- DS division includes CSA, general Cyber units, etc.
      v_req_division := 'DS';
    ELSIF v_req_unit LIKE '%CS%' THEN
      -- Generic CS units belong to CS division
      v_req_division := 'CS';
    END IF;
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