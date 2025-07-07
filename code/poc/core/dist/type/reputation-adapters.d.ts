/**
 * Adapter-specific reputation types for OmeoneChain
 *
 * This file provides adapter-specific types and utilities for working with
 * reputation data across different blockchain implementations.
 */
/**
 * Core reputation score information
 */
export interface ReputationScore {
    /**
     * Overall reputation score (0-1)
     */
    score: number;
    /**
     * Trust level based on score
     */
    trustLevel: 'low' | 'medium' | 'high' | 'expert';
    /**
     * Confidence in the score (0-1)
     */
    confidence: number;
    /**
     * Last update timestamp
     */
    lastUpdated: number;
}
/**
 * Detailed reputation breakdown
 */
export interface ReputationBreakdown {
    /**
     * Content quality score
     */
    contentQuality: number;
    /**
     * Social trust score
     */
    socialTrust: number;
    /**
     * Engagement quality
     */
    engagementQuality: number;
    /**
     * Verification bonus
     */
    verificationBonus: number;
    /**
     * Penalty deductions
     */
    penalties: number;
}
/**
 * User reputation profile
 */
export interface UserReputation {
    /**
     * User identifier
     */
    userId: string;
    /**
     * Current reputation score
     */
    reputation: ReputationScore;
    /**
     * Detailed breakdown
     */
    breakdown: ReputationBreakdown;
    /**
     * Verification status
     */
    verification: UserVerification;
    /**
     * Activity metrics
     */
    activity: UserActivity;
    /**
     * Social connections
     */
    social: SocialMetrics;
}
/**
 * User verification information
 */
export interface UserVerification {
    /**
     * Verification level
     */
    level: 'basic' | 'verified' | 'expert';
    /**
     * Verification timestamp
     */
    verifiedAt?: number;
    /**
     * Verification method
     */
    method?: 'email' | 'phone' | 'identity' | 'expert_review';
    /**
     * Verification expiry
     */
    expiresAt?: number;
    /**
     * Specialization areas
     */
    specializations: string[];
}
/**
 * User activity metrics
 */
export interface UserActivity {
    /**
     * Total recommendations created
     */
    totalRecommendations: number;
    /**
     * Total upvotes received
     */
    upvotesReceived: number;
    /**
     * Total downvotes received
     */
    downvotesReceived: number;
    /**
     * Total saves received
     */
    savesReceived: number;
    /**
     * Average recommendation rating
     */
    averageRating: number;
    /**
     * Activity streak (days)
     */
    streak: number;
    /**
     * Last activity timestamp
     */
    lastActive: number;
}
/**
 * Social metrics for reputation
 */
export interface SocialMetrics {
    /**
     * Number of followers
     */
    followers: number;
    /**
     * Number of following
     */
    following: number;
    /**
     * Social graph density
     */
    networkDensity: number;
    /**
     * Trust connections (mutual follows with high reputation)
     */
    trustConnections: number;
    /**
     * Influence score based on network
     */
    influenceScore: number;
}
/**
 * Reputation transaction data format
 * Used when submitting reputation updates to blockchain adapters
 */
export interface ReputationTransactionData {
    /**
     * User's public key or identifier
     */
    userId: string;
    /**
     * Total number of recommendations made by the user
     */
    totalRecommendations: number;
    /**
     * Total number of upvotes received across all recommendations
     */
    upvotesReceived: number;
    /**
     * Total number of downvotes received across all recommendations
     */
    downvotesReceived: number;
    /**
     * Calculated reputation score
     */
    reputationScore: number;
    /**
     * Verification level of the user
     */
    verificationLevel: 'basic' | 'verified' | 'expert';
    /**
     * Categories in which the user has demonstrated expertise
     */
    specializations?: string[];
    /**
     * Chain ID indicating the originating chain
     */
    chainID?: string;
    /**
     * On-chain reference data
     */
    ledger?: {
        objectID?: string;
        commitNumber?: number;
    };
}
/**
 * Reputation transaction wrapper
 * Used for blockchain transaction submissions
 */
export interface ReputationTransaction {
    id: string;
    data: ReputationTransactionData;
    signature: string;
    blockHeight?: number;
    timestamp: number;
}
/**
 * Reputation update event
 */
export interface ReputationUpdateEvent {
    /**
     * User whose reputation changed
     */
    userId: string;
    /**
     * Previous reputation score
     */
    previousScore: number;
    /**
     * New reputation score
     */
    newScore: number;
    /**
     * Reason for the update
     */
    reason: 'recommendation_created' | 'upvote_received' | 'downvote_received' | 'verification_updated' | 'penalty_applied' | 'bonus_awarded';
    /**
     * Related object (recommendation, vote, etc.)
     */
    relatedId?: string;
    /**
     * Update timestamp
     */
    timestamp: number;
    /**
     * Score change amount
     */
    scoreChange: number;
}
/**
 * Trust relationship between users
 */
export interface TrustRelationship {
    /**
     * User who trusts
     */
    trustor: string;
    /**
     * User being trusted
     */
    trustee: string;
    /**
     * Trust weight (0-1)
     */
    weight: number;
    /**
     * Relationship type
     */
    type: 'follow' | 'mutual' | 'verified' | 'expert';
    /**
     * When relationship was established
     */
    establishedAt: number;
    /**
     * Last interaction timestamp
     */
    lastInteraction: number;
}
/**
 * Reputation penalty record
 */
