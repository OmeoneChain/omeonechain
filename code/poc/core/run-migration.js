// File: code/poc/core/run-migration.js
// Quick script to run the Foursquare migration

require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

async function runMigration() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false // Needed for Supabase
    }
  });

  try {
    console.log('Connecting to database...');
    
    // Read the migration file
    const migrationPath = path.join(__dirname, 'migrations', 'add_foursquare_fields.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('Running migration...');
    await pool.query(migrationSQL);
    
    console.log('✅ Migration completed successfully!');
    
    // Verify the columns were added
    const result = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'restaurants' 
      AND column_name IN ('foursquare_place_id', 'data_source', 'foursquare_data')
    `);
    
    console.log('\nVerification - New columns:');
    result.rows.forEach(row => {
      console.log(`  ✓ ${row.column_name} (${row.data_type})`);
    });
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    throw error;
  } finally {
    await pool.end();
  }
}

runMigration().catch(err => {
  console.error(err);
  process.exit(1);
});