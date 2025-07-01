export interface SocialConnection {
    fromUserId: string;
    toUserId: string;
    connectionType: 'follow' | 'trust' | 'verified';
    establishedAt: Date;
    trustWeight: number;
}
export interface UserInteraction {
    userId: string;
    contentId: string;
    interactionType: 'upvote' | 'save' | 'share' | 'downvote';
    timestamp: Date;
    socialDistance: number;
}
export interface ContentMetadata {
    contentId: string;
    authorId: string;
    createdAt: Date;
    category: string;
    tags: string[];
}
export interface TrustScoreInput {
    targetContentId: string;
    evaluatingUserId: string;
    socialConnections: SocialConnection[];
    userInteractions: UserInteraction[];
    contentMetadata: ContentMetadata;
}
export interface TrustScoreResult {
    finalScore: number;
    breakdown: {
        socialTrustWeight: number;
        qualitySignals: number;
        recencyFactor: number;
        diversityBonus: number;
    };
    socialPath: {
        userId: string;
        distance: number;
        contributionWeight: number;
    }[];
    confidence: number;
}
/**
 * Core Trust Score Calculator
 * Implements the social graph-weighted recommendation scoring that differentiates OmeoneChain
 */
export declare class TrustScoreCalculator {
    private static readonly DIRECT_FOLLOW_WEIGHT;
    private static readonly SECOND_HOP_WEIGHT;
    private static readonly MAX_SOCIAL_DISTANCE;
    private static readonly MIN_TRUST_THRESHOLD;
    private static readonly MAX_TRUST_SCORE;
    private static readonly RECENCY_HALF_LIFE_DAYS;
    private static readonly INTERACTION_WEIGHT_DECAY;
    /**
     * Calculate Trust Score for content based on social graph
     */
    calculateTrustScore(input: TrustScoreInput): TrustScoreResult;
    /**
     * Calculate social trust weight based on social graph connections
     */
    private calculateSocialTrustWeight;
    /**
     * Calculate quality signals from user interactions
     */
    private calculateQualitySignals;
    /**
     * Calculate recency factor for time-based scoring
     */
    private calculateRecencyFactor;
    /**
     * Calculate diversity bonus for varied social signals
     */
    private calculateDiversityBonus;
    /**
     * Combine all score factors using weighted formula
     */
    private combineScoreFactors;
    /**
     * Build social graph from connections
     */
    private buildSocialGraph;
    /**
     * Find social distance between two users using BFS
     */
    private findSocialDistance;
    /**
     * Calculate interaction reinforcement based on past behavior
     */
    private calculateInteractionReinforcement;
    /**
     * Build social path showing trust propagation
     */
    private buildSocialPath;
    /**
     * Calculate confidence in the trust score
     */
    private calculateConfidence;
    /**
     * Get weight based on social distance
     */
    private getSocialDistanceWeight;
    /**
     * Get value for different interaction types
     */
    private getInteractionValue;
    /**
     * Check if content meets minimum trust threshold
     */
    meetsTrustThreshold(trustScore: number): boolean;
    /**
     * Get trust score category for UI display
     */
    getTrustCategory(trustScore: number): string;
}
