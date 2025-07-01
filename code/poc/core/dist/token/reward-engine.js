"use strict";
// code/poc/core/src/token/reward-engine.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.RewardEngine = void 0;
const decimal_js_1 = require("decimal.js");
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
class RewardEngine {
    constructor(initialPoolState) {
        this.rewardPoolState = {
            totalSupply: RewardEngine.TOTAL_SUPPLY,
            remainingPool: RewardEngine.TOTAL_SUPPLY.mul(RewardEngine.REWARDS_POOL_PERCENTAGE),
            currentEmissionRate: new decimal_js_1.Decimal('1.0'), // Starts at 100%
            distributedTokens: new decimal_js_1.Decimal('0'),
            halvingCount: 0,
            nextHalvingThreshold: RewardEngine.TOTAL_SUPPLY.mul(RewardEngine.REWARDS_POOL_PERCENTAGE).mul(RewardEngine.HALVING_THRESHOLD_PERCENT),
            lastUpdated: new Date(),
            ...initialPoolState
        };
    }
    /**
     * Calculate rewards for a rewardable action
     */
    calculateReward(action) {
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
    distributeRewards(calculationResult) {
        if (calculationResult.poolImpact.tokensFromPool.gt(this.rewardPoolState.remainingPool)) {
            throw new Error('Insufficient tokens in reward pool');
        }
        // Update pool state
        this.rewardPoolState.remainingPool = this.rewardPoolState.remainingPool.sub(calculationResult.poolImpact.tokensFromPool);
        this.rewardPoolState.distributedTokens = this.rewardPoolState.distributedTokens.add(calculationResult.poolImpact.tokensFromPool);
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
    qualifiesForReward(action) {
        return new decimal_js_1.Decimal(action.trustScore).gte(RewardEngine.MIN_TRUST_THRESHOLD);
    }
    /**
     * Get base reward amount for action type
     */
    getBaseReward(actionType) {
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
                return new decimal_js_1.Decimal('0');
        }
    }
    /**
     * Calculate trust score multiplier (Trust Score becomes the multiplier)
     */
    calculateTrustMultiplier(trustScore) {
        const trustDecimal = new decimal_js_1.Decimal(trustScore);
        // Trust score directly becomes multiplier, capped at 3x
        return decimal_js_1.Decimal.min(trustDecimal.div(10).mul(3), RewardEngine.MAX_SOCIAL_MULTIPLIER);
    }
    /**
     * Calculate social bonuses from network effects
     */
    calculateSocialBonuses(connections) {
        let totalBonus = new decimal_js_1.Decimal('0');
        for (const connection of connections) {
            const distanceMultiplier = this.getSocialDistanceMultiplier(connection.socialDistance);
            const interactionValue = this.getInteractionValue(connection.interactionType);
            const connectionBonus = distanceMultiplier.mul(interactionValue);
            totalBonus = totalBonus.add(connectionBonus);
        }
        // Cap social bonuses to prevent gaming
        return decimal_js_1.Decimal.min(totalBonus, new decimal_js_1.Decimal('2.0'));
    }
    /**
     * Get multiplier based on social distance
     */
    getSocialDistanceMultiplier(distance) {
        switch (distance) {
            case 1:
                return RewardEngine.DIRECT_FOLLOW_MULTIPLIER;
            case 2:
                return RewardEngine.SECOND_HOP_MULTIPLIER;
            default:
                return new decimal_js_1.Decimal('0');
        }
    }
    /**
     * Get value for different interaction types
     */
    getInteractionValue(interactionType) {
        switch (interactionType) {
            case 'upvote':
                return new decimal_js_1.Decimal('1.0');
            case 'save':
                return new decimal_js_1.Decimal('1.2');
            case 'share':
                return new decimal_js_1.Decimal('1.5');
            default:
                return new decimal_js_1.Decimal('0');
        }
    }
    /**
     * Calculate quality bonus based on action metadata
     */
    calculateQualityBonus(action) {
        let qualityBonus = new decimal_js_1.Decimal('0');
        // Bonus for high-quality categories
        if (action.metadata.category) {
            const categoryBonuses = {
                'restaurant': new decimal_js_1.Decimal('0.1'),
                'travel': new decimal_js_1.Decimal('0.15'),
                'wellness': new decimal_js_1.Decimal('0.1'),
                'entertainment': new decimal_js_1.Decimal('0.05')
            };
            qualityBonus = qualityBonus.add(categoryBonuses[action.metadata.category] || new decimal_js_1.Decimal('0'));
        }
        // Apply any manual multiplier
        if (action.metadata.rewardMultiplier) {
            qualityBonus = qualityBonus.mul(new decimal_js_1.Decimal(action.metadata.rewardMultiplier));
        }
        return qualityBonus;
    }
    /**
     * Calculate recency bonus for recent actions
     */
    calculateRecencyBonus(timestamp) {
        const now = new Date();
        const ageHours = (now.getTime() - timestamp.getTime()) / (1000 * 60 * 60);
        // Bonus for actions within last 24 hours
        if (ageHours <= 24) {
            return new decimal_js_1.Decimal('0.2');
        }
        // Smaller bonus for actions within last week
        if (ageHours <= 168) { // 7 days
            return new decimal_js_1.Decimal('0.1');
        }
        return new decimal_js_1.Decimal('0');
    }
    /**
     * Apply caps and anti-gaming measures
     */
    applyCaps(amount, action) {
        let finalAmount = amount;
        const appliedCaps = [];
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
    createDistributionPlan(action, totalAmount) {
        const distributionPlan = [];
        // Primary reward to action creator
        const primaryReward = {
            recipientUserId: action.userId,
            amount: totalAmount.mul(new decimal_js_1.Decimal('0.8')), // 80% to primary actor
            rewardType: this.getRewardTypeFromAction(action.actionType),
            sourceActionId: action.actionId,
            calculatedAt: new Date()
        };
        distributionPlan.push(primaryReward);
        // Distribute remaining 20% to social connections
        const socialRewardPool = totalAmount.mul(new decimal_js_1.Decimal('0.2'));
        const socialRewards = this.distributeSocialRewards(action, socialRewardPool);
        distributionPlan.push(...socialRewards);
        return distributionPlan;
    }
    /**
     * Distribute rewards to social connections
     */
    distributeSocialRewards(action, poolAmount) {
        const socialRewards = [];
        if (action.socialConnections.length === 0) {
            return socialRewards;
        }
        // Calculate total weight
        let totalWeight = new decimal_js_1.Decimal('0');
        for (const connection of action.socialConnections) {
            totalWeight = totalWeight.add(this.getSocialDistanceMultiplier(connection.socialDistance));
        }
        // Distribute proportionally
        for (const connection of action.socialConnections) {
            const weight = this.getSocialDistanceMultiplier(connection.socialDistance);
            const share = poolAmount.mul(weight).div(totalWeight);
            if (share.gt(new decimal_js_1.Decimal('0.01'))) { // Only distribute if meaningful amount
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
    calculatePoolImpact(rewardAmount) {
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
    triggerHalving() {
        this.rewardPoolState.halvingCount += 1;
        this.rewardPoolState.currentEmissionRate = this.rewardPoolState.currentEmissionRate.div(new decimal_js_1.Decimal('2'));
        // Set next halving threshold
        const baseThreshold = RewardEngine.TOTAL_SUPPLY
            .mul(RewardEngine.REWARDS_POOL_PERCENTAGE)
            .mul(RewardEngine.HALVING_THRESHOLD_PERCENT);
        this.rewardPoolState.nextHalvingThreshold = baseThreshold.mul(new decimal_js_1.Decimal(this.rewardPoolState.halvingCount + 1));
    }
    /**
     * Get reward type from action type
     */
    getRewardTypeFromAction(actionType) {
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
    createEmptyResult(action, reason) {
        return {
            totalReward: new decimal_js_1.Decimal('0'),
            breakdown: {
                baseReward: new decimal_js_1.Decimal('0'),
                trustMultiplier: new decimal_js_1.Decimal('0'),
                socialBonuses: new decimal_js_1.Decimal('0'),
                qualityBonus: new decimal_js_1.Decimal('0'),
                recencyBonus: new decimal_js_1.Decimal('0'),
                caps: {
                    appliedCaps: [reason],
                    originalAmount: new decimal_js_1.Decimal('0'),
                    finalAmount: new decimal_js_1.Decimal('0')
                }
            },
            distributionPlan: [],
            poolImpact: {
                tokensFromPool: new decimal_js_1.Decimal('0'),
                remainingPool: this.rewardPoolState.remainingPool,
                triggerHalving: false
            }
        };
    }
    /**
     * Get current pool state
     */
    getPoolState() {
        return { ...this.rewardPoolState };
    }
    /**
     * Check if pool has sufficient tokens
     */
    hasSufficientTokens(amount) {
        return this.rewardPoolState.remainingPool.gte(amount);
    }
    /**
     * Get current emission rate after halvings
     */
    getCurrentEmissionRate() {
        return this.rewardPoolState.currentEmissionRate;
    }
    /**
     * Estimate rewards for given trust score
     */
    estimateReward(trustScore, actionType) {
        if (trustScore < RewardEngine.MIN_TRUST_THRESHOLD.toNumber()) {
            return new decimal_js_1.Decimal('0');
        }
        const baseReward = this.getBaseReward(actionType);
        const trustMultiplier = this.calculateTrustMultiplier(trustScore);
        return baseReward.mul(trustMultiplier).mul(this.rewardPoolState.currentEmissionRate);
    }
}
exports.RewardEngine = RewardEngine;
// Core constants from whitepaper
RewardEngine.TOTAL_SUPPLY = new decimal_js_1.Decimal('10000000000'); // 10 billion tokens
RewardEngine.REWARDS_POOL_PERCENTAGE = new decimal_js_1.Decimal('0.52'); // 52% of total supply
RewardEngine.MIN_TRUST_THRESHOLD = new decimal_js_1.Decimal('0.25');
RewardEngine.HALVING_THRESHOLD_PERCENT = new decimal_js_1.Decimal('0.10'); // Every 10% distributed
// Reward multipliers by social distance
RewardEngine.DIRECT_FOLLOW_MULTIPLIER = new decimal_js_1.Decimal('0.75');
RewardEngine.SECOND_HOP_MULTIPLIER = new decimal_js_1.Decimal('0.25');
RewardEngine.MAX_SOCIAL_MULTIPLIER = new decimal_js_1.Decimal('3.0');
// Base rewards for different actions
RewardEngine.BASE_REWARDS = {
    RECOMMENDATION_CREATED: new decimal_js_1.Decimal('1.0'),
    UPVOTE_BATCH: new decimal_js_1.Decimal('1.0'), // Per 10 upvotes from trusted users
    LIST_CREATED: new decimal_js_1.Decimal('1.0'),
    REFERRAL_COMPLETED: new decimal_js_1.Decimal('2.0'),
    SPAM_REPORTED: new decimal_js_1.Decimal('1.0')
};
// Reward caps to prevent gaming
RewardEngine.CAPS = {
    MAX_REWARD_PER_POST: new decimal_js_1.Decimal('5.0'),
    MAX_DAILY_USER_REWARDS: new decimal_js_1.Decimal('50.0'),
    MAX_WEEKLY_IMPACT_SCORE: new decimal_js_1.Decimal('100.0')
};
//# sourceMappingURL=reward-engine.js.map