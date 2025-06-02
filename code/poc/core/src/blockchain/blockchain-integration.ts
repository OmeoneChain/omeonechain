// code/poc/core/src/blockchain/blockchain-integration.ts
import { RebasedAdapter, RebasedConfig } from '../adapters/rebased-adapter';
import { MockAdapter } from '../adapters/mock-adapter';
import { ChainAdapter } from '../adapters/chain-adapter';
import { GovernanceEngine } from '../governance/engine';
import { TokenEngine } from '../token/engine';
import { ReputationEngine } from '../reputation/engine';
import { RecommendationEngine } from '../recommendation/engine';

export interface BlockchainConfig {
  mode: 'mock' | 'rebased';
  rebased?: RebasedConfig;
  autoSync?: boolean;
  syncInterval?: number;
}

export interface UserProfile {
  address: string;
  liquidBalance: number;
  stakedBalance: number;
  pendingRewards: number;
  lifetimeRewards: number;
  trustScore: number;
  reputationScore: number;
  stakes: any[];
}

export interface RewardStatus {
  actionId: string;
  trustScore: number;
  endorsements: number;
  potentialReward: number;
  isEligible: boolean;
  canClaim: boolean;
}

/**
 * Blockchain Integration Service
 * Coordinates between existing OmeoneChain engines and blockchain adapters
 * Provides seamless migration from MockAdapter to RebasedAdapter
 */
export class BlockchainIntegrationService {
  private adapter: ChainAdapter;
  private config: BlockchainConfig;
  private isInitialized: boolean = false;
  private syncInterval?: NodeJS.Timeout;

  // Engine references
  private governanceEngine: GovernanceEngine;
  private tokenEngine: TokenEngine;
  private reputationEngine: ReputationEngine;
  private recommendationEngine: RecommendationEngine;

  constructor(
    config: BlockchainConfig,
    engines: {
      governance: GovernanceEngine;
      token: TokenEngine;
      reputation: ReputationEngine;
      recommendation: RecommendationEngine;
    }
  ) {
    this.config = config;
    this.governanceEngine = engines.governance;
    this.tokenEngine = engines.token;
    this.reputationEngine = engines.reputation;
    this.recommendationEngine = engines.recommendation;

    // Initialize adapter based on mode
    if (config.mode === 'rebased' && config.rebased) {
      this.adapter = new RebasedAdapter(config.rebased);
    } else {
      this.adapter = new MockAdapter();
    }
  }

  async initialize(): Promise<void> {
    console.log(`🚀 Initializing blockchain integration (${this.config.mode} mode)...`);

    try {
      // Connect to blockchain
      await this.adapter.connect();

      // Initialize contracts if using Rebased
      if (this.adapter instanceof RebasedAdapter) {
        await this.adapter.initializeSystem();
      }

      // Set up auto-sync if enabled
      if (this.config.autoSync) {
        this.startAutoSync();
      }

      this.isInitialized = true;
      console.log('✅ Blockchain integration initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize blockchain integration:', error);
      throw error;
    }
  }

  async shutdown(): Promise<void> {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }
    
