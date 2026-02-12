
CREATE TABLE public.appointment_lifecycle_checklist (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  appointment_id uuid NOT NULL REFERENCES public.hr_appointments(id) ON DELETE CASCADE,
  stage_key text NOT NULL,
  item_key text NOT NULL,
  item_label text NOT NULL,
  completed boolean NOT NULL DEFAULT false,
  completed_at timestamptz,
  completed_by uuid REFERENCES public.users(id),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(appointment_id, stage_key, item_key)
);

ALTER TABLE public.appointment_lifecycle_checklist ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage appointment lifecycle checklists"
ON public.appointment_lifecycle_checklist
FOR ALL
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);
