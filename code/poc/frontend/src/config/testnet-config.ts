// IOTA Rebased Testnet Configuration - UPDATED WITH LIVE CONTRACTS
// Based on successful contract deployments July 20-21, 2025

export const IOTA_TESTNET_CONFIG = {
  // Network Configuration
  chainId: '2304aa97', // ✅ CONFIRMED
  network: 'testnet',
  protocolVersion: 9,
  
  // Endpoints
  rpcUrl: 'https://api.testnet.iota.cafe', // ✅ CONFIRMED WORKING
  explorerUrl: 'https://explorer.testnet.iota.cafe',
  faucetUrl: 'https://faucet.testnet.iota.cafe',
  
  // RPC Methods (confirmed working)
  rpcMethods: {
    getChainIdentifier: 'iota_getChainIdentifier', // ✅ WORKING
    getLatestCheckpoint: 'iota_getLatestCheckpointSequenceNumber', // ✅ WORKING
    getCheckpoint: 'iota_getCheckpoint', // ⚠️ Needs sequence number param
    getBalance: 'iota_getBalance', // To be tested
    getCoins: 'iota_getCoins', // To be tested
    getObjects: 'iota_getOwnedObjects', // To be tested
    executeTransactionBlock: 'iota_executeTransactionBlock',
    getTransactionBlock: 'iota_getTransactionBlock',
    queryEvents: 'iota_queryEvents',
  },
  
  // 🚀 LIVE DEPLOYED CONTRACTS - All 5 contracts operational!
  contracts: {
    // Core contracts successfully deployed
    token: {
      packageId: '0x8e2115e374da187479791caf2a6591b5a3b8579c8550089e922ce673453e0f80',
      module: 'token',
      functions: {
        mint: 'mint',
        transfer_tokens: 'transfer_tokens',
        get_balance: 'get_balance',
        burn: 'burn',
        update_registry: 'update_registry'
      }
    },
    
    reputation: {
      packageId: '0xd5b409715fc8b81866e362bc851c9ef6fc36d58e79d6595f280c04cc824e3955',
      module: 'reputation',
      functions: {
        create_user_profile: 'create_user_profile',
        update_reputation: 'update_reputation',
        get_user_reputation: 'get_user_reputation',
        add_social_connection: 'add_social_connection',
        get_trust_score: 'get_trust_score'
      }
    },
    
    governance: {
      packageId: '0x7429a0ec403c1ea8cc33637c946983047404f13e2e2ae801cbfe5df6b067b39a',
      module: 'governance',
      functions: {
        create_proposal: 'create_proposal',
        vote: 'vote',
        execute_proposal: 'execute_proposal',
        get_proposal: 'get_proposal',
        get_voting_power: 'get_voting_power'
      }
    },
    
    recommendation: {
      packageId: '0x2944ad31391686be62e955acd908e7b8905c89e78207e6d1bea69f25220bc7a3',
      module: 'recommendation',
      functions: {
        create_recommendation: 'create_recommendation',
        get_recommendation: 'get_recommendation',
        endorse_recommendation: 'endorse_recommendation',
        get_recommendations_by_author: 'get_recommendations_by_author',
        get_recommendations_by_category: 'get_recommendations_by_category'
      },
      // Shared objects
      registry: '0x62c4a86722f160a55aca585f1ec41a1150c5ae8bf05899d61a46234cf4630718'
    },
    
    reward: {
      packageId: '0x94be5e4138473ac370ff98227c25ff6c0a77bffe72d282854dd70c37e1fadf0f',
      module: 'reward',
      functions: {
        process_recommendation_reward: 'process_recommendation_reward',
        initialize_starter_pack: 'initialize_starter_pack',
        get_starter_pack_progress: 'get_starter_pack_progress',
        is_recommendation_processed: 'is_recommendation_processed'
      }
    }
  },
  
  // Trust Score Configuration
  trustScore: {
    threshold: 0.25, // Minimum trust score for rewards
    weights: {
      directConnection: 0.75, // 1-hop weight
      indirectConnection: 0.25, // 2-hop weight
      maxHops: 2
    },
    rewards: {
      baseRecommendation: 1.0, // 1 TOK base reward
      trustMultiplier: 3.0, // Maximum 3x multiplier
      starterPack: 5.0 // 5 TOK starter pack total
    }
  },
  
  // Token Configuration
  token: {
    symbol: 'OMEONE',
    decimals: 9,
    totalSupply: '10000000000000000000', // 10B tokens with 9 decimals
    rewardPool: '5200000000000000000' // 5.2B tokens for rewards (52%)
  }
};

// IOTA Rebased RPC Client with Smart Contract Integration
export class IOTATestnetClient {
  private rpcUrl: string;
  private chainId: string;
  
  constructor(config = IOTA_TESTNET_CONFIG) {
    this.rpcUrl = config.rpcUrl;
    this.chainId = config.chainId;
  }
  
