-- 1. Table
CREATE TABLE public.org_units (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  unit text NOT NULL,
  parent_section text NOT NULL DEFAULT '',
  division text NOT NULL,
  manager text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','decommissioned')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE UNIQUE INDEX org_units_unit_lower_idx ON public.org_units (lower(unit));
CREATE INDEX org_units_division_idx ON public.org_units (division);
CREATE INDEX org_units_status_idx ON public.org_units (status);

-- 2. updated_at trigger
CREATE TRIGGER update_org_units_updated_at
BEFORE UPDATE ON public.org_units
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- 3. Helper function — does current user have org_units edit rights?
CREATE OR REPLACE FUNCTION public.can_edit_org_units(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = _user_id
      AND role IN ('Admin', 'HR Assistant', 'Chief of HR')
  )
$$;

-- 4. RLS
ALTER TABLE public.org_units ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view org units"
ON public.org_units FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admins/HR can insert org units"
ON public.org_units FOR INSERT
TO authenticated
WITH CHECK (public.can_edit_org_units(auth.uid()));

CREATE POLICY "Admins/HR can update org units"
ON public.org_units FOR UPDATE
TO authenticated
USING (public.can_edit_org_units(auth.uid()))
WITH CHECK (public.can_edit_org_units(auth.uid()));

CREATE POLICY "Admins/HR can delete org units"
ON public.org_units FOR DELETE
TO authenticated
USING (public.can_edit_org_units(auth.uid()));

-- 5. Seed from constants (matches DIVISIONS × DIVISION_UNITS in src/lib/organizationConstants.ts)
INSERT INTO public.org_units (full_name, unit, division) VALUES
  -- CS
  ('CISO Section', 'CISO', 'CS'),
  ('Investigative Support Unit', 'CSI', 'CS'),
  ('Cybersecurity Solutions & Strategy Unit', 'CSS', 'CS'),
  ('Cybersecurity Assurance & Architecture Section', 'CSA', 'CS'),
  ('Cybersecurity Engineering Unit', 'CSE', 'CS'),
  ('Cybersecurity Networking Unit', 'CSN', 'CS'),
  ('Cybersecurity Operations Section', 'CSO', 'CS'),
  ('Organizational Resilience Unit', 'CSR', 'CS'),
  -- DD
  ('Data and Artificial Intelligence Section', 'DDA', 'DD'),
  ('Digital Development Center Section', 'DDC', 'DD'),
  ('Digital Business Solutions Section', 'DDD', 'DD'),
  ('Artificial Intelligence and Machine Learning Unit', 'DDAI', 'DD'),
  ('Data Management Unit', 'DDAM', 'DD'),
  ('Enterprise Service Management Unit', 'DDES', 'DD'),
  ('Enterprise Solutions Section', 'DDE', 'DD'),
  ('Hyperautomation Solutions Unit', 'DDHA', 'DD'),
  ('MS Dynamics Unit', 'DDMS', 'DD'),
  ('Projects & Programmes Section', 'DDP', 'DD'),
  ('Programme Portfolio Unit', 'DDPG', 'DD'),
  ('Project Portfolio Unit', 'DDPM', 'DD'),
  ('Governance PMO Unit', 'DDPO', 'DD'),
  -- DS
  ('Digital Products Unit', 'DSDP', 'DS'),
  ('Business Solutions Unit', 'DSB', 'DS'),
  ('Digital Customer Services Unit', 'DSCS', 'DS'),
  ('Unite Digital Workspace Services Unit', 'DSDW', 'DS'),
  ('Learning Services Unit', 'DSL', 'DS'),
  ('Digital Public Solutions Unit', 'DSPS', 'DS'),
  -- DO
  ('UNICC Directorate', 'DOD', 'DO'),
  ('External Relations and Strategic Partnerships Section', 'DOE', 'DO'),
  ('Digital ID Programme', 'DOP', 'DO'),
  ('Business Relationship Management Section', 'DBR', 'DO'),
  -- MS
  ('Policy (Legal) Unit', 'MSL', 'MS'),
  ('Business Control Section', 'MSB', 'MS'),
  ('Process and Change Unit', 'MSBP', 'MS'),
  ('Finance and Accounting Section', 'MSF', 'MS'),
  ('GRC & QA Unit', 'MSG', 'MS'),
  ('Human Resources Section', 'MSH', 'MS'),
  ('Talent Unit', 'MSHT', 'MS'),
  ('Procurement Section', 'MSP', 'MS'),
  -- OP
  ('Infrastructure and Platform Operations Unit', 'OPBO', 'OP'),
  ('Customer IT Resilience Team', 'OPBR', 'OP'),
  ('Data Center Support Unit', 'OPBS', 'OP'),
  ('Customer Services Centre', 'OPC', 'OP'),
  ('Service Desk Unit', 'OPCS', 'OP'),
  ('Cloud Services Section', 'OPD', 'OP'),
  ('Cloud Operations and Platform Service Unit', 'OPDA', 'OP'),
  ('Digital Workplace Service Unit', 'OPDM', 'OP'),
  ('Infrastructure and Operations Business Section', 'OPM', 'OP'),
  ('Service Excellence Unit', 'OPMX', 'OP'),
  ('On-premise Services', 'OPO', 'OP'),
  ('Platform Architecture and Service Automation Unit', 'OPOA', 'OP'),
  ('Oracle Unit', 'OPOU', 'OP'),
  ('SAP Unit', 'OPOS', 'OP');