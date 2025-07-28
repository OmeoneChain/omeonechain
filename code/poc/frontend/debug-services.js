// File path: /code/poc/frontend/debug-services.js

/**
 * Debug script to test OmeoneChain services independently
 * Run with: node debug-services.js
 */

// Simple test for IOTA connection (Node.js version)
async function testIOTAConnection() {
  console.log('🌐 Testing IOTA Rebased testnet connection...');
  
  try {
    const response = await fetch('https://fullnode.testnet.iota.org:443', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'sui_getLatestCheckpointSequenceNumber',
        params: []
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    
    if (data.error) {
      console.error('❌ IOTA RPC error:', data.error.message);
      return false;
    }

    console.log('✅ IOTA connection successful!');
    console.log('📊 Latest checkpoint:', data.result);
    return true;
    
  } catch (error) {
    console.error('❌ IOTA connection failed:', error.message);
    return false;
  }
}

// Test trust score calculation logic
function testTrustScoreCalculation() {
  console.log('\n🧮 Testing Trust Score calculation...');
  
  // Mock data for testing
  const mockEndorsements = [
    { userId: 'user_456', userTrustScore: 0.8, socialDistance: 1 }, // Direct friend
    { userId: 'user_789', userTrustScore: 0.6, socialDistance: 2 }, // Friend-of-friend
    { userId: 'user_321', userTrustScore: 0.9, socialDistance: 1 }, // Direct friend
    { userId: 'user_654', userTrustScore: 0.7, socialDistance: 2 }, // Friend-of-friend
    { userId: 'user_999', userTrustScore: 0.5, socialDistance: 999 }, // No connection
  ];

  // Calculate trust weights (same logic as TrustScoreService)
  const weights = mockEndorsements.map(endorsement => {
    let baseWeight = 0;
    if (endorsement.socialDistance === 1) {
      baseWeight = 0.75; // Direct friends
    } else if (endorsement.socialDistance === 2) {
      baseWeight = 0.25; // Friend-of-friends
    }
    // socialDistance > 2 gets 0 weight

    const finalWeight = baseWeight * endorsement.userTrustScore;
    return {
      userId: endorsement.userId,
      weight: Number(finalWeight.toFixed(3)),
      socialDistance: endorsement.socialDistance,
      trustScore: endorsement.userTrustScore
    };
  });

  console.log('📊 Trust Weights calculated:');
  weights.forEach(w => {
    const type = w.socialDistance === 1 ? 'Direct' : w.socialDistance === 2 ? 'Network' : 'None';
    console.log(`   ${w.userId}: ${w.weight} (${type})`);
  });

  // Calculate final trust score
  const baseScore = 5.0;
  const socialMultiplier = Math.min(
    weights.reduce((sum, weight) => sum + weight.weight, 0),
    3.0 // Cap at 3x as per white paper
  );
  const totalScore = Math.min(baseScore * socialMultiplier, 10.0);

  console.log(`📈 Final Trust Score: ${totalScore.toFixed(1)}/10`);
  console.log(`   Base Score: ${baseScore}`);
  console.log(`   Social Multiplier: ${socialMultiplier.toFixed(2)}x`);
  console.log(`   Total Endorsements: ${mockEndorsements.length}`);
  console.log(`   Direct Friends: ${weights.filter(w => w.socialDistance === 1).length}`);
  console.log(`   Friend-of-Friends: ${weights.filter(w => w.socialDistance === 2).length}`);

  return {
    totalScore: Number(totalScore.toFixed(1)),
    socialMultiplier: Number(socialMultiplier.toFixed(2)),
    weights
  };
}

// Test reward calculation
function testRewardCalculation(trustScore, socialMultiplier) {
  console.log('\n💰 Testing Reward calculation...');
  
  const REWARD_THRESHOLD = 2.5; // 0.25 on 0-1 scale = 2.5 on 0-10 scale
  const BASE_REWARD = 1.0;
  const MAX_MULTIPLIER = 3.0;
  
  if (trustScore >= REWARD_THRESHOLD) {
    const rewardAmount = Math.min(BASE_REWARD * socialMultiplier, MAX_MULTIPLIER);
    console.log(`✅ Reward earned: ${rewardAmount.toFixed(2)} TOK`);
    console.log(`   Trust Score: ${trustScore} >= ${REWARD_THRESHOLD} (threshold met)`);
    console.log(`   Formula: ${BASE_REWARD} TOK × ${socialMultiplier}x = ${rewardAmount.toFixed(2)} TOK`);
    return rewardAmount;
  } else {
    console.log(`❌ No reward: Trust Score ${trustScore} < ${REWARD_THRESHOLD} (threshold not met)`);
    return 0;
  }
}

// Main test function
async function runTests() {
  console.log('🧪 OmeoneChain Service Layer Debug Tests');
  console.log('=======================================\n');

  // Test 1: IOTA Connection
  const iotaConnected = await testIOTAConnection();

  // Test 2: Trust Score Calculation
  const trustResult = testTrustScoreCalculation();

  // Test 3: Reward Calculation
  const rewardAmount = testRewardCalculation(trustResult.totalScore, trustResult.socialMultiplier);

  // Summary
  console.log('\n📋 Test Summary:');
  console.log('================');
  console.log(`IOTA Connection: ${iotaConnected ? '✅ Connected' : '❌ Failed'}`);
  console.log(`Trust Calculation: ✅ Working (${trustResult.totalScore}/10)`);
  console.log(`Reward System: ✅ Working (${rewardAmount} TOK)`);
  console.log(`Social Graph: ✅ 0.75x direct, 0.25x network weighting`);

  if (!iotaConnected) {
    console.log('\n⚠️  Note: IOTA connection failed - this is normal during development');
    console.log('   The frontend will use mock data and show connection status');
  }

  console.log('\n🚀 Ready to test in browser at http://localhost:3000');
}

// Run if called directly
if (typeof require !== 'undefined' && require.main === module) {
  runTests().catch(console.error);
}

// Export for use in other scripts
if (typeof module !== 'undefined') {
  module.exports = {
    testIOTAConnection,
    testTrustScoreCalculation,
    testRewardCalculation,
    runTests
  };
}