export interface ReputationPenalty {
    /**
     * User receiving penalty
     */
    userId: string;
    /**
     * Penalty type
     */
    type: 'spam' | 'abuse' | 'fake_content' | 'manipulation' | 'other';
    /**
     * Penalty severity
     */
    severity: 'minor' | 'moderate' | 'major' | 'severe';
    /**
     * Score reduction amount
     */
    scoreReduction: number;
    /**
     * Penalty duration (in seconds, 0 = permanent)
     */
    duration: number;
    /**
     * Reason for penalty
     */
    reason: string;
    /**
     * Who applied the penalty
     */
    appliedBy: 'system' | 'moderator' | 'community';
    /**
     * When penalty was applied
     */
    appliedAt: number;
    /**
     * When penalty expires (if duration > 0)
     */
    expiresAt?: number;
}
/**
 * Token transaction data format (used in reputation context)
 * Used when submitting token operations to blockchain adapters
 */
export interface TokenTransactionData {
    /**
     * Sender address
     */
    from: string;
    /**
     * Recipient address
     */
    to: string;
    /**
     * Amount to transfer
     */
    amount: number;
    /**
     * Type of token operation
     */
    tokenType: 'TOK' | 'REWARD';
    /**
     * Reason for the transaction
     */
    reason: string;
    /**
     * Transaction timestamp
     */
    timestamp: number;
    /**
     * Additional metadata
     */
    metadata?: Record<string, any>;
}
/**
 * Token transaction wrapper
 * Used for blockchain transaction submissions
 */
export interface TokenTransaction {
    id: string;
    data: TokenTransactionData;
    signature: string;
    blockHeight?: number;
}
/**
 * Recommendation transaction data format
 * Used when submitting recommendations to blockchain adapters
 */
export interface RecommendationTransactionData {
    /**
     * Author's user ID
     */
    authorId: string;
    /**
     * IPFS hash of the recommendation content
     */
    contentHash: string;
    /**
     * Recommendation category
     */
    category: string;
    /**
     * Location information (optional)
     */
    location?: {
        lat: number;
        lng: number;
        address?: string;
    };
    /**
     * Creation timestamp
     */
    timestamp: number;
    /**
     * Additional metadata
     */
    metadata?: Record<string, any>;
}
/**
 * Governance transaction data format
 * Used when submitting governance actions to blockchain adapters
 */
export interface GovernanceTransactionData {
    /**
     * Proposal ID (for voting/execution)
     */
    proposalId?: string;
    /**
     * Vote ID (for vote recording)
     */
    voteId?: string;
    /**
     * Type of governance action
     */
    action: 'propose' | 'vote' | 'execute';
    /**
     * Voting weight of the participant
     */
    voterWeight: number;
    /**
     * Action timestamp
     */
    timestamp: number;
    /**
     * Additional governance metadata
     */
    metadata?: Record<string, any>;
}
/**
 * Social action transaction data format
 * Used for social interactions like follows, upvotes, saves
 */
export interface SocialActionTransactionData {
    /**
     * User performing the action
     */
    userId: string;
    /**
     * Type of social action
     */
    action: 'upvote' | 'downvote' | 'save' | 'follow' | 'unfollow' | 'share';
    /**
     * Target of the action (recommendation ID, user ID, etc.)
     */
    targetId: string;
    /**
     * Type of target
     */
    targetType: 'recommendation' | 'user' | 'list';
    /**
     * Weight/influence of the action
     */
    weight: number;
    /**
     * Action timestamp
     */
    timestamp: number;
    /**
     * Additional action metadata
     */
    metadata?: Record<string, any>;
}
/**
 * Union type for all transaction data types
 */
export type TransactionData = ReputationTransactionData | TokenTransactionData | RecommendationTransactionData | GovernanceTransactionData | SocialActionTransactionData;
/**
 * Generic transaction wrapper
 */
export interface GenericTransaction<T = TransactionData> {
    id: string;
    type: string;
    data: T;
    signature: string;
    blockHeight?: number;
    timestamp: number;
    chainId?: string;
}
/**
 * Reputation adapter interface
 */
export interface ReputationAdapter {
    /**
     * Calculate reputation score
     */
    calculateReputation(userId: string, activity: UserActivity, social: SocialMetrics): Promise<ReputationScore>;
    /**
     * Update user reputation
     */
    updateReputation(userId: string, event: ReputationUpdateEvent): Promise<void>;
    /**
     * Get user reputation
     */
    getUserReputation(userId: string): Promise<UserReputation>;
    /**
     * Apply reputation penalty
     */
    applyPenalty(penalty: ReputationPenalty): Promise<void>;
    /**
     * Get trust relationships
     */
    getTrustRelationships(userId: string): Promise<TrustRelationship[]>;
}
/**
 * Helper function to format reputation data for chain submission
 * @param reputationData Original reputation data
 * @returns Formatted reputation data for chain transaction
 */
export declare function formatReputationForChain(reputationData: any): ReputationTransactionData;
/**
 * Helper function to format token transaction data
 * @param tokenData Original token data
 * @returns Formatted token data for chain transaction
 */
export declare function formatTokenDataForChain(tokenData: any): TokenTransactionData;
/**
 * Helper function to create social action transaction data
 * @param actionData Original action data
 * @returns Formatted social action data for chain transaction
 */
export declare function formatSocialActionForChain(actionData: any): SocialActionTransactionData;
/**
 * Calculate trust weight between users
 * @param trustor User doing the trusting
 * @param trustee User being trusted
 * @param socialDistance Social distance (1 = direct, 2 = friend-of-friend)
 * @returns Trust weight (0-1)
 */
export declare function calculateTrustWeight(trustor: UserReputation, trustee: UserReputation, socialDistance: number): number;
/**
 * Type guard to check if data is ReputationTransactionData
 */
export declare function isReputationTransactionData(data: any): data is ReputationTransactionData;
/**
 * Type guard to check if data is TokenTransactionData
 */
export declare function isTokenTransactionData(data: any): data is TokenTransactionData;
/**
 * Type guard for UserReputation
 */
export declare function isUserReputation(data: any): data is UserReputation;