    await this.adapter.disconnect();
    this.isInitialized = false;
    console.log('🔌 Blockchain integration shut down');
  }

  // ========== User Management ==========

  async createUser(address: string): Promise<UserProfile> {
    this.ensureInitialized();

    try {
      // Create wallet on blockchain
      if (this.adapter instanceof RebasedAdapter) {
        const result = await this.adapter.createUserWallet(address);
        if (!result.success) {
          throw new Error(`Failed to create wallet: ${result.error}`);
        }
      }

      // Create user in existing engines
      await this.tokenEngine.createUser(address);
      await this.reputationEngine.updateUserReputation(address, 0, 0);

      // Return user profile
      return await this.getUserProfile(address);
    } catch (error) {
      console.error('Failed to create user:', error);
      throw error;
    }
  }

  async getUserProfile(address: string): Promise<UserProfile> {
    this.ensureInitialized();

    try {
      // Get data from blockchain
      let blockchainData = {
        liquidBalance: 0,
        stakedBalance: 0,
        pendingRewards: 0,
        lifetimeRewards: 0,
        trustScore: 0,
        reputationScore: 0,
        stakes: [],
      };

      if (this.adapter instanceof RebasedAdapter) {
        const balance = await this.adapter.getTokenBalance(address);
        const trustScore = await this.adapter.getTrustScore(address);
        const reputationScore = await this.adapter.getReputationScore(address);
        const stakes = await this.adapter.getStakeInfo(address);

        blockchainData = {
          liquidBalance: balance.liquid,
          stakedBalance: balance.staked,
          pendingRewards: balance.pending_rewards,
          lifetimeRewards: balance.lifetime_rewards,
          trustScore,
          reputationScore,
          stakes,
        };
      } else {
        // Get from existing engines for mock mode
        const tokenData = await this.tokenEngine.getUserBalance(address);
        const reputationData = await this.reputationEngine.getUserReputation(address);

        blockchainData = {
          liquidBalance: tokenData.balance,
          stakedBalance: tokenData.staked || 0,
          pendingRewards: tokenData.pendingRewards || 0,
          lifetimeRewards: tokenData.lifetimeEarned || 0,
          trustScore: reputationData.trustScore,
          reputationScore: reputationData.reputationScore,
          stakes: [],
        };
      }

      return {
        address,
        ...blockchainData,
      };
    } catch (error) {
      console.error('Failed to get user profile:', error);
      throw error;
    }
  }

  // ========== Token Operations ==========

  async stakeTokens(
    userAddress: string,
    amount: number,
    stakeType: number,
    lockPeriodMonths: number
  ): Promise<{ success: boolean; transactionHash?: string; error?: string }> {
    this.ensureInitialized();

    try {
      if (this.adapter instanceof RebasedAdapter) {
        const result = await this.adapter.stakeTokens(
          userAddress,
          amount,
          stakeType,
          lockPeriodMonths
        );

        if (result.success) {
          // Update local engines
          await this.tokenEngine.stakeTokens(userAddress, amount, stakeType);
          return { success: true, transactionHash: result.hash };
        } else {
          return { success: false, error: result.error };
        }
      } else {
        // Use existing engine for mock mode
        await this.tokenEngine.stakeTokens(userAddress, amount, stakeType);
        return { success: true, transactionHash: 'mock_tx_' + Date.now() };
      }
    } catch (error) {
      console.error('Failed to stake tokens:', error);
      return { success: false, error: error.message };
    }
  }

  async claimRewards(userAddress: string): Promise<{
    success: boolean;
    amount?: number;
    transactionHash?: string;
    error?: string;
  }> {
    this.ensureInitialized();

    try {
      if (this.adapter instanceof RebasedAdapter) {
        const result = await this.adapter.claimRewards(userAddress);
        
        if (result.success) {
          // Sync with local engines
          await this.syncUserData(userAddress);
          
          return {
            success: true,
            transactionHash: result.hash,
            amount: 0, // Would parse from events
          };
        } else {
          return { success: false, error: result.error };
        }
      } else {
        // Use existing engine for mock mode
        const amount = await this.tokenEngine.claimRewards(userAddress);
        return {
          success: true,
          amount,
          transactionHash: 'mock_tx_' + Date.now(),
        };
      }
    } catch (error) {
      console.error('Failed to claim rewards:', error);
      return { success: false, error: error.message };
    }
  }

  // ========== Recommendation & Reward Operations ==========

  async submitRecommendation(
    userAddress: string,
    recommendationData: any
  ): Promise<{
    success: boolean;
    actionId?: string;
    transactionHash?: string;
    error?: string;
  }> {
    this.ensureInitialized();

    try {
      // Create recommendation in existing engine
      const recommendation = await this.recommendationEngine.createRecommendation(
        userAddress,
        recommendationData
      );

      const actionId = recommendation.id;

      if (this.adapter instanceof RebasedAdapter) {
        // Submit action for potential reward on blockchain
        const result = await this.adapter.submitActionForReward(
          userAddress,
          actionId,
          1 // Recommendation type
        );

        if (result.success) {
          return {
            success: true,
            actionId,
            transactionHash: result.hash,
          };
        } else {
          return { success: false, error: result.error };
        }
      } else {
        // Mock mode - use existing reward system
        return {
          success: true,
          actionId,
          transactionHash: 'mock_tx_' + Date.now(),
        };
      }
    } catch (error) {
      console.error('Failed to submit recommendation:', error);
      return { success: false, error: error.message };
    }
  }

  async endorseRecommendation(
    endorserAddress: string,
    actionId: string,
    socialDistance: number = 1
  ): Promise<{
    success: boolean;
    transactionHash?: string;
    newTrustScore?: number;
    error?: string;
  }> {
    this.ensureInitialized();

    try {
      if (this.adapter instanceof RebasedAdapter) {
        const result = await this.adapter.addSocialEndorsement(
          endorserAddress,
          actionId,
          socialDistance
        );

        if (result.success) {
          // Get updated reward info
          const rewardInfo = await this.adapter.getRewardInfo(actionId);
          
          return {
            success: true,
            transactionHash: result.hash,
            newTrustScore: rewardInfo.current_trust_score,
          };
        } else {
          return { success: false, error: result.error };
        }
      } else {
        // Mock mode - use existing engines
        await this.reputationEngine.addEndorsement(endorserAddress, actionId);
        
        return {
          success: true,
          transactionHash: 'mock_tx_' + Date.now(),
          newTrustScore: 0.3, // Mock trust score
        };
      }
    } catch (error) {
      console.error('Failed to endorse recommendation:', error);
      return { success: false, error: error.message };
    }
  }

  async checkRewardEligibility(actionId: string): Promise<RewardStatus> {
    this.ensureInitialized();

    try {
      if (this.adapter instanceof RebasedAdapter) {
        const rewardInfo = await this.adapter.getRewardInfo(actionId);
        
        return {
          actionId,
          trustScore: rewardInfo.current_trust_score / 100, // Convert from 0-100 to 0-1
          endorsements: rewardInfo.endorsement_count,
          potentialReward: rewardInfo.potential_reward / 1000000, // Convert from micro-tokens
          isEligible: rewardInfo.is_eligible,
          canClaim: rewardInfo.is_eligible,
        };
      } else {
        // Mock mode - return sample data
        return {
          actionId,
          trustScore: 0.3,
          endorsements: 2,
          potentialReward: 1.5,
          isEligible: true,
          canClaim: true,
        };
      }
    } catch (error) {
      console.error('Failed to check reward eligibility:', error);
      return {
        actionId,
        trustScore: 0,
        endorsements: 0,
        potentialReward: 0,
        isEligible: false,
        canClaim: false,
      };
    }
  }

  async claimRecommendationReward(
    userAddress: string,
    actionId: string
  ): Promise<{
    success: boolean;
    rewardAmount?: number;
    transactionHash?: string;
    error?: string;
  }> {
    this.ensureInitialized();

    try {
      if (this.adapter instanceof RebasedAdapter) {
        const result = await this.adapter.claimReward(userAddress, actionId);
        
        if (result.success) {
          // Sync user data after reward claim
          await this.syncUserData(userAddress);
          
          return {
            success: true,
            transactionHash: result.hash,
            rewardAmount: 0, // Would parse from events
          };
        } else {
          return { success: false, error: result.error };
        }
      } else {
        // Mock mode - use existing token engine
        const rewardAmount = await this.tokenEngine.distributeReward(
          userAddress,
          1.0, // Mock reward amount
          'recommendation'
        );
        
        return {
          success: true,
          rewardAmount,
          transactionHash: 'mock_tx_' + Date.now(),
        };
      }
    } catch (error) {
      console.error('Failed to claim recommendation reward:', error);
      return { success: false, error: error.message };
    }
  }

  // ========== Governance Operations ==========

  async createProposal(
    proposerAddress: string,
    title: string,
    description: string,
    proposalType: string
  ): Promise<{
    success: boolean;
    proposalId?: string;
    transactionHash?: string;
    error?: string;
  }> {
    this.ensureInitialized();

    try {
      if (this.adapter instanceof RebasedAdapter) {
        const result = await this.adapter.createProposal(
          proposerAddress,
          title,
          description,
          proposalType
        );

        if (result.success) {
          // Also create in local governance engine for consistency
          const proposalId = `blockchain_${result.hash}`;
          await this.governanceEngine.createProposal(
            proposerAddress,
            title,
            description,
            proposalType
          );

          return {
            success: true,
            proposalId,
            transactionHash: result.hash,
          };
        } else {
          return { success: false, error: result.error };
        }
      } else {
        // Mock mode - use existing governance engine
        const proposal = await this.governanceEngine.createProposal(
          proposerAddress,
          title,
          description,
          proposalType
        );

        return {
          success: true,
          proposalId: proposal.id,
          transactionHash: 'mock_tx_' + Date.now(),
        };
      }
    } catch (error) {
      console.error('Failed to create proposal:', error);
      return { success: false, error: error.message };
    }
  }

  async vote(
    voterAddress: string,
    proposalId: string,
    support: boolean
  ): Promise<{
    success: boolean;
    transactionHash?: string;
    votingPower?: number;
    error?: string;
  }> {
    this.ensureInitialized();

    try {
      if (this.adapter instanceof RebasedAdapter) {
        const result = await this.adapter.vote(voterAddress, proposalId, support);
        
        if (result.success) {
          // Sync with local governance engine
          await this.governanceEngine.vote(voterAddress, proposalId, support);
          
          return {
            success: true,
            transactionHash: result.hash,
            votingPower: 1, // Would calculate based on stake and reputation
          };
        } else {
          return { success: false, error: result.error };
        }
      } else {
        // Mock mode - use existing governance engine
        await this.governanceEngine.vote(voterAddress, proposalId, support);
        
        return {
          success: true,
          transactionHash: 'mock_tx_' + Date.now(),
          votingPower: 1,
        };
      }
    } catch (error) {
      console.error('Failed to vote:', error);
      return { success: false, error: error.message };
    }
  }

  // ========== Synchronization ==========

  private async syncUserData(userAddress: string): Promise<void> {
    if (!(this.adapter instanceof RebasedAdapter)) {
      return; // No sync needed for mock mode
    }

    try {
      // Sync token data
      const balance = await this.adapter.getTokenBalance(userAddress);
      await this.tokenEngine.updateUserBalance(userAddress, {
        balance: balance.liquid,
        staked: balance.staked,
        pendingRewards: balance.pending_rewards,
        lifetimeEarned: balance.lifetime_rewards,
      });

      // Sync reputation data
      const trustScore = await this.adapter.getTrustScore(userAddress);
      const reputationScore = await this.adapter.getReputationScore(userAddress);
      await this.reputationEngine.updateUserReputation(
        userAddress,
        trustScore,
        reputationScore
      );
    } catch (error) {
      console.error('Failed to sync user data:', error);
    }
  }

  private startAutoSync(): Promise<void> {
    const interval = this.config.syncInterval || 30000; // Default 30 seconds
    
    this.syncInterval = setInterval(async () => {
      try {
        // Auto-sync logic would go here
        console.log('🔄 Running auto-sync...');
      } catch (error) {
        console.error('Auto-sync failed:', error);
      }
    }, interval);

    return Promise.resolve();
  }

  private ensureInitialized(): void {
    if (!this.isInitialized) {
      throw new Error('Blockchain integration not initialized');
    }
  }

  // ========== Health & Monitoring ==========

  async getSystemHealth(): Promise<{
    adapter: string;
    connected: boolean;
    latestBlock: number;
    syncStatus: string;
  }> {
    try {
      const health = await this.adapter.healthCheck();
      
      return {
        adapter: this.config.mode,
        connected: health.isConnected,
        latestBlock: health.latestBlock,
        syncStatus: this.isInitialized ? 'ready' : 'initializing',
      };
    } catch (error) {
      return {
        adapter: this.config.mode,
        connected: false,
        latestBlock: 0,
        syncStatus: 'error',
      };
    }
  }

  async getSystemStats(): Promise<{
    currentRewardRate: number;
    totalDistributed: number;
    halvingPeriod: number;
    activeUsers: number;
  }> {
    try {
      if (this.adapter instanceof RebasedAdapter) {
        const rewardRate = await this.adapter.getCurrentRewardRate();
        const halvingInfo = await this.adapter.getHalvingInfo();
        
        return {
          currentRewardRate: rewardRate,
          totalDistributed: halvingInfo.totalDistributed,
          halvingPeriod: halvingInfo.currentPeriod,
          activeUsers: 0, // Would track separately
        };
      } else {
        // Mock mode stats
        return {
          currentRewardRate: 1000,
          totalDistributed: 0,
          halvingPeriod: 0,
          activeUsers: 0,
        };
      }
    } catch (error) {
      console.error('Failed to get system stats:', error);
      return {
        currentRewardRate: 0,
        totalDistributed: 0,
        halvingPeriod: 0,
        activeUsers: 0,
      };
    }
  }
}