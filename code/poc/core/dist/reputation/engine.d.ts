/**
 * Reputation Engine
 *
 * Core business logic for managing user reputation and trust scores
 * Based on Technical Specifications A.3.3
 */
import { ChainAdapter } from '../type/chain';
import { UserReputation, ReputationFilter, UserRelationship, TrustScoreParams } from '../type/reputation';
import { RecommendationAction } from '../type/recommendation';
/**
 * Options for the reputation engine
 */
export interface ReputationEngineOptions {
    /**
     * Chain ID
     */
    chainId?: string;
    /**
     * Trust score parameters
     */
    trustScoreParams?: TrustScoreParams;
    /**
     * Enable Sybil resistance
     */
    sybilResistance?: boolean;
    /**
     * Sponsor wallet for fee payments
     */
    sponsorWallet?: string;
}
/**
 * Implementation of the Reputation Engine
 * Handles reputation scoring, trust calculation, and follow relationships
 */
export declare class ReputationEngine {
    private adapter;
    private options;
    private chainId;
    /**
     * Create a new ReputationEngine instance
     *
     * @param adapter Chain adapter for blockchain interactions
     * @param options Engine options
     */
    constructor(adapter: ChainAdapter, options?: ReputationEngineOptions);
    /**
     * Initialize the engine
     *
     * @returns Promise resolving when initialized
     */
    initialize(): Promise<void>;
    /**
     * Create or update a user's reputation profile
     *
     * @param userId User's public key or identifier
     * @param updates Optional fields to update
     * @returns Updated reputation profile
     */
    updateUserReputation(userId: string, updates?: Partial<Omit<UserReputation, 'userId' | 'chainID' | 'ledger'>>): Promise<UserReputation>;
    /**
     * Get a user's reputation profile
     *
     * @param userId User's public key or identifier
     * @returns User's reputation profile
     */
    getUserReputation(userId: string): Promise<UserReputation>;
    /**
     * Query reputation profiles based on filter criteria
     *
     * @param filter Filter criteria
     * @returns Reputation profiles matching the filter
     */
    queryReputations(filter: ReputationFilter): Promise<{
        reputations: UserReputation[];
        total: number;
        pagination?: {
            offset: number;
            limit: number;
            hasMore: boolean;
        };
    }>;
    /**
     * Create a follow relationship between users
     *
     * @param followerId User who is following
     * @param followedId User being followed
     * @returns Created relationship
     */
    followUser(followerId: string, followedId: string): Promise<UserRelationship>;
    /**
     * Remove a follow relationship between users
     *
     * @param followerId User who is unfollowing
     * @param followedId User being unfollowed
     * @returns Success status
     */
    unfollowUser(followerId: string, followedId: string): Promise<{
        success: boolean;
    }>;
    /**
     * Get a specific relationship between users
     *
     * @param followerId User who is following
     * @param followedId User being followed
     * @returns Relationship if it exists, null otherwise
     */
    getRelationship(followerId: string, followedId: string): Promise<UserRelationship | null>;
    /**
     * Get all users that a given user is following
     *
     * @param userId User's public key or identifier
     * @param pagination Pagination parameters
     * @returns Users being followed
     */
    getFollowing(userId: string, pagination?: {
        offset: number;
        limit: number;
    }): Promise<{
        relationships: UserRelationship[];
        total: number;
        pagination: {
            offset: number;
            limit: number;
            hasMore: boolean;
        };
    }>;
    /**
     * Get all users following a given user
     *
     * @param userId User's public key or identifier
     * @param pagination Pagination parameters
     * @returns Followers
     */
    getFollowers(userId: string, pagination?: {
        offset: number;
        limit: number;
    }): Promise<{
        relationships: UserRelationship[];
        total: number;
        pagination: {
            offset: number;
            limit: number;
            hasMore: boolean;
        };
    }>;
    /**
     * Calculate the Trust Score between two users
     *
     * @param sourceId User ID calculating trust from
     * @param targetId User ID calculating trust to
     * @param maxDepth Maximum social graph depth to traverse (default: 2)
     * @returns Trust Score (0-1)
     */
    calculateTrustScore(sourceId: string, targetId: string, maxDepth?: number): Promise<number>;
    /**
     * Update a user's reputation based on an action
     *
     * @param action Recommendation action
     * @returns Updated reputation
     */
    updateReputationFromAction(action: RecommendationAction): Promise<UserReputation>;
    /**
     * Update reputation when a user receives votes
     *
     * @param authorId Author of the recommendation
     * @param isUpvote Whether the vote is an upvote
     * @returns Updated reputation
     */
    updateReputationFromVotes(authorId: string, isUpvote: boolean): Promise<UserReputation>;
    /**
     * Update follower counts for users
     *
     * @private
     * @param followerId User who is following/unfollowing
     * @param followedId User being followed/unfollowed
     * @param isFollow Whether this is a follow (true) or unfollow (false)
     */
    private updateFollowerCounts;
    /**
     * Calculate the reputation score based on user activity
     *
     * @private
     * @param reputation User reputation data
     * @returns Calculated reputation score (0-1)
     */
    private calculateReputationScore;
    /**
     * Determine the verification level based on reputation
     *
     * @private
     * @param reputation User reputation data
     * @returns Verification level
     */
    private determineVerificationLevel;
}
