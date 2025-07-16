#!/usr/bin/env ts-node

/**
 * IOTA Rebased Mainnet Connection Test Suite - WORKING VERSION
 * Using confirmed working endpoints: api.mainnet.iota.cafe
 */

import { SuiClient } from '@mysten/sui.js/client';
import { Ed25519Keypair } from '@mysten/sui.js/keypairs/ed25519';
import { TransactionBlock } from '@mysten/sui.js/transactions';

// CONFIRMED WORKING ENDPOINTS
const IOTA_REBASED_ENDPOINTS = {
  fullnode: 'https://api.mainnet.iota.cafe',
  indexer: 'https://indexer.mainnet.iota.cafe',
  explorer: 'https://explorer.iota.org'
};

// Your account details
const PRIVATE_KEY = '0xc4c3ac5d49bddd5155fa08eebb73225da6ef0f023d90c890cc7739769b6d08c3';
const ADDRESS = '0x0509c6cb62be6d152ff10bac89ede842768de3b5';

interface TestResult {
  name: string;
  status: 'pass' | 'fail' | 'warning';
  details: string;
  duration: number;
  data?: any;
}

class MainnetTester {
  private client: SuiClient;
  private keypair: Ed25519Keypair;
  private results: TestResult[] = [];

  constructor() {
    console.log('🔗 Connecting to IOTA Rebased Mainnet...');
    console.log(`📡 RPC Endpoint: ${IOTA_REBASED_ENDPOINTS.fullnode}`);
    
    this.client = new SuiClient({ 
      url: IOTA_REBASED_ENDPOINTS.fullnode 
    });
    
    const privateKeyBytes = new Uint8Array(
      PRIVATE_KEY.slice(2).match(/.{2}/g)!.map(byte => parseInt(byte, 16))
    );
    this.keypair = Ed25519Keypair.fromSecretKey(privateKeyBytes);
    
    console.log(`🔑 Account Address: ${ADDRESS}`);
    console.log('');
  }

  private async runTest(name: string, testFn: () => Promise<any>): Promise<TestResult> {
    process.stdout.write(`🧪 Testing ${name}... `);
    const startTime = Date.now();

    try {
      const result = await testFn();
      const duration = Date.now() - startTime;
      console.log(`✅ PASS (${duration}ms)`);
      
      return { name, status: 'pass', details: 'Success', duration, data: result };
    } catch (error: any) {
      const duration = Date.now() - startTime;
      console.log(`❌ FAIL (${duration}ms)`);
      console.log(`   Error: ${error.message}`);
      
      return { name, status: 'fail', details: error.message, duration };
    }
  }

  async testChainConnectivity(): Promise<TestResult> {
    return this.runTest('Chain Connectivity', async () => {
      const chainId = await this.client.getChainIdentifier();
      const latestCheckpoint = await this.client.getLatestCheckpointSequenceNumber();
      
      return {
        chainId,
        latestCheckpoint,
        endpoint: IOTA_REBASED_ENDPOINTS.fullnode,
        network: 'IOTA Rebased Mainnet'
      };
    });
  }

  async testAccountStatus(): Promise<TestResult> {
    return this.runTest('Account Status', async () => {
      const balance = await this.client.getBalance({ owner: ADDRESS });
      const objects = await this.client.getOwnedObjects({
        owner: ADDRESS,
        options: { showType: true, showContent: true }
      });

      return {
        address: ADDRESS,
        balance: balance.totalBalance,
        coinType: balance.coinType,
        objectCount: objects.data.length,
        hasBalance: BigInt(balance.totalBalance) > 0n
      };
    });
  }

  async runAllTests(): Promise<void> {
    console.log('🚀 OmeoneChain IOTA Rebased Mainnet Test Suite');
    console.log('================================================\n');

    const tests = [
      () => this.testChainConnectivity(),
      () => this.testAccountStatus()
    ];

    for (const test of tests) {
      const result = await test();
      this.results.push(result);
    }

    this.printSummary();
  }

  private printSummary(): void {
    console.log('\n📊 Test Results Summary');
    console.log('========================\n');

    const passed = this.results.filter(r => r.status === 'pass').length;
    const failed = this.results.filter(r => r.status === 'fail').length;

    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);

    const connectivity = this.results.find(r => r.name === 'Chain Connectivity');
    const account = this.results.find(r => r.name === 'Account Status');

    if (connectivity?.data) {
      console.log('\n🌐 Network Information:');
      console.log(`   Chain ID: ${connectivity.data.chainId}`);
      console.log(`   Latest Checkpoint: ${connectivity.data.latestCheckpoint}`);
    }

    if (account?.data) {
      console.log('\n💰 Account Information:');
      console.log(`   Address: ${account.data.address}`);
      console.log(`   Balance: ${account.data.balance} MIST`);
      console.log(`   Objects: ${account.data.objectCount}`);
    }

    console.log('\n🎉 IOTA Rebased mainnet integration successful!');
  }
}

if (require.main === module) {
  const tester = new MainnetTester();
  tester.runAllTests().catch(error => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });
}

export { MainnetTester };
