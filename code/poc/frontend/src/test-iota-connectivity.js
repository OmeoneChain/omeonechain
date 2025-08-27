// Test script to check IOTA Rebased contract connectivity
const { IOTAService } = require('./services/IOTAService.ts');

async function testIOTAConnectivity() {
  console.log('🔗 Testing IOTA Rebased Contract Connectivity...\n');
  
  const iotaService = new IOTAService();
  
  try {
    // Test 1: Basic connection
    console.log('1️⃣ Testing basic connection...');
    const isConnected = await iotaService.testConnection();
    console.log(`   Result: ${isConnected ? '✅ Connected' : '❌ Not Connected'}\n`);
    
    // Test 2: Network info
    console.log('2️⃣ Getting network information...');
    const networkInfo = await iotaService.getNetworkInfo();
    console.log('   Network Status:', networkInfo);
    console.log(`   Contracts Deployed: ${networkInfo.contractsDeployed}/5`);
    console.log(`   Network Health: ${networkInfo.networkHealth}\n`);
    
    console.log('✅ Basic connectivity test complete!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testIOTAConnectivity();
EOF
