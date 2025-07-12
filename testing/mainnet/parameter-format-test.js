// IOTA Parameter Format Testing
// Let's find the correct parameter format for iotax_ methods

const IOTA_MAINNET_RPC = 'https://api.mainnet.iota.cafe';
const YOUR_ADDRESS = '0x0509c6cb62be6d152ff10bac89ede842768de3b5';

console.log('🔧 IOTA Parameter Format Testing');
console.log('=================================');

// Helper function for RPC calls with detailed error reporting
async function testParameterFormat(method, paramVariations, description) {
    console.log(`\n📋 Testing ${description}`);
    console.log('=' + '='.repeat(description.length + 8));
    
    for (let i = 0; i < paramVariations.length; i++) {
        const params = paramVariations[i];
        console.log(`\n${i + 1}. Testing with params:`, JSON.stringify(params, null, 2));
        
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
                console.log(`   ❌ ${data.error.message}`);
                if (data.error.data) {
                    console.log(`   📝 Details: ${JSON.stringify(data.error.data)}`);
                }
            } else {
                console.log('   ✅ SUCCESS!');
                console.log('   📊 Result preview:', JSON.stringify(data.result, null, 2).substring(0, 300) + '...');
                return { success: true, result: data.result };
            }
        } catch (error) {
            console.log(`   💥 Network error: ${error.message}`);
        }
        
        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 200));
    }
    
    return { success: false };
}

async function testAllMethods() {
    // Test 1: Balance Methods
    const balanceVariations = [
        [YOUR_ADDRESS],                                    // Simple address
        [YOUR_ADDRESS, null],                             // Address + null coin type
        [YOUR_ADDRESS, "0x2::iota::IOTA"],               // Address + IOTA coin type
        [{ address: YOUR_ADDRESS }],                      // Object format
        [{ owner: YOUR_ADDRESS }],                        // Owner format
        [YOUR_ADDRESS, { coinType: "0x2::iota::IOTA" }], // Address + options
    ];
    
    await testParameterFormat('iotax_getAllBalances', balanceVariations, 'Balance Methods');
    
    // Test 2: Owned Objects Methods  
    const objectVariations = [
        [YOUR_ADDRESS],                                   // Simple address
        [YOUR_ADDRESS, null],                            // Address + null cursor
        [YOUR_ADDRESS, { showType: true }],              // Address + options
        [YOUR_ADDRESS, { showContent: true, showType: true }], // Address + full options
        [{ address: YOUR_ADDRESS }],                      // Object format
        [YOUR_ADDRESS, null, null],                       // Address + cursor + limit
        [YOUR_ADDRESS, { showType: true, showContent: true }, null, 50], // Full format
    ];
    
    await testParameterFormat('iotax_getOwnedObjects', objectVariations, 'Owned Objects Methods');
    
    // Test 3: Transaction Query Methods
    const txVariations = [
        [{ filter: { FromAddress: YOUR_ADDRESS } }],      // Standard filter
        [{ filter: { ToAddress: YOUR_ADDRESS } }],        // To address filter
        [{ filter: { FromAddress: YOUR_ADDRESS }, limit: 5 }], // With limit
        [{ 
            filter: { FromAddress: YOUR_ADDRESS },
            options: { showInput: true }
        }],                                               // With options
        [YOUR_ADDRESS],                                   // Just address
        [{ address: YOUR_ADDRESS }],                      // Object format
    ];
    
    await testParameterFormat('iotax_queryTransactionBlocks', txVariations, 'Transaction Query Methods');
    
    // Test 4: Simple Balance Check (specific coin)
    const specificBalanceVariations = [
        [YOUR_ADDRESS, "0x2::iota::IOTA"],               // Standard IOTA type
        [YOUR_ADDRESS, "iota"],                          // Short name
        [YOUR_ADDRESS, "IOTA"],                          // Uppercase
        [YOUR_ADDRESS, null],                            // Null coin type
        [YOUR_ADDRESS, "0x0000000000000000000000000000000000000000000000000000000000000002::iota::IOTA"], // Full format
    ];
    
    await testParameterFormat('iotax_getBalance', specificBalanceVariations, 'Specific Balance Methods');
    
    // Test 5: Coins Method (might be easier)
    const coinVariations = [
        [YOUR_ADDRESS],                                   // Simple address
        [YOUR_ADDRESS, null],                            // Address + null coin type  
        [YOUR_ADDRESS, "0x2::iota::IOTA"],               // Address + IOTA type
        [YOUR_ADDRESS, null, null],                       // Address + cursor + limit
        [YOUR_ADDRESS, "0x2::iota::IOTA", null, 50],     // Full format
    ];
    
    await testParameterFormat('iotax_getCoins', coinVariations, 'Coins Methods');
}

// Test if address format is the issue
async function testAddressFormats() {
    console.log('\n🔍 TESTING ADDRESS FORMATS');
    console.log('===========================');
    
    const addressFormats = [
        YOUR_ADDRESS,                                     // Your current format
        YOUR_ADDRESS.toLowerCase(),                       // Lowercase
        YOUR_ADDRESS.toUpperCase(),                       // Uppercase  
        YOUR_ADDRESS.replace('0x', ''),                   // Without 0x prefix
        '0x' + YOUR_ADDRESS.replace('0x', '').padStart(64, '0'), // Padded to 64 chars
    ];
    
    for (let i = 0; i < addressFormats.length; i++) {
        const address = addressFormats[i];
        console.log(`\n${i + 1}. Testing address format: ${address}`);
        
        try {
            const response = await fetch(IOTA_MAINNET_RPC, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    jsonrpc: '2.0',
                    id: 1,
                    method: 'iotax_getAllBalances',
                    params: [address]
                })
            });

            const data = await response.json();
            
            if (data.error) {
                console.log(`   ❌ ${data.error.message}`);
            } else {
                console.log('   ✅ SUCCESS! This address format works');
                console.log('   📊 Result:', JSON.stringify(data.result, null, 2));
                return address; // Return working format
            }
        } catch (error) {
            console.log(`   💥 Network error: ${error.message}`);
        }
        
        await new Promise(resolve => setTimeout(resolve, 200));
    }
    
    return null;
}

// Main testing function
async function main() {
    console.log(`Testing with address: ${YOUR_ADDRESS}`);
    console.log(`Network: IOTA Rebased Mainnet`);
    
    // First test address formats
    const workingAddress = await testAddressFormats();
    
    if (workingAddress) {
        console.log(`\n🎉 Found working address format: ${workingAddress}`);
        // Update the address for subsequent tests
        YOUR_ADDRESS = workingAddress;
    }
    
    // Then test all parameter variations
    await testAllMethods();
    
    console.log('\n🎯 TESTING COMPLETE');
    console.log('===================');
    console.log('📋 Summary:');
    console.log('• Look for ✅ SUCCESS messages above');
    console.log('• Note the exact parameter format that worked');
    console.log('• We\'ll use the working format for deployment');
    console.log('');
    console.log('🚀 Once we find working parameters, we can check your balance!');
}

main().catch(console.error);