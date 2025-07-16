const axios = require('axios');

console.log('🎯 IOTA Rebased Mainnet - Focused RPC Testing');
console.log('📡 Endpoint: https://api.mainnet.iota.cafe');
console.log('👤 Account: 0x0509c6cb62be6d152ff10bac89ede842768de3b5');
console.log('='.repeat(60));

async function testSuiMethods() {
    const account = '0x0509c6cb62be6d152ff10bac89ede842768de3b5';
    
    const methods = [
        { method: 'suix_getBalance', params: [account] },
        { method: 'suix_getAllBalances', params: [account] },
        { method: 'sui_getBalance', params: [account, null] },
        { method: 'sui_getAllBalances', params: [account] },
        { method: 'sui_getCoins', params: [account] },
        { method: 'sui_getReferenceGasPrice', params: [] },
        { method: 'sui_getLatestCheckpointSequenceNumber', params: [] }
    ];
    
    console.log('\n🔍 Testing Sui-style RPC methods...\n');
    
    const results = [];
    
    for (const test of methods) {
        try {
            const response = await axios.post('https://api.mainnet.iota.cafe', {
                jsonrpc: '2.0',
                id: Math.floor(Math.random() * 10000),
                method: test.method,
                params: test.params
            }, {
                headers: { 'Content-Type': 'application/json' },
                timeout: 10000
            });
            
            if (response.data.error) {
                console.log(`❌ ${test.method}: ${response.data.error.message} (${response.data.error.code})`);
                results.push({ method: test.method, success: false, error: response.data.error.message });
            } else {
                console.log(`✅ ${test.method}: SUCCESS`);
                const preview = JSON.stringify(response.data.result).substring(0, 150);
                console.log(`   📊 Result: ${preview}...`);
                results.push({ method: test.method, success: true, data: response.data.result });
                
                // If this is a balance method and has data, highlight it
                if (test.method.includes('Balance') || test.method.includes('Coins')) {
                    console.log(`   💰 BALANCE FOUND!`);
                }
            }
            
        } catch (error) {
            console.log(`❌ ${test.method}: Network error - ${error.message}`);
            results.push({ method: test.method, success: false, error: error.message });
        }
        
        // Small delay between requests
        await new Promise(resolve => setTimeout(resolve, 300));
    }
    
    return results;
}

async function main() {
    try {
        // First test basic connection
        console.log('🔍 Testing basic connection...');
        const basicTest = await axios.post('https://api.mainnet.iota.cafe', {
            jsonrpc: '2.0',
            id: 1,
            method: 'iota_getChainIdentifier',
            params: []
        });
        
        console.log(`✅ Connection OK - Chain ID: ${basicTest.data.result}`);
        
        // Now test Sui methods
        const results = await testSuiMethods();
        
        // Summary
        console.log('\n' + '='.repeat(60));
        console.log('📋 SUMMARY');
        console.log('='.repeat(60));
        
        const working = results.filter(r => r.success);
        const failed = results.filter(r => !r.success);
        
        console.log(`\n✅ WORKING METHODS (${working.length}):`);
        working.forEach(r => console.log(`   - ${r.method}`));
        
        console.log(`\n❌ FAILED METHODS (${failed.length}):`);
        failed.forEach(r => console.log(`   - ${r.method}: ${r.error}`));
        
        // Check for balance info
        const balanceMethods = working.filter(r => 
            r.method.includes('Balance') || r.method.includes('Coins')
        );
        
        if (balanceMethods.length > 0) {
            console.log('\n💰 ACCOUNT STATUS: ✅ BALANCE METHODS WORK');
            console.log('   Your account balance can be checked!');
            console.log('   🎯 Ready for smart contract deployment phase!');
        } else {
            console.log('\n💰 ACCOUNT STATUS: ⚠️  NO BALANCE METHODS WORK');
            console.log('   May need different approach for deployment');
        }
        
        console.log('\n🚀 NEXT STEPS:');
        if (working.length >= 3) {
            console.log('   1. ✅ Multiple RPC methods confirmed working');
            console.log('   2. 🎯 Can proceed with smart contract deployment');
        } else {
            console.log('   1. ⚠️  Limited RPC functionality');
            console.log('   2. 🔍 May need alternative approach');
        }
        
        console.log('='.repeat(60));
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
    }
}

main().catch(console.error);
