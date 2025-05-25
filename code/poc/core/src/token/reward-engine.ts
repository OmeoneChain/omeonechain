// code/poc/core/src/token/reward-engine.ts

import { Decimal } from 'decimal.js';

export interface RewardableAction {
  actionId: string;
  userId: string;
  contentId: string;
  actionType: 'recommendation_created' | 'upvote_received' | 'list_created' | 'referral_completed' | 'spam_reported';
  trustScore: number;
  socialConnections: SocialRewardConnection[];
  timestamp: Date;
  metadata: {
    category?: string;
    originalAuthor?: string;
    rewardMultiplier?: number;
  };
}

export interface SocialRewardConnection {
  fromUserId: string;
  toUserId: string;
  socialDistance: number; // 1 or 2 hops
  trustWeight: number; // 0.75 for 1-hop, 0.25 for 2-hop
  interactionType: 'upvote' | 'save' | 'share';
  timestamp: Date;
}

export interface TokenReward {
  recipientUserId: string;
  amount: Decimal;
  rewardType: 'creation_bonus' | 'trust_multiplier' | 'interaction_reward' | 'curation_share' | 'referral_bonus' | 'spam_bounty';
  sourceActionId: string;
  calculatedAt: Date;
  socialPath?: {
    userId: string;
    contribution: Decimal;
    distance: number;
  }[];
}

export interface RewardPoolState {
  totalSupply: Decimal;
  remainingPool: Decimal;
  currentEmissionRate: Decimal;
  distributedTokens: Decimal;
  halvingCount: number;
  nextHalvingThreshold: Decimal;
  lastUpdated: Date;
}

export interface RewardCalculationResult {
  totalReward: Decimal;
  breakdown: {
    baseReward: Decimal;
    trustMultiplier: Decimal;
    socialBonuses: Decimal;
    qualityBonus: Decimal;
    recencyBonus: Decimal;
    caps: {
      appliedCaps: string[];
      originalAmount: Decimal;
      finalAmount: Decimal;
    };
  };
  distributionPlan: TokenReward[];
  poolImpact: {
    tokensFromPool: Decimal;
    remainingPool: Decimal;
    triggerHalving: boolean;
  };
}

/**
 * Reward Logic Engine - Implements OmeoneChain's Trust-Weighted Token Economics
 * 
 * Key Features:
 * - Trust Score threshold enforcement (≥0.25)
 * - Social-weighted reward multipliers (1-hop: 0.75, 2-hop: 0.25)
 * - Halving mechanism (every 10% of supply distributed)
 * - Anti-gaming caps and validation
 * - Multiple reward streams (creation, curation, referrals, etc.)
 */
export class RewardEngine {
  // Core constants from whitepaper
  private static readonly TOTAL_SUPPLY = new Decimal('10000000000'); // 10 billion tokens
  private static readonly REWARDS_POOL_PERCENTAGE = new Decimal('0.52'); // 52% of total supply
  private static readonly MIN_TRUST_THRESHOLD = new Decimal('0.25');
  private static readonly HALVING_THRESHOLD_PERCENT = new Decimal('0.10'); // Every 10% distributed
  
  // Reward multipliers by social distance
  private static readonly DIRECT_FOLLOW_MULTIPLIER = new Decimal('0.75');
  private static readonly SECOND_HOP_MULTIPLIER = new Decimal('0.25');
  private static readonly MAX_SOCIAL_MULTIPLIER = new Decimal('3.0');
  
  // Base rewards for different actions
  private static readonly BASE_REWARDS = {
    RECOMMENDATION_CREATED: new Decimal('1.0'),
    UPVOTE_BATCH: new Decimal('1.0'), // Per 10 upvotes from trusted users
    LIST_CREATED: new Decimal('1.0'),
    REFERRAL_COMPLETED: new Decimal('2.0'),
    SPAM_REPORTED: new Decimal('1.0')
  };
  
  // Reward caps to prevent gaming
  private static readonly CAPS = {
    MAX_REWARD_PER_POST: new Decimal('5.0'),
    MAX_DAILY_USER_REWARDS: new Decimal('50.0'),
    MAX_WEEKLY_IMPACT_SCORE: new Decimal('100.0')
  };

  private rewardPoolState: RewardPoolState;

