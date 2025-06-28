/**
 * blockchain-reputation.ts - Blockchain Integration Service
 * 
 * Location: code/core/src/services/blockchain-reputation.ts
 * 
 * Service layer connecting reputation engine to IOTA Rebased blockchain
 */

import { RebasedAdapter } from '../adapters/rebased-adapter';
import { ReputationEngine } from '../reputation/engine';

// Types for blockchain interactions
export interface BlockchainReputationUpdate {
  userId: string;
  reputationScore: number;
  socialConnections: Array<{
    targetId: string;
    trustWeight: number;
    connectionType: number; // 1=direct, 2=friend-of-friend
  }>;
  verificationLevel: number; // 0=basic, 1=verified, 2=expert
  lastUpdated: string;
}

export interface BlockchainDiscoveryIncentive {
  campaignId: string;
  region: string;
  category: string;
  bonusMultiplier: number;
  targetRecommendations: number;
  expiresAt: string;
  minTrustScore: number;
  bonusPool: bigint;
}

export interface BlockchainVerificationSubmission {
  verifierId: string;
  targetUserId: string;
  evidence: string;
  category: string;
  timestamp: string;
  verificationHash: string;
}

export interface BlockchainTransaction {
  transactionId: string;
  blockHeight: number;
  timestamp: string;
  gasUsed: number;
  success: boolean;
  events: Array<{
    type: string;
    data: any;
  }>;
}

/**
 * Service for blockchain reputation operations
 */
export class BlockchainReputationService {
  private adapter: RebasedAdapter;
  private reputationEngine: ReputationEngine;
  private contractAddresses: {
    reputation: string;
    socialGraph: string;
    discoveryIncentives: string;
  };

  constructor(
    adapter: RebasedAdapter,
    reputationEngine: ReputationEngine,
    contractAddresses: {
      reputation: string;
      socialGraph: string;
      discoveryIncentives: string;
    }
  ) {
    this.adapter = adapter;
    this.reputationEngine = reputationEngine;
    this.contractAddresses = contractAddresses;
  }

  /**
   * Update user reputation on blockchain
   */
  async updateUserReputationOnChain(
    userId: string,
    reputationData: BlockchainReputationUpdate
  ): Promise<BlockchainTransaction> {
    try {
      // Prepare Move script call
      const moveCall = {
        packageId: this.contractAddresses.reputation,
        module: 'reputation',
        function: 'update_user_reputation',
        arguments: [
          userId,
          reputationData.reputationScore,
          reputationData.socialConnections,
          reputationData.verificationLevel,
          reputationData.lastUpdated
        ],
        typeArguments: [],
      };

      // Execute transaction through adapter
      const result = await this.adapter.executeTransaction(moveCall);

      return {
        transactionId: result.digest,
        blockHeight: result.checkpoint || 0,
        timestamp: new Date().toISOString(),
        gasUsed: result.gasUsed || 0,
        success: result.status === 'success',
        events: result.events || [],
      };
    } catch (error) {
      console.error('Error updating reputation on chain:', error);
      throw new Error(`Blockchain reputation update failed: ${error.message}`);
    }
  }

  /**
   * Submit social connection on blockchain
   */
  async submitSocialConnection(
    followerId: string,
    followedId: string,
    trustWeight: number
  ): Promise<BlockchainTransaction> {
    try {
      const moveCall = {
        packageId: this.contractAddresses.socialGraph,
        module: 'social_graph',
        function: 'add_connection',
        arguments: [
          followerId,
          followedId,
          Math.floor(trustWeight * 1000), // Convert to integer (0.75 -> 750)
          1, // Direct connection type
          Date.now().toString()
        ],
        typeArguments: [],
      };

      const result = await this.adapter.executeTransaction(moveCall);

      return {
        transactionId: result.digest,
        blockHeight: result.checkpoint || 0,
        timestamp: new Date().toISOString(),
        gasUsed: result.gasUsed || 0,
        success: result.status === 'success',
        events: result.events || [],
      };
    } catch (error) {
      console.error('Error submitting social connection:', error);
      throw new Error(`Blockchain social connection failed: ${error.message}`);
    }
  }

  /**
   * Remove social connection on blockchain
   */
  async removeSocialConnection(
    followerId: string,
    followedId: string
  ): Promise<BlockchainTransaction> {
    try {
      const moveCall = {
        packageId: this.contractAddresses.socialGraph,
        module: 'social_graph',
        function: 'remove_connection',
        arguments: [
          followerId,
          followedId
        ],
        typeArguments: [],
      };

      const result = await this.adapter.executeTransaction(moveCall);

      return {
        transactionId: result.digest,
        blockHeight: result.checkpoint || 0,
        timestamp: new Date().toISOString(),
        gasUsed: result.gasUsed || 0,
        success: result.status === 'success',
        events: result.events || [],
      };
    } catch (error) {
      console.error('Error removing social connection:', error);
      throw new Error(`Blockchain connection removal failed: ${error.message}`);
    }
  }

  /**
   * Submit community verification on blockchain
   */
  async submitCommunityVerification(
    verification: BlockchainVerificationSubmission
  ): Promise<BlockchainTransaction> {
    try {
      const moveCall = {
        packageId: this.contractAddresses.reputation,
        module: 'reputation',
        function: 'submit_community_verification',
        arguments: [
          verification.verifierId,
          verification.targetUserId,
          verification.evidence,
          verification.category,
          verification.timestamp,
          verification.verificationHash
        ],
        typeArguments: [],
      };

      const result = await this.adapter.executeTransaction(moveCall);

      return {
        transactionId: result.digest,
        blockHeight: result.checkpoint || 0,
        timestamp: new Date().toISOString(),
        gasUsed: result.gasUsed || 0,
        success: result.status === 'success',
        events: result.events || [],
      };
    } catch (error) {
      console.error('Error submitting verification:', error);
      throw new Error(`Blockchain verification submission failed: ${error.message}`);
    }
  }

  /**
   * Claim discovery incentive bonus on blockchain
   */
  async claimDiscoveryBonus(
    userId: string,
    campaignId: string,
    recommendationIds: string[]
  ): Promise<BlockchainTransaction> {
    try {
      const moveCall = {
        packageId: this.contractAddresses.discoveryIncentives,
        module: 'discovery_incentives',
        function: 'claim_discovery_bonus',
        arguments: [
          userId,
          campaignId,
          recommendationIds,
          Date.now().toString()
        ],
        typeArguments: [],
      };

      const result = await this.adapter.executeTransaction(moveCall);

      return {
        transactionId: result.digest,
        blockHeight: result.checkpoint || 0,
        timestamp: new Date().toISOString(),
        gasUsed: result.gasUsed || 0,
        success: result.status === 'success',
        events: result.events || [],
      };
    } catch (error) {
      console.error('Error claiming discovery bonus:', error);
      throw new Error(`Blockchain bonus claim failed: ${error.message}`);
    }
  }

  /**
   * Get on-chain reputation data
   */
  async getOnChainReputation(userId: string): Promise<{
    reputationScore: number;
    verificationLevel: number;
    socialConnections: number;
    lastUpdated: string;
    onChainHistory: Array<{
      timestamp: string;
      score: number;
      transactionId: string;
    }>;
  }> {
    try {
      // Query blockchain state
      const result = await this.adapter.queryObject({
        objectId: `reputation_${userId}`,
        options: {
          showContent: true,
          showType: true,
        },
      });

      if (!result.data) {
        throw new Error(`No on-chain reputation found for user ${userId}`);
      }

      const content = result.data.content as any;
      
      return {
        reputationScore: content.fields.reputation_score / 100, // Convert from integer
        verificationLevel: content.fields.verification_level,
        socialConnections: content.fields.connection_count,
        lastUpdated: content.fields.last_updated,
        onChainHistory: content.fields.history || [],
      };
    } catch (error) {
      console.error('Error getting on-chain reputation:', error);
      throw new Error(`Failed to fetch on-chain reputation: ${error.message}`);
    }
  }

  /**
   * Get active discovery campaigns from blockchain
   */
  async getActiveDiscoveryCampaigns(
    region?: string,
    category?: string
  ): Promise<BlockchainDiscoveryIncentive[]> {
    try {
      // Query active campaigns
      const result = await this.adapter.queryEvents({
        query: {
          MoveEventType: `${this.contractAddresses.discoveryIncentives}::discovery_incentives::CampaignCreated`
        },
        limit: 50,
        order: 'descending',
      });

      const campaigns: BlockchainDiscoveryIncentive[] = [];
      
      for (const event of result.data) {
        const parsedJson = event.parsedJson as any;
        
        // Filter by region and category if specified
        if (region && parsedJson.region !== region) continue;
        if (category && parsedJson.category !== category) continue;
        
        // Check if campaign is still active
        const expiresAt = new Date(parsedJson.expires_at);
        if (expiresAt < new Date()) continue;

        campaigns.push({
          campaignId: parsedJson.campaign_id,
          region: parsedJson.region,
          category: parsedJson.category,
          bonusMultiplier: parsedJson.bonus_multiplier / 100, // Convert from integer
          targetRecommendations: parsedJson.target_recommendations,
          expiresAt: parsedJson.expires_at,
          minTrustScore: parsedJson.min_trust_score / 100,
          bonusPool: BigInt(parsedJson.bonus_pool),
        });
      }

      return campaigns;
    } catch (error) {
      console.error('Error getting discovery campaigns:', error);
      throw new Error(`Failed to fetch discovery campaigns: ${error.message}`);
    }
  }

  /**
   * Sync off-chain reputation with on-chain data
   */
  async syncReputationData(userId: string): Promise<{
    synced: boolean;
    discrepancies: string[];
    lastSync: string;
  }> {
    try {
      // Get both off-chain and on-chain data
      const [offChainRep, onChainRep] = await Promise.all([
        this.reputationEngine.getUserReputation(userId),
        this.getOnChainReputation(userId)
      ]);

      const discrepancies: string[] = [];
      
      // Check for discrepancies
      const scoreDiff = Math.abs(offChainRep.reputationScore - onChainRep.reputationScore * 1000);
      if (scoreDiff > 10) { // Allow small rounding differences
        discrepancies.push(`Reputation score differs: off-chain ${offChainRep.reputationScore}, on-chain ${onChainRep.reputationScore * 1000}`);
      }

      const verificationLevelMap = { 'basic': 0, 'verified': 1, 'expert': 2 };
      const expectedLevel = verificationLevelMap[offChainRep.verificationLevel] || 0;
      if (expectedLevel !== onChainRep.verificationLevel) {
        discrepancies.push(`Verification level differs: off-chain ${offChainRep.verificationLevel}, on-chain ${onChainRep.verificationLevel}`);
      }

      // If there are discrepancies, update on-chain data
      let synced = discrepancies.length === 0;
      
      if (!synced) {
        console.log(`Syncing reputation for user ${userId}. Discrepancies:`, discrepancies);
        
        await this.updateUserReputationOnChain(userId, {
          userId,
          reputationScore: offChainRep.reputationScore,
          socialConnections: [], // Would need to fetch actual connections
          verificationLevel: expectedLevel,
          lastUpdated: new Date().toISOString(),
        });
        
        synced = true;
      }

      return {
        synced,
        discrepancies,
        lastSync: new Date().toISOString(),
      };
    } catch (error) {
      console.error('Error syncing reputation data:', error);
      return {
        synced: false,
        discrepancies: [`Sync failed: ${error.message}`],
        lastSync: new Date().toISOString(),
      };
    }
  }

  /**
   * Monitor blockchain events for reputation updates
   */
  async startEventMonitoring(
    onReputationUpdate: (event: any) => void,
    onSocialConnection: (event: any) => void,
    onVerificationSubmission: (event: any) => void
  ): Promise<() => void> {
    const eventFilters = [
      {
        MoveEventType: `${this.contractAddresses.reputation}::reputation::ReputationUpdated`
      },
      {
        MoveEventType: `${this.contractAddresses.socialGraph}::social_graph::ConnectionAdded`
      },
      {
        MoveEventType: `${this.contractAddresses.socialGraph}::social_graph::ConnectionRemoved`
      },
      {
        MoveEventType: `${this.contractAddresses.reputation}::reputation::VerificationSubmitted`
      }
    ];

    // Set up event subscription
    const unsubscribeFunctions: Array<() => void> = [];

    for (const filter of eventFilters) {
      const unsubscribe = await this.adapter.subscribeToEvents(
        filter,
        (event: any) => {
          const eventType = event.type;
          
          if (eventType.includes('ReputationUpdated')) {
            onReputationUpdate(event);
          } else if (eventType.includes('Connection')) {
            onSocialConnection(event);
          } else if (eventType.includes('VerificationSubmitted')) {
            onVerificationSubmission(event);
          }
        }
      );
      
      unsubscribeFunctions.push(unsubscribe);
    }

    // Return cleanup function
    return () => {
      unsubscribeFunctions.forEach(fn => fn());
    };
  }

  /**
   * Health check for blockchain connection
   */
  async healthCheck(): Promise<{
    connected: boolean;
    blockHeight: number;
    contractsDeployed: boolean;
    lastTransactionTime: string;
    networkInfo: {
      chainId: string;
      networkType: string;
      nodeVersion: string;
    };
  }> {
    try {
      const [systemState, reputationContract] = await Promise.all([
        this.adapter.getLatestSuiSystemState(),
        this.adapter.queryObject({
          objectId: this.contractAddresses.reputation,
          options: { showContent: true }
        })
      ]);

      return {
        connected: true,
        blockHeight: parseInt(systemState.epoch) || 0,
        contractsDeployed: !!reputationContract.data,
        lastTransactionTime: new Date().toISOString(),
        networkInfo: {
          chainId: systemState.systemStateVersion || 'unknown',
          networkType: 'testnet', // Would be dynamic in production
          nodeVersion: systemState.suiVersion || 'unknown',
        },
      };
    } catch (error) {
      console.error('Blockchain health check failed:', error);
      return {
        connected: false,
        blockHeight: 0,
        contractsDeployed: false,
        lastTransactionTime: 'unknown',
        networkInfo: {
          chainId: 'unknown',
          networkType: 'unknown',
          nodeVersion: 'unknown',
        },
      };
    }
  }
}

export default BlockchainReputationService;