// File path: /code/poc/frontend/src/services/TierService.ts
// NEW: Tier-based user status system for BocaBoca v0.8
// Replaces old TrustScoreService.ts (0-1000 reputation score)

import { IOTAService } from './IOTAService';
import IOTA_TESTNET_CONFIG from '../config/testnet-config';

export type UserTier = 'new' | 'established' | 'trusted';

export interface TierStatus {
  userId: string;
  currentTier: UserTier;
  daysActive: number;
  validatedRecommendations: number;
  engagementWeight: number;
  rateLimit: number;
  rateLimitRemaining: number;
  escrowRequired: boolean;
  nextTier: UserTier | null;
  nextTierRequirements: {
    daysNeeded: number;
    validatedRecsNeeded: number;
  } | null;
  benefits: string[];
  spamStatus: {
    isFlagged: boolean;
    flagCount: number;
    currentPenalty: 'none' | '30day' | '90day' | 'permanent';
    penaltyExpiresAt: string | null;
  };
}

export interface TierProgression {
  from: UserTier;
  to: UserTier;
  achievedAt: string;
  newBenefits: string[];
}

export interface RateLimitStatus {
  userId: string;
  tier: UserTier;
  dailyLimit: number;
  used: number;
  remaining: number;
  resetsAt: string;
  isBoostDay: boolean; // registration or wallet upgrade day
  isPenalized: boolean;
}

export interface SocialConnections {
  userId: string;
  directConnections: string[]; // 1-hop friends
  indirectConnections: string[]; // 2-hop friends
  totalNetwork: number;
  networkDensity: number;
}

export interface ValidationProgress {
  userId: string;
  totalRecommendations: number;
  validatedRecommendations: number;
  pendingValidation: number;
  validationRate: number; // percentage
  averageEngagement: number; // average engagement points per rec
}

class TierService {
  private iotaService: IOTAService;
  private config: typeof IOTA_TESTNET_CONFIG;

  constructor() {
    this.iotaService = new IOTAService();
    this.config = IOTA_TESTNET_CONFIG;
  }

  /**
   * Get complete tier status for a user
   */
  async getUserTierStatus(userAddress: string): Promise<TierStatus> {
    try {
      console.log(`📊 Getting tier status for ${userAddress}...`);

      // Get tier data from user_status contract
      const tierData = await this.getUserTierFromContract(userAddress);
      
      // Get rate limit status
      const rateLimitData = await this.getRateLimitStatus(userAddress);
      
      // Calculate next tier requirements
      const nextTierInfo = this.calculateNextTierRequirements(
        tierData.currentTier,
        tierData.daysActive,
        tierData.validatedRecommendations
      );

      const tierConfig = this.config.tierSystem.requirements[tierData.currentTier];
      const tierWeights = this.config.tierSystem.weights;
      
      return {
        userId: userAddress,
        currentTier: tierData.currentTier,
        daysActive: tierData.daysActive,
        validatedRecommendations: tierData.validatedRecommendations,
        engagementWeight: tierWeights[tierData.currentTier],
        rateLimit: rateLimitData.dailyLimit,
        rateLimitRemaining: rateLimitData.remaining,
        escrowRequired: tierData.currentTier === 'new',
        nextTier: nextTierInfo.nextTier,
        nextTierRequirements: nextTierInfo.requirements,
        benefits: this.config.tierSystem.benefits[tierData.currentTier],
        spamStatus: tierData.spamStatus
      };
    } catch (error) {
      console.error('❌ Failed to get tier status:', error);
      throw error;
    }
  }

  /**
   * Check if user can create a recommendation (rate limiting)
   */
  async canCreateRecommendation(userAddress: string): Promise<{
    allowed: boolean;
    reason?: string;
    rateLimitStatus: RateLimitStatus;
  }> {
    try {
      const rateLimitStatus = await this.getRateLimitStatus(userAddress);
      const tierStatus = await this.getUserTierStatus(userAddress);

      // Check spam flag
      if (tierStatus.spamStatus.isFlagged) {
        return {
          allowed: false,
          reason: `Account flagged for spam. Penalty: ${tierStatus.spamStatus.currentPenalty}`,
          rateLimitStatus
        };
      }

      // Check rate limit
      if (rateLimitStatus.remaining <= 0) {
        return {
          allowed: false,
          reason: `Daily limit reached (${rateLimitStatus.dailyLimit} recommendations). Resets at ${rateLimitStatus.resetsAt}`,
          rateLimitStatus
        };
      }

      return {
        allowed: true,
        rateLimitStatus
      };
    } catch (error) {
      console.error('❌ Failed to check recommendation permission:', error);
      throw error;
    }
  }