  constructor(initialPoolState?: Partial<RewardPoolState>) {
    this.rewardPoolState = {
      totalSupply: RewardEngine.TOTAL_SUPPLY,
      remainingPool: RewardEngine.TOTAL_SUPPLY.mul(RewardEngine.REWARDS_POOL_PERCENTAGE),
      currentEmissionRate: new Decimal('1.0'), // Starts at 100%
      distributedTokens: new Decimal('0'),
      halvingCount: 0,
      nextHalvingThreshold: RewardEngine.TOTAL_SUPPLY.mul(RewardEngine.REWARDS_POOL_PERCENTAGE).mul(RewardEngine.HALVING_THRESHOLD_PERCENT),
      lastUpdated: new Date(),
      ...initialPoolState
    };
  }

  /**
   * Calculate rewards for a rewardable action
   */
  public calculateReward(action: RewardableAction): RewardCalculationResult {
    // Check if action qualifies for rewards
    if (!this.qualifiesForReward(action)) {
      return this.createEmptyResult(action, 'Does not meet trust threshold');
    }

    // Calculate base reward
    const baseReward = this.getBaseReward(action.actionType);
    
    // Apply trust score multiplier
    const trustMultiplier = this.calculateTrustMultiplier(action.trustScore);
    
    // Calculate social bonuses from network effects
    const socialBonuses = this.calculateSocialBonuses(action.socialConnections);
    
    // Apply quality and recency bonuses
    const qualityBonus = this.calculateQualityBonus(action);
    const recencyBonus = this.calculateRecencyBonus(action.timestamp);
    
    // Calculate total before caps
    const totalBeforeCaps = baseReward
      .mul(trustMultiplier)
      .add(socialBonuses)
      .add(qualityBonus)
      .add(recencyBonus)
      .mul(this.rewardPoolState.currentEmissionRate);

    // Apply caps and anti-gaming measures
    const { finalAmount, appliedCaps } = this.applyCaps(totalBeforeCaps, action);
    
    // Create distribution plan
    const distributionPlan = this.createDistributionPlan(action, finalAmount);
    
    // Calculate pool impact
    const poolImpact = this.calculatePoolImpact(finalAmount);

    return {
      totalReward: finalAmount,
      breakdown: {
        baseReward,
        trustMultiplier,
        socialBonuses,
        qualityBonus,
        recencyBonus,
        caps: {
          appliedCaps,
          originalAmount: totalBeforeCaps,
          finalAmount
        }
      },
      distributionPlan,
      poolImpact
    };
  }

  /**
   * Process reward distribution and update pool state
   */
  public distributeRewards(calculationResult: RewardCalculationResult): boolean {
    if (calculationResult.poolImpact.tokensFromPool.gt(this.rewardPoolState.remainingPool)) {
      throw new Error('Insufficient tokens in reward pool');
    }

    // Update pool state
    this.rewardPoolState.remainingPool = this.rewardPoolState.remainingPool.sub(
      calculationResult.poolImpact.tokensFromPool
    );
    this.rewardPoolState.distributedTokens = this.rewardPoolState.distributedTokens.add(
      calculationResult.poolImpact.tokensFromPool
    );
    this.rewardPoolState.lastUpdated = new Date();

    // Check if halving should be triggered
    if (calculationResult.poolImpact.triggerHalving) {
      this.triggerHalving();
    }

    return true;
  }

  /**
   * Check if action qualifies for rewards based on trust threshold
   */
  private qualifiesForReward(action: RewardableAction): boolean {
    return new Decimal(action.trustScore).gte(RewardEngine.MIN_TRUST_THRESHOLD);
  }

  /**
   * Get base reward amount for action type
   */
  private getBaseReward(actionType: RewardableAction['actionType']): Decimal {
    switch (actionType) {
      case 'recommendation_created':
        return RewardEngine.BASE_REWARDS.RECOMMENDATION_CREATED;
      case 'upvote_received':
        return RewardEngine.BASE_REWARDS.UPVOTE_BATCH;
      case 'list_created':
        return RewardEngine.BASE_REWARDS.LIST_CREATED;
      case 'referral_completed':
        return RewardEngine.BASE_REWARDS.REFERRAL_COMPLETED;
      case 'spam_reported':
        return RewardEngine.BASE_REWARDS.SPAM_REPORTED;
      default:
        return new Decimal('0');
    }
  }

  /**
   * Calculate trust score multiplier (Trust Score becomes the multiplier)
   */
  private calculateTrustMultiplier(trustScore: number): Decimal {
    const trustDecimal = new Decimal(trustScore);
    
    // Trust score directly becomes multiplier, capped at 3x
    return Decimal.min(trustDecimal.div(10).mul(3), RewardEngine.MAX_SOCIAL_MULTIPLIER);
  }

