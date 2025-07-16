// Simple IOTA Rebased connectivity test
async function testIOTA() {
  console.log('🚀 Testing IOTA Rebased Mainnet Connection\n');
  
  const endpoint = 'https://api.mainnet.iota.cafe';
  console.log(`📡 Endpoint: ${endpoint}`);
  
  try {
    // Test basic connectivity
    console.log('🔍 Testing basic connectivity...');
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'iota_getChainIdentifier',
        params: []
      })
    });
    
    const data = await response.json();
    console.log('✅ Response received:', JSON.stringify(data, null, 2));
    
    if (data.result) {
      console.log(`\n🎉 SUCCESS: Chain ID confirmed as ${data.result}`);
      console.log('✅ IOTA Rebased mainnet connection working!');
    } else if (data.error) {
      console.log(`\n⚠️  Method error: ${data.error.message}`);
      console.log('💡 Need to discover correct RPC methods for IOTA Rebased');
    }
    
  } catch (error) {
    console.log(`❌ Connection failed: ${error.message}`);
  }
  
  console.log('\n📋 Status: Ready for next chat to resolve RPC methods');
}

testIOTA();
