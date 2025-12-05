-- Create skill_definitions table (skill catalog)
CREATE TABLE public.skill_definitions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL DEFAULT 'General',
  description TEXT,
  order_index INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create skill_assessments table (individual assessments with workflow)
CREATE TABLE public.skill_assessments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  skill_id UUID NOT NULL REFERENCES public.skill_definitions(id) ON DELETE CASCADE,
  self_assessment INTEGER CHECK (self_assessment >= 1 AND self_assessment <= 5),
  manager_assessment INTEGER CHECK (manager_assessment >= 1 AND manager_assessment <= 5),
  required_level INTEGER CHECK (required_level >= 1 AND required_level <= 5),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'pending_approval', 'approved', 'rejected')),
  remarks TEXT,
  expiration_date DATE,
  attachments JSONB DEFAULT '[]'::jsonb,
  assessed_at TIMESTAMP WITH TIME ZONE,
  assessed_by UUID REFERENCES public.users(id),
  approved_at TIMESTAMP WITH TIME ZONE,
  approved_by UUID REFERENCES public.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, skill_id)
);

-- Create team_skill_requirements table (manager-set requirements for team)
CREATE TABLE public.team_skill_requirements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  manager_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  skill_id UUID NOT NULL REFERENCES public.skill_definitions(id) ON DELETE CASCADE,
  required_level INTEGER NOT NULL CHECK (required_level >= 1 AND required_level <= 5),
  applies_to_division TEXT,
  applies_to_unit TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.skill_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.skill_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_skill_requirements ENABLE ROW LEVEL SECURITY;

-- RLS for skill_definitions (everyone can view, admin/HR can manage)
CREATE POLICY "Anyone can view skill definitions"
  ON public.skill_definitions FOR SELECT
  USING (true);

CREATE POLICY "Admin and HR can manage skill definitions"
  ON public.skill_definitions FOR ALL
  USING (has_role(auth.uid(), 'Admin'::user_role) OR has_role(auth.uid(), 'HR Assistant'::user_role) OR has_role(auth.uid(), 'Chief of HR'::user_role));

-- RLS for skill_assessments
CREATE POLICY "Users can view their own assessments"
  ON public.skill_assessments FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Managers can view team assessments"
  ON public.skill_assessments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users u 
      WHERE u.id = skill_assessments.user_id 
      AND u.line_manager = (SELECT name FROM public.users WHERE id = auth.uid())
    )
    OR has_role(auth.uid(), 'Admin'::user_role) 
    OR has_role(auth.uid(), 'HR Assistant'::user_role) 
    OR has_role(auth.uid(), 'Chief of HR'::user_role)
  );

CREATE POLICY "Users can create their own assessments"
  ON public.skill_assessments FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own draft assessments"
  ON public.skill_assessments FOR UPDATE
  USING (user_id = auth.uid() AND status IN ('draft', 'rejected'));

CREATE POLICY "Managers can update team assessments"
  ON public.skill_assessments FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.users u 
      WHERE u.id = skill_assessments.user_id 
      AND u.line_manager = (SELECT name FROM public.users WHERE id = auth.uid())
    )
    OR has_role(auth.uid(), 'Admin'::user_role) 
    OR has_role(auth.uid(), 'HR Assistant'::user_role) 
    OR has_role(auth.uid(), 'Chief of HR'::user_role)
  );

CREATE POLICY "Admin and HR can manage all assessments"
  ON public.skill_assessments FOR ALL
  USING (has_role(auth.uid(), 'Admin'::user_role) OR has_role(auth.uid(), 'HR Assistant'::user_role) OR has_role(auth.uid(), 'Chief of HR'::user_role));

-- RLS for team_skill_requirements
CREATE POLICY "Managers can view their own requirements"
  ON public.team_skill_requirements FOR SELECT
  USING (manager_id = auth.uid() OR has_role(auth.uid(), 'Admin'::user_role) OR has_role(auth.uid(), 'HR Assistant'::user_role) OR has_role(auth.uid(), 'Chief of HR'::user_role));

CREATE POLICY "Managers can manage their own requirements"
  ON public.team_skill_requirements FOR ALL
  USING (manager_id = auth.uid() OR has_role(auth.uid(), 'Admin'::user_role) OR has_role(auth.uid(), 'HR Assistant'::user_role) OR has_role(auth.uid(), 'Chief of HR'::user_role));

-- Create indexes for performance
CREATE INDEX idx_skill_assessments_user_id ON public.skill_assessments(user_id);
CREATE INDEX idx_skill_assessments_skill_id ON public.skill_assessments(skill_id);
CREATE INDEX idx_skill_assessments_status ON public.skill_assessments(status);
CREATE INDEX idx_skill_definitions_category ON public.skill_definitions(category);
CREATE INDEX idx_team_skill_requirements_manager ON public.team_skill_requirements(manager_id);

-- Create trigger for updated_at
CREATE TRIGGER update_skill_definitions_updated_at
  BEFORE UPDATE ON public.skill_definitions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_skill_assessments_updated_at
  BEFORE UPDATE ON public.skill_assessments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_team_skill_requirements_updated_at
  BEFORE UPDATE ON public.team_skill_requirements
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed initial skill categories from existing user skills
INSERT INTO public.skill_definitions (name, category)
SELECT DISTINCT 
  TRIM(skill::text) as name,
  'General' as category
FROM public.users, 
  jsonb_array_elements_text(COALESCE(skills, '[]'::jsonb)) as skill
WHERE TRIM(skill::text) != ''
ON CONFLICT (name) DO NOTHING;