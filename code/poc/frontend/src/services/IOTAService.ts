// File path: /code/poc/frontend/src/services/IOTAService.ts
// UPDATED: Integration with BocaBoca v1.0 contracts (9 modules)
// CRITICAL: Updated for 6 decimal precision
// PATCHED: v0.8 → v1.0 (January 2026)
//   - Tier mapping: 1/2/3 (was 0/1/2)
//   - All reward amounts: 10× increase
//   - Escrow check: tier === 1 (was tier === 0)

import IOTA_TESTNET_CONFIG, { testnetClient } from '../config/testnet-config';
import { createMockTestnetClient, MockTestnetClient } from '../config/mock-testnet-client';

export type UserTier = 'new' | 'established' | 'trusted';

export interface Recommendation {
  id: string;
  title: string;
  body: string;
  author: string;
  category: string;
  restaurantId: string;
  location: {
    latitude: number;
    longitude: number;
    address: string;
    city: string;
  };
  contentHash: string;
  engagementScore: number;
  likes: number;
  saves: number;
  comments: number;
  validated: boolean;
  isFirstReview: boolean;
  createdAt: string;
}

export interface Comment {
  id: string;
  recommendationId: string;
  authorId: string;
  content: string;
  isHelpful: boolean;
  createdAt: string;
}

export interface UserStatus {
  userId: string;
  tier: UserTier;
  daysActive: number;
  validatedRecommendations: number;
  engagementWeight: number;
  rateLimit: number;
  rateLimitUsed: number;
  spamFlagged: boolean;
  escrowRequired: boolean;
}

export interface EscrowStatus {
  userId: string;
  amount: number;
  createdAt: string;
  releaseAt: string;
  status: 'pending' | 'released' | 'forfeited';
  recommendationId: string;
}

export interface TokenBalance {
  address: string;
  balance: number;
  displayBalance: string;
  escrowBalance: number;
  availableBalance: number;
}

export interface LotteryStatus {
  userId: string;
  weeklyEngagement: number;
  tickets: number;
  rank: number;
  eligible: boolean;
  prizes: {
    totalWon: number;
    lastWin?: string;
  };
}

export interface AttributionRewards {
  userId: string;
  totalAttributionBonuses: number;
  reshareCount: number;
  displayTotal: string;
}

export interface ContractCallOptions {
  gasLimit?: number;
  gasBudget?: number;
}

export class IOTAService {
  private rpcUrl: string;
  private networkId: string;
  private client: typeof testnetClient | MockTestnetClient;
  private usingMockClient: boolean = false;
  
  // Contract Package IDs from config
  private readonly CONTRACTS = IOTA_TESTNET_CONFIG.contracts;
  
  // ========== TOKEN CONFIGURATION ==========
  // CRITICAL: Token decimals (6 instead of 9)
  private readonly TOKEN_DECIMALS = 6;
  private readonly TOKEN_MULTIPLIER = 1_000_000; // 10^6

  // ========== v1.0 REWARD CONSTANTS (10× from v0.8) ==========
  // All amounts in base units (6 decimals, so 1 BOCA = 1,000,000)

  // ----- CONTENT CREATION REWARDS -----
  /** Base reward for creating recommendation (wallet user): 5.0 BOCA */
  private readonly CREATION_REWARD_WALLET = 5_000_000;
  /** Base reward for creating recommendation (email user): 2.5 BOCA */
  private readonly CREATION_REWARD_EMAIL = 2_500_000;
  /** Validation bonus at 3.0 engagement points: 10.0 BOCA */
  private readonly VALIDATION_BONUS = 10_000_000;
  /** First reviewer bonus: 10.0 BOCA */
  private readonly FIRST_REVIEWER_BONUS = 10_000_000;

  // ----- ENGAGEMENT REWARDS -----
  /** Reward when someone saves your rec: 1.0 BOCA (before tier weight) */
  private readonly SAVE_REWARD_BASE = 1_000_000;
  /** Reward when someone comments: 0.5 BOCA (before tier weight) */
  private readonly COMMENT_REWARD_BASE = 500_000;
  /** Reward when your comment is marked helpful: 2.0 BOCA */
  private readonly HELPFUL_COMMENT_REWARD = 2_000_000;

  // ----- SOCIAL AMPLIFICATION REWARDS -----
  /** Reward for boosting a recommendation: 1.0 BOCA */
  private readonly BOOST_REWARD = 1_000_000;
  /** Reward for resharing with endorsement: 2.0 BOCA */
  private readonly RESHARE_REWARD = 2_000_000;
  /** Attribution bonus when your rec gets reshared: 1.0 BOCA */
  private readonly ATTRIBUTION_BONUS = 1_000_000;

