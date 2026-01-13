// IOTA Rebased Testnet Configuration - UPDATED January 2026
// BocaBoca Token System v1.1 - Phone-first auth, no escrow

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
    getCheckpoint: 'iota_getCheckpoint',
    getBalance: 'iota_getBalance',
    getCoins: 'iota_getCoins',
    getObjects: 'iota_getOwnedObjects',
    executeTransactionBlock: 'iota_executeTransactionBlock',
    getTransactionBlock: 'iota_getTransactionBlock',
    queryEvents: 'iota_queryEvents',
  },
  
  // 🚀 LIVE DEPLOYED CONTRACTS - Updated January 2026
  // Note: escrow and email_escrow contracts are DEPRECATED (kept for reference)
  contracts: {
    // ========== LAYER 1: BASE INFRASTRUCTURE ==========
    
    // BOCA Token - Fungible token with 6 decimal precision
    token: {
      packageId: '0xa455c5a7bce8e0d28f42234deeb16ea496cec40f0d87a15ad26c6620b5352fb6',
      module: 'token',
      decimals: 6, // CRITICAL: Changed from 9 to 6 decimals
      symbol: 'BOCA',
      totalSupply: '10000000000000000', // 10B BOCA with 6 decimals
      functions: {
        mint: 'mint',
        transfer_tokens: 'transfer_tokens',
        get_balance: 'get_balance',
        burn: 'burn',
        update_registry: 'update_registry',
        get_allocation: 'get_allocation',
        check_vesting: 'check_vesting'
      },
      allocations: {
        community: 4000000000000000, // 40% - 4B BOCA
        team: 2500000000000000,      // 25% - 2.5B BOCA (4yr vesting, 1yr cliff)
        ecosystem: 1500000000000000,  // 15% - 1.5B BOCA
        marketing: 1000000000000000,  // 10% - 1B BOCA
        treasury: 1000000000000000    // 10% - 1B BOCA
      }
    },
    
    // User Status - Tier system (v1.1 - updated rate limits)
    user_status: {
      packageId: '0x36b7e8497d3210ab5697700f866654d8e8179f7d0b6c31a8195452344a9394f1',
      module: 'user_status',
      functions: {
        register_user: 'register_user',
        get_user_tier: 'get_user_tier',
        get_tier_info: 'get_tier_info',
        update_tier: 'update_tier',
        check_rate_limit: 'check_rate_limit',
        record_recommendation: 'record_recommendation',
        add_spam_flag: 'add_spam_flag',
        remove_spam_flag: 'remove_spam_flag',
        get_social_connections: 'get_social_connections',
        add_connection: 'add_connection',
        get_spam_status: 'get_spam_status'
      },
      // UPDATED v1.1: Rate limits increased, escrow removed
      tiers: {
        new: {
          name: 'New',
          minDays: 0,
          maxDays: 6,
          engagementWeight: 0.5,
          rateLimit: 10,              // UPDATED: was 5
          escrowRequired: false       // UPDATED: was true (escrow removed)
        },
        established: {
          name: 'Established',
          minDays: 7,
          engagementWeight: 1.0,
          rateLimit: 10,              // UPDATED: was 5
          escrowRequired: false
        },
        trusted: {
          name: 'Trusted',
          minDays: 30,
          minValidatedRecs: 3,
          engagementWeight: 1.5,
          rateLimit: 10,              // UPDATED: was 5
          escrowRequired: false,
          governanceVoting: true
        }
      },
      // UPDATED v1.1: Higher limits for better UX
      rateLimits: {
        standard: 10,       // UPDATED: was 5 - recommendations per day
        boost: 20,          // UPDATED: was 10 - registration day only
        penalty: 3,         // unchanged - when spam flagged
        resetHour: 0        // UTC midnight
      }
    },
    
    // ========== LAYER 2: DEPRECATED CONTRACTS ==========
    // Note: These contracts exist on testnet but are no longer used in v1.1
    // Phone verification replaces escrow as spam prevention mechanism
    
    // Escrow - DEPRECATED (kept for testnet reference only)
    escrow: {
      packageId: '0x0b8aca5827456ac537829f01637a93a79fb9d3401ac513c028c4a25f75d6d21e',
      module: 'escrow',
      status: 'DEPRECATED', // v1.1: No longer used - phone auth provides spam resistance
      functions: {
        create_escrow: 'create_escrow',
        release_escrow: 'release_escrow',
        forfeit_escrow: 'forfeit_escrow',
        get_escrow_status: 'get_escrow_status',
        batch_release: 'batch_release',
        check_release_eligibility: 'check_release_eligibility'
      },
      config: {
        holdDuration: 7,              // days (no longer enforced)
        reporterRewardPercent: 10,    // 10% to spam reporter
        burnPercent: 90               // 90% burned on forfeiture
      }
    },
    
    // Email Escrow - DEPRECATED (email auth disabled)
    email_escrow: {
      packageId: '0x9fba0f28e326d8bbfdbcbb6ee03f07a41a8a903bde063c08839424edb53590db',
      module: 'email_escrow',
      status: 'DEPRECATED', // v1.1: Email auth disabled, phone-first model
      functions: {
        create_email_escrow: 'create_email_escrow',
        verify_email: 'verify_email',
        release_on_verification: 'release_on_verification',
        get_email_status: 'get_email_status'
      },
      config: {
        bonusAmount: 5000000, // 5 BOCA bonus for email verification (6 decimals)
        expirationDays: 30
      }
    },
    
    // ========== LAYER 3: ACTIVE CONTRACTS ==========
    
    // Rewards - Token reward distribution and calculation
    rewards: {
      packageId: '0xa38c2800afdbf7144985b6df295f4274a288d95f2f7f97bfd25598a381dcb84a',
      module: 'rewards',
      functions: {
        calculate_reward: 'calculate_reward',
        distribute_reward: 'distribute_reward',
        check_validation_bonus: 'check_validation_bonus',
        record_engagement_reward: 'record_engagement_reward',
        get_reward_history: 'get_reward_history'
      },
      amounts: {
        // All amounts in base units (6 decimals)
        recommendationBase: 250000,      // 0.25 BOCA base
        recommendationMax: 500000,       // 0.5 BOCA max (tier weighted)
        validationBonus: 250000,         // 0.25 BOCA at 3.0 engagement threshold
        likeEngagement: 250000,          // 0.25 BOCA
        saveEngagement: 500000,          // 0.5 BOCA
        commentEngagement: 750000        // 0.75 BOCA
      },
      validation: {
        threshold: 3.0,  // engagement points needed for validation bonus
        engagementValues: {
          like: 0.25,
          save: 0.5,
          comment: 0.75
        }
      }
    },
    
    // ========== LAYER 4: PLATFORM FEATURES ==========
    
    // Recommendation - Core content creation with unified engagement
    recommendation: {
      packageId: '0x296d6464874fca09b9f38a8b719aab2a2647ac35f089aab87656e2e0bb23eeee',
      module: 'recommendation',
      functions: {
        create_recommendation: 'create_recommendation',
        get_recommendation: 'get_recommendation',
        like_recommendation: 'like_recommendation',
        save_recommendation: 'save_recommendation',
        comment_on_recommendation: 'comment_on_recommendation',
        get_engagement_score: 'get_engagement_score',
        get_recommendations_by_author: 'get_recommendations_by_author',
        get_recommendations_by_category: 'get_recommendations_by_category',
        check_validation_status: 'check_validation_status'
      },
      engagement: {
        like: 0.25,     // engagement points
        save: 0.5,      // engagement points
        comment: 0.75   // engagement points
      }
    },
    
    // ========== LAYER 5: COMMUNITY APPS ==========
    
    // Lottery - Weekly engagement-based drawing
    lottery: {
      packageId: '0x326c44a0c70c045890d962e57d7f23db6754d12eac4860db0d9d5ef9aaf5ead0',
      module: 'lottery',
      functions: {
        record_engagement: 'record_engagement',
        get_weekly_score: 'get_weekly_score',
        get_lifetime_stats: 'get_lifetime_stats',
        calculate_tickets: 'calculate_tickets',
        draw_winners: 'draw_winners',
        get_current_standings: 'get_current_standings',
        claim_prize: 'claim_prize'
      },
      config: {
        eligibilityTop: 50,           // top N users eligible
        minEngagement: 1.0,           // minimum engagement points
        prizePool: 50000000,          // 50 BOCA/week (6 decimals)
        prizes: {
          first: 25000000,            // 25 BOCA
          second: 15000000,           // 15 BOCA
          third: 10000000             // 10 BOCA
        },
        schedule: {
          resetDay: 'Monday',
          drawDay: 'Sunday',
          drawTime: '20:00 UTC'
        },
        ticketFormula: 'sqrt'         // √(engagement_score)
      }
    },
    
    // Photo Contest - "Serendipity Sunday" weekly contest
    photo_contest: {
      packageId: '0x3fcb73bd55e649c98318adbf6654222144b8d758590732e652df27a0fb6223dd',
      module: 'photo_contest',
      functions: {
        nominate_photo: 'nominate_photo',
        select_finalists: 'select_finalists',
        vote: 'vote',
        announce_winners: 'announce_winners',
        get_nominations: 'get_nominations',
        get_finalists: 'get_finalists',
        get_vote_count: 'get_vote_count',
        claim_prize: 'claim_prize'
      },
      config: {
        minNominations: 3,
        finalistCount: 10,
        prizePool: 18000000,          // 18 BOCA/week (6 decimals)
        prizes: {
          first: 10000000,            // 10 BOCA
          second: 5000000,            // 5 BOCA
          third: 3000000              // 3 BOCA
        },
        votingType: 'democratic',     // 1 person = 1 vote
        schedule: {
          nominationStart: 'Monday 00:00 UTC',
          nominationEnd: 'Wednesday 23:59 UTC',
          finalistSelection: 'Thursday 09:00 UTC',
          votingEnd: 'Saturday 23:59 UTC',
          announcement: 'Sunday 20:15 UTC'
        }
      }
    },
    
    // Bounty System - User-pledged rewards
    bounty: {
      packageId: '0xd297c8d6cbccba453fdf96870c5e2e94d87a71a3ec473465e52e9f8c542b9d54',
      module: 'bounty',
      functions: {
        create_bounty: 'create_bounty',
        pledge_to_bounty: 'pledge_to_bounty',
        submit_recommendation: 'submit_recommendation',
        vote_on_submission: 'vote_on_submission',
        claim_bounty: 'claim_bounty',
        refund_bounty: 'refund_bounty',
        get_active_bounties: 'get_active_bounties',
        get_bounty_details: 'get_bounty_details'
      },
      config: {
        minPledge: 1000000,           // 1 BOCA minimum (6 decimals)
        votingPeriod: 7,              // days
        minVotes: 3                   // minimum votes to award
      }
    },
    
    // ========== LAYER 6: GOVERNANCE (LEGACY) ==========
    
    // Governance - Needs simplification, keeping old contract
    governance: {
      packageId: '0x7429a0ec403c1ea8cc33637c946983047404f13e2e2ae801cbfe5df6b067b39a',
      module: 'governance',
      status: 'legacy', // Marked as legacy, needs v1.1 update
      functions: {
        create_proposal: 'create_proposal',
        vote: 'vote',
        execute_proposal: 'execute_proposal',
        get_proposal: 'get_proposal',
        get_voting_power: 'get_voting_power'
      },
      note: 'This contract needs simplification for v1.1. Current version is complex staking-based governance. Need simplified tier-based governance for Trusted users.'
    }
  },
  
  // Token Configuration (updated for 6 decimals)
  token: {
    symbol: 'BOCA',
    decimals: 6, // CRITICAL: Changed from 9 to 6
    totalSupply: '10000000000000000', // 10B BOCA with 6 decimals
    displayFormat: (amount: number) => {
      // Convert from base units (6 decimals) to display
      return (amount / 1_000_000).toFixed(2);
    },
    toBaseUnits: (amount: number) => {
      // Convert from display to base units (6 decimals)
      return Math.floor(amount * 1_000_000);
    }
  },
  
  // Tier System Configuration (v1.1 - no escrow)
  tierSystem: {
    tiers: ['new', 'established', 'trusted'],
    requirements: {
      new: { days: 0, validatedRecs: 0 },
      established: { days: 7, validatedRecs: 0 },
      trusted: { days: 30, validatedRecs: 3 }
    },
    weights: {
      new: 0.5,
      established: 1.0,
      trusted: 1.5
    },
    // UPDATED v1.1: Removed escrow from New tier benefits
    benefits: {
      new: ['Basic participation', 'Immediate rewards (0.5x weight)', '20 recs on registration day'],
      established: ['Immediate rewards (1.0x weight)', 'Standard engagement weight'],
      trusted: ['Enhanced engagement weight (1.5x)', 'Governance voting', 'Priority features']
    }
  },
  
  // Reward Economics (UPDATED v1.1)
  rewardEconomics: {
    daily: {
      recommendations: 10,          // UPDATED: was 5 - per user
      estimatedUsers: 1000,         // Year 1 estimate
      avgRewardPerRec: 0.375       // BOCA (weighted average)
    },
    weekly: {
      lottery: 50,                  // BOCA
      photoContest: 18,             // BOCA
      total: 68                     // BOCA/week
    },
    yearly: {
      userRewards: 4710000,         // ~4.71M BOCA
      weeklyContests: 3536,         // BOCA
      total: 4713536,               // BOCA
      availablePool: 4000000000,    // 4B community allocation
      utilization: 0.12             // % (comfortable runway)
    },
    emissions: {
      initialDaily: 12904,          // BOCA/day
      halvingPeriod: 4,             // years (time-based)
      epochs: 5,                    // total halving epochs
      currentEpoch: 0
    }
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
  
  // Network methods
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
  
  // Health check with contract validation
  async healthCheck(): Promise<boolean> {
    try {
      const chainId = await this.getChainIdentifier();
      const isValidChain = chainId === this.chainId;
      
      // Test token contract accessibility
      const tokenPackage = await this.getObject(
        IOTA_TESTNET_CONFIG.contracts.token.packageId
      );
      const hasContracts = !!tokenPackage;
      
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
      contractsDeployed: 10, // Total modules on testnet
      activeContracts: 8,    // Active in v1.1 (excludes escrow, email_escrow)
      timestamp: new Date().toISOString(),
      contracts: {
        // Active
        token: IOTA_TESTNET_CONFIG.contracts.token.packageId,
        user_status: IOTA_TESTNET_CONFIG.contracts.user_status.packageId,
        rewards: IOTA_TESTNET_CONFIG.contracts.rewards.packageId,
        recommendation: IOTA_TESTNET_CONFIG.contracts.recommendation.packageId,
        lottery: IOTA_TESTNET_CONFIG.contracts.lottery.packageId,
        photo_contest: IOTA_TESTNET_CONFIG.contracts.photo_contest.packageId,
        bounty: IOTA_TESTNET_CONFIG.contracts.bounty.packageId,
        governance: IOTA_TESTNET_CONFIG.contracts.governance.packageId + ' (legacy)',
        // Deprecated
        escrow: IOTA_TESTNET_CONFIG.contracts.escrow.packageId + ' (DEPRECATED)',
        email_escrow: IOTA_TESTNET_CONFIG.contracts.email_escrow.packageId + ' (DEPRECATED)'
      }
    };
  }
}

// Export singleton instance
export const testnetClient = new IOTATestnetClient();

// Test function with contract validation
export async function testIOTAConnection(): Promise<void> {
  console.log('🔗 Testing IOTA Rebased testnet connection with BocaBoca v1.1 contracts...');
  
  try {
    const status = await testnetClient.getNetworkStatus();
    console.log('✅ Connection successful!');
    console.log('📊 Network Status:', status);
    console.log('🚀 Active Smart Contracts (8 modules):', status.contracts);
    console.log('💰 BOCA Token: 6 decimal precision');
    console.log('👥 Tier System: New/Established/Trusted (no escrow)');
    console.log('📱 Auth Model: Phone-first (mobile) / Wallet (web)');
  } catch (error) {
    console.error('❌ Connection failed:', error);
  }
}

// Export for frontend integration
export default IOTA_TESTNET_CONFIG;