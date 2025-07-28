// File path: /code/poc/frontend/browser-test-commands.js

/**
 * Browser Console Commands for Testing OmeoneChain Integration
 * 
 * Copy and paste these commands into your browser's Developer Console
 * when viewing the dashboard at http://localhost:3000
 */

// 1. Test IOTA Connection Status
console.log('🌐 Testing IOTA Connection...');
fetch('https://fullnode.testnet.iota.org:443', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    jsonrpc: '2.0',
    id: 1,
    method: 'sui_getLatestCheckpointSequenceNumber',
    params: []
  })
})
.then(response => response.json())
.then(data => {
  if (data.result) {
    console.log('✅ IOTA Rebased testnet connected!');
    console.log('📊 Latest checkpoint:', data.result);
  } else {
    console.log('❌ IOTA connection failed:', data.error);
  }
})
.catch(error => {
  console.log('❌ IOTA connection error:', error.message);
  console.log('⚠️  This is normal during development - using mock data');
});

// 2. Test Trust Score Service (if available in window)
console.log('\n🧮 Testing Trust Score Service...');
if (window.trustScoreService) {
  // Test trust score calculation
  window.trustScoreService.calculateTrustScore('rec_123', 'user_123')
    .then(breakdown => {
      console.log('✅ Trust Score calculated:', breakdown);
      console.log('📊 Score:', breakdown.totalScore);
      console.log('🔗 Social multiplier:', breakdown.socialMultiplier);
      console.log('👥 Provenance:', breakdown.provenance);
    })
    .catch(error => {
      console.log('❌ Trust Score calculation failed:', error.message);
    });
} else {
  console.log('⚠️  TrustScoreService not available in window - this is normal');
}

// 3. Test React Components State
console.log('\n⚛️  Checking React Component State...');
// This will show if the useTrustScore hook is working
setTimeout(() => {
  const dashboardElement = document.querySelector('[data-testid="trust-dashboard"]') 
    || document.querySelector('.trust-score-dashboard')
    || document.querySelector('main');
  
  if (dashboardElement) {
    console.log('✅ Dashboard component rendered');
    
    // Check for connection status indicator
    const connectionIndicator = document.querySelector('[class*="text-green-600"]');
    if (connectionIndicator && connectionIndicator.textContent.includes('IOTA')) {
      console.log('✅ IOTA connection status displayed');
    } else {
      console.log('⚠️  IOTA connection status not found');
    }
    
    // Check for trust scores
    const trustScores = document.querySelectorAll('[class*="Trust"]');
    console.log(`📊 Found ${trustScores.length} trust score elements`);
    
  } else {
    console.log('❌ Dashboard component not found');
  }
}, 2000);

// 4. Test Environment Variables
console.log('\n🔧 Environment Configuration:');
console.log('IOTA RPC URL:', process?.env?.REACT_APP_IOTA_RPC_URL || 'Not set');
console.log('IOTA Network:', process?.env?.REACT_APP_IOTA_NETWORK || 'Not set');
console.log('API URL:', process?.env?.REACT_APP_API_URL || 'Not set');

// 5. Monitor Network Requests
console.log('\n📡 Monitoring Network Requests...');
const originalFetch = window.fetch;
window.fetch = function(...args) {
  const url = args[0];
  if (typeof url === 'string' && url.includes('iota.org')) {
    console.log('🌐 IOTA Request:', url);
  }
  return originalFetch.apply(this, args)
    .then(response => {
      if (typeof url === 'string' && url.includes('iota.org')) {
        console.log('📡 IOTA Response status:', response.status);
      }
      return response;
    });
};

// 6. Test Trust Score Calculation Logic
console.log('\n🧮 Manual Trust Score Test:');
function testTrustScore() {
  const mockEndorsements = [
    { userId: 'friend1', socialDistance: 1, userTrustScore: 0.8 },
    { userId: 'friend2', socialDistance: 1, userTrustScore: 0.9 },
    { userId: 'network1', socialDistance: 2, userTrustScore: 0.7 },
    { userId: 'network2', socialDistance: 2, userTrustScore: 0.6 }
  ];

  const weights = mockEndorsements.map(e => {
    const baseWeight = e.socialDistance === 1 ? 0.75 : e.socialDistance === 2 ? 0.25 : 0;
    return baseWeight * e.userTrustScore;
  });

  const socialMultiplier = Math.min(weights.reduce((sum, w) => sum + w, 0), 3.0);
  const trustScore = Math.min(5.0 * socialMultiplier, 10.0);

  console.log('📊 Trust Score Test Results:');
  console.log('   Endorsements:', mockEndorsements.length);
  console.log('   Weights:', weights.map(w => w.toFixed(3)));
  console.log('   Social Multiplier:', socialMultiplier.toFixed(2) + 'x');
  console.log('   Final Trust Score:', trustScore.toFixed(1) + '/10');
  
  return { trustScore, socialMultiplier, weights };
}

const testResult = testTrustScore();

// 7. Instructions for Manual Testing
console.log('\n📋 Manual Testing Instructions:');
console.log('==============================');
console.log('1. Check IOTA connection indicator in top-right corner');
console.log('2. Click "Endorse" buttons to test reward calculations');
console.log('3. Navigate between Dashboard tabs to test loading states');
console.log('4. Check Network tab in DevTools for IOTA requests');
console.log('5. Watch Console for trust score calculations');
console.log('\n🎯 Expected Behavior:');
console.log('- Green WiFi icon = Connected to IOTA testnet');
console.log('- Red WiFi icon = Using mock data (normal during development)');
console.log('- Trust scores show social proof breakdown');
console.log('- Endorsing triggers reward calculations');
console.log('\n🚀 Dashboard ready for testing!');

// Export test functions for manual use
window.omeoneTest = {
  testTrustScore,
  testIOTA: () => fetch('https://fullnode.testnet.iota.org:443', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'sui_getLatestCheckpointSequenceNumber',
      params: []
    })
  }).then(r => r.json())
};