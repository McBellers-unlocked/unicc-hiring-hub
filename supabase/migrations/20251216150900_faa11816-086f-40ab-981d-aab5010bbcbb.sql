-- Add columns to performance_cycles for individual cycles
ALTER TABLE public.performance_cycles 
ADD COLUMN IF NOT EXISTS cycle_type TEXT DEFAULT 'organization' CHECK (cycle_type IN ('organization', 'probation', 'transition')),
ADD COLUMN IF NOT EXISTS staff_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS is_auto_generated BOOLEAN DEFAULT false;

-- Add index for staff_id lookups
CREATE INDEX IF NOT EXISTS idx_performance_cycles_staff_id ON public.performance_cycles(staff_id);
CREATE INDEX IF NOT EXISTS idx_performance_cycles_cycle_type ON public.performance_cycles(cycle_type);

-- Add probation_end_date to users table
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS probation_end_date DATE;

-- Update RLS policies to allow staff to view their own individual cycles
DROP POLICY IF EXISTS "Staff can view own individual cycles" ON public.performance_cycles;
CREATE POLICY "Staff can view own individual cycles"
ON public.performance_cycles
FOR SELECT
USING (
  staff_id = auth.uid() 
  OR staff_id IS NULL 
  OR has_role(auth.uid(), 'Admin'::user_role) 
  OR has_role(auth.uid(), 'HR Assistant'::user_role) 
  OR has_role(auth.uid(), 'Chief of HR'::user_role)
);