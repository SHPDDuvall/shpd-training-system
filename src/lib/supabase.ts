import { createClient } from '@supabase/supabase-js';

// Supabase database connection
// Project: Shaker Heights Police
// Region: AWS US East 1 (N. Virginia)
const supabaseUrl = 'https://bthvzjfpmnmlismmprra.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ0aHZ6amZwbW5tbGlzbW1wcnJhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYwNzA2NTUsImV4cCI6MjA4MTY0NjY1NX0.gy0wchypW5guaKLBy8upUMD5vS3U0LRVKy1fA_CHB0I';

// Create Supabase client
const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});

export { supabase };
