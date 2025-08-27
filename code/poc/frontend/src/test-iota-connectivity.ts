// Test script to check IOTA Rebased contract connectivity
import { IOTAService } from './services/IOTAService';

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
    
    // Test 3: Sample user address for testing
    const testUserAddress = '0x1234567890abcdef1234567890abcdef12345678';
    
    // Test 4: Trust Score calculation
    console.log('3️⃣ Testing Trust Score calculation...');
    const trustScore = await iotaService.calculateLiveTrustScore(testUserAddress);
    console.log('   Trust Score Result:', {
      finalScore: trustScore.finalScore,
      directConnections: trustScore.breakdown.directConnections,
      indirectConnections: trustScore.breakdown.indirectConnections,
      authorReputation: trustScore.breakdown.authorReputation
    });
    console.log('\n');
    
    // Test 5: Token balance
    console.log('4️⃣ Testing token balance query...');
    const balance = await iotaService.getLiveTokenBalance(testUserAddress);
    console.log(`   Token Balance: ${balance} TOK\n`);
    
    // Test 6: Comprehensive dashboard data
    console.log('5️⃣ Testing comprehensive dashboard data...');
    const dashboardData = await iotaService.getDashboardData(testUserAddress);
    console.log('   Dashboard Data Summary:', {
      hasReputation: !!dashboardData.reputation,
      tokenBalance: dashboardData.tokenBalance,
      trustScore: dashboardData.trustCalculation.finalScore,
      networkConnected: dashboardData.networkStatus.isConnected,
      contractsWorking: dashboardData.networkStatus.contractsDeployed
    });
    
    console.log('\n🎉 IOTA Connectivity Test Complete!');
    
    // Summary
    const allTestsPassed = isConnected && 
                          networkInfo.contractsDeployed >= 3 && 
                          trustScore.finalScore > 0 && 
                          balance > 0;
    
    console.log('\n📊 SUMMARY:');
    console.log(`Overall Status: ${allTestsPassed ? '✅ READY FOR INTEGRATION' : '⚠️ NEEDS ATTENTION'}`);
    console.log(`Contracts Accessible: ${networkInfo.contractsDeployed}/5`);
    console.log(`Using Mock Client: ${(iotaService as any).usingMockClient ? 'Yes (Development Mode)' : 'No (Live Blockchain)'}`);
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testIOTAConnectivity();