// File: code/poc/core/debug-env.js
// Debug script to check environment variable loading

console.log('�� Debugging Environment Variable Loading...\n');

// Check current working directory
console.log('📁 Current working directory:', process.cwd());

// Check for environment files
const fs = require('fs');
const path = require('path');

const envFiles = ['.env', '.env.local', '.env.development', '.env.development.local'];

console.log('📋 Checking for environment files:');
envFiles.forEach(filename => {
  const filePath = path.join(process.cwd(), filename);
  if (fs.existsSync(filePath)) {
    console.log(`✅ ${filename} exists`);
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const lines = content.split('\n').filter(line => line.trim() && !line.startsWith('#'));
      console.log(`   📝 Contains ${lines.length} variables`);
      
      // Show variable names (not values for security)
      lines.forEach(line => {
        const [key] = line.split('=');
        if (key) {
          console.log(`   - ${key.trim()}`);
        }
      });
    } catch (error) {
      console.log(`   ❌ Error reading file: ${error.message}`);
    }
  } else {
    console.log(`❌ ${filename} does not exist`);
  }
});

// Test different ways of loading environment variables
console.log('\n🧪 Testing environment variable loading methods:');

// Method 1: No dotenv
console.log('\n1. Without dotenv:');
console.log('   SUPABASE_URL:', process.env.SUPABASE_URL || 'undefined');
console.log('   SUPABASE_ANON_KEY:', process.env.SUPABASE_ANON_KEY ? '***set***' : 'undefined');

// Method 2: Load dotenv with default config
console.log('\n2. With dotenv (default):');
require('dotenv').config();
console.log('   SUPABASE_URL:', process.env.SUPABASE_URL || 'undefined');
console.log('   SUPABASE_ANON_KEY:', process.env.SUPABASE_ANON_KEY ? '***set***' : 'undefined');

// Method 3: Load dotenv with explicit .env.local
console.log('\n3. With dotenv (.env.local):');
require('dotenv').config({ path: '.env.local' });
console.log('   SUPABASE_URL:', process.env.SUPABASE_URL || 'undefined');
console.log('   SUPABASE_ANON_KEY:', process.env.SUPABASE_ANON_KEY ? '***set***' : 'undefined');

console.log('\n📊 Final environment state:');
console.log('   SUPABASE_URL:', process.env.SUPABASE_URL || 'NOT SET');
console.log('   SUPABASE_ANON_KEY:', process.env.SUPABASE_ANON_KEY ? 'SET' : 'NOT SET');
console.log('   JWT_SECRET:', process.env.JWT_SECRET ? 'SET' : 'NOT SET');
console.log('   NODE_ENV:', process.env.NODE_ENV || 'undefined');
