-- ePMDS Performance Management System Tables

-- 1. Performance Cycles - Manage annual cycles
CREATE TABLE public.performance_cycles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  begin_year_deadline DATE,
  mid_year_deadline DATE,
  end_year_deadline DATE,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'completed', 'archived')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES public.users(id)
);

-- 2. Workplans - Core document linking staff to supervisors
CREATE TABLE public.workplans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cycle_id UUID NOT NULL REFERENCES public.performance_cycles(id) ON DELETE CASCADE,
  staff_id UUID NOT NULL REFERENCES public.users(id),
  supervisor1_id UUID REFERENCES public.users(id),
  supervisor2_id UUID REFERENCES public.users(id),
  is_supervisor_role BOOLEAN DEFAULT false,
  current_phase TEXT NOT NULL DEFAULT 'begin_year' CHECK (current_phase IN ('begin_year', 'mid_year', 'end_year', 'completed')),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'in_progress', 'pending_supervisor', 'approved', 'completed')),
  
  -- Begin-Year signatures
  begin_year_staff_signed_at TIMESTAMP WITH TIME ZONE,
  begin_year_supervisor1_signed_at TIMESTAMP WITH TIME ZONE,
  begin_year_supervisor2_signed_at TIMESTAMP WITH TIME ZONE,
  
  -- Mid-Year signatures
  mid_year_staff_signed_at TIMESTAMP WITH TIME ZONE,
  mid_year_supervisor1_signed_at TIMESTAMP WITH TIME ZONE,
  mid_year_supervisor2_signed_at TIMESTAMP WITH TIME ZONE,
  
  -- End-Year signatures
  end_year_staff_signed_at TIMESTAMP WITH TIME ZONE,
  end_year_supervisor1_signed_at TIMESTAMP WITH TIME ZONE,
  end_year_supervisor2_signed_at TIMESTAMP WITH TIME ZONE,
  
  -- End-Year evaluation comments (staff)
  staff_achievements_comment TEXT,
  staff_challenges_comment TEXT,
  staff_support_comment TEXT,
  
  -- End-Year evaluation comments (supervisor)
  supervisor_achievements_comment TEXT,
  supervisor_challenges_comment TEXT,
  supervisor_support_comment TEXT,
  
  overall_rating INTEGER CHECK (overall_rating >= 1 AND overall_rating <= 5),
  mandatory_training_completed BOOLEAN DEFAULT false,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  UNIQUE(cycle_id, staff_id)
);

-- 3. Budget Outputs - Reference table for Programme Budget outputs
CREATE TABLE public.budget_outputs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL,
  programme TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 4. Workplan Objectives - SMART Objectives (3-5 per workplan)