  /**
   * Get rate limit status
   */
  async getRateLimitStatus(userAddress: string): Promise<RateLimitStatus> {
    try {
      // Call user_status contract
      const rateLimitData = await this.iotaService.executeContractQuery(
        this.config.contracts.user_status.packageId,
        this.config.contracts.user_status.module,
        this.config.contracts.user_status.functions.check_rate_limit,
        [userAddress]
      );

      const tierStatus = await this.getUserTierFromContract(userAddress);
      
      // Calculate reset time (midnight UTC)
      const now = new Date();
      const resetTime = new Date(now);
      resetTime.setUTCHours(24, 0, 0, 0); // Next midnight UTC

      return {
        userId: userAddress,
        tier: tierStatus.currentTier,
        dailyLimit: rateLimitData.dailyLimit,
        used: rateLimitData.used,
        remaining: rateLimitData.dailyLimit - rateLimitData.used,
        resetsAt: resetTime.toISOString(),
        isBoostDay: rateLimitData.isBoostDay,
        isPenalized: tierStatus.spamStatus.isFlagged
      };
    } catch (error) {
      console.error('❌ Failed to get rate limit status:', error);
      
      // Return mock data for development
      return {
        userId: userAddress,
        tier: 'established',
        dailyLimit: 5,
        used: 2,
        remaining: 3,
        resetsAt: new Date(Date.now() + 86400000).toISOString(),
        isBoostDay: false,
        isPenalized: false
      };
    }
  }

  /**
   * Get user's social connections (for taste alignment)
   */
  async getSocialConnections(userAddress: string): Promise<SocialConnections> {
    try {
      // Call user_status contract for social graph
      const connections = await this.iotaService.executeContractQuery(
        this.config.contracts.user_status.packageId,
        this.config.contracts.user_status.module,
        this.config.contracts.user_status.functions.get_social_connections,
        [userAddress]
      );

      return {
        userId: userAddress,
        directConnections: connections.direct || [],
        indirectConnections: connections.indirect || [],
        totalNetwork: (connections.direct?.length || 0) + (connections.indirect?.length || 0),
        networkDensity: this.calculateNetworkDensity(
          connections.direct?.length || 0,
          connections.indirect?.length || 0
        )
      };
    } catch (error) {
      console.error('❌ Failed to get social connections:', error);
      
      // Return mock data
      return {
        userId: userAddress,
        directConnections: [],
        indirectConnections: [],
        totalNetwork: 0,
        networkDensity: 0
      };
    }
  }

  /**
   * Get validation progress towards Trusted tier
   */
  async getValidationProgress(userAddress: string): Promise<ValidationProgress> {
    try {
      const tierStatus = await this.getUserTierStatus(userAddress);
      
      // Get recommendation history from recommendation contract
      const recHistory = await this.iotaService.executeContractQuery(
        this.config.contracts.recommendation.packageId,
        this.config.contracts.recommendation.module,
        this.config.contracts.recommendation.functions.get_recommendations_by_author,
        [userAddress]
      );

      const total = recHistory.length;
      const validated = tierStatus.validatedRecommendations;
      const pending = total - validated;

      return {
        userId: userAddress,
        totalRecommendations: total,
        validatedRecommendations: validated,
        pendingValidation: pending,
        validationRate: total > 0 ? (validated / total) * 100 : 0,
        averageEngagement: recHistory.reduce((sum: number, rec: any) => 
          sum + (rec.engagementScore || 0), 0) / (total || 1)
      };
    } catch (error) {
      console.error('❌ Failed to get validation progress:', error);
      return {
        userId: userAddress,
        totalRecommendations: 0,
        validatedRecommendations: 0,
        pendingValidation: 0,
        validationRate: 0,
        averageEngagement: 0
      };
    }
  }

  /**
   * Calculate tier benefits and display info
   */
  getTierInfo(tier: UserTier): {
    name: string;
    weight: number;
    requirements: string;
    benefits: string[];
    color: string;
    icon: string;
  } {
    const tierConfig = this.config.tierSystem.requirements[tier];
    const weight = this.config.tierSystem.weights[tier];
    const benefits = this.config.tierSystem.benefits[tier];

    const tierInfo = {
      new: {
        name: 'New',
        requirements: '0-6 days active',
        color: '#9CA3AF', // gray
        icon: '🌱'
      },
      established: {
        name: 'Established',
        requirements: '7+ days active',
        color: '#3B82F6', // blue
        icon: '⭐'
      },
      trusted: {
        name: 'Trusted',
        requirements: '30+ days active + 3 validated recommendations',
        color: '#10B981', // green
        icon: '👑'
      }
    };

    return {
      name: tierInfo[tier].name,
      weight,
      requirements: tierInfo[tier].requirements,
      benefits,
      color: tierInfo[tier].color,
      icon: tierInfo[tier].icon
    };
  }