  // Generic RPC call method
  async rpcCall(method: string, params: any[] = []): Promise<any> {
    const response = await fetch(this.rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: Date.now(),
        method,
        params
      })
    });
    
    const result = await response.json();
    
    if (result.error) {
      throw new Error(`RPC Error: ${result.error.message}`);
    }
    
    return result.result;
  }
  
  // Network methods (confirmed working)
  async getChainIdentifier(): Promise<string> {
    return await this.rpcCall('iota_getChainIdentifier');
  }
  
  async getLatestCheckpointSequenceNumber(): Promise<string> {
    return await this.rpcCall('iota_getLatestCheckpointSequenceNumber');
  }
  
  async getCheckpoint(sequenceNumber: string): Promise<any> {
    return await this.rpcCall('iota_getCheckpoint', [sequenceNumber]);
  }
  
  // Object and balance methods
  async getBalance(address: string): Promise<any> {
    return await this.rpcCall('iota_getBalance', [address]);
  }
  
  async getCoins(owner: string, coinType?: string): Promise<any> {
    const params = coinType ? [owner, coinType] : [owner];
    return await this.rpcCall('iota_getCoins', params);
  }
  
  async getOwnedObjects(owner: string, filter?: any): Promise<any> {
    const params = filter ? [owner, filter] : [owner];
    return await this.rpcCall('iota_getOwnedObjects', params);
  }
  
  // 🚀 NEW: Smart Contract Interaction Methods
  
  // Execute Move function call
  async executeContract(
    packageId: string,
    module: string,
    functionName: string,
    args: any[] = [],
    typeArgs: string[] = []
  ): Promise<any> {
    const moveCall = {
      package: packageId,
      module,
      function: functionName,
      arguments: args,
      type_arguments: typeArgs
    };
    
    return await this.rpcCall('iota_executeTransactionBlock', {
      transactionBlockBytes: moveCall,
      options: {
        showInput: true,
        showEffects: true,
        showEvents: true,
        showObjectChanges: true,
        showBalanceChanges: true
      }
    });
  }
  
  // Get object details
  async getObject(objectId: string): Promise<any> {
    return await this.rpcCall('iota_getObject', [
      objectId,
      {
        showType: true,
        showOwner: true,
        showPreviousTransaction: true,
        showDisplay: true,
        showContent: true,
        showBcs: false,
        showStorageRebate: true
      }
    ]);
  }
  
  // Query events from contracts
  async queryEvents(query: any): Promise<any> {
    return await this.rpcCall('iota_queryEvents', [query]);
  }
  
  // 🎯 Contract-Specific Methods
  
  // Recommendation contract methods
  async createRecommendation(
    title: string,
    body: string,
    category: string,
    location: any,
    author: string
  ): Promise<any> {
    const config = IOTA_TESTNET_CONFIG.contracts.recommendation;
    return await this.executeContract(
      config.packageId,
      config.module,
      config.functions.create_recommendation,
      [title, body, category, JSON.stringify(location), author]
    );
  }
  
  async getRecommendation(recommendationId: string): Promise<any> {
    return await this.getObject(recommendationId);
  }
  
  // Reputation contract methods
  async getUserReputation(userAddress: string): Promise<any> {
    const config = IOTA_TESTNET_CONFIG.contracts.reputation;
    return await this.executeContract(
      config.packageId,
      config.module,
      config.functions.get_user_reputation,
      [userAddress]
    );
  }
  
  // Token contract methods
  async getTokenBalance(address: string): Promise<any> {
    const tokenPackage = IOTA_TESTNET_CONFIG.contracts.token.packageId;
    return await this.getCoins(address, `${tokenPackage}::token::TOKEN`);
  }
  
  // Health check with contract validation
  async healthCheck(): Promise<boolean> {
    try {
      const chainId = await this.getChainIdentifier();
      const isValidChain = chainId === this.chainId;
      
      // Test contract accessibility
      const recommendationRegistry = await this.getObject(
        IOTA_TESTNET_CONFIG.contracts.recommendation.registry
      );
      const hasContracts = !!recommendationRegistry;
      
      return isValidChain && hasContracts;
    } catch (error) {
      console.error('Health check failed:', error);
      return false;
    }
  }
  
  // Enhanced network status with contract info
  async getNetworkStatus(): Promise<any> {
    const chainId = await this.getChainIdentifier();
    const latestCheckpoint = await this.getLatestCheckpointSequenceNumber();
    const contractsHealthy = await this.healthCheck();
    
    return {
      chainId,
      latestCheckpoint: parseInt(latestCheckpoint),
      isHealthy: contractsHealthy,
      contractsDeployed: 5,
      timestamp: new Date().toISOString(),
      contracts: {
        token: IOTA_TESTNET_CONFIG.contracts.token.packageId,
        reputation: IOTA_TESTNET_CONFIG.contracts.reputation.packageId,
        governance: IOTA_TESTNET_CONFIG.contracts.governance.packageId,
        recommendation: IOTA_TESTNET_CONFIG.contracts.recommendation.packageId,
        reward: IOTA_TESTNET_CONFIG.contracts.reward.packageId
      }
    };
  }
}

// Usage examples and exports
export const testnetClient = new IOTATestnetClient();

// Test function with contract validation
export async function testIOTAConnection(): Promise<void> {
  console.log('🔗 Testing IOTA Rebased testnet connection with live contracts...');
  
  try {
    const status = await testnetClient.getNetworkStatus();
    console.log('✅ Connection successful!');
    console.log('📊 Network Status:', status);
    console.log('🚀 Smart Contracts:', status.contracts);
  } catch (error) {
    console.error('❌ Connection failed:', error);
  }
}

// Export for frontend integration
export default IOTA_TESTNET_CONFIG;