  /**
   * Calculate social bonuses from network effects
   */
  private calculateSocialBonuses(connections: SocialRewardConnection[]): Decimal {
    let totalBonus = new Decimal('0');

    for (const connection of connections) {
      const distanceMultiplier = this.getSocialDistanceMultiplier(connection.socialDistance);
      const interactionValue = this.getInteractionValue(connection.interactionType);
      
      const connectionBonus = distanceMultiplier.mul(interactionValue);
      totalBonus = totalBonus.add(connectionBonus);
    }

    // Cap social bonuses to prevent gaming
    return Decimal.min(totalBonus, new Decimal('2.0'));
  }

  /**
   * Get multiplier based on social distance
   */
  private getSocialDistanceMultiplier(distance: number): Decimal {
    switch (distance) {
      case 1:
        return RewardEngine.DIRECT_FOLLOW_MULTIPLIER;
      case 2:
        return RewardEngine.SECOND_HOP_MULTIPLIER;
      default:
        return new Decimal('0');
    }
  }

  /**
   * Get value for different interaction types
   */
  private getInteractionValue(interactionType: string): Decimal {
    switch (interactionType) {
      case 'upvote':
        return new Decimal('1.0');
      case 'save':
        return new Decimal('1.2');
      case 'share':
        return new Decimal('1.5');
      default:
        return new Decimal('0');
    }
  }

  /**
   * Calculate quality bonus based on action metadata
   */
  private calculateQualityBonus(action: RewardableAction): Decimal {
    let qualityBonus = new Decimal('0');

    // Bonus for high-quality categories
    if (action.metadata.category) {
      const categoryBonuses = {
        'restaurant': new Decimal('0.1'),
        'travel': new Decimal('0.15'),
        'wellness': new Decimal('0.1'),
        'entertainment': new Decimal('0.05')
      };
      
      qualityBonus = qualityBonus.add(categoryBonuses[action.metadata.category] || new Decimal('0'));
    }

    // Apply any manual multiplier
    if (action.metadata.rewardMultiplier) {
      qualityBonus = qualityBonus.mul(new Decimal(action.metadata.rewardMultiplier));
    }

    return qualityBonus;
  }

  /**
   * Calculate recency bonus for recent actions
   */
  private calculateRecencyBonus(timestamp: Date): Decimal {
    const now = new Date();
    const ageHours = (now.getTime() - timestamp.getTime()) / (1000 * 60 * 60);
    
    // Bonus for actions within last 24 hours
    if (ageHours <= 24) {
      return new Decimal('0.2');
    }
    
    // Smaller bonus for actions within last week
    if (ageHours <= 168) { // 7 days
      return new Decimal('0.1');
    }
    
    return new Decimal('0');
  }

  /**
   * Apply caps and anti-gaming measures
   */
  private applyCaps(amount: Decimal, action: RewardableAction): { finalAmount: Decimal; appliedCaps: string[] } {
    let finalAmount = amount;
    const appliedCaps: string[] = [];

    // Cap per-post rewards
    if (finalAmount.gt(RewardEngine.CAPS.MAX_REWARD_PER_POST)) {
      finalAmount = RewardEngine.CAPS.MAX_REWARD_PER_POST;
      appliedCaps.push('max_reward_per_post');
    }

    // Additional anti-gaming logic could be added here
    // - Daily user limits
    // - Velocity checks
    // - Pattern detection

    return { finalAmount, appliedCaps };
  }

  /**
   * Create token distribution plan
   */
  private createDistributionPlan(action: RewardableAction, totalAmount: Decimal): TokenReward[] {
    const distributionPlan: TokenReward[] = [];

    // Primary reward to action creator
    const primaryReward: TokenReward = {
      recipientUserId: action.userId,
      amount: totalAmount.mul(new Decimal('0.8')), // 80% to primary actor
      rewardType: this.getRewardTypeFromAction(action.actionType),
      sourceActionId: action.actionId,
      calculatedAt: new Date()
    };
    distributionPlan.push(primaryReward);

    // Distribute remaining 20% to social connections
    const socialRewardPool = totalAmount.mul(new Decimal('0.2'));
    const socialRewards = this.distributeSocialRewards(action, socialRewardPool);
    distributionPlan.push(...socialRewards);

    return distributionPlan;
  }

