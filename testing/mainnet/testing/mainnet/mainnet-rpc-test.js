// IOTA Rebased Mainnet RPC Testing Suite
// File: mainnet-rpc-test.js

const axios = require('axios');
const crypto = require('crypto');

class IOTARebasedTester {
    constructor() {
        this.endpoint = 'https://api.mainnet.iota.cafe';
        this.chainId = '6364aad5'; // Confirmed mainnet chain ID
        this.testAccount = '0x0509c6cb62be6d152ff10bac89ede842768de3b5'; // Your configured account
    }

    async makeRPCCall(method, params = []) {
        const payload = {
            jsonrpc: '2.0',
            id: Math.floor(Math.random() * 10000),
            method: method,
            params: params
        };

        try {
            console.log(`\n�� Testing RPC Method: ${method}`);
            console.log(`📤 Request:`, JSON.stringify(payload, null, 2));
            
            const response = await axios.post(this.endpoint, payload, {
                headers: {
                    'Content-Type': 'application/json',
                },
                timeout: 10000
            });

            console.log(`✅ Response Status: ${response.status}`);
            console.log(`📥 Response:`, JSON.stringify(response.data, null, 2));
            
            return {
                success: true,
                method: method,
                data: response.data,
                statusCode: response.status
            };
        } catch (error) {
            console.log(`❌ Error for ${method}:`, error.message);
            if (error.response) {
                console.log(`📥 Error Response:`, JSON.stringify(error.response.data, null, 2));
            }
            
            return {
                success: false,
                method: method,
                error: error.message,
                errorData: error.response?.data
            };
        }
    }

    async testBasicConnection() {
        console.log('\n=== BASIC CONNECTION TESTS ===');
        
        const tests = [
            // Known working method
            { method: 'iota_getChainIdentifier', params: [] },
            
            // Network info methods
            { method: 'iota_getNetworkInfo', params: [] },
            { method: 'iota_getProtocolConfig', params: [] },
            { method: 'iota_getLatestBlockHeight', params: [] },
            { method: 'iota_getLatestCommitNumber', params: [] },
            
            // Alternative naming patterns
            { method: 'sui_getChainIdentifier', params: [] }, // Test if sui_ works
            { method: 'iota_chainIdentifier', params: [] }, // Alternative format
        ];

        const results = [];
        for (const test of tests) {
            const result = await this.makeRPCCall(test.method, test.params);
            results.push(result);
            await this.sleep(500); // Rate limiting
        }

        return results;
    }

    async testAccountMethods() {
        console.log('\n=== ACCOUNT AND BALANCE TESTS ===');
        
        const tests = [
            // Balance queries
            { method: 'iota_getBalance', params: [this.testAccount] },
            { method: 'iota_getAllBalances', params: [this.testAccount] },
            { method: 'iota_getCoinBalances', params: [this.testAccount] },
            
            // Account info
            { method: 'iota_getOwnedObjects', params: [this.testAccount] },
            { method: 'iota_getAccountInfo', params: [this.testAccount] },
            { method: 'iota_getAccountBalance', params: [this.testAccount] },
            
            // Alternative parameter formats
            { method: 'iota_getBalance', params: [{ address: this.testAccount }] },
            { method: 'iota_getOwnedObjects', params: [{ 
                owner: this.testAccount,
                limit: 10
            }] },
            
            // Try with different object types
            { method: 'iota_getOwnedObjects', params: [
                this.testAccount, 
                { 
                    filter: { StructType: "0x2::coin::Coin" },
                    limit: 10 
                }
            ] },
        ];

        const results = [];
        for (const test of tests) {
            const result = await this.makeRPCCall(test.method, test.params);
            results.push(result);
            await this.sleep(500);
        }

        return results;
    }

