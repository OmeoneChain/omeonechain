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
    socialDistance: number;
    trustWeight: number;
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
export declare class RewardEngine {
    private static readonly TOTAL_SUPPLY;
    private static readonly REWARDS_POOL_PERCENTAGE;
    private static readonly MIN_TRUST_THRESHOLD;
    private static readonly HALVING_THRESHOLD_PERCENT;
    private static readonly DIRECT_FOLLOW_MULTIPLIER;
    private static readonly SECOND_HOP_MULTIPLIER;
    private static readonly MAX_SOCIAL_MULTIPLIER;
    private static readonly BASE_REWARDS;
    private static readonly CAPS;
    private static readonly CATEGORY_BONUSES;
    private rewardPoolState;
    constructor(initialPoolState?: Partial<RewardPoolState>);
    /**
     * Calculate rewards for a rewardable action
     */
    calculateReward(action: RewardableAction): RewardCalculationResult;
    /**
     * Process reward distribution and update pool state
     */
    distributeRewards(calculationResult: RewardCalculationResult): boolean;
    /**
     * Check if action qualifies for rewards based on trust threshold
     */
    private qualifiesForReward;
    /**
     * Get base reward amount for action type
     */
    private getBaseReward;
    /**
     * Calculate trust score multiplier (Trust Score becomes the multiplier)
     */
    private calculateTrustMultiplier;
    /**
     * Calculate social bonuses from network effects
     */
    private calculateSocialBonuses;
    /**
     * Get multiplier based on social distance
     */
    private getSocialDistanceMultiplier;
    /**
     * Get value for different interaction types
     */
    private getInteractionValue;
    private isValidCategory;
    private getCategoryBonus;
    /**
     * Calculate quality bonus based on action metadata
     */
    private calculateQualityBonus;
    /**
     * Calculate recency bonus for recent actions
     */
    private calculateRecencyBonus;
    /**
     * Apply caps and anti-gaming measures
     */
    private applyCaps;
    /**
     * Create token distribution plan
     */
    private createDistributionPlan;
    /**
     * Distribute rewards to social connections
     */
    private distributeSocialRewards;
    /**
     * Calculate impact on reward pool
     */
    private calculatePoolImpact;
    /**
     * Trigger halving mechanism
     */
    private triggerHalving;
    /**
     * Get reward type from action type
     */
    private getRewardTypeFromAction;
    /**
     * Create empty result for non-qualifying actions
     */
    private createEmptyResult;
    /**
     * Get current pool state
     */
    getPoolState(): RewardPoolState;
    /**
     * Check if pool has sufficient tokens
     */
    hasSufficientTokens(amount: Decimal): boolean;
    /**
     * Get current emission rate after halvings
     */
    getCurrentEmissionRate(): Decimal;
    /**
     * Estimate rewards for given trust score
     */
    estimateReward(trustScore: number, actionType: RewardableAction['actionType']): Decimal;
}