  /**
   * Distribute rewards to social connections
   */
  private distributeSocialRewards(action: RewardableAction, poolAmount: Decimal): TokenReward[] {
    const socialRewards: TokenReward[] = [];
    
    if (action.socialConnections.length === 0) {
      return socialRewards;
    }

    // Calculate total weight
    let totalWeight = new Decimal('0');
    for (const connection of action.socialConnections) {
      totalWeight = totalWeight.add(this.getSocialDistanceMultiplier(connection.socialDistance));
    }

    // Distribute proportionally
    for (const connection of action.socialConnections) {
      const weight = this.getSocialDistanceMultiplier(connection.socialDistance);
      const share = poolAmount.mul(weight).div(totalWeight);

      if (share.gt(new Decimal('0.01'))) { // Only distribute if meaningful amount
        socialRewards.push({
          recipientUserId: connection.fromUserId,
          amount: share,
          rewardType: 'trust_multiplier',
          sourceActionId: action.actionId,
          calculatedAt: new Date(),
          socialPath: [{
            userId: connection.fromUserId,
            contribution: share,
            distance: connection.socialDistance
          }]
        });
      }
    }

    return socialRewards;
  }

  /**
   * Calculate impact on reward pool
   */
  private calculatePoolImpact(rewardAmount: Decimal): {
    tokensFromPool: Decimal;
    remainingPool: Decimal;
    triggerHalving: boolean;
  } {
    const tokensFromPool = rewardAmount;
    const newDistributedTotal = this.rewardPoolState.distributedTokens.add(tokensFromPool);
    const remainingPool = this.rewardPoolState.remainingPool.sub(tokensFromPool);
    
    const triggerHalving = newDistributedTotal.gte(this.rewardPoolState.nextHalvingThreshold);

    return {
      tokensFromPool,
      remainingPool,
      triggerHalving
    };
  }

  /**
   * Trigger halving mechanism
   */
  private triggerHalving(): void {
    this.rewardPoolState.halvingCount += 1;
    this.rewardPoolState.currentEmissionRate = this.rewardPoolState.currentEmissionRate.div(new Decimal('2'));
    
    // Set next halving threshold
    const baseThreshold = RewardEngine.TOTAL_SUPPLY
      .mul(RewardEngine.REWARDS_POOL_PERCENTAGE)
      .mul(RewardEngine.HALVING_THRESHOLD_PERCENT);
    
    this.rewardPoolState.nextHalvingThreshold = baseThreshold.mul(
      new Decimal(this.rewardPoolState.halvingCount + 1)
    );
  }

  /**
   * Get reward type from action type
   */
  private getRewardTypeFromAction(actionType: RewardableAction['actionType']): TokenReward['rewardType'] {
    switch (actionType) {
      case 'recommendation_created':
        return 'creation_bonus';
      case 'upvote_received':
        return 'interaction_reward';
      case 'list_created':
        return 'curation_share';
      case 'referral_completed':
        return 'referral_bonus';
      case 'spam_reported':
        return 'spam_bounty';
      default:
        return 'creation_bonus';
    }
  }

  /**
   * Create empty result for non-qualifying actions
   */
  private createEmptyResult(action: RewardableAction, reason: string): RewardCalculationResult {
    return {
      totalReward: new Decimal('0'),
      breakdown: {
        baseReward: new Decimal('0'),
        trustMultiplier: new Decimal('0'),
        socialBonuses: new Decimal('0'),
        qualityBonus: new Decimal('0'),
        recencyBonus: new Decimal('0'),
        caps: {
          appliedCaps: [reason],
          originalAmount: new Decimal('0'),
          finalAmount: new Decimal('0')
        }
      },
      distributionPlan: [],
      poolImpact: {
        tokensFromPool: new Decimal('0'),
        remainingPool: this.rewardPoolState.remainingPool,
        triggerHalving: false
      }
    };
  }

  /**
   * Get current pool state
   */
  public getPoolState(): RewardPoolState {
    return { ...this.rewardPoolState };
  }

  /**
   * Check if pool has sufficient tokens
   */
  public hasSufficientTokens(amount: Decimal): boolean {
    return this.rewardPoolState.remainingPool.gte(amount);
  }

  /**
   * Get current emission rate after halvings
   */
  public getCurrentEmissionRate(): Decimal {
    return this.rewardPoolState.currentEmissionRate;
  }

  /**
   * Estimate rewards for given trust score
   */
  public estimateReward(trustScore: number, actionType: RewardableAction['actionType']): Decimal {
    if (trustScore < RewardEngine.MIN_TRUST_THRESHOLD.toNumber()) {
      return new Decimal('0');
    }

    const baseReward = this.getBaseReward(actionType);
    const trustMultiplier = this.calculateTrustMultiplier(trustScore);
    
    return baseReward.mul(trustMultiplier).mul(this.rewardPoolState.currentEmissionRate);
  }
}