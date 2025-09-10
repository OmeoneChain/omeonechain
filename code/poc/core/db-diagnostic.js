// Database Diagnostic Script for OmeoneChain
// Run this with: node db-diagnostic.js

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

async function diagnoseDatabaseIssues() {
  console.log('🔍 OmeoneChain Database Diagnostic');
  console.log('=====================================\n');

  // Initialize Supabase client
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase environment variables');
    console.log('Required: SUPABASE_URL and SUPABASE_ANON_KEY');
    return;
  }

  console.log('✅ Supabase credentials found');
  const supabase = createClient(supabaseUrl, supabaseKey);

  // Test 1: Check table existence and schema
  console.log('\n🔍 Test 1: Checking table existence...');
  
  const possibleTables = ['recommendations', 'recommendation', 'user_recommendations'];
  let workingTable = null;
  
  for (const tableName of possibleTables) {
    try {
      console.log(`  Testing table: ${tableName}`);
      const { data, error, count } = await supabase
        .from(tableName)
        .select('*', { count: 'exact', head: true });
      
      if (!error) {
        console.log(`  ✅ Table '${tableName}' exists with ${count} records`);
        workingTable = tableName;
        break;
      } else {
        console.log(`  ❌ Table '${tableName}': ${error.message}`);
      }
    } catch (e) {
      console.log(`  ❌ Table '${tableName}': ${e.message}`);
    }
  }

  if (!workingTable) {
    console.log('❌ No recommendations table found!');
    return;
  }

  // Test 2: Check table schema
  console.log(`\n🔍 Test 2: Analyzing '${workingTable}' schema...`);
  
  try {
    const { data, error } = await supabase
      .from(workingTable)
      .select('*')
      .limit(1);
    
    if (error) {
      console.log(`❌ Error fetching schema: ${error.message}`);
    } else if (data && data.length > 0) {
      console.log('✅ Sample record structure:');
      const sample = data[0];
      Object.keys(sample).forEach(key => {
        console.log(`  - ${key}: ${typeof sample[key]} = ${sample[key]}`);
      });
    } else {
      console.log('⚠️  Table is empty - checking column names...');
      // Try to get column info from error messages
    }
  } catch (e) {
    console.log(`❌ Error: ${e.message}`);
  }

  // Test 3: Check for user c2513dbc-fdb9-4142-b6e2-98e7b74958aa recommendations
  console.log('\n🔍 Test 3: Looking for Test User 3 recommendations...');
  
  const testUserId = 'c2513dbc-fdb9-4142-b6e2-98e7b74958aa';
  const possibleAuthorColumns = ['author', 'user_id', 'author_id', 'created_by'];
  
  for (const columnName of possibleAuthorColumns) {
    try {
      console.log(`  Testing column: ${columnName}`);
      const { data, error, count } = await supabase
        .from(workingTable)
        .select('*', { count: 'exact' })
        .eq(columnName, testUserId);
      
      if (!error) {
        console.log(`  ✅ Column '${columnName}' exists: found ${count} records`);
        if (data && data.length > 0) {
          console.log(`  📄 First record:`, data[0]);
        }
        break;
      } else {
        console.log(`  ❌ Column '${columnName}': ${error.message}`);
      }
    } catch (e) {
      console.log(`  ❌ Column '${columnName}': ${e.message}`);
    }
  }

  // Test 4: Check all recommendations (to see if data exists)
  console.log('\n🔍 Test 4: Checking all recommendations...');
  
  try {
    const { data, error, count } = await supabase
      .from(workingTable)
      .select('*', { count: 'exact' });
    
    if (error) {
      console.log(`❌ Error: ${error.message}`);
    } else {
      console.log(`✅ Total recommendations in database: ${count}`);
      if (data && data.length > 0) {
        console.log('📄 Sample records:');
        data.slice(0, 3).forEach((record, index) => {
          console.log(`  ${index + 1}. ID: ${record.id}, Author: ${record.author || record.user_id || 'unknown'}`);
        });
      }
    }
  } catch (e) {
    console.log(`❌ Error: ${e.message}`);
  }

  // Test 5: Generate working query
  console.log('\n🔧 Test 5: Generating working query...');
  
  console.log('Based on the analysis above, the working query should be:');
  console.log(`
const { data, error } = await supabase
  .from("${workingTable}")
  .select("*")
  .eq("CORRECT_COLUMN_NAME", userId);
  `);

  console.log('\n✅ Diagnostic complete!');
  console.log('Use the results above to fix the recommendation queries.');
}

// Run the diagnostic
diagnoseDatabaseIssues().catch(console.error);