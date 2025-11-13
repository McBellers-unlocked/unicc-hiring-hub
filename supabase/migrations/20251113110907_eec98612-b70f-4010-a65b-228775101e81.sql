-- Create requisition field comments table
CREATE TABLE public.requisition_field_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  requisition_id UUID NOT NULL REFERENCES public.job_requisitions(id) ON DELETE CASCADE,
  field_name TEXT NOT NULL,
  comment_text TEXT NOT NULL,
  author_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  parent_comment_id UUID REFERENCES public.requisition_field_comments(id) ON DELETE CASCADE,
  is_resolved BOOLEAN NOT NULL DEFAULT false,
  resolved_by UUID REFERENCES public.users(id),
  resolved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.requisition_field_comments ENABLE ROW LEVEL SECURITY;

-- Staff can view comments on requisitions they have access to
CREATE POLICY "Staff can view requisition comments"
ON public.requisition_field_comments
FOR SELECT
USING (
  has_role(auth.uid(), 'Admin'::user_role) OR
  has_role(auth.uid(), 'HR Assistant'::user_role) OR
  has_role(auth.uid(), 'Chief of HR'::user_role) OR
  has_role(auth.uid(), 'Hiring Manager'::user_role)
);

-- Staff can create comments
CREATE POLICY "Staff can create comments"
ON public.requisition_field_comments
FOR INSERT
WITH CHECK (
  (has_role(auth.uid(), 'Admin'::user_role) OR
   has_role(auth.uid(), 'HR Assistant'::user_role) OR
   has_role(auth.uid(), 'Chief of HR'::user_role) OR
   has_role(auth.uid(), 'Hiring Manager'::user_role)) AND
  author_id = auth.uid()
);

-- Users can update their own comments
CREATE POLICY "Users can update own comments"
ON public.requisition_field_comments
FOR UPDATE
USING (author_id = auth.uid())
WITH CHECK (author_id = auth.uid());

-- HR and Chief HR can resolve any comment
CREATE POLICY "HR can resolve comments"
ON public.requisition_field_comments
FOR UPDATE
USING (
  has_role(auth.uid(), 'Admin'::user_role) OR
  has_role(auth.uid(), 'HR Assistant'::user_role) OR
  has_role(auth.uid(), 'Chief of HR'::user_role)
);

-- Users can delete their own comments
CREATE POLICY "Users can delete own comments"
ON public.requisition_field_comments
FOR DELETE
USING (author_id = auth.uid());

-- Create index for faster queries
CREATE INDEX idx_requisition_field_comments_requisition ON public.requisition_field_comments(requisition_id);
CREATE INDEX idx_requisition_field_comments_field ON public.requisition_field_comments(requisition_id, field_name);
CREATE INDEX idx_requisition_field_comments_parent ON public.requisition_field_comments(parent_comment_id);

-- Add updated_at trigger
CREATE TRIGGER update_requisition_field_comments_updated_at
BEFORE UPDATE ON public.requisition_field_comments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();