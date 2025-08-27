// File: code/poc/frontend/test-backend-integration.js
// Quick test script to verify backend connectivity and integration points

const API_BASE_URL = process.env.NEXT_PUBLIC_EXPRESS_API_URL || 'http://localhost:3001/api';

async function testBackendIntegration() {
  console.log('🔍 Testing OmeoneChain Backend Integration...\n');
  console.log('🌐 API Base URL:', API_BASE_URL);

  // Test 1: Basic API Health Check
  console.log('\n1. Testing API Health Check...');
  try {
    const response = await fetch(`${API_BASE_URL}/health`);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    const data = await response.json();
    console.log('✅ API Health:', data);
  } catch (error) {
    console.log('❌ API Health Check Failed:', error.message);
    console.log('   → Make sure your backend is running: cd code/poc/core && npm run server:dev');
    return;
  }

  // Test 2: Authentication Challenge Endpoint
  console.log('\n2. Testing Authentication Challenge...');
  try {
    const response = await fetch(`${API_BASE_URL}/auth/challenge`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ address: '0x1234567890123456789012345678901234567890' })
    });
    
    console.log('   Response status:', response.status);
    if (response.ok) {
      const challengeData = await response.json();
      console.log('✅ Auth Challenge Working:', challengeData);
    } else {
      const errorData = await response.text();
      console.log('⚠️  Auth Challenge Response:', errorData);
    }
  } catch (error) {
    console.log('❌ Authentication Challenge Failed:', error.message);
  }

  // Test 3: User Endpoints
  console.log('\n3. Testing User Endpoints...');
  try {
    // Test users endpoint
    const response = await fetch(`${API_BASE_URL}/users?limit=5`);
    console.log('   Users endpoint status:', response.status);
    
    if (response.ok) {
      const usersData = await response.json();
      console.log('✅ Users Endpoint Working');
      console.log('   Sample user structure:', usersData.users?.[0] || 'No users found');
      
      // Check if progressive Web3 fields are supported
      if (usersData.users && usersData.users.length > 0) {
        const sampleUser = usersData.users[0];
        console.log('   📧 Email field supported:', 'email' in sampleUser);
        console.log('   🪙 Pending tokens field supported:', 'pending_tokens' in sampleUser);
        console.log('   🔐 Auth mode field supported:', 'auth_mode' in sampleUser);
      }
    } else {
      const errorText = await response.text();
      console.log('⚠️  Users endpoint error:', errorText);
    }
  } catch (error) {
    console.log('❌ User Endpoints Test Failed:', error.message);
  }

  // Test 4: Recommendations Endpoints
  console.log('\n4. Testing Recommendations Endpoints...');
  try {
    const response = await fetch(`${API_BASE_URL}/recommendations?limit=5`);
    console.log('   Recommendations endpoint status:', response.status);
    
    if (response.ok) {
      const recsData = await response.json();
      console.log('✅ Recommendations Endpoint Working');
      console.log('   Sample recommendation structure:', recsData.recommendations?.[0] || 'No recommendations found');
    } else {
      const errorText = await response.text();
      console.log('⚠️  Recommendations endpoint error:', errorText);
    }
  } catch (error) {
    console.log('❌ Recommendations Test Failed:', error.message);
  }

  // Test 5: Trust Score Endpoints
  console.log('\n5. Testing Trust Score Endpoints...');
  try {
    const response = await fetch(`${API_BASE_URL}/trust-config`);
    console.log('   Trust config endpoint status:', response.status);
    
    if (response.ok) {
      const trustData = await response.json();
      console.log('✅ Trust Config Working:', trustData);
    } else {
      const errorText = await response.text();
      console.log('⚠️  Trust config error:', errorText);
    }
  } catch (error) {
    console.log('❌ Trust Score Test Failed:', error.message);
  }

  // Test 6: Email Signup Endpoint (Progressive Web3 Feature)
  console.log('\n6. Testing Progressive Web3 Features...');
  try {
    const response = await fetch(`${API_BASE_URL}/auth/email-signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'test@example.com', name: 'Test User' })
    });
    
    console.log('   Email signup endpoint status:', response.status);
    if (response.ok) {
      const emailData = await response.json();
      console.log('✅ Email Signup Endpoint Working:', emailData);
    } else if (response.status === 404) {
      console.log('📧 Email signup endpoint not implemented yet (this is expected)');
    } else {
      const errorText = await response.text();
      console.log('⚠️  Email signup error:', errorText);
    }
  } catch (error) {
    console.log('📧 Email signup endpoint not available yet (this is expected)');
  }

  // Test 7: Wallet/Token Endpoints
  console.log('\n7. Testing Token/Wallet Endpoints...');
  try {
    const response = await fetch(`${API_BASE_URL}/wallet/balance?address=0x1234567890123456789012345678901234567890`);
    console.log('   Wallet endpoint status:', response.status);
    
    if (response.ok) {
      const walletData = await response.json();
      console.log('✅ Wallet Endpoint Working:', walletData);
    } else {
      const errorText = await response.text();
      console.log('⚠️  Wallet endpoint error:', errorText);
    }
  } catch (error) {
    console.log('❌ Wallet Endpoints Test Failed:', error.message);
  }

  console.log('\n🏁 Backend Integration Test Complete!');
  console.log('\n📋 Summary & Next Steps:');
  console.log('   ✅ If API health passed → Backend is running correctly');
  console.log('   📧 If email signup missing → Need to implement progressive Web3 backend');
  console.log('   🔐 If auth working → Can test wallet connection flow');
  console.log('   📝 If endpoints error → May need to check API routes');
  
  console.log('\n🚀 Ready for next phase:');
  console.log('   1. Implement email signup backend endpoint');
  console.log('   2. Add progressive Web3 user model fields');
  console.log('   3. Test end-to-end progressive authentication flow');
}

// Handle fetch for Node.js environment
if (typeof fetch === 'undefined') {
  console.log('📦 Note: This test requires Node.js 18+ with built-in fetch, or install node-fetch');
  console.log('   Alternative: Test these endpoints manually in your browser or with curl');
  process.exit(0);
}

// Run the test
testBackendIntegration().catch(console.error);