CREATE TABLE public.workplan_objectives (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workplan_id UUID NOT NULL REFERENCES public.workplans(id) ON DELETE CASCADE,
  order_index INTEGER NOT NULL DEFAULT 0,
  title TEXT NOT NULL,
  description TEXT,
  output_id UUID REFERENCES public.budget_outputs(id),
  planned_time_percent INTEGER CHECK (planned_time_percent >= 0 AND planned_time_percent <= 100),
  actual_time_percent INTEGER CHECK (actual_time_percent >= 0 AND actual_time_percent <= 100),
  status TEXT DEFAULT 'not_started' CHECK (status IN ('not_started', 'on_track', 'delayed', 'completed', 'cancelled')),
  mid_year_progress TEXT,
  staff_rating INTEGER CHECK (staff_rating >= 1 AND staff_rating <= 5),
  supervisor_rating INTEGER CHECK (supervisor_rating >= 1 AND supervisor_rating <= 5),
  staff_comment TEXT,
  supervisor_comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 5. Workplan Competencies - Competencies with ratings
CREATE TABLE public.workplan_competencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workplan_id UUID NOT NULL REFERENCES public.workplans(id) ON DELETE CASCADE,
  competency_name TEXT NOT NULL,
  competency_type TEXT NOT NULL CHECK (competency_type IN ('mandatory', 'optional')),
  description TEXT,
  order_index INTEGER NOT NULL DEFAULT 0,
  staff_rating INTEGER CHECK (staff_rating >= 1 AND staff_rating <= 5),
  supervisor_rating INTEGER CHECK (supervisor_rating >= 1 AND supervisor_rating <= 5),
  staff_comment TEXT,
  supervisor_comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 6. Workplan Team Objectives - Team goals
CREATE TABLE public.workplan_team_objectives (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workplan_id UUID NOT NULL REFERENCES public.workplans(id) ON DELETE CASCADE,
  objective_type TEXT NOT NULL CHECK (objective_type IN ('learning_organization', 'respectful_workplace', 'custom')),
  title TEXT NOT NULL,
  description TEXT,
  individual_contribution TEXT,
  status TEXT DEFAULT 'not_started' CHECK (status IN ('not_started', 'on_track', 'delayed', 'completed')),
  staff_rating INTEGER CHECK (staff_rating >= 1 AND staff_rating <= 5),
  supervisor_rating INTEGER CHECK (supervisor_rating >= 1 AND supervisor_rating <= 5),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 7. Workplan Learning Plans - L&D section
CREATE TABLE public.workplan_learning_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workplan_id UUID NOT NULL REFERENCES public.workplans(id) ON DELETE CASCADE,
  learning_areas JSONB DEFAULT '[]'::jsonb,
  learning_methods JSONB DEFAULT '[]'::jsonb,
  learning_reasons JSONB DEFAULT '[]'::jsonb,
  description TEXT,
  end_year_comment TEXT,
  achievements TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(workplan_id)
);

-- Enable RLS on all tables
ALTER TABLE public.performance_cycles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workplans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budget_outputs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workplan_objectives ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workplan_competencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workplan_team_objectives ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workplan_learning_plans ENABLE ROW LEVEL SECURITY;

-- RLS Policies for performance_cycles
CREATE POLICY "Anyone can view active cycles" ON public.performance_cycles
  FOR SELECT USING (status = 'active' OR has_role(auth.uid(), 'Admin'::user_role) OR has_role(auth.uid(), 'HR Assistant'::user_role) OR has_role(auth.uid(), 'Chief of HR'::user_role));

CREATE POLICY "HR can manage cycles" ON public.performance_cycles
  FOR ALL USING (has_role(auth.uid(), 'Admin'::user_role) OR has_role(auth.uid(), 'HR Assistant'::user_role) OR has_role(auth.uid(), 'Chief of HR'::user_role));

-- RLS Policies for workplans
CREATE POLICY "Staff can view own workplan" ON public.workplans
  FOR SELECT USING (staff_id = auth.uid() OR supervisor1_id = auth.uid() OR supervisor2_id = auth.uid());

CREATE POLICY "Staff can update own workplan" ON public.workplans
  FOR UPDATE USING (staff_id = auth.uid() OR supervisor1_id = auth.uid() OR supervisor2_id = auth.uid());

CREATE POLICY "Staff can create own workplan" ON public.workplans
  FOR INSERT WITH CHECK (staff_id = auth.uid());

CREATE POLICY "HR can manage all workplans" ON public.workplans
  FOR ALL USING (has_role(auth.uid(), 'Admin'::user_role) OR has_role(auth.uid(), 'HR Assistant'::user_role) OR has_role(auth.uid(), 'Chief of HR'::user_role));

-- RLS Policies for budget_outputs
CREATE POLICY "Anyone can view budget outputs" ON public.budget_outputs
  FOR SELECT USING (true);

CREATE POLICY "HR can manage budget outputs" ON public.budget_outputs
  FOR ALL USING (has_role(auth.uid(), 'Admin'::user_role) OR has_role(auth.uid(), 'HR Assistant'::user_role) OR has_role(auth.uid(), 'Chief of HR'::user_role));

-- RLS Policies for workplan_objectives
CREATE POLICY "Users can view objectives for accessible workplans" ON public.workplan_objectives
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.workplans w 
      WHERE w.id = workplan_id 
      AND (w.staff_id = auth.uid() OR w.supervisor1_id = auth.uid() OR w.supervisor2_id = auth.uid())
    )
    OR has_role(auth.uid(), 'Admin'::user_role) 
    OR has_role(auth.uid(), 'HR Assistant'::user_role) 
    OR has_role(auth.uid(), 'Chief of HR'::user_role)
  );

CREATE POLICY "Users can manage objectives for accessible workplans" ON public.workplan_objectives
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.workplans w 
      WHERE w.id = workplan_id 
      AND (w.staff_id = auth.uid() OR w.supervisor1_id = auth.uid() OR w.supervisor2_id = auth.uid())
    )
    OR has_role(auth.uid(), 'Admin'::user_role) 
    OR has_role(auth.uid(), 'HR Assistant'::user_role) 
    OR has_role(auth.uid(), 'Chief of HR'::user_role)
  );

-- RLS Policies for workplan_competencies
CREATE POLICY "Users can view competencies for accessible workplans" ON public.workplan_competencies
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.workplans w 
      WHERE w.id = workplan_id 
      AND (w.staff_id = auth.uid() OR w.supervisor1_id = auth.uid() OR w.supervisor2_id = auth.uid())
    )
    OR has_role(auth.uid(), 'Admin'::user_role) 
    OR has_role(auth.uid(), 'HR Assistant'::user_role) 
    OR has_role(auth.uid(), 'Chief of HR'::user_role)
  );

CREATE POLICY "Users can manage competencies for accessible workplans" ON public.workplan_competencies
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.workplans w 
      WHERE w.id = workplan_id 
      AND (w.staff_id = auth.uid() OR w.supervisor1_id = auth.uid() OR w.supervisor2_id = auth.uid())
    )
    OR has_role(auth.uid(), 'Admin'::user_role) 
    OR has_role(auth.uid(), 'HR Assistant'::user_role) 
    OR has_role(auth.uid(), 'Chief of HR'::user_role)
  );

-- RLS Policies for workplan_team_objectives
CREATE POLICY "Users can view team objectives for accessible workplans" ON public.workplan_team_objectives
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.workplans w 
      WHERE w.id = workplan_id 
      AND (w.staff_id = auth.uid() OR w.supervisor1_id = auth.uid() OR w.supervisor2_id = auth.uid())
    )
    OR has_role(auth.uid(), 'Admin'::user_role) 
    OR has_role(auth.uid(), 'HR Assistant'::user_role) 
    OR has_role(auth.uid(), 'Chief of HR'::user_role)
  );

CREATE POLICY "Users can manage team objectives for accessible workplans" ON public.workplan_team_objectives
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.workplans w 
      WHERE w.id = workplan_id 
      AND (w.staff_id = auth.uid() OR w.supervisor1_id = auth.uid() OR w.supervisor2_id = auth.uid())
    )
    OR has_role(auth.uid(), 'Admin'::user_role) 
    OR has_role(auth.uid(), 'HR Assistant'::user_role) 
    OR has_role(auth.uid(), 'Chief of HR'::user_role)
  );

-- RLS Policies for workplan_learning_plans
CREATE POLICY "Users can view learning plans for accessible workplans" ON public.workplan_learning_plans
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.workplans w 
      WHERE w.id = workplan_id 
      AND (w.staff_id = auth.uid() OR w.supervisor1_id = auth.uid() OR w.supervisor2_id = auth.uid())
    )
    OR has_role(auth.uid(), 'Admin'::user_role) 
    OR has_role(auth.uid(), 'HR Assistant'::user_role) 
    OR has_role(auth.uid(), 'Chief of HR'::user_role)
  );

CREATE POLICY "Users can manage learning plans for accessible workplans" ON public.workplan_learning_plans
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.workplans w 
      WHERE w.id = workplan_id 
      AND (w.staff_id = auth.uid() OR w.supervisor1_id = auth.uid() OR w.supervisor2_id = auth.uid())
    )
    OR has_role(auth.uid(), 'Admin'::user_role) 
    OR has_role(auth.uid(), 'HR Assistant'::user_role) 
    OR has_role(auth.uid(), 'Chief of HR'::user_role)
  );

-- Create updated_at triggers
CREATE TRIGGER update_performance_cycles_updated_at
  BEFORE UPDATE ON public.performance_cycles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_workplans_updated_at
  BEFORE UPDATE ON public.workplans
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_workplan_objectives_updated_at
  BEFORE UPDATE ON public.workplan_objectives
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_workplan_competencies_updated_at
  BEFORE UPDATE ON public.workplan_competencies
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_workplan_team_objectives_updated_at
  BEFORE UPDATE ON public.workplan_team_objectives
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_workplan_learning_plans_updated_at
  BEFORE UPDATE ON public.workplan_learning_plans
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Insert some sample budget outputs
INSERT INTO public.budget_outputs (code, description, programme) VALUES
  ('1.1', 'Effective ICT strategy and governance', 'Programme 1'),
  ('1.2', 'Secure and reliable ICT infrastructure', 'Programme 1'),
  ('2.1', 'Digital workplace solutions', 'Programme 2'),
  ('2.2', 'Enterprise applications and services', 'Programme 2'),
  ('3.1', 'Cybersecurity and risk management', 'Programme 3'),
  ('3.2', 'Data protection and privacy', 'Programme 3');