    async testTransactionMethods() {
        console.log('\n=== TRANSACTION METHODS TESTS ===');
        
        const tests = [
            // Transaction info methods
            { method: 'iota_getTransactionCount', params: [] },
            { method: 'iota_getGasPrice', params: [] },
            { method: 'iota_estimateGas', params: [] },
            
            // Transaction building methods  
            { method: 'iota_getTransactionBlock', params: [] },
            { method: 'iota_getLatestTransactionBlocks', params: [10] },
            
            // Dry run capabilities
            { method: 'iota_dryRunTransactionBlock', params: [] },
            
            // Alternative naming
            { method: 'iota_getGasBudget', params: [] },
            { method: 'iota_getTransactionMetadata', params: [] },
        ];

        const results = [];
        for (const test of tests) {
            const result = await this.makeRPCCall(test.method, test.params);
            results.push(result);
            await this.sleep(500);
        }

        return results;
    }

    async testObjectAndStateMethods() {
        console.log('\n=== OBJECT AND STATE METHODS ===');
        
        const tests = [
            // Object queries
            { method: 'iota_getObject', params: [] },
            { method: 'iota_getObjects', params: [] },
            { method: 'iota_getObjectsOwnedByAddress', params: [this.testAccount] },
            
            // State queries
            { method: 'iota_getSystemState', params: [] },
            { method: 'iota_getValidators', params: [] },
            { method: 'iota_getCommittee', params: [] },
            
            // Event methods
            { method: 'iota_queryEvents', params: [] },
            { method: 'iota_getEvents', params: [] },
        ];

        const results = [];
        for (const test of tests) {
            const result = await this.makeRPCCall(test.method, test.params);
            results.push(result);
            await this.sleep(500);
        }

        return results;
    }

    async runComprehensiveTest() {
        console.log('🚀 Starting IOTA Rebased Mainnet RPC Testing Suite');
        console.log(`📡 Endpoint: ${this.endpoint}`);
        console.log(`🔗 Chain ID: ${this.chainId}`);
        console.log(`👤 Test Account: ${this.testAccount}`);
        
        const allResults = {
            timestamp: new Date().toISOString(),
            endpoint: this.endpoint,
            chainId: this.chainId,
            testAccount: this.testAccount,
            tests: {}
        };

        try {
            // Run all test suites
            allResults.tests.basicConnection = await this.testBasicConnection();
            allResults.tests.accountMethods = await this.testAccountMethods();
            allResults.tests.transactionMethods = await this.testTransactionMethods();
            allResults.tests.objectAndState = await this.testObjectAndStateMethods();

            // Generate summary
            this.generateSummary(allResults);
            
            return allResults;
        } catch (error) {
            console.error('❌ Test suite failed:', error);
            return { error: error.message, results: allResults };
        }
    }

    generateSummary(results) {
        console.log('\n' + '='.repeat(60));
        console.log('📊 TEST SUMMARY');
        console.log('='.repeat(60));

        const workingMethods = [];
        const failedMethods = [];

        Object.entries(results.tests).forEach(([category, tests]) => {
            console.log(`\n�� ${category.toUpperCase()}:`);
            tests.forEach(test => {
                if (test.success) {
                    console.log(`  ✅ ${test.method}`);
                    workingMethods.push(test.method);
                } else {
                    console.log(`  ❌ ${test.method}: ${test.error}`);
                    failedMethods.push(test.method);
                }
            });
        });

        console.log('\n' + '='.repeat(60));
        console.log(`✅ WORKING METHODS (${workingMethods.length}):`);
        workingMethods.forEach(method => console.log(`   - ${method}`));
        
        console.log(`\n❌ FAILED METHODS (${failedMethods.length}):`);
        failedMethods.forEach(method => console.log(`   - ${method}`));
        
        console.log('\n' + '='.repeat(60));
        console.log('💡 NEXT STEPS:');
        console.log('1. Use working methods for mainnet integration');
        console.log('2. Test transaction building with working methods');
        console.log('3. Proceed to smart contract deployment');
        console.log('='.repeat(60));
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Usage and Export
async function runMainnetTests() {
    const tester = new IOTARebasedTester();
    const results = await tester.runComprehensiveTest();
    
    // Save results to file
    const fs = require('fs');
    const filename = `mainnet-test-results-${Date.now()}.json`;
    fs.writeFileSync(filename, JSON.stringify(results, null, 2));
    console.log(`\n💾 Results saved to: ${filename}`);
    
    return results;
}

// Run tests if called directly
if (require.main === module) {
    runMainnetTests().catch(console.error);
}

module.exports = {
    IOTARebasedTester,
    runMainnetTests
};
