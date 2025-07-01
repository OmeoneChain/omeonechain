/**
 * Adapter-specific reputation types for OmeoneChain
 *
 * This file provides adapter-specific types and utilities for working with
 * reputation data across different blockchain implementations.
 * Updated to include missing TypeScript exports
 */
/**
 * Reputation data format for chain transactions
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
 * Token transaction data format
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
 * Type guard to check if data is ReputationTransactionData
 */
export declare function isReputationTransactionData(data: any): data is ReputationTransactionData;
/**
 * Type guard to check if data is TokenTransactionData
 */
export declare function isTokenTransactionData(data: any): data is TokenTransactionData;
