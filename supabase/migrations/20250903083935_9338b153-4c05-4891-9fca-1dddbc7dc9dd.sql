-- Update video_question_sets table to include timing parameters
ALTER TABLE public.video_question_sets 
ADD COLUMN IF NOT EXISTS read_secs integer DEFAULT 30,
ADD COLUMN IF NOT EXISTS prep_secs integer DEFAULT 30,
ADD COLUMN IF NOT EXISTS answer_secs integer DEFAULT 180,
ADD COLUMN IF NOT EXISTS allow_retakes boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS max_retakes integer DEFAULT 1;

-- Update video_answers table to include transcript, duration, and rating
ALTER TABLE public.video_answers
ADD COLUMN IF NOT EXISTS transcript text,
ADD COLUMN IF NOT EXISTS file_size bigint,
ADD COLUMN IF NOT EXISTS azure_blob_url text,
ADD COLUMN IF NOT EXISTS processing_status text DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS virus_scan_status text DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS retry_count integer DEFAULT 0;

-- Create video_ratings table for manager ratings
CREATE TABLE IF NOT EXISTS public.video_ratings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  video_answer_id uuid NOT NULL REFERENCES public.video_answers(id) ON DELETE CASCADE,
  evaluator_id uuid NOT NULL REFERENCES public.users(id),
  rating integer CHECK (rating >= 1 AND rating <= 5),
  comments text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on video_ratings
ALTER TABLE public.video_ratings ENABLE ROW LEVEL SECURITY;

-- Create policies for video_ratings
CREATE POLICY "Staff can view video ratings" 
ON public.video_ratings 
FOR SELECT 
USING (has_role(auth.uid(), 'Admin'::user_role) 
  OR has_role(auth.uid(), 'HR Assistant'::user_role) 
  OR has_role(auth.uid(), 'Hiring Manager'::user_role) 
  OR has_role(auth.uid(), 'Panel Member'::user_role));

CREATE POLICY "Staff can create video ratings" 
ON public.video_ratings 
FOR INSERT 
WITH CHECK (has_role(auth.uid(), 'Admin'::user_role) 
  OR has_role(auth.uid(), 'HR Assistant'::user_role) 
  OR has_role(auth.uid(), 'Hiring Manager'::user_role) 
  OR has_role(auth.uid(), 'Panel Member'::user_role));

CREATE POLICY "Evaluators can update their own ratings" 
ON public.video_ratings 
FOR UPDATE 
USING (evaluator_id = auth.uid());

-- Create policies for video_question_sets
CREATE POLICY "Staff can view video question sets" 
ON public.video_question_sets 
FOR SELECT 
USING (has_role(auth.uid(), 'Admin'::user_role) 
  OR has_role(auth.uid(), 'HR Assistant'::user_role) 
  OR has_role(auth.uid(), 'Hiring Manager'::user_role) 
  OR has_role(auth.uid(), 'Panel Member'::user_role));

CREATE POLICY "Admin and HR can manage video question sets" 
ON public.video_question_sets 
FOR ALL 
USING (has_role(auth.uid(), 'Admin'::user_role) 
  OR has_role(auth.uid(), 'HR Assistant'::user_role));

-- Create policies for video_answers  
CREATE POLICY "Staff can view video answers" 
ON public.video_answers 
FOR SELECT 
USING (has_role(auth.uid(), 'Admin'::user_role) 
  OR has_role(auth.uid(), 'HR Assistant'::user_role) 
  OR has_role(auth.uid(), 'Hiring Manager'::user_role) 
  OR has_role(auth.uid(), 'Panel Member'::user_role));

CREATE POLICY "Anyone can create video answers" 
ON public.video_answers 
FOR INSERT 
WITH CHECK (true);

-- Add trigger for updated_at on video_ratings
CREATE TRIGGER update_video_ratings_updated_at
  BEFORE UPDATE ON public.video_ratings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();