const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY
);

async function testConnection() {
  console.log('=== Database Connection Test ===');
  console.log('SUPABASE_URL:', process.env.SUPABASE_URL);
  console.log('Using Service Role Key:', !!process.env.SUPABASE_SERVICE_ROLE_KEY);
  
  try {
    const { data: users, error } = await supabase
      .from('users')
      .select('*')
      .limit(10);
      
    if (error) {
      console.log('Database Error:', error);
    } else {
      console.log('Users Found:', users?.length || 0);
      console.log('Sample Users:', users?.slice(0, 3) || []);
    }
  } catch (err) {
    console.log('Connection Error:', err.message);
  }
}

testConnection();