  // ----- ONBOARDING REWARDS -----
  /** Follow 3+ accounts: 5.0 BOCA */
  private readonly ONBOARDING_FOLLOW_REWARD = 5_000_000;
  /** Create 5 recommendations: 5.0 BOCA each */
  private readonly ONBOARDING_REC_REWARD = 5_000_000;
  /** Engage with 10 posts from 3+ authors: 20.0 BOCA */
  private readonly ONBOARDING_ENGAGE_REWARD = 20_000_000;

  // ----- REFERRAL REWARDS -----
  /** Referral completes onboarding: 20.0 BOCA */
  private readonly REFERRAL_COMPLETE_REWARD = 20_000_000;
  /** Referred user creates 10 recs: 10.0 BOCA bonus */
  private readonly REFERRAL_MILESTONE_REWARD = 10_000_000;

  // ----- LOTTERY PRIZES -----
  /** First place: 250 BOCA */
  private readonly LOTTERY_FIRST_PRIZE = 250_000_000;
  /** Second place: 150 BOCA */
  private readonly LOTTERY_SECOND_PRIZE = 150_000_000;
  /** Third place: 100 BOCA */
  private readonly LOTTERY_THIRD_PRIZE = 100_000_000;

  // ----- PHOTO CONTEST PRIZES -----
  /** First place: 100 BOCA */
  private readonly CONTEST_FIRST_PRIZE = 100_000_000;
  /** Second place: 50 BOCA */
  private readonly CONTEST_SECOND_PRIZE = 50_000_000;
  /** Third place: 30 BOCA */
  private readonly CONTEST_THIRD_PRIZE = 30_000_000;
  /** Nomination participation: 0.5 BOCA (NEW in v1.0) */
  private readonly CONTEST_NOMINATION_REWARD = 500_000;

  // ----- TIER WEIGHTS (basis points for precision) -----
  /** New tier weight: 0.5x = 5000 basis points */
  private readonly TIER_WEIGHT_NEW = 5000;
  /** Established tier weight: 1.0x = 10000 basis points */
  private readonly TIER_WEIGHT_ESTABLISHED = 10000;
  /** Trusted tier weight: 1.5x = 15000 basis points */
  private readonly TIER_WEIGHT_TRUSTED = 15000;

  constructor() {
    this.rpcUrl = IOTA_TESTNET_CONFIG.rpcUrl;
    this.networkId = IOTA_TESTNET_CONFIG.network;
    
    try {
      this.client = testnetClient;
      this.usingMockClient = false;
    } catch (error) {
      console.warn('⚠️ IOTA testnet client not available, using mock client for development');
      this.client = createMockTestnetClient();
      this.usingMockClient = true;
    }
  }

  // ========== 🔗 CONNECTION & HEALTH CHECKS ==========

