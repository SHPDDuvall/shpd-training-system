import { createClient } from '@supabase/supabase-js';

// Old database (databasepad.com)
const oldSupabaseUrl = 'https://xufmoikdhbgyzwluyrmr.databasepad.com';
const oldSupabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6IjMxNDUwYjkyLTZjYjItNDEyZi05YTEyLTI5NDVmODY0NzBmYSJ9.eyJwcm9qZWN0SWQiOiJ4dWZtb2lrZGhiZ3l6d2x1eXJtciIsInJvbGUiOiJhbm9uIiwiaWF0IjoxNzY1ODYzMjg4LCJleHAiOjIwODEyMjMyODgsImlzcyI6ImZhbW91cy5kYXRhYmFzZXBhZCIsImF1ZCI6ImZhbW91cy5jbGllbnRzIn0.s35JPT-TRSKGV6YJQxbEyoU6V9DhlWaUeYMosLsWyiA';

// New database (Supabase)
const newSupabaseUrl = 'https://bthvzjfpmnmlismmprra.supabase.co';
const newSupabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ0aHZ6amZwbW5tbGlzbW1wcnJhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYwNzA2NTUsImV4cCI6MjA4MTY0NjY1NX0.gy0wchypW5guaKLBy8upUMD5vS3U0LRVKy1fA_CHB0I';

const oldDb = createClient(oldSupabaseUrl, oldSupabaseKey);
const newDb = createClient(newSupabaseUrl, newSupabaseKey);

// Map old role values to new allowed values
function mapRole(role) {
  const roleMap = {
    'administrator': 'administrator',
    'supervisor': 'supervisor',
    'officer': 'officer',
    'Civilian Staff': 'officer', // Map civilian staff to officer
    'Detective': 'officer',
    'Sergeant': 'supervisor',
    'Lieutenant': 'supervisor',
    'Captain': 'supervisor',
    'Chief': 'administrator'
  };
  return roleMap[role] || 'officer'; // Default to officer if unknown
}

async function main() {
  console.log('='.repeat(60));
  console.log('DATABASE MIGRATION: databasepad.com → Supabase');
  console.log('='.repeat(60));
  console.log();
  
  try {
    // Export users
    console.log('📤 Exporting users from old database...');
    const { data: users, error: usersError } = await oldDb
      .from('users')
      .select('*');
    
    if (usersError) throw usersError;
    console.log(`✅ Exported ${users.length} users`);
    if (users.length > 0) {
      console.log(`   Sample: ${users[0].first_name} ${users[0].last_name} - Badge #${users[0].badge_number}`);
    }
    
    // Export training requests
    console.log('📤 Exporting training requests from old database...');
    const { data: requests, error: requestsError } = await oldDb
      .from('training_requests')
      .select('*');
    
    if (requestsError) throw requestsError;
    console.log(`✅ Exported ${requests.length} training requests`);
    
    // Import users with mapped roles
    console.log('📥 Importing users to new Supabase...');
    const mappedUsers = users.map(user => ({
      id: user.id,
      email: user.email,
      password: user.password || '1234', // Default password if missing
      first_name: user.first_name,
      last_name: user.last_name,
      badge_number: user.badge_number,
      department: user.department,
      rank: user.rank,
      role: mapRole(user.role), // Map the role
      avatar: user.avatar,
      phone: user.phone,
      hire_date: user.hire_date,
      created_at: user.created_at,
      updated_at: user.updated_at
    }));
    
    // Insert in batches of 10
    for (let i = 0; i < mappedUsers.length; i += 10) {
      const batch = mappedUsers.slice(i, i + 10);
      const { error: insertError } = await newDb
        .from('users')
        .insert(batch);
      
      if (insertError) {
        console.log(`❌ Error importing users batch ${i/10 + 1}:`, insertError);
        console.log(`   Details:`, JSON.stringify(insertError, null, 2));
        throw insertError;
      }
      console.log(`   ✅ Imported batch ${i/10 + 1} (${batch.length} users)`);
    }
    console.log(`✅ Successfully imported ${mappedUsers.length} users`);
    
    // Import training requests
    console.log('📥 Importing training requests to new Supabase...');
    const mappedRequests = requests.map(req => ({
      id: req.id,
      user_id: req.user_id,
      training_id: req.training_id,
      course_name: req.course_name,
      training_type: req.training_type,
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
    console.log(`✅ ${users.length} users migrated`);
    console.log(`✅ ${requests.length} training requests migrated`);
    console.log(`✅ Badge numbers preserved`);
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

main();
