// Focused IOTA Rebased Mainnet Test - Using Sui-style RPC Methods
// File: focused-mainnet-test.js

const axios = require('axios');

class IOTAMainnetTester {
    constructor() {
        this.endpoint = 'https://api.mainnet.iota.cafe';
        this.chainId = '6364aad5';
        this.testAccount = '0x0509c6cb62be6d152ff10bac89ede842768de3b5';
    }

    async makeRPCCall(method, params = []) {
        const payload = {
            jsonrpc: '2.0',
            id: Math.floor(Math.random() * 10000),
            method: method,
            params: params
        };

        try {
            console.log(`\n🔍 Testing: ${method}`);
            
            const response = await axios.post(this.endpoint, payload, {
                headers: { 'Content-Type': 'application/json' },
                timeout: 10000
            });

            if (response.data.error) {
                console.log(`❌ Error: ${response.data.error.message} (${response.data.error.code})`);
                return { success: false, method, error: response.data.error };
            } else {
                console.log(`✅ Success: ${method}`);
                if (response.data.result) {
                    // Show preview of result
                    const resultPreview = JSON.stringify(response.data.result).substring(0, 200);
                    console.log(`📊 Result preview: ${resultPreview}...`);
                }
                return { success: true, method, data: response.data.result };
            }
        } catch (error) {
            console.log(`❌ Network Error: ${error.message}`);
            return { success: false, method, error: error.message };
        }
    }

    async testWorkingMethods() {
        console.log('\n🎯 TESTING CONFIRMED WORKING METHODS');
        console.log('='.repeat(50));
        
        const workingMethods = [
            { method: 'iota_getChainIdentifier', params: [] },
            { method: 'iota_getNetworkInfo', params: [] },
            { method: 'iota_getProtocolConfig', params: [] }
        ];

        const results = [];
        for (const test of workingMethods) {
            const result = await this.makeRPCCall(test.method, test.params);
            results.push(result);
            await this.sleep(300);
        }

        return results;
    }

    async testSuiStyleMethods() {
        console.log('\n🔍 TESTING SUI-STYLE RPC METHODS');
        console.log('='.repeat(50));
        
        // IOTA Rebased is based on Sui, so let's try Sui RPC methods
        const suiMethods = [
            // Account and balance methods (Sui style)
            { method: 'suix_getBalance', params: [this.testAccount] },
            { method: 'suix_getAllBalances', params: [this.testAccount] },
            { method: 'suix_getCoinBalances', params: [this.testAccount] },
            { method: 'suix_getOwnedObjects', params: [this.testAccount] },
            
            // Alternative balance methods
            { method: 'sui_getBalance', params: [this.testAccount, null] },
            { method: 'sui_getAllBalances', params: [this.testAccount] },
            { method: 'sui_getCoins', params: [this.testAccount] },
            
            // Gas and transaction methods
            { method: 'sui_getReferenceGasPrice', params: [] },
            { method: 'sui_getLatestCheckpointSequenceNumber', params: [] },
            { method: 'sui_getCheckpoint', params: [] },
            
            // System state
            { method: 'sui_getLatestIotaSystemState', params: [] },
            { method: 'sui_getValidatorsApy', params: [] },
            { method: 'sui_getCommittee', params: [] },
        ];

        const results = [];
        for (const test of suiMethods) {
            const result = await this.makeRPCCall(test.method, test.params);
            results.push(result);
            await this.sleep(300);
        }

        return results;
    }

    async testParameterizedMethods() {
        console.log('\n🔧 TESTING METHODS THAT NEED PARAMETERS');
        console.log('='.repeat(50));
        
        // These methods exist but need specific parameters
        const paramTests = [
            // Try to get a recent transaction (we'll use a dummy digest first)
            { 
                method: 'iota_getTransactionBlock', 
                params: ['11111111111111111111111111111111111111111111'] // dummy digest
            },
            { 
                method: 'sui_getTransactionBlock', 
                params: ['11111111111111111111111111111111111111111111'] // dummy digest
            },
            
            // Try to get system objects
            { 
                method: 'iota_getObject', 
                params: ['0x5'] // system object
            },
            { 
                method: 'sui_getObject', 
                params: ['0x5'] // system object  
            },
            
            // Try events with empty filter
            { 
                method: 'iota_queryEvents',
                params: [{ All: [] }, null, 10, false]
            },
            { 
                method: 'sui_queryEvents',
                params: [{ All: [] }, null, 10, false]
            }
        ];

        const results = [];
        for (const test of paramTests) {
            const result = await this.makeRPCCall(test.method, test.params);
            results.push(result);
            await this.sleep(300);
        }

        return results;
    }

