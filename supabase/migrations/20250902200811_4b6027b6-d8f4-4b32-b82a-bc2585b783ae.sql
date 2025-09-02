-- Add missing RLS policies for application_history table
CREATE POLICY "Staff can view application history" ON public.application_history
  FOR SELECT USING (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'hr_assistant') OR
    public.has_role(auth.uid(), 'hiring_manager') OR
    public.has_role(auth.uid(), 'panel_member')
  );

CREATE POLICY "Staff can create application history" ON public.application_history
  FOR INSERT WITH CHECK (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'hr_assistant') OR
    public.has_role(auth.uid(), 'hiring_manager')
  );

-- Add missing RLS policies for interviews table
CREATE POLICY "Candidates can view their interview details" ON public.interviews
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.applications 
      WHERE id = application_id 
      AND candidate_id = auth.uid()
      AND public.has_role(auth.uid(), 'candidate')
    )
  );

CREATE POLICY "Staff can view all interviews" ON public.interviews
  FOR SELECT USING (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'hr_assistant') OR
    public.has_role(auth.uid(), 'hiring_manager') OR
    public.has_role(auth.uid(), 'panel_member')
  );

CREATE POLICY "Staff can manage interviews" ON public.interviews
  FOR ALL USING (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'hr_assistant') OR
    public.has_role(auth.uid(), 'hiring_manager')
  );

CREATE POLICY "Panel members can update their interviews" ON public.interviews
  FOR UPDATE USING (
    public.has_role(auth.uid(), 'panel_member') AND 
    auth.uid() = ANY(interviewer_ids)
  );