import { createClient } from '@supabase/supabase-js';
import pg from 'pg';
const { Client } = pg;

// Old database (databasepad.com)
const oldSupabaseUrl = 'https://xufmoikdhbgyzwluyrmr.databasepad.com';
const oldSupabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6IjMxNDUwYjkyLTZjYjItNDEyZi05YTEyLTI5NDVmODY0NzBmYSJ9.eyJwcm9qZWN0SWQiOiJ4dWZtb2lrZGhiZ3l6d2x1eXJtciIsInJvbGUiOiJhbm9uIiwiaWF0IjoxNzY1ODYzMjg4LCJleHAiOjIwODEyMjMyODgsImlzcyI6ImZhbW91cy5kYXRhYmFzZXBhZCIsImF1ZCI6ImZhbW91cy5jbGllbnRzIn0.s35JPT-TRSKGV6YJQxbEyoU6V9DhlWaUeYMosLsWyiA';

// New database (Neon.tech)
const newDbConnectionString = 'postgresql://neondb_owner:npg_6DE7SuWYgUak@ep-delicate-shadow-ahedq6px.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require';

const oldDb = createClient(oldSupabaseUrl, oldSupabaseKey);

async function exportData() {
  console.log('📤 Exporting data from old database...\n');
  
  const tables = [
    'users',
    'training_requests',
    'internal_training',
    'external_training',
    'officer_costs',
    'attendance'
  ];
  
  const data = {};
  
  for (const table of tables) {
    console.log(`  Exporting ${table}...`);
    const { data: tableData, error } = await oldDb
      .from(table)
      .select('*');
    
    if (error) {
      console.error(`  ❌ Error exporting ${table}:`, error);
      continue;
    }
    
    data[table] = tableData;
    console.log(`  ✅ Exported ${tableData?.length || 0} rows from ${table}`);
  }
  
  console.log('\n✅ Data export complete!\n');
  return data;
}

async function createSchema(client) {
  console.log('🔧 Creating database schema...\n');
  
  const schema = `
    -- Users table
    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      badge_number TEXT,
      role TEXT NOT NULL CHECK (role IN ('officer', 'supervisor', 'administrator')),
      supervisor_id UUID REFERENCES users(id),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

    -- Training requests table
    CREATE TABLE IF NOT EXISTS training_requests (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES users(id) NOT NULL,
      training_name TEXT NOT NULL,
      training_type TEXT NOT NULL CHECK (training_type IN ('internal', 'external')),
      start_date DATE NOT NULL,
      end_date DATE,
      status TEXT NOT NULL CHECK (status IN ('submitted', 'supervisor_review', 'admin_approval', 'approved', 'denied')),
      supervisor_notes TEXT,
      admin_notes TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

    -- Internal training table
    CREATE TABLE IF NOT EXISTS internal_training (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      request_id UUID REFERENCES training_requests(id) NOT NULL,
      course_name TEXT NOT NULL,
      instructor TEXT NOT NULL,
      location TEXT NOT NULL,
      date DATE NOT NULL,
      start_time TIME NOT NULL,
      end_time TIME NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

    -- External training table
    CREATE TABLE IF NOT EXISTS external_training (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      request_id UUID REFERENCES training_requests(id) NOT NULL,
      course_name TEXT NOT NULL,
      provider TEXT NOT NULL,
      location TEXT NOT NULL,
      start_date DATE NOT NULL,
      end_date DATE,
      cost DECIMAL(10, 2),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

    -- Officer costs table
    CREATE TABLE IF NOT EXISTS officer_costs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      request_id UUID REFERENCES training_requests(id) NOT NULL,
      officer_id UUID REFERENCES users(id) NOT NULL,
      registration_fee DECIMAL(10, 2),
      travel_cost DECIMAL(10, 2),
      lodging_cost DECIMAL(10, 2),
      meal_cost DECIMAL(10, 2),
      other_cost DECIMAL(10, 2),
      notes TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

    -- Attendance table
    CREATE TABLE IF NOT EXISTS attendance (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      training_id UUID NOT NULL,
      user_id UUID REFERENCES users(id) NOT NULL,
      status TEXT NOT NULL CHECK (status IN ('present', 'absent', 'excused')),
      notes TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(training_id, user_id)
    );

    -- Create indexes
    CREATE INDEX IF NOT EXISTS idx_training_requests_user_id ON training_requests(user_id);
    CREATE INDEX IF NOT EXISTS idx_training_requests_status ON training_requests(status);
    CREATE INDEX IF NOT EXISTS idx_users_supervisor_id ON users(supervisor_id);
    CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
  `;
  
  await client.query(schema);
  console.log('✅ Schema created successfully!\n');
}

async function importData(client, data) {
  console.log('📥 Importing data to new database...\n');
  
  for (const [table, rows] of Object.entries(data)) {
    if (!rows || rows.length === 0) {
      console.log(`  ⏭️  Skipping ${table} (no data)`);
      continue;
    }
    
    console.log(`  Importing ${rows.length} rows to ${table}...`);
    
    for (const row of rows) {
      const columns = Object.keys(row);
      const values = Object.values(row);
      const placeholders = values.map((_, i) => `$${i + 1}`).join(', ');
      
      const query = `
        INSERT INTO ${table} (${columns.join(', ')})
        VALUES (${placeholders})
        ON CONFLICT DO NOTHING
      `;
      
      try {
        await client.query(query, values);
      } catch (error) {
        console.error(`    ⚠️  Error inserting row:`, error.message);
      }
    }
    
    console.log(`  ✅ Imported ${rows.length} rows to ${table}`);
  }
  
  console.log('\n✅ Data import complete!\n');
}

async function main() {
  console.log('='.repeat(60));
  console.log('DATABASE MIGRATION: databasepad.com → Neon.tech');
  console.log('='.repeat(60));
  console.log();
  
  try {
    // Step 1: Export data from old database
    const data = await exportData();
    
    // Step 2: Connect to new database
    console.log('🔌 Connecting to Neon database...');
    const client = new Client({ connectionString: newDbConnectionString });
    await client.connect();
    console.log('✅ Connected to Neon!\n');
    
    // Step 3: Create schema
    await createSchema(client);
    
    // Step 4: Import data
    await importData(client, data);
    
    // Step 5: Verify
    console.log('🔍 Verifying migration...\n');
    const result = await client.query('SELECT COUNT(*) FROM users');
    console.log(`  Users in new database: ${result.rows[0].count}`);
    
    const requestsResult = await client.query('SELECT COUNT(*) FROM training_requests');
    console.log(`  Training requests in new database: ${requestsResult.rows[0].count}`);
    
    await client.end();
    
    console.log('\n' + '='.repeat(60));
    console.log('✅ MIGRATION COMPLETE!');
    console.log('='.repeat(60));
    console.log('\nNext steps:');
    console.log('1. Update the app connection string to use Neon');
    console.log('2. Deploy the updated app');
    console.log('3. Test the badge numbers!');
    
  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  }
}

main();