    async checkAccountFunding() {
        console.log('\n💰 CHECKING ACCOUNT FUNDING STATUS');
        console.log('='.repeat(50));
        
        // Try multiple ways to get balance
        const balanceTests = [
            { method: 'suix_getBalance', params: [this.testAccount] },
            { method: 'sui_getBalance', params: [this.testAccount, null] },
            { method: 'suix_getAllBalances', params: [this.testAccount] },
            { method: 'sui_getAllBalances', params: [this.testAccount] },
            { method: 'suix_getCoins', params: [this.testAccount] },
            { method: 'sui_getCoins', params: [this.testAccount] }
        ];

        let accountHasFunds = false;
        let balanceInfo = null;

        for (const test of balanceTests) {
            const result = await this.makeRPCCall(test.method, test.params);
            if (result.success && result.data) {
                console.log(`💰 Balance found via ${test.method}:`, result.data);
                accountHasFunds = true;
                balanceInfo = result.data;
                break;
            }
            await this.sleep(300);
        }

        if (!accountHasFunds) {
            console.log('⚠️  Could not determine account balance with any method');
            console.log('📝 This may mean:');
            console.log('   - Account has zero balance');
            console.log('   - Different RPC method names than expected');
            console.log('   - Account needs to be funded for deployment');
        }

        return { accountHasFunds, balanceInfo };
    }

    async runFocusedTest() {
        console.log('🎯 IOTA Rebased Mainnet - Focused RPC Testing');
        console.log('🔗 Chain ID: 6364aad5 (confirmed working)');
        console.log('📡 Endpoint: https://api.mainnet.iota.cafe');
        console.log('👤 Account: 0x0509c6cb62be6d152ff10bac89ede842768de3b5');
        console.log('='.repeat(60));

        const testResults = {
            timestamp: new Date().toISOString(),
            chainId: this.chainId,
            endpoint: this.endpoint,
            testAccount: this.testAccount,
            results: {}
        };

        try {
            // Test confirmed working methods
            testResults.results.workingMethods = await this.testWorkingMethods();
            
            // Test Sui-style methods (IOTA Rebased is Sui-based)
            testResults.results.suiStyleMethods = await this.testSuiStyleMethods();
            
            // Test parameterized methods
            testResults.results.parameterizedMethods = await this.testParameterizedMethods();
            
            // Check account funding
            testResults.results.accountStatus = await this.checkAccountFunding();
            
            // Generate actionable summary
            this.generateActionableSummary(testResults);
            
            return testResults;
            
        } catch (error) {
            console.error('❌ Test suite failed:', error);
            return { error: error.message, partialResults: testResults };
        }
    }

    generateActionableSummary(results) {
        console.log('\n' + '='.repeat(60));
        console.log('📋 ACTIONABLE SUMMARY FOR DEPLOYMENT');
        console.log('='.repeat(60));

        // Find working balance method
        const workingMethods = [];
        Object.values(results.results).forEach(categoryResults => {
            if (Array.isArray(categoryResults)) {
                categoryResults.forEach(result => {
                    if (result.success) {
                        workingMethods.push(result.method);
                    }
                });
            }
        });

        console.log(`\n✅ CONFIRMED WORKING METHODS (${workingMethods.length}):`);
        workingMethods.forEach(method => console.log(`   - ${method}`));

        // Account status
        const accountStatus = results.results.accountStatus;
        if (accountStatus?.accountHasFunds) {
            console.log('\n💰 ACCOUNT STATUS: ✅ FUNDED');
            console.log('   Ready for smart contract deployment!');
        } else {
            console.log('\n💰 ACCOUNT STATUS: ⚠️  NEEDS FUNDING');
            console.log('   Action required: Fund account before deployment');
        }

        // Next steps
        console.log('\n🚀 NEXT STEPS FOR DEPLOYMENT:');
        if (workingMethods.length >= 3) {
            console.log('   1. ✅ RPC connection confirmed');
            if (accountStatus?.accountHasFunds) {
                console.log('   2. ✅ Account funded');
                console.log('   3. 🎯 Ready for smart contract deployment!');
                console.log('      Run: node deploy-mainnet.js deploy');
            } else {
                console.log('   2. ⚠️  Fund account with MIOTA');
                console.log('   3. 🎯 Then deploy contracts');
            }
        } else {
            console.log('   1. ⚠️  Limited RPC functionality detected');
            console.log('   2. 🔍 May need alternative deployment method');
        }

        console.log('\n📄 USE THESE METHODS FOR INTEGRATION:');
        workingMethods.slice(0, 5).forEach(method => {
            console.log(`   - ${method}`);
        });
        
        console.log('='.repeat(60));
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Run the focused test
async function runFocusedMainnetTest() {
    const tester = new IOTAMainnetTester();
    const results = await tester.runFocusedTest();
    
    // Save results
    const fs = require('fs');
    const filename = `focused-mainnet-results-${Date.now()}.json`;
    fs.writeFileSync(filename, JSON.stringify(results, null, 2));
    console.log(`\n💾 Detailed results saved to: ${filename}`);
    
    return results;
}

if (require.main === module) {
    runFocusedMainnetTest().catch(console.error);
}

module.exports = {
    IOTAMainnetTester,
    runFocusedMainnetTest
}