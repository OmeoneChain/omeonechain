// IOTA Rebased Mainnet RPC Method Expansion Test
// Building on your successful Chain ID verification

const IOTA_MAINNET_RPC = 'https://api.mainnet.iota.cafe';
const YOUR_ADDRESS = '0x0509c6cb62be6d152ff10bac89ede842768de3b5';

// Test Results Tracker
const testResults = {
    chainIdentifier: '✅ Working',
    getBalance: '❓ Testing',
    getOwnedObjects: '❓ Testing', 
    getTransactionBlock: '❓ Testing',
    getNetworkInfo: '❓ Testing',
    getProtocolConfig: '❓ Testing'
};

console.log('🚀 IOTA Rebased Mainnet RPC Expansion Test');
console.log('=========================================');

// Helper function for RPC calls
async function makeRPCCall(method, params = []) {
    try {
        console.log(`\n🔍 Testing: ${method}`);
        
        const response = await fetch(IOTA_MAINNET_RPC, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                jsonrpc: '2.0',
                id: 1,
                method: method,
                params: params
            })
        });

        const data = await response.json();
        
        if (data.error) {
            console.log(`❌ ${method}: ERROR - ${data.error.message}`);
            return { success: false, error: data.error };
        } else {
            console.log(`✅ ${method}: SUCCESS`);
            console.log('Response:', JSON.stringify(data.result, null, 2));
            return { success: true, result: data.result };
        }
    } catch (error) {
        console.log(`❌ ${method}: NETWORK ERROR - ${error.message}`);
        return { success: false, error: error.message };
    }
}

// Test Suite
async function runExpandedRPCTests() {
    console.log(`Testing with address: ${YOUR_ADDRESS}`);
    console.log(`RPC Endpoint: ${IOTA_MAINNET_RPC}`);
    
    // Test 1: Confirm Chain ID (we know this works)
    console.log('\n📋 SECTION 1: NETWORK IDENTITY');
    const chainId = await makeRPCCall('iota_getChainIdentifier');
    testResults.chainIdentifier = chainId.success ? '✅ Working' : '❌ Failed';
    
    // Test 2: Network Configuration
    const networkInfo = await makeRPCCall('iota_getNetworkInfo');
    testResults.getNetworkInfo = networkInfo.success ? '✅ Working' : '❌ Failed';
    
    const protocolConfig = await makeRPCCall('iota_getProtocolConfig');
    testResults.getProtocolConfig = protocolConfig.success ? '✅ Working' : '❌ Failed';
    
    // Test 3: Account Balance (Critical for deployment)
    console.log('\n💰 SECTION 2: ACCOUNT BALANCE');
    const balance = await makeRPCCall('iota_getBalance', [YOUR_ADDRESS]);
    testResults.getBalance = balance.success ? '✅ Working' : '❌ Failed';
    
    if (balance.success) {
        const totalBalance = balance.result?.totalBalance || '0';
        console.log(`💎 Account Balance: ${totalBalance} IOTA`);
        
        if (totalBalance === '0' || !totalBalance) {
            console.log('⚠️  WARNING: Zero balance detected. You\'ll need IOTA tokens for contract deployment.');
            console.log('💡 Recommended: Get 10-100 IOTA for deployment and testing');
        } else {
            console.log('✅ Sufficient balance for contract deployment!');
        }
    }
    
    // Test 4: Owned Objects (Important for contract interaction)
    console.log('\n🎁 SECTION 3: OWNED OBJECTS');
    const ownedObjects = await makeRPCCall('iota_getOwnedObjects', [
        YOUR_ADDRESS,
        {
            showType: true,
            showContent: true,
            showOwner: true
        }
    ]);
    testResults.getOwnedObjects = ownedObjects.success ? '✅ Working' : '❌ Failed';
    
    if (ownedObjects.success) {
        const objects = ownedObjects.result?.data || [];
        console.log(`📦 Total Objects Owned: ${objects.length}`);
        
        if (objects.length > 0) {
            console.log('🔍 Object Types:');
            objects.slice(0, 5).forEach((obj, i) => {
                console.log(`  ${i + 1}. ${obj.data?.type || 'Unknown Type'}`);
            });
            if (objects.length > 5) {
                console.log(`  ... and ${objects.length - 5} more`);
            }
        }
    }
    
    // Test 5: Transaction Methods (for future contract deployment)
    console.log('\n📝 SECTION 4: TRANSACTION CAPABILITIES');
    
    // Test getting recent transactions (if any)
    const recentTxs = await makeRPCCall('iota_queryTransactionBlocks', [
        {
            filter: {
                FromAddress: YOUR_ADDRESS
            },
            options: {
                showInput: true,
                showEffects: true,
                showEvents: true
            },
            limit: 5
        }
    ]);
    
    if (recentTxs.success) {
        const txs = recentTxs.result?.data || [];
        console.log(`📊 Recent Transactions: ${txs.length}`);
        
        if (txs.length > 0) {
            console.log('🔗 Latest Transaction:');
            const latest = txs[0];
            console.log(`  Digest: ${latest.digest}`);
            console.log(`  Status: ${latest.effects?.status?.status || 'Unknown'}`);
        }
    }
    
    // Final Summary
    console.log('\n📊 FINAL TEST RESULTS');
    console.log('=====================');
    Object.entries(testResults).forEach(([method, status]) => {
        console.log(`${status} ${method}`);
    });
    
    // Deployment Readiness Assessment
    console.log('\n🎯 DEPLOYMENT READINESS ASSESSMENT');
    console.log('===================================');
    
    const criticalMethods = ['getBalance', 'getOwnedObjects'];
    const criticalWorking = criticalMethods.every(method => 
        testResults[method] === '✅ Working'
    );
    
    if (criticalWorking) {
        console.log('✅ READY: Critical RPC methods working!');
        console.log('📋 Next Steps:');
        console.log('   1. Acquire IOTA tokens for deployment');
        console.log('   2. Test contract deployment on mainnet');
        console.log('   3. Verify smart contract interactions');
    } else {
        console.log('⚠️  BLOCKED: Critical RPC methods need debugging');
        console.log('🔧 Focus Areas:');
        criticalMethods.forEach(method => {
            if (testResults[method] !== '✅ Working') {
                console.log(`   - Fix ${method} connectivity`);
            }
        });
    }
    
    return testResults;
}

// Alternative Methods to Test (if standard ones don't work)
async function testAlternativeMethods() {
    console.log('\n🔄 TESTING ALTERNATIVE METHOD NAMES');
    console.log('===================================');
    
    const alternatives = [
        'sui_getBalance',           // Sometimes IOTA uses Sui-compatible methods
        'sui_getOwnedObjects', 
        'iota_getCoinMetadata',
        'iota_getTotalSupply',
        'iota_getLatestCheckpointSequenceNumber'
    ];
    
    for (const method of alternatives) {
        await makeRPCCall(method, method.includes('Balance') || method.includes('Objects') ? [YOUR_ADDRESS] : []);
        await new Promise(resolve => setTimeout(resolve, 500)); // Rate limiting
    }
}

// Main execution
async function main() {
    try {
        const results = await runExpandedRPCTests();
        
        // If core methods don't work, try alternatives
        const coreMethodsWorking = results.getBalance === '✅ Working' && 
                                 results.getOwnedObjects === '✅ Working';
        
        if (!coreMethodsWorking) {
            await testAlternativeMethods();
        }
        
        console.log('\n🎉 RPC Expansion Testing Complete!');
        console.log('Ready for next phase: Contract Deployment');
        
    } catch (error) {
        console.error('💥 Test suite error:', error);
    }
}

// Run the tests
main();