-- Migration to add message and rating to sessions table

ALTER TABLE public.sessions
ADD COLUMN message TEXT CHECK (char_length(message) <= 100),
ADD COLUMN rating INTEGER CHECK (rating >= 1 AND rating <= 10);

-- Update RLS policies (optional, but good practice if needed specifically for these columns, 
-- though existing policies likely cover the row update)
