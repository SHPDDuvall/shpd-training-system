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
    
    // Log first row to see structure
    if (tableData && tableData.length > 0) {
      console.log(`     Columns: ${Object.keys(tableData[0]).join(', ')}`);
    }
  }
  
  console.log('\n✅ Data export complete!\n');
  return data;
}

async function dropAndRecreateSchema(client) {
  console.log('🗑️  Dropping existing tables...\n');
  
  await client.query(`    DROP TABLE IF EXISTS attendance CASCADE;
    DROP TABLE IF EXISTS officer_costs CASCADE;
    DROP TABLE IF EXISTS external_training CASCADE;
    DROP TABLE IF EXISTS internal_training CASCADE;
    DROP TABLE IF EXISTS training_requests CASCADE;
    DROP TABLE IF EXISTS users CASCADE;
  `);
  
  console.log('✅ Tables dropped!\n');
  console.log('🔧 Creating database schema with all columns...\n');
  
  const schema = `
    -- Users table (with all columns from old database)
    CREATE TABLE users (
      id UUID PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      badge_number TEXT,
      department TEXT,
      rank TEXT,
      avatar TEXT,
      phone TEXT,
      hire_date DATE,
      role TEXT NOT NULL,
      supervisor_id UUID,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

    -- Training requests table (with all columns)
    CREATE TABLE training_requests (
      id UUID PRIMARY KEY,
      training_id UUID,
      user_id UUID REFERENCES users(id) NOT NULL,
      status TEXT NOT NULL,
      submitted_date DATE,
      supervisor_id UUID,
      supervisor_approval_date TIMESTAMP WITH TIME ZONE,
      admin_id UUID,
      admin_approval_date TIMESTAMP WITH TIME ZONE,
      scheduled_date DATE,
      notes TEXT,
      denial_reason TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

    -- Internal training table
    CREATE TABLE internal_training (
      id UUID PRIMARY KEY,
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
    CREATE TABLE external_training (
      id UUID PRIMARY KEY,
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
    CREATE TABLE officer_costs (
      id UUID PRIMARY KEY,
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
    CREATE TABLE attendance (
      id UUID PRIMARY KEY,
      training_id UUID NOT NULL,
      user_id UUID REFERENCES users(id) NOT NULL,
      status TEXT NOT NULL,
      notes TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(training_id, user_id)
    );

    -- Create indexes
    CREATE INDEX idx_training_requests_user_id ON training_requests(user_id);
    CREATE INDEX idx_training_requests_status ON training_requests(status);
    CREATE INDEX idx_users_supervisor_id ON users(supervisor_id);
    CREATE INDEX idx_users_role ON users(role);
    CREATE INDEX idx_users_badge_number ON users(badge_number);
  `;
  
  await client.query(schema);
  console.log('✅ Schema created successfully!\n');
}

async function importData(client, data) {
  console.log('📥 Importing data to new database...\n');
  
  // Import in order to respect foreign keys
  const tableOrder = ['users', 'training_requests', 'internal_training', 'external_training', 'officer_costs', 'attendance'];
  
  for (const table of tableOrder) {
    const rows = data[table];
    
    if (!rows || rows.length === 0) {
      console.log(`  ⏭️  Skipping ${table} (no data)`);
      continue;
    }
    
    console.log(`  Importing ${rows.length} rows to ${table}...`);
    
    let successCount = 0;
    let errorCount = 0;
    
    for (const row of rows) {
      const columns = Object.keys(row);
      const values = Object.values(row);
      const placeholders = values.map((_, i) => `$${i + 1}`).join(', ');
      
      const query = `
        INSERT INTO ${table} (${columns.join(', ')})
        VALUES (${placeholders})
        ON CONFLICT (id) DO NOTHING
      `;
      
      try {
        await client.query(query, values);
        successCount++;
      } catch (error) {
        errorCount++;
        if (errorCount <= 3) {
          console.error(`    ⚠️  Error inserting row:`, error.message);
        }
      }
    }
    
    console.log(`  ✅ Imported ${successCount} rows to ${table} (${errorCount} errors)`);
  }
  
  console.log('\n✅ Data import complete!\n');
}

async function main() {
  console.log('='.repeat(60));
  console.log('DATABASE MIGRATION: databasepad.com → Neon.tech (v2)');
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
    
    // Step 3: Drop and recreate schema
    await dropAndRecreateSchema(client);
    
    // Step 4: Import data
    await importData(client, data);
    
    // Step 5: Verify
    console.log('🔍 Verifying migration...\n');
    const result = await client.query('SELECT COUNT(*) FROM users');
    console.log(`  Users in new database: ${result.rows[0].count}`);
    
    const requestsResult = await client.query('SELECT COUNT(*) FROM training_requests');
    console.log(`  Training requests in new database: ${requestsResult.rows[0].count}`);
    
    // Check badge numbers
    const badgeResult = await client.query(`
      SELECT first_name, last_name, badge_number 
      FROM users 
      WHERE badge_number IS NOT NULL 
      LIMIT 5
    `);
    console.log('\n  Sample users with badge numbers:');
    badgeResult.rows.forEach(row => {
      console.log(`    ${row.first_name} ${row.last_name}: Badge #${row.badge_number}`);
    });
    
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
