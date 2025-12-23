-- Create external_training_requests table
CREATE TABLE IF NOT EXISTS external_training_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  event_name TEXT NOT NULL,
  organization TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  location TEXT NOT NULL,
  cost_estimate DECIMAL(10, 2) DEFAULT 0,
  justification TEXT NOT NULL,
  image_url TEXT,
  status TEXT NOT NULL DEFAULT 'submitted' CHECK (status IN ('draft', 'submitted', 'supervisor_review', 'admin_approval', 'approved', 'denied', 'completed')),
  submitted_date DATE NOT NULL,
  supervisor_id UUID REFERENCES users(id),
  supervisor_name TEXT,
  supervisor_approval_date DATE,
  admin_id UUID REFERENCES users(id),
  admin_name TEXT,
  admin_approval_date DATE,
  notes TEXT,
  denial_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on external_training_requests
ALTER TABLE external_training_requests ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own external training requests"
ON external_training_requests FOR SELECT
TO authenticated
USING (user_id = auth.uid() OR supervisor_id = auth.uid() OR admin_id = auth.uid());

CREATE POLICY "Users can create their own external training requests"
ON external_training_requests FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own external training requests"
ON external_training_requests FOR UPDATE
TO authenticated
USING (user_id = auth.uid() OR supervisor_id = auth.uid() OR admin_id = auth.uid());

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_external_training_user_id ON external_training_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_external_training_status ON external_training_requests(status);
CREATE INDEX IF NOT EXISTS idx_external_training_supervisor_id ON external_training_requests(supervisor_id);
CREATE INDEX IF NOT EXISTS idx_external_training_admin_id ON external_training_requests(admin_id);
CREATE INDEX IF NOT EXISTS idx_external_training_start_date ON external_training_requests(start_date);

-- Add comments
COMMENT ON TABLE external_training_requests IS 'External training requests for conferences, seminars, and external training events';
COMMENT ON COLUMN external_training_requests.image_url IS 'URL of the event/training image uploaded by the user';
