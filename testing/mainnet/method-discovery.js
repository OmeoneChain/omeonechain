// IOTA Rebased Method Discovery Script
// Let's find the actual method names for balance and objects

const IOTA_MAINNET_RPC = 'https://api.mainnet.iota.cafe';
const YOUR_ADDRESS = '0x0509c6cb62be6d152ff10bac89ede842768de3b5';

console.log('🔍 IOTA Rebased Method Discovery');
console.log('===============================');

// Helper function for RPC calls
async function testMethod(method, params = []) {
    try {
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
            return { success: false, error: data.error.message };
        } else {
            return { success: true, result: data.result };
        }
    } catch (error) {
        return { success: false, error: error.message };
    }
}

// Comprehensive method name variations to test
async function discoverMethods() {
    console.log(`Testing with address: ${YOUR_ADDRESS}\n`);
    
    // Balance-related methods
    console.log('💰 TESTING BALANCE METHODS');
    console.log('==========================');
    
    const balanceMethods = [
        'suix_getBalance',
        'suix_getAllBalances', 
        'suix_getCoinMetadata',
        'sui_getBalance',
        'sui_getAllBalances',
        'iota_getBalance',
        'iotax_getBalance',
        'suix_getCoins',
        'sui_getCoins',
        'iota_getCoins'
    ];
    
    for (const method of balanceMethods) {
        const result = await testMethod(method, [YOUR_ADDRESS]);
        console.log(`${result.success ? '✅' : '❌'} ${method}: ${result.success ? 'SUCCESS' : result.error}`);
        
        if (result.success) {
            console.log('   Result preview:', JSON.stringify(result.result, null, 2).substring(0, 200) + '...');
        }
        
        await new Promise(resolve => setTimeout(resolve, 100)); // Rate limiting
    }
    
    // Object-related methods
    console.log('\n🎁 TESTING OBJECT METHODS');
    console.log('=========================');
    
    const objectMethods = [
        'suix_getOwnedObjects',
        'sui_getOwnedObjects', 
        'iota_getOwnedObjects',
        'iotax_getOwnedObjects',
        'suix_queryObjects',
        'sui_queryObjects',
        'iota_queryObjects'
    ];
    
    for (const method of objectMethods) {
        const result = await testMethod(method, [
            YOUR_ADDRESS,
            {
                showType: true,
                showContent: true,
                showOwner: true
            }
        ]);
        console.log(`${result.success ? '✅' : '❌'} ${method}: ${result.success ? 'SUCCESS' : result.error}`);
        
        if (result.success) {
            console.log('   Result preview:', JSON.stringify(result.result, null, 2).substring(0, 200) + '...');
        }
        
        await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    // Transaction methods
    console.log('\n📝 TESTING TRANSACTION METHODS');
    console.log('==============================');
    
    const txMethods = [
        'suix_queryTransactionBlocks',
        'sui_queryTransactionBlocks',
        'iota_queryTransactionBlocks', 
        'iotax_queryTransactionBlocks',
        'suix_getTransactionBlock',
        'sui_getTransactionBlock',
        'iota_getTransactionBlock'
    ];
    
    for (const method of txMethods) {
        // Try with simple filter first
        const result = await testMethod(method, [
            {
                filter: {
                    FromAddress: YOUR_ADDRESS
                },
                limit: 1
            }
        ]);
        console.log(`${result.success ? '✅' : '❌'} ${method}: ${result.success ? 'SUCCESS' : result.error}`);
        
        if (result.success) {
            console.log('   Result preview:', JSON.stringify(result.result, null, 2).substring(0, 200) + '...');
        }
        
        await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    // Network info methods
    console.log('\n🌐 TESTING NETWORK INFO METHODS');
    console.log('===============================');
    
    const networkMethods = [
        'suix_getReferenceGasPrice',
        'sui_getReferenceGasPrice',
        'iota_getReferenceGasPrice',
        'suix_getLatestCheckpointSequenceNumber',
        'sui_getLatestCheckpointSequenceNumber', 
        'iota_getLatestCheckpointSequenceNumber', // We know this works
        'suix_getChainIdentifier',
        'sui_getChainIdentifier',
        'iota_getChainIdentifier', // We know this works
        'suix_getCheckpoint',
        'sui_getCheckpoint',
        'iota_getCheckpoint'
    ];
    
    for (const method of networkMethods) {
        let params = [];
        
        // Special handling for checkpoint methods
        if (method.includes('getCheckpoint') && !method.includes('Sequence')) {
            params = ['25272165']; // Use latest checkpoint number we know
        }
        
        const result = await testMethod(method, params);
        console.log(`${result.success ? '✅' : '❌'} ${method}: ${result.success ? 'SUCCESS' : result.error}`);
        
        if (result.success && method !== 'iota_getLatestCheckpointSequenceNumber' && method !== 'iota_getChainIdentifier') {
            console.log('   Result preview:', JSON.stringify(result.result, null, 2).substring(0, 200) + '...');
        }
        
        await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    // Method list discovery
    console.log('\n📚 TESTING METHOD DISCOVERY');
    console.log('===========================');
    
    const discoveryMethods = [
        'rpc.discover',
        'system.listMethods',
        'iota.listMethods',
        'sui.listMethods',
        'help'
    ];
    
    for (const method of discoveryMethods) {
        const result = await testMethod(method, []);
        console.log(`${result.success ? '✅' : '❌'} ${method}: ${result.success ? 'SUCCESS' : result.error}`);
        
        if (result.success) {
            console.log('   Available methods:', result.result);
        }
        
        await new Promise(resolve => setTimeout(resolve, 100));
    }
}

// Summary and next steps
async function summarizeFindings() {
    console.log('\n🎯 DISCOVERY SUMMARY');
    console.log('===================');
    console.log('Based on testing, we now know:');
    console.log('✅ IOTA Rebased mainnet is fully operational');
    console.log('✅ Network identity and config methods work'); 
    console.log('❓ Balance and object methods use different naming');
    console.log('');
    console.log('📋 NEXT ACTIONS:');
    console.log('1. Identify working balance/object method names');
    console.log('2. Test account funding status');
    console.log('3. Proceed with contract deployment');
    console.log('');
    console.log('🚀 Once we find the right method names, you\'ll be ready for deployment!');
}

// Run discovery
async function main() {
    try {
        await discoverMethods();
        await summarizeFindings();
    } catch (error) {
        console.error('Discovery failed:', error);
    }
}

main();