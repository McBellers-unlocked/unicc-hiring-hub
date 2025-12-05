-- Create a function to get all reports (direct and indirect) for a manager
CREATE OR REPLACE FUNCTION public.get_all_reports(p_manager_name text)
RETURNS TABLE (
  id uuid,
  name text,
  job_title text,
  unit text,
  division text,
  line_manager text,
  depth integer
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH RECURSIVE reporting_tree AS (
    -- Base case: Direct reports (depth = 1)
    SELECT 
      u.id, 
      u.name, 
      u.job_title, 
      u.unit, 
      u.division, 
      u.line_manager, 
      1 as depth
    FROM users u
    WHERE u.line_manager = p_manager_name
    
    UNION ALL
    
    -- Recursive case: Indirect reports
    SELECT 
      u.id, 
      u.name, 
      u.job_title, 
      u.unit, 
      u.division, 
      u.line_manager, 
      rt.depth + 1
    FROM users u
    INNER JOIN reporting_tree rt ON u.line_manager = rt.name
    WHERE rt.depth < 10  -- Safety limit to prevent infinite recursion
  )
  SELECT * FROM reporting_tree ORDER BY depth, name;
$$;