  /**
   * Check if user tier upgrade is available
   */
  async checkTierUpgrade(userAddress: string): Promise<{
    upgradeAvailable: boolean;
    currentTier: UserTier;
    nextTier: UserTier | null;
    meetsRequirements: boolean;
    requirements: any;
  }> {
    const tierStatus = await this.getUserTierStatus(userAddress);
    
    if (!tierStatus.nextTier) {
      return {
        upgradeAvailable: false,
        currentTier: tierStatus.currentTier,
        nextTier: null,
        meetsRequirements: false,
        requirements: null
      };
    }

    const requirements = tierStatus.nextTierRequirements!;
    const meetsRequirements = requirements.daysNeeded === 0 && 
                              requirements.validatedRecsNeeded === 0;

    return {
      upgradeAvailable: meetsRequirements,
      currentTier: tierStatus.currentTier,
      nextTier: tierStatus.nextTier,
      meetsRequirements,
      requirements
    };
  }

  // ========== PRIVATE HELPER METHODS ==========

  /**
   * Get tier data from user_status contract
   */
  private async getUserTierFromContract(userAddress: string): Promise<{
    currentTier: UserTier;
    daysActive: number;
    validatedRecommendations: number;
    spamStatus: any;
  }> {
    try {
      const userData = await this.iotaService.executeContractQuery(
        this.config.contracts.user_status.packageId,
        this.config.contracts.user_status.module,
        this.config.contracts.user_status.functions.get_tier_info,
        [userAddress]
      );

      return {
        currentTier: this.mapTierFromContract(userData.tier),
        daysActive: userData.daysActive,
        validatedRecommendations: userData.validatedRecommendations || 0,
        spamStatus: {
          isFlagged: userData.spamFlagged || false,
          flagCount: userData.spamFlagCount || 0,
          currentPenalty: userData.penaltyType || 'none',
          penaltyExpiresAt: userData.penaltyExpiry || null
        }
      };
    } catch (error) {
      console.error('⚠️ Failed to get tier from contract, using mock data:', error);
      
      // Return mock data for development
      return {
        currentTier: 'established',
        daysActive: 15,
        validatedRecommendations: 1,
        spamStatus: {
          isFlagged: false,
          flagCount: 0,
          currentPenalty: 'none',
          penaltyExpiresAt: null
        }
      };
    }
  }

  /**
   * Map tier from contract to TypeScript enum
   */
  private mapTierFromContract(tier: number | string): UserTier {
    if (typeof tier === 'string') {
      return tier.toLowerCase() as UserTier;
    }
    
    // If contract returns numbers: 0 = new, 1 = established, 2 = trusted
    const tierMap: { [key: number]: UserTier } = {
      0: 'new',
      1: 'established',
      2: 'trusted'
    };
    
    return tierMap[tier] || 'new';
  }

  /**
   * Calculate requirements for next tier
   */
  private calculateNextTierRequirements(
    currentTier: UserTier,
    daysActive: number,
    validatedRecs: number
  ): {
    nextTier: UserTier | null;
    requirements: { daysNeeded: number; validatedRecsNeeded: number } | null;
  } {
    if (currentTier === 'trusted') {
      return { nextTier: null, requirements: null };
    }

    const nextTier = currentTier === 'new' ? 'established' : 'trusted';
    const nextTierReqs = this.config.tierSystem.requirements[nextTier];

    const daysNeeded = Math.max(0, nextTierReqs.days - daysActive);
    const validatedRecsNeeded = Math.max(0, nextTierReqs.validatedRecs - validatedRecs);

    return {
      nextTier,
      requirements: {
        daysNeeded,
        validatedRecsNeeded
      }
    };
  }

  /**
   * Calculate network density metric
   */
  private calculateNetworkDensity(direct: number, indirect: number): number {
    const total = direct + indirect;
    if (total === 0) return 0;
    
    // Density formula: weight direct connections more heavily
    // density = (direct * 1.0 + indirect * 0.3) / total
    const weightedSum = (direct * 1.0) + (indirect * 0.3);
    return weightedSum / total;
  }
}

export default TierService;