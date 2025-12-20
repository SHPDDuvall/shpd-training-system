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
  console.log('DATABASE MIGRATION: databasepad.com → Supabase');
  console.log('='.repeat(60));
  console.log();
  
  try {
    // Step 1: Export users
    console.log('📤 Exporting users from old database...');
    const { data: users, error: usersError } = await oldDb
      .from('users')
      .select('*');
    
    if (usersError) {
      console.error('❌ Error exporting users:', usersError);
      return;
    }
    
    console.log(`✅ Exported ${users.length} users`);
    console.log(`   Sample: ${users[0].first_name} ${users[0].last_name} - Badge #${users[0].badge_number}`);
    
    // Map users to new schema - only include columns that exist in new schema
    const mappedUsers = users.map(user => ({
      id: user.id,
      email: user.email,
      password: user.password_hash, // Rename password_hash to password
      first_name: user.first_name,
      last_name: user.last_name,
      badge_number: user.badge_number,
      department: user.department,
      rank: user.rank,
      role: user.role,
      avatar: user.avatar,
      phone: user.phone,
      hire_date: user.hire_date,
      created_at: user.created_at,
      updated_at: user.updated_at
    }));
    
    // Step 2: Export training requests
    console.log('\n📤 Exporting training requests from old database...');
    const { data: requests, error: requestsError } = await oldDb
      .from('training_requests')
      .select('*');
    
    if (requestsError) {
      console.error('❌ Error exporting training requests:', requestsError);
      return;
    }
    
    console.log(`✅ Exported ${requests.length} training requests`);
    
    // Map training requests - need to get course_name and training_type from somewhere
    // For now, use placeholder values
    const mappedRequests = requests.map(req => ({
      id: req.id,
      user_id: req.user_id,
      training_id: req.training_id,
      course_name: req.training_id || 'Unknown Course', // Placeholder
      training_type: 'internal', // Placeholder
      status: req.status,
      supervisor_id: req.supervisor_id,
      admin_id: req.admin_id,
      scheduled_date: req.scheduled_date,
      denial_reason: req.denial_reason,
      notes: req.notes,
      created_at: req.created_at,
      updated_at: req.updated_at
    }));
    
    // Step 3: Import users to new database
    console.log('\n📥 Importing users to new Supabase...');
    const { data: importedUsers, error: importUsersError } = await newDb
      .from('users')
      .insert(mappedUsers)
      .select();
    
    if (importUsersError) {
      console.error('❌ Error importing users:', importUsersError);
      console.error('   Details:', JSON.stringify(importUsersError, null, 2));
      return;
    }
    
    console.log(`✅ Imported ${importedUsers?.length || 0} users`);
    
    // Step 4: Import training requests to new database
    console.log('\n📥 Importing training requests to new Supabase...');
    const { data: importedRequests, error: importRequestsError } = await newDb
      .from('training_requests')
      .insert(mappedRequests)
      .select();
    
    if (importRequestsError) {
      console.error('❌ Error importing training requests:', importRequestsError);
      console.error('   Details:', JSON.stringify(importRequestsError, null, 2));
      return;
    }
    
    console.log(`✅ Imported ${importedRequests?.length || 0} training requests`);
    
    // Step 5: Verify
    console.log('\n🔍 Verifying migration...');
    const { data: verifyUsers } = await newDb
      .from('users')
      .select('first_name, last_name, badge_number')
      .limit(5);
    
    console.log('\n  Sample users in new database:');
    verifyUsers?.forEach(user => {
      console.log(`    ${user.first_name} ${user.last_name}: Badge #${user.badge_number}`);
    });
    
    console.log('\n' + '='.repeat(60));
    console.log('✅ MIGRATION COMPLETE!');
    console.log('='.repeat(60));
    console.log('\nNext steps:');
    console.log('1. Update the app connection string to use new Supabase');
    console.log('2. Deploy the updated app');
    console.log('3. Test the badge numbers - they should work now!');
    
  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  }
}

main();
