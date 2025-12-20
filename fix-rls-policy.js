import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://xufmoikdhbgyzwluyrmr.databasepad.com';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6IjMxNDUwYjkyLTZjYjItNDEyZi05YTEyLTI5NDVmODY0NzBmYSJ9.eyJwcm9qZWN0SWQiOiJ4dWZtb2lrZGhiZ3l6d2x1eXJtciIsInJvbGUiOiJhbm9uIiwiaWF0IjoxNzY1ODYzMjg4LCJleHAiOjIwODEyMjMyODgsImlzcyI6ImZhbW91cy5kYXRhYmFzZXBhZCIsImF1ZCI6ImZhbW91cy5jbGllbnRzIn0.s35JPT-TRSKGV6YJQxbEyoU6V9DhlWaUeYMosLsWyiA';

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixRLSPolicy() {
  console.log('Attempting to fix RLS policy for users table...');
  
  // Try to create the RLS policy
  const { data, error } = await supabase.rpc('exec_sql', {
    sql: `
      CREATE POLICY IF NOT EXISTS "Allow authenticated users to read all users"
      ON users FOR SELECT
      TO authenticated
      USING (true);
    `
  });

  if (error) {
    console.error('Error creating RLS policy:', error);
    console.log('\nThis is expected - the anon key cannot create policies.');
    console.log('We need a service_role key or database admin access.');
    return false;
  }

  console.log('✅ RLS policy created successfully!');
  return true;
}

async function testUserQuery() {
  console.log('\nTesting user query to see current permissions...');
  
  const { data, error } = await supabase
    .from('users')
    .select('id, badge_number, first_name, last_name')
    .limit(1);

  if (error) {
    console.error('❌ Error querying users:', error);
    return;
  }

  console.log('✅ Successfully queried users table:', data);
}

async function testTrainingRequestJoin() {
  console.log('\nTesting training_requests join with users...');
  
  const { data, error } = await supabase
    .from('training_requests')
    .select(`
      *,
      user:users!user_id(id, badge_number, first_name, last_name)
    `)
    .limit(1);

  if (error) {
    console.error('❌ Error with join query:', error);
    return;
  }

  console.log('✅ Join query result:');
  console.log('Request ID:', data[0]?.id);
  console.log('User data:', data[0]?.user);
  console.log('Badge number:', data[0]?.user?.badge_number);
}

async function main() {
  console.log('='.repeat(60));
  console.log('SUPABASE RLS POLICY FIX SCRIPT');
  console.log('='.repeat(60));
  
  await testUserQuery();
  await testTrainingRequestJoin();
  
  console.log('\n' + '='.repeat(60));
  console.log('ATTEMPTING RLS POLICY FIX');
  console.log('='.repeat(60));
  
  await fixRLSPolicy();
  
  console.log('\n' + '='.repeat(60));
  console.log('DONE');
  console.log('='.repeat(60));
}

main();
