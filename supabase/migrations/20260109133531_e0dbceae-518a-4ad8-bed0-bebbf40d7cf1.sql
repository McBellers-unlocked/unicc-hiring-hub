-- Add longlist_rating column to applications table
ALTER TABLE applications 
ADD COLUMN longlist_rating text 
CHECK (longlist_rating IN ('eligible', 'above_average', 'excellent'));