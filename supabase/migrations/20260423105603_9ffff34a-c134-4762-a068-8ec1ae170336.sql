-- Create users_clean table
CREATE TABLE public.users_clean (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- GSM fields
  full_name text,
  gsm_staff_number text,
  nationality text,
  gsm_gender text,
  date_of_birth text,
  gsm_email_address text,
  service_time_current_org text,
  official_duty_station text,
  apa_start_date text,
  job_name text,
  position_name text,
  first_incumbency_start_date date,
  entry_on_duty_date_who date,
  appointment_type text,
  contract_start_date text,
  contract_end_date text,
  current_grade text,
  current_step text,
  reporting_lines text,
  category text,
  -- Samsaran fields
  first_name text,
  last_name text,
  search_name text,
  samsaran_gender text,
  samsaran_staff_number text,
  samsaran_email_address text,
  worker_type text,
  intern text,
  unit text,
  job_title text,
  line_manager text,
  office_location text,
  division text,
  -- Bookkeeping
  match_key text,
  source text NOT NULL,
  imported_at timestamptz NOT NULL DEFAULT now(),
  imported_by uuid REFERENCES auth.users(id)
);

CREATE INDEX users_clean_match_key_idx ON public.users_clean(match_key);
CREATE INDEX users_clean_email_idx ON public.users_clean(lower(coalesce(samsaran_email_address, gsm_email_address)));
CREATE INDEX users_clean_division_idx ON public.users_clean(division);
CREATE INDEX users_clean_unit_idx ON public.users_clean(unit);
CREATE INDEX users_clean_worker_type_idx ON public.users_clean(worker_type);
CREATE INDEX users_clean_imported_at_idx ON public.users_clean(imported_at DESC);

ALTER TABLE public.users_clean ENABLE ROW LEVEL SECURITY;

-- SELECT: Admin, HR Assistant, Chief of HR
CREATE POLICY "users_clean_select_admin_hr"
ON public.users_clean
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.id = auth.uid()
      AND u.role IN ('Admin', 'HR Assistant', 'Chief of HR')
  )
);

-- INSERT: Admin, HR Assistant
CREATE POLICY "users_clean_insert_admin_hr"
ON public.users_clean
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.id = auth.uid()
      AND u.role IN ('Admin', 'HR Assistant')
  )
);

-- UPDATE: Admin, HR Assistant
CREATE POLICY "users_clean_update_admin_hr"
ON public.users_clean
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.id = auth.uid()
      AND u.role IN ('Admin', 'HR Assistant')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.id = auth.uid()
      AND u.role IN ('Admin', 'HR Assistant')
  )
);

-- DELETE: Admin, HR Assistant
CREATE POLICY "users_clean_delete_admin_hr"
ON public.users_clean
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.id = auth.uid()
      AND u.role IN ('Admin', 'HR Assistant')
  )
);