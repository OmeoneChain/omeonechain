const { createClient } = require('@supabase/supabase-js');

// Load env vars manually from the server console output we saw earlier
const supabase = createClient(
  'https://oxwguvquusrtkaczhmsq.supabase.co',  // From your screenshots
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY
);

async function testDB() {
  try {
    const { data, error } = await supabase.from('users').select('*').limit(3);
    console.log('Users found:', data?.length || 0);
    console.log('Sample:', data?.map(u => u.username) || []);
    if (error) console.log('Error:', error);
  } catch (err) {
    console.log('Failed:', err.message);
  }
}
testDB();
