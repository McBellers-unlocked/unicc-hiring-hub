ALTER TABLE public.hr_transfers 
ADD COLUMN change_types text[],
ADD COLUMN new_duty_station text,
ADD COLUMN new_section_unit text,
ADD COLUMN new_supervisor text;