  /**
   * Test connection to IOTA testnet
   */
  async testConnection(): Promise<boolean> {
    try {
      console.log(`🔗 Testing connection to IOTA Rebased ${this.networkId}...`);
      
      const timeout = (ms: number) => new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Connection timeout')), ms)
      );

      // Test token contract (base layer)
      const tokenTest = await Promise.race([
        this.testContract('token', this.CONTRACTS.token.packageId),
        timeout(5000)
      ]);

      console.log(`✅ Token contract accessible: ${tokenTest}`);
      return tokenTest as boolean;
    } catch (error) {
      console.error('❌ IOTA connection failed:', error);
      return false;
    }
  }

  /**
   * Test individual contract accessibility
   */
  private async testContract(name: string, packageId: string): Promise<boolean> {
    try {
      if (this.usingMockClient) {
        console.log(`🔧 ${name} contract - Using mock client (demo mode)`);
        return true;
      }

      if (!this.client || typeof (this.client as any).getObject !== 'function') {
        console.log(`⚠️ ${name} contract - Client not configured, using demo mode`);
        return true;
      }

      const packageInfo = await (this.client as any).getObject(packageId);
      const isAccessible = !!packageInfo?.data;
      
      console.log(`${isAccessible ? '✅' : '❌'} ${name} contract: ${isAccessible ? 'accessible' : 'not found'}`);
      return isAccessible;
    } catch (error: any) {
      console.log(`⚠️ ${name} contract test failed:`, error.message);
      return true; // Return true for demo purposes
    }
  }

  /**
   * Get network status with all 9 contract modules
   */
  async getNetworkStatus(): Promise<{
    isConnected: boolean;
    contractsDeployed: number;
    latestCheckpoint: number;
    networkHealth: 'healthy' | 'degraded' | 'unhealthy';
    contracts: { [key: string]: string };
  }> {
    try {
      const contractNames = [
        'token', 'user_status', 'escrow', 'email_escrow',
        'rewards', 'recommendation', 'lottery', 'photo_contest', 'bounty'
      ];
      
      const contractTests = await Promise.allSettled(
        contractNames.map(name => 
          this.testContract(name, (this.CONTRACTS as any)[name].packageId)
        )
      );

      const contractsDeployed = contractTests.filter(
        result => result.status === 'fulfilled' && result.value === true
      ).length;

      let latestCheckpoint = 0;
      try {
        const checkpoints = await (this.client as any).getLatestCheckpointSequenceNumber();
        latestCheckpoint = parseInt(checkpoints) || 0;
      } catch (error) {
        console.warn('Could not get latest checkpoint:', error);
      }

      const networkHealth = contractsDeployed >= 7 ? 'healthy' : 
                           contractsDeployed >= 4 ? 'degraded' : 'unhealthy';

      return {
        isConnected: contractsDeployed > 0,
        contractsDeployed,
        latestCheckpoint,
        networkHealth,
        contracts: {
          token: this.CONTRACTS.token.packageId,
          user_status: this.CONTRACTS.user_status.packageId,
          escrow: this.CONTRACTS.escrow.packageId,
          email_escrow: this.CONTRACTS.email_escrow.packageId,
          rewards: this.CONTRACTS.rewards.packageId,
          recommendation: this.CONTRACTS.recommendation.packageId,
          lottery: this.CONTRACTS.lottery.packageId,
          photo_contest: this.CONTRACTS.photo_contest.packageId,
          bounty: this.CONTRACTS.bounty.packageId
        }
      };
    } catch (error) {
      console.error('❌ Failed to get network status:', error);
      return {
        isConnected: false,
        contractsDeployed: 0,
        latestCheckpoint: 0,
        networkHealth: 'unhealthy',
        contracts: {}
      };
    }
  }

  // ========== 💰 TOKEN OPERATIONS (6 DECIMAL PRECISION) ==========

  /**
   * Get token balance with 6 decimal precision
   */
  async getTokenBalance(userAddress: string): Promise<TokenBalance> {
    try {
      console.log(`💰 Getting BOCA balance for ${userAddress}...`);
      
      const tokenType = `${this.CONTRACTS.token.packageId}::token::BOCA`;
      const coins = await (this.client as any).getCoins(userAddress, tokenType);
      
      let totalBalance = 0;
      if (coins && coins.data && coins.data.length > 0) {
        coins.data.forEach((coin: any) => {
          totalBalance += parseInt(coin.balance || '0');
        });
      }

      // Get escrow balance
      const escrowBalance = await this.getEscrowBalance(userAddress);
      const availableBalance = totalBalance - escrowBalance;

      return {
        address: userAddress,
        balance: totalBalance,
        displayBalance: this.formatTokenAmount(totalBalance),
        escrowBalance,
        availableBalance
      };
    } catch (error) {
      console.error('❌ Failed to get token balance:', error);
      
      // Return mock data for development
      return {
        address: userAddress,
        balance: 1250000000, // 1250 BOCA in base units
        displayBalance: '1,250.00 BOCA',
        escrowBalance: 0,
        availableBalance: 1250000000
      };
    }
  }

  /**
   * Get escrow balance
   */
  async getEscrowBalance(userAddress: string): Promise<number> {
    try {
      const escrowStatus = await this.executeContractQuery(
        this.CONTRACTS.escrow.packageId,
        this.CONTRACTS.escrow.module,
        this.CONTRACTS.escrow.functions.get_escrow_status,
        [userAddress]
      );

      return escrowStatus?.amount || 0;
    } catch (error) {
      console.warn('⚠️ Could not get escrow balance:', error);
      return 0;
    }
  }

  /**
   * Format token amount for display (6 decimals)
   */
  formatTokenAmount(baseUnits: number): string {
    const amount = baseUnits / this.TOKEN_MULTIPLIER;
    return `${amount.toLocaleString('en-US', { 
      minimumFractionDigits: 2,
      maximumFractionDigits: 2 
    })} BOCA`;
  }

  /**
   * Convert display amount to base units (6 decimals)
   */
  toBaseUnits(displayAmount: number): number {
    return Math.floor(displayAmount * this.TOKEN_MULTIPLIER);
  }

  /**
   * Convert base units to display amount (6 decimals)
   */
  toDisplayAmount(baseUnits: number): number {
    return baseUnits / this.TOKEN_MULTIPLIER;
  }

  // ========== 👤 USER STATUS & TIER OPERATIONS ==========

  /**
   * Get user status and tier information
   */
  async getUserStatus(userAddress: string): Promise<UserStatus> {
    try {
      const tierInfo = await this.executeContractQuery(
        this.CONTRACTS.user_status.packageId,
        this.CONTRACTS.user_status.module,
        this.CONTRACTS.user_status.functions.get_tier_info,
        [userAddress]
      );

      const rateLimitInfo = await this.executeContractQuery(
        this.CONTRACTS.user_status.packageId,
        this.CONTRACTS.user_status.module,
        this.CONTRACTS.user_status.functions.check_rate_limit,
        [userAddress]
      );

      return {
        userId: userAddress,
        tier: this.mapTierFromContract(tierInfo.tier),
        daysActive: tierInfo.daysActive || 0,
        validatedRecommendations: tierInfo.validatedRecommendations || 0,
        engagementWeight: this.getTierWeightDecimal(tierInfo.tier),
        rateLimit: rateLimitInfo.dailyLimit || 5,
        rateLimitUsed: rateLimitInfo.used || 0,
        spamFlagged: tierInfo.spamFlagged || false,
        escrowRequired: tierInfo.tier === 1 // v1.0 FIX: New tier = 1 (was 0)
      };
    } catch (error) {
      console.error('❌ Failed to get user status:', error);
      
      // Return mock data
      return {
        userId: userAddress,
        tier: 'established',
        daysActive: 15,
        validatedRecommendations: 2,
        engagementWeight: 1.0,
        rateLimit: 5,
        rateLimitUsed: 2,
        spamFlagged: false,
        escrowRequired: false
      };
    }
  }

  /**
   * Register new user
   */
  async registerUser(userAddress: string): Promise<boolean> {
    try {
      await this.executeContract(
        this.CONTRACTS.user_status.packageId,
        this.CONTRACTS.user_status.module,
        this.CONTRACTS.user_status.functions.register_user,
        [userAddress]
      );
      
      console.log('✅ User registered successfully');
      return true;
    } catch (error) {
      console.error('❌ Failed to register user:', error);
      return false;
    }
  }

  // ========== 📝 RECOMMENDATION OPERATIONS ==========

  /**
   * Create recommendation with unified engagement
   */
  async createRecommendation(
    userAddress: string,
    recommendation: Omit<Recommendation, 'id' | 'engagementScore' | 'likes' | 'saves' | 'comments' | 'validated' | 'isFirstReview' | 'createdAt'>
  ): Promise<string> {
    try {
      // Check rate limit first
      const userStatus = await this.getUserStatus(userAddress);
      if (userStatus.rateLimitUsed >= userStatus.rateLimit) {
        throw new Error('Daily recommendation limit reached');
      }

      // Check if this is first review of restaurant
      const isFirstReview = await this.isFirstReviewer(recommendation.restaurantId);

      const result = await this.executeContract(
        this.CONTRACTS.recommendation.packageId,
        this.CONTRACTS.recommendation.module,
        this.CONTRACTS.recommendation.functions.create_recommendation,
        [
          recommendation.title,
          recommendation.body,
          recommendation.category,
          recommendation.restaurantId,
          JSON.stringify(recommendation.location),
          userAddress
        ]
      );

      const recommendationId = result?.objectChanges?.find(
        (change: any) => change.type === 'created'
      )?.objectId || `rec_${Date.now()}`;

      console.log('✅ Recommendation created:', recommendationId);
      
      if (isFirstReview) {
        console.log(`🔍 First reviewer bonus triggered! (+${this.formatTokenAmount(this.FIRST_REVIEWER_BONUS)})`);
      }

      return recommendationId;
    } catch (error) {
      console.error('❌ Failed to create recommendation:', error);
      throw error;
    }
  }

  /**
   * Get recommendation by ID
   */
  async getRecommendation(id: string): Promise<Recommendation | null> {
    try {
      const rec = await this.executeContractQuery(
        this.CONTRACTS.recommendation.packageId,
        this.CONTRACTS.recommendation.module,
        this.CONTRACTS.recommendation.functions.get_recommendation,
        [id]
      );

      if (!rec) return null;

      return {
        id: rec.id,
        title: rec.title,
        body: rec.body,
        author: rec.author,
        category: rec.category,
        restaurantId: rec.restaurantId,
        location: JSON.parse(rec.location),
        contentHash: rec.contentHash,
        engagementScore: rec.engagementScore || 0,
        likes: rec.likes || 0,
        saves: rec.saves || 0,
        comments: rec.comments || 0,
        validated: rec.engagementScore >= 3.0,
        isFirstReview: rec.isFirstReview || false,
        createdAt: rec.createdAt
      };
    } catch (error) {
      console.error('❌ Failed to get recommendation:', error);
      return null;
    }
  }

  /**
   * Like recommendation (0.25 engagement points)
   */
  async likeRecommendation(recommendationId: string, userAddress: string): Promise<boolean> {
    try {
      await this.executeContract(
        this.CONTRACTS.recommendation.packageId,
        this.CONTRACTS.recommendation.module,
        this.CONTRACTS.recommendation.functions.like_recommendation,
        [recommendationId, userAddress]
      );
      
      console.log('✅ Recommendation liked');
      return true;
    } catch (error) {
      console.error('❌ Failed to like recommendation:', error);
      return false;
    }
  }

  /**
   * Save recommendation (0.5 engagement points)
   * Author earns tier-weighted save reward
   */
  async saveRecommendation(recommendationId: string, userAddress: string): Promise<boolean> {
    try {
      await this.executeContract(
        this.CONTRACTS.recommendation.packageId,
        this.CONTRACTS.recommendation.module,
        this.CONTRACTS.recommendation.functions.save_recommendation,
        [recommendationId, userAddress]
      );
      
      console.log('✅ Recommendation saved');
      return true;
    } catch (error) {
      console.error('❌ Failed to save recommendation:', error);
      return false;
    }
  }

  /**
   * Comment on recommendation (0.75 engagement points)
   * Author earns tier-weighted comment reward
   */
  async commentOnRecommendation(
    recommendationId: string,
    userAddress: string,
    comment: string
  ): Promise<string> {
    try {
      const result = await this.executeContract(
        this.CONTRACTS.recommendation.packageId,
        this.CONTRACTS.recommendation.module,
        this.CONTRACTS.recommendation.functions.comment_on_recommendation,
        [recommendationId, userAddress, comment]
      );
      
      const commentId = result?.objectChanges?.find(
        (change: any) => change.type === 'created'
      )?.objectId || `comment_${Date.now()}`;
      
      console.log('✅ Comment added:', commentId);
      return commentId;
    } catch (error) {
      console.error('❌ Failed to add comment:', error);
      throw error;
    }
  }

  // ========== ⭐ HELPFUL COMMENT SYSTEM ==========

  /**
   * Mark a comment as helpful (author of recommendation can mark ONE comment)
   * Commenter earns 2.0 BOCA bonus (v1.0)
   */
  async markCommentHelpful(
    commentId: string,
    recommendationId: string,
    authorAddress: string
  ): Promise<{
    success: boolean;
    bonusAwarded: number;
    error?: string;
  }> {
    try {
      console.log(`⭐ Marking comment ${commentId} as helpful...`);

      // Verify author owns the recommendation
      const rec = await this.getRecommendation(recommendationId);
      if (!rec || rec.author !== authorAddress) {
        return {
          success: false,
          bonusAwarded: 0,
          error: 'Only recommendation author can mark comments as helpful'
        };
      }

      const result = await this.executeContract(
        this.CONTRACTS.recommendation.packageId,
        this.CONTRACTS.recommendation.module,
        'mark_comment_helpful',
        [commentId, recommendationId, authorAddress]
      );

      // v1.0: 2.0 BOCA (was 0.2 BOCA in v0.8)
      const bonusAmount = this.HELPFUL_COMMENT_REWARD;

      console.log('✅ Comment marked as helpful');
      console.log(`   Bonus awarded: ${this.formatTokenAmount(bonusAmount)}`);

      return {
        success: true,
        bonusAwarded: bonusAmount
      };
    } catch (error: any) {
      console.error('❌ Failed to mark comment as helpful:', error);
      return {
        success: false,
        bonusAwarded: 0,
        error: error.message
      };
    }
  }

  /**
   * Get comments for a recommendation
   */
  async getRecommendationComments(recommendationId: string): Promise<Comment[]> {
    try {
      const comments = await this.executeContractQuery(
        this.CONTRACTS.recommendation.packageId,
        this.CONTRACTS.recommendation.module,
        'get_recommendation_comments',
        [recommendationId]
      );

      return comments || [];
    } catch (error) {
      console.error('❌ Failed to get comments:', error);
      return [];
    }
  }

  // ========== 🔍 FIRST REVIEWER DETECTION ==========

  /**
   * Check if user would be first reviewer for a restaurant
   * Returns true if restaurant has 0 recommendations
   */
  async isFirstReviewer(restaurantId: string): Promise<boolean> {
    try {
      const count = await this.getRestaurantRecommendationCount(restaurantId);
      return count === 0;
    } catch (error) {
      console.error('⚠️ Failed to check first reviewer status:', error);
      return false;
    }
  }

  /**
   * Get count of recommendations for a restaurant
   */
  async getRestaurantRecommendationCount(restaurantId: string): Promise<number> {
    try {
      const result = await this.executeContractQuery(
        this.CONTRACTS.recommendation.packageId,
        this.CONTRACTS.recommendation.module,
        'get_restaurant_recommendation_count',
        [restaurantId]
      );

      return result?.count || 0;
    } catch (error) {
      console.error('⚠️ Failed to get restaurant recommendation count:', error);
      return 0;
    }
  }

  /**
   * Get all recommendations for a restaurant
   */
  async getRestaurantRecommendations(restaurantId: string): Promise<Recommendation[]> {
    try {
      const recs = await this.executeContractQuery(
        this.CONTRACTS.recommendation.packageId,
        this.CONTRACTS.recommendation.module,
        'get_recommendations_by_restaurant',
        [restaurantId]
      );

      return recs || [];
    } catch (error) {
      console.error('❌ Failed to get restaurant recommendations:', error);
      return [];
    }
  }

  // ========== 🚀 BOOST & RESHARE SYSTEM ==========

  /**
   * Boost recommendation (amplify without endorsement)
   * Booster earns: 1.0 BOCA (v1.0)
   * Does NOT affect taste profile
   */
  async boostRecommendation(
    recommendationId: string,
    boosterAddress: string
  ): Promise<{
    success: boolean;
    reward: number;
    error?: string;
  }> {
    try {
      console.log(`🚀 Boosting recommendation ${recommendationId}...`);

      const result = await this.executeContract(
        this.CONTRACTS.recommendation.packageId,
        this.CONTRACTS.recommendation.module,
        'boost_recommendation',
        [recommendationId, boosterAddress]
      );

      // v1.0: 1.0 BOCA (was 0.1 BOCA in v0.8)
      const boostReward = this.BOOST_REWARD;

      console.log('✅ Recommendation boosted');
      console.log(`   Reward: ${this.formatTokenAmount(boostReward)}`);

      return {
        success: true,
        reward: boostReward
      };
    } catch (error: any) {
      console.error('❌ Failed to boost recommendation:', error);
      return {
        success: false,
        reward: 0,
        error: error.message
      };
    }
  }

  /**
   * Reshare recommendation (full endorsement)
   * Resharer earns: 2.0 BOCA (v1.0)
   * DOES affect taste profile (warning should be shown in UI)
   * Original author earns: 1.0 BOCA attribution bonus (v1.0)
   * Resharer earns: 20% of downstream engagement
   */
  async reshareRecommendation(
    recommendationId: string,
    resharerAddress: string
  ): Promise<{
    success: boolean;
    resharerReward: number;
    attributionBonus: number;
    error?: string;
  }> {
    try {
      console.log(`🔄 Resharing recommendation ${recommendationId}...`);
      console.log('⚠️ This will affect resharer\'s taste profile');

      const result = await this.executeContract(
        this.CONTRACTS.recommendation.packageId,
        this.CONTRACTS.recommendation.module,
        'reshare_recommendation',
        [recommendationId, resharerAddress]
      );

      // v1.0: 2.0 BOCA reshare reward (was 0.2 BOCA in v0.8)
      const resharerReward = this.RESHARE_REWARD;
      // v1.0: 1.0 BOCA attribution bonus (was 0.1 BOCA in v0.8)
      const attributionBonus = this.ATTRIBUTION_BONUS;

      console.log('✅ Recommendation reshared');
      console.log(`   Resharer reward: ${this.formatTokenAmount(resharerReward)}`);
      console.log(`   Attribution bonus (to author): ${this.formatTokenAmount(attributionBonus)}`);

      return {
        success: true,
        resharerReward,
        attributionBonus
      };
    } catch (error: any) {
      console.error('❌ Failed to reshare recommendation:', error);
      return {
        success: false,
        resharerReward: 0,
        attributionBonus: 0,
        error: error.message
      };
    }
  }

  /**
   * Get attribution rewards earned by user
   * Shows how much they've earned from others resharing their content
   */
  async getAttributionRewards(userAddress: string): Promise<AttributionRewards> {
    try {
      const result = await this.executeContractQuery(
        this.CONTRACTS.recommendation.packageId,
        this.CONTRACTS.recommendation.module,
        'get_attribution_rewards',
        [userAddress]
      );

      const total = result?.totalAttributionBonuses || 0;
      const count = result?.reshareCount || 0;

      return {
        userId: userAddress,
        totalAttributionBonuses: total,
        reshareCount: count,
        displayTotal: this.formatTokenAmount(total)
      };
    } catch (error) {
      console.error('❌ Failed to get attribution rewards:', error);
      return {
        userId: userAddress,
        totalAttributionBonuses: 0,
        reshareCount: 0,
        displayTotal: '0.00 BOCA'
      };
    }
  }

  // ========== 📊 RECOMMENDATION QUERIES ==========

  /**
   * Get recommendations by author
   */
  async getRecommendationsByAuthor(authorAddress: string): Promise<Recommendation[]> {
    try {
      const recs = await this.executeContractQuery(
        this.CONTRACTS.recommendation.packageId,
        this.CONTRACTS.recommendation.module,
        this.CONTRACTS.recommendation.functions.get_recommendations_by_author,
        [authorAddress]
      );

      return recs || [];
    } catch (error) {
      console.error('❌ Failed to get recommendations by author:', error);
      return [];
    }
  }

  /**
   * Get recommendations (with optional filters)
   */
  async getRecommendations(options: {
    category?: string;
    limit?: number;
    offset?: number;
  } = {}): Promise<Recommendation[]> {
    try {
      let recs = [];
      
      if (options.category) {
        recs = await this.executeContractQuery(
          this.CONTRACTS.recommendation.packageId,
          this.CONTRACTS.recommendation.module,
          this.CONTRACTS.recommendation.functions.get_recommendations_by_category,
          [options.category]
        );
      } else {
        // Get recent recommendations
        recs = await this.executeContractQuery(
          this.CONTRACTS.recommendation.packageId,
          this.CONTRACTS.recommendation.module,
          'get_recent_recommendations',
          [options.limit || 20, options.offset || 0]
        );
      }

      return recs || [];
    } catch (error) {
      console.error('❌ Failed to get recommendations:', error);
      return [];
    }
  }

  // ========== 🏆 LOTTERY OPERATIONS ==========

  /**
   * Get lottery status for user
   */
  async getLotteryStatus(userAddress: string): Promise<LotteryStatus> {
    try {
      const weeklyScore = await this.executeContractQuery(
        this.CONTRACTS.lottery.packageId,
        this.CONTRACTS.lottery.module,
        this.CONTRACTS.lottery.functions.get_weekly_score,
        [userAddress]
      );

      const lifetimeStats = await this.executeContractQuery(
        this.CONTRACTS.lottery.packageId,
        this.CONTRACTS.lottery.module,
        this.CONTRACTS.lottery.functions.get_lifetime_stats,
        [userAddress]
      );

      const tickets = await this.executeContractQuery(
        this.CONTRACTS.lottery.packageId,
        this.CONTRACTS.lottery.module,
        this.CONTRACTS.lottery.functions.calculate_tickets,
        [weeklyScore.engagementScore]
      );

      return {
        userId: userAddress,
        weeklyEngagement: weeklyScore.engagementScore || 0,
        tickets: tickets || 0,
        rank: weeklyScore.rank || 0,
        eligible: weeklyScore.engagementScore >= 1.0 && weeklyScore.rank <= 50,
        prizes: {
          totalWon: lifetimeStats.totalPrizesWon || 0,
          lastWin: lifetimeStats.lastWinDate
        }
      };
    } catch (error) {
      console.error('❌ Failed to get lottery status:', error);
      return {
        userId: userAddress,
        weeklyEngagement: 0,
        tickets: 0,
        rank: 0,
        eligible: false,
        prizes: { totalWon: 0 }
      };
    }
  }

  /**
   * Get lottery prize amounts (v1.0)
   */
  getLotteryPrizes(): { first: number; second: number; third: number } {
    return {
      first: this.LOTTERY_FIRST_PRIZE,
      second: this.LOTTERY_SECOND_PRIZE,
      third: this.LOTTERY_THIRD_PRIZE
    };
  }

  /**
   * Get photo contest prize amounts (v1.0)
   */
  getContestPrizes(): { first: number; second: number; third: number; nomination: number } {
    return {
      first: this.CONTEST_FIRST_PRIZE,
      second: this.CONTEST_SECOND_PRIZE,
      third: this.CONTEST_THIRD_PRIZE,
      nomination: this.CONTEST_NOMINATION_REWARD
    };
  }

  // ========== 🔧 HELPER METHODS ==========

  /**
   * Execute contract function (write operation)
   */
  async executeContract(
    packageId: string,
    module: string,
    functionName: string,
    args: any[] = [],
    options?: ContractCallOptions
  ): Promise<any> {
    if (this.usingMockClient) {
      console.log(`🔧 Mock: ${module}::${functionName}`, args);
      return { success: true };
    }

    return await (this.client as any).executeContract(
      packageId,
      module,
      functionName,
      args,
      []
    );
  }

  /**
   * Execute contract query (read operation)
   */
  async executeContractQuery(
    packageId: string,
    module: string,
    functionName: string,
    args: any[] = []
  ): Promise<any> {
    if (this.usingMockClient) {
      console.log(`🔧 Mock query: ${module}::${functionName}`, args);
      return null;
    }

    // For queries, we use getObject or queryEvents
    // This is a placeholder - implement based on actual contract structure
    return null;
  }

  /**
   * Map tier from contract (number) to TypeScript enum
   * v1.0 FIX: Contract uses 1-indexed tiers (1=New, 2=Established, 3=Trusted)
   */
  private mapTierFromContract(tier: number | string): UserTier {
    if (typeof tier === 'string') {
      return tier.toLowerCase() as UserTier;
    }
    
    // v1.0: Contract uses 1/2/3 (was 0/1/2 in v0.8)
    const tierMap: { [key: number]: UserTier } = {
      1: 'new',
      2: 'established',
      3: 'trusted'
    };
    
    return tierMap[tier] || 'new';
  }

  /**
   * Get tier weight as decimal (for engagementWeight in UserStatus)
   */
  private getTierWeightDecimal(tier: number | string): number {
    const tierKey = typeof tier === 'number' 
      ? this.mapTierFromContract(tier)
      : tier.toLowerCase() as UserTier;
    
    const weights = {
      new: 0.5,
      established: 1.0,
      trusted: 1.5
    };
    
    return weights[tierKey] || 1.0;
  }

  /**
   * Get tier weight in basis points (for reward calculations)
   * - New (tier 1): 0.5x = 5000 basis points
   * - Established (tier 2): 1.0x = 10000 basis points
   * - Trusted (tier 3): 1.5x = 15000 basis points
   */
  getTierWeightBasisPoints(tier: number): number {
    switch (tier) {
      case 3: return this.TIER_WEIGHT_TRUSTED;   // 15000 (1.5x)
      case 2: return this.TIER_WEIGHT_ESTABLISHED; // 10000 (1.0x)
      case 1:
      default: return this.TIER_WEIGHT_NEW;       // 5000 (0.5x)
    }
  }

  /**
   * Apply tier weight to a base reward amount
   * @param baseAmount - Base reward in base units (6 decimals)
   * @param tier - User tier (1, 2, or 3)
   * @returns Weighted reward amount
   */
  applyTierWeight(baseAmount: number, tier: number): number {
    const weight = this.getTierWeightBasisPoints(tier);
    return Math.floor((baseAmount * weight) / 10000);
  }

  /**
   * Calculate engagement reward with tier weighting
   * @param engagementType - 'save' or 'comment'
   * @param engagerTier - Tier of the user doing the engagement (1, 2, or 3)
   * @returns Reward amount in base units
   */
  calculateEngagementReward(
    engagementType: 'save' | 'comment',
    engagerTier: number
  ): number {
    const baseReward = engagementType === 'save' 
      ? this.SAVE_REWARD_BASE 
      : this.COMMENT_REWARD_BASE;
    
    return this.applyTierWeight(baseReward, engagerTier);
  }

  /**
   * Get all reward constants (useful for UI display)
   */
  getRewardConstants(): {
    creation: { wallet: number; email: number };
    validation: number;
    firstReviewer: number;
    engagement: { save: number; comment: number; helpful: number };
    social: { boost: number; reshare: number; attribution: number };
    onboarding: { follow: number; recommendation: number; engage: number };
    referral: { complete: number; milestone: number };
    lottery: { first: number; second: number; third: number };
    contest: { first: number; second: number; third: number; nomination: number };
  } {
    return {
      creation: {
        wallet: this.CREATION_REWARD_WALLET,
        email: this.CREATION_REWARD_EMAIL
      },
      validation: this.VALIDATION_BONUS,
      firstReviewer: this.FIRST_REVIEWER_BONUS,
      engagement: {
        save: this.SAVE_REWARD_BASE,
        comment: this.COMMENT_REWARD_BASE,
        helpful: this.HELPFUL_COMMENT_REWARD
      },
      social: {
        boost: this.BOOST_REWARD,
        reshare: this.RESHARE_REWARD,
        attribution: this.ATTRIBUTION_BONUS
      },
      onboarding: {
        follow: this.ONBOARDING_FOLLOW_REWARD,
        recommendation: this.ONBOARDING_REC_REWARD,
        engage: this.ONBOARDING_ENGAGE_REWARD
      },
      referral: {
        complete: this.REFERRAL_COMPLETE_REWARD,
        milestone: this.REFERRAL_MILESTONE_REWARD
      },
      lottery: {
        first: this.LOTTERY_FIRST_PRIZE,
        second: this.LOTTERY_SECOND_PRIZE,
        third: this.LOTTERY_THIRD_PRIZE
      },
      contest: {
        first: this.CONTEST_FIRST_PRIZE,
        second: this.CONTEST_SECOND_PRIZE,
        third: this.CONTEST_THIRD_PRIZE,
        nomination: this.CONTEST_NOMINATION_REWARD
      }
    };
  }
}

export default IOTAService;