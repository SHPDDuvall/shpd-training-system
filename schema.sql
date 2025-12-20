-- Training System Database Schema
-- Create tables for Shaker Heights Police Training System

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  password TEXT,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  badge_number TEXT,
  department TEXT,
  rank TEXT,
  role TEXT NOT NULL CHECK (role IN ('officer', 'supervisor', 'administrator')),
  avatar TEXT,
  phone TEXT,
  hire_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Training requests table
CREATE TABLE IF NOT EXISTS training_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  training_id UUID,
  course_name TEXT NOT NULL,
  training_type TEXT NOT NULL CHECK (training_type IN ('internal', 'external')),
  status TEXT NOT NULL CHECK (status IN ('pending', 'supervisor_review', 'admin_approval', 'approved', 'denied')),
  supervisor_id UUID REFERENCES users(id),
  admin_id UUID REFERENCES users(id),
  scheduled_date DATE,
  denial_reason TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create RLS policies to allow authenticated users to read all users
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated users to read all users"
ON users FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Users can update their own data"
ON users FOR UPDATE
TO authenticated
USING (auth.uid() = id);

-- Enable RLS on training_requests
ALTER TABLE training_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own requests"
ON training_requests FOR SELECT
TO authenticated
USING (user_id = auth.uid() OR supervisor_id = auth.uid() OR admin_id = auth.uid());

CREATE POLICY "Users can create their own requests"
ON training_requests FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own requests"
ON training_requests FOR UPDATE
TO authenticated
USING (user_id = auth.uid() OR supervisor_id = auth.uid() OR admin_id = auth.uid());

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_badge_number ON users(badge_number);
CREATE INDEX IF NOT EXISTS idx_training_requests_user_id ON training_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_training_requests_status ON training_requests(status);
CREATE INDEX IF NOT EXISTS idx_training_requests_supervisor_id ON training_requests(supervisor_id);
CREATE INDEX IF NOT EXISTS idx_training_requests_admin_id ON training_requests(admin_id);
