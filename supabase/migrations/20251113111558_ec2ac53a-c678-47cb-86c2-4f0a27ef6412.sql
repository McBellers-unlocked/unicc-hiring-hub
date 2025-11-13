-- Add columns to store text selection for comments
ALTER TABLE public.requisition_field_comments
ADD COLUMN highlighted_text TEXT,
ADD COLUMN selection_start INTEGER,
ADD COLUMN selection_end INTEGER;

-- Create index for highlighted text queries
CREATE INDEX idx_requisition_field_comments_highlighted 
ON public.requisition_field_comments(requisition_id, field_name) 
WHERE highlighted_text IS NOT NULL;