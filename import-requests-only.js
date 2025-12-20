import { createClient } from '@supabase/supabase-js';

// Old database (databasepad.com)
const oldSupabaseUrl = 'https://xufmoikdhbgyzwluyrmr.databasepad.com';
const oldSupabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6IjMxNDUwYjkyLTZjYjItNDEyZi05YTEyLTI5NDVmODY0NzBmYSJ9.eyJwcm9qZWN0SWQiOiJ4dWZtb2lrZGhiZ3l6d2x1eXJtciIsInJvbGUiOiJhbm9uIiwiaWF0IjoxNzY1ODYzMjg4LCJleHAiOjIwODEyMjMyODgsImlzcyI6ImZhbW91cy5kYXRhYmFzZXBhZCIsImF1ZCI6ImZhbW91cy5jbGllbnRzIn0.s35JPT-TRSKGV6YJQxbEyoU6V9DhlWaUeYMosLsWyiA';

// New database (Supabase)
const newSupabaseUrl = 'https://bthvzjfpmnmlismmprra.supabase.co';
const newSupabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ0aHZ6amZwbW5tbGlzbW1wcnJhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYwNzA2NTUsImV4cCI6MjA4MTY0NjY1NX0.gy0wchypW5guaKLBy8upUMD5vS3U0LRVKy1fA_CHB0I';

const oldDb = createClient(oldSupabaseUrl, oldSupabaseKey);
const newDb = createClient(newSupabaseUrl, newSupabaseKey);

async function main() {
  console.log('='.repeat(60));
  console.log('IMPORTING TRAINING REQUESTS ONLY');
  console.log('='.repeat(60));
  console.log();
  
  try {
    // Export training requests
    console.log('📤 Exporting training requests from old database...');
    const { data: requests, error: requestsError } = await oldDb
      .from('training_requests')
      .select('*');
    
    if (requestsError) throw requestsError;
    console.log(`✅ Exported ${requests.length} training requests`);
    
    // Import training requests
    console.log('📥 Importing training requests to new Supabase...');
    const mappedRequests = requests.map(req => ({
      id: req.id,
      user_id: req.user_id,
      training_id: req.training_id,
      course_name: req.course_name || 'Unknown Course',
      training_type: req.training_type || 'internal',
      status: req.status,
      supervisor_id: req.supervisor_id,
      admin_id: req.admin_id,
      scheduled_date: req.scheduled_date,
      denial_reason: req.denial_reason,
      created_at: req.created_at,
      updated_at: req.updated_at
    }));
    
    const { error: requestsInsertError } = await newDb
      .from('training_requests')
      .insert(mappedRequests);
    
    if (requestsInsertError) {
      console.log('❌ Error importing training requests:', requestsInsertError);
      throw requestsInsertError;
    }
    console.log(`✅ Successfully imported ${mappedRequests.length} training requests`);
    
    console.log();
    console.log('='.repeat(60));
    console.log('🎉 MIGRATION COMPLETE!');
    console.log('='.repeat(60));
    console.log(`✅ ${requests.length} training requests migrated`);
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

main();
