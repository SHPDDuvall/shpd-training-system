-- Add image_url column to external_training_requests table
ALTER TABLE external_training_requests 
ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Add comment to document the column
COMMENT ON COLUMN external_training_requests.image_url IS 'URL of the event/training image uploaded by the user';
