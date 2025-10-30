// Save as: code/poc/core/check-lists.js
// Run with: node check-lists.js

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

const { createClient } = require('@supabase/supabase-js');

// Debug: Print what we found
console.log('🔍 Environment check:');
console.log('   SUPABASE_URL:', process.env.SUPABASE_URL ? '✓ Found' : '✗ Missing');
console.log('   SUPABASE_ANON_KEY:', process.env.SUPABASE_ANON_KEY ? '✓ Found' : '✗ Missing');
console.log('');

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
  console.error('❌ Missing Supabase credentials in .env file');
  console.log('💡 Make sure code/poc/core/.env contains:');
  console.log('   SUPABASE_URL=your_url_here');
  console.log('   SUPABASE_ANON_KEY=your_key_here');
  process.exit(1);
}

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

async function checkLists() {
  console.log('🔍 Checking Lists Database State...\n');

  // 1. Check if table exists by trying to query it
  console.log('1️⃣ Checking if curated_lists table exists...');
  const { data: listsExist, error: tableError } = await supabase
    .from('curated_lists')
    .select('id')
    .limit(1);

  if (tableError) {
    console.error('❌ Table error:', tableError.message);
    console.log('💡 The curated_lists table might not exist. Run the schema creation SQL.');
    return;
  }

  console.log('✅ Table exists\n');

  // 2. Count total lists
  console.log('2️⃣ Counting total lists...');
  const { count: totalCount, error: countError } = await supabase
    .from('curated_lists')
    .select('*', { count: 'exact', head: true });

  console.log(`   Total lists: ${totalCount || 0}\n`);

  // 3. Get sample lists
  console.log('3️⃣ Fetching sample lists...');
  const { data: sampleLists, error: sampleError } = await supabase
    .from('curated_lists')
    .select('id, title, creator_id, is_public, created_at')
    .limit(5);

  if (sampleLists && sampleLists.length > 0) {
    console.log('   Sample lists:');
    sampleLists.forEach(list => {
      console.log(`   - ${list.title} (${list.is_public ? 'public' : 'private'}) by ${list.creator_id.substring(0, 8)}...`);
    });
  } else {
    console.log('   ⚠️ No lists found in database');
  }
  console.log('');

  // 4. Check the followed users specifically
  const followedUsers = [
    '5a08d799-d87d-4324-b538-65862d30f057',
    '6dcf3d05-c396-4d6b-a620-2c09351dde2c'
  ];

  console.log('4️⃣ Checking lists from followed users...');
  const { data: followedLists, error: followedError } = await supabase
    .from('curated_lists')
    .select('id, title, creator_id, is_public')
    .in('creator_id', followedUsers);

  console.log(`   Found ${followedLists?.length || 0} lists from followed users`);
  if (followedLists && followedLists.length > 0) {
    followedLists.forEach(list => {
      console.log(`   - ${list.title} (${list.is_public ? 'public' : 'private'})`);
    });
  } else {
    console.log('   💡 The followed users have not created any lists yet');
  }
  console.log('');

  // 5. Check list_items
  console.log('5️⃣ Checking list_items table...');
  const { data: itemsCheck, error: itemsError } = await supabase
    .from('list_items')
    .select('id, list_id')
    .limit(1);

  if (itemsError) {
    console.error('❌ list_items table error:', itemsError.message);
  } else {
    const { count: itemsCount } = await supabase
      .from('list_items')
      .select('*', { count: 'exact', head: true });
    console.log(`   ✅ list_items table exists with ${itemsCount || 0} items\n`);
  }

  // 6. Check if restaurants table exists
  console.log('6️⃣ Checking restaurants table...');
  const { data: restaurantsCheck, error: restaurantsError } = await supabase
    .from('restaurants')
    .select('id, name')
    .limit(1);

  if (restaurantsError) {
    console.error('❌ restaurants table error:', restaurantsError.message);
  } else {
    const { count: restaurantsCount } = await supabase
      .from('restaurants')
      .select('*', { count: 'exact', head: true });
    console.log(`   ✅ restaurants table exists with ${restaurantsCount || 0} restaurants\n`);
  }

  // 7. Summary
  console.log('\n📊 SUMMARY');
  console.log('─'.repeat(50));
  if (totalCount === 0) {
    console.log('⚠️  No lists exist in the database yet');
    console.log('💡 Action: Create some test lists in the UI');
  } else if (followedLists?.length === 0) {
    console.log('⚠️  Lists exist, but not from the followed users');
    console.log('💡 Action: Have followed users create lists, or follow users who have lists');
  } else if (followedLists?.every(l => !l.is_public)) {
    console.log('⚠️  Lists exist from followed users, but they are all private');
    console.log('💡 Action: Make lists public (is_public = true)');
  } else {
    console.log('✅ Everything looks good - lists should appear in feed');
    console.log('🐛 If they still don\'t appear, check the backend logs for query errors');
  }
}

checkLists().catch(console.error);