"use strict";
/**
 * Reputation Engine
 *
 * Core business logic for managing user reputation and trust scores
 * Based on Technical Specifications A.3.3
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReputationEngine = void 0;
const reputation_adapters_1 = require("../adapters/types/reputation-adapters");
const reputation_1 = require("../types/reputation");
const recommendation_1 = require("../types/recommendation");
/**
 * Default trust score parameters
 */
const DEFAULT_TRUST_PARAMS = {
    directFollowerWeight: 0.75,
    secondaryFollowerWeight: 0.25,
    maxTrustMultiplier: 3,
    minTrustThreshold: 0.25
};
/**
 * Default reputation engine options
 */
const DEFAULT_OPTIONS = {
    sybilResistance: true,
    trustScoreParams: DEFAULT_TRUST_PARAMS
};
/**
 * Implementation of the Reputation Engine
 * Handles reputation scoring, trust calculation, and follow relationships
 */
class ReputationEngine {
    /**
     * Create a new ReputationEngine instance
     *
     * @param adapter Chain adapter for blockchain interactions
     * @param options Engine options
     */
    constructor(adapter, options = {}) {
        this.chainId = null;
        this.adapter = adapter;
        this.options = { ...DEFAULT_OPTIONS, ...options };
        // Merge trust score params
        if (options.trustScoreParams) {
            this.options.trustScoreParams = {
                ...DEFAULT_TRUST_PARAMS,
                ...options.trustScoreParams
            };
        }
    }
    /**
     * Initialize the engine
     *
     * @returns Promise resolving when initialized
     */
    async initialize() {
        // Get chain ID from adapter or options
        this.chainId = this.options.chainId || await this.adapter.getWalletAddress();
    }
    /**
     * Create or update a user's reputation profile
     *
     * @param userId User's public key or identifier
     * @param updates Optional fields to update
     * @returns Updated reputation profile
     */
    async updateUserReputation(userId, updates = {}) {
        // Try to get existing profile
        let existingProfile = null;
        try {
            existingProfile = await this.getUserReputation(userId);
        }
        catch (error) {
            // Profile doesn't exist yet
        }
        const timestamp = new Date().toISOString();
        // Create new profile or update existing
        let profile;
        if (existingProfile) {
            profile = {
                ...existingProfile,
                // Only update fields that are provided
                ...(updates.totalRecommendations !== undefined && {
                    totalRecommendations: updates.totalRecommendations
                }),
                ...(updates.upvotesReceived !== undefined && {
                    upvotesReceived: updates.upvotesReceived
                }),
                ...(updates.downvotesReceived !== undefined && {
                    downvotesReceived: updates.downvotesReceived
                }),
                ...(updates.reputationScore !== undefined && {
                    reputationScore: updates.reputationScore
                }),
                ...(updates.verificationLevel !== undefined && {
                    verificationLevel: updates.verificationLevel
                }),
                ...(updates.specializations !== undefined && {
                    specializations: updates.specializations
                }),
                ...(updates.tokenRewardsEarned !== undefined && {
                    tokenRewardsEarned: updates.tokenRewardsEarned
                }),
                ...(updates.followers !== undefined && {
                    followers: updates.followers
                }),
                ...(updates.following !== undefined && {
                    following: updates.following
                })
            };
        }
        else {
            // Create new profile with defaults
            profile = {
                chainID: this.chainId || 'unknown',
                userId,
                totalRecommendations: updates.totalRecommendations || 0,
                upvotesReceived: updates.upvotesReceived || 0,
                downvotesReceived: updates.downvotesReceived || 0,
                reputationScore: updates.reputationScore || 0,
                verificationLevel: updates.verificationLevel || reputation_1.VerificationLevel.BASIC,
                specializations: updates.specializations || [],
                activeSince: updates.activeSince || timestamp,
                tokenRewardsEarned: updates.tokenRewardsEarned || 0,
                followers: updates.followers || 0,
                following: updates.following || 0
            };
        }
        // Updated transaction submission
        const txPayload = {
            type: 'reputation',
            action: existingProfile ? 'update' : 'create',
            requiresSignature: true,
            data: (0, reputation_adapters_1.formatReputationForChain)(profile)
        };
        // Submit transaction
        const txResult = await this.adapter.submitTransaction(txPayload);
        // Return complete reputation profile with ledger reference
        return {
            ...profile,
            ledger: {
                objectID: txResult.objectId || txResult.transactionId,
                commitNumber: txResult.commitNumber || 0
            }
        };
    }
    /**
     * Get a user's reputation profile
     *
     * @param userId User's public key or identifier
     * @returns User's reputation profile
     */
    async getUserReputation(userId) {
        try {
            const result = await this.adapter.queryState('reputation', userId);
            return result.data;
        }
        catch (error) {
            throw new Error(`User reputation not found: ${userId}`);
        }
    }
    /**
     * Query reputation profiles based on filter criteria
     *
     * @param filter Filter criteria
     * @returns Reputation profiles matching the filter
     */
    async queryReputations(filter) {
        // Query the blockchain for reputation profiles with updated interface
        const result = await this.adapter.queryObjects('reputation', {
            ...(filter.userId && { userId: filter.userId }),
            ...(filter.minReputationScore && { minReputationScore: filter.minReputationScore }),
            ...(filter.verificationLevel && { verificationLevel: filter.verificationLevel }),
            ...(filter.specialization && { specialization: filter.specialization })
        }, filter.pagination);
        // Transform results
        const reputations = result.map(state => state.data);
        const total = result.length;
        // Calculate pagination
        const pagination = filter.pagination ? {
            offset: filter.pagination.offset,
            limit: filter.pagination.limit,
            hasMore: filter.pagination.offset + reputations.length < total
        } : undefined;
        return {
            reputations,
            total,
            pagination
        };
    }
    /**
     * Create a follow relationship between users
     *
     * @param followerId User who is following
     * @param followedId User being followed
     * @returns Created relationship
     */
    async followUser(followerId, followedId) {
        // Check if the relationship already exists
        const existingRelationship = await this.getRelationship(followerId, followedId);
        if (existingRelationship) {
            throw new Error(`User ${followerId} is already following ${followedId}`);
        }
        // Create new relationship
        const timestamp = new Date().toISOString();
        const relationship = {
            followerId,
            followedId,
            timestamp,
            distance: 1,
            trustWeight: this.options.trustScoreParams?.directFollowerWeight || 0.75
        };
        // Updated transaction submission
        const txPayload = {
            type: 'reputation',
            action: 'follow',
            requiresSignature: true,
            data: relationship
        };
        await this.adapter.submitTransaction(txPayload);
        // Update follower counts
        await this.updateFollowerCounts(followerId, followedId, true);
        return relationship;
    }
    /**
     * Remove a follow relationship between users
     *
     * @param followerId User who is unfollowing
     * @param followedId User being unfollowed
     * @returns Success status
     */
    async unfollowUser(followerId, followedId) {
        // Check if the relationship exists
        const existingRelationship = await this.getRelationship(followerId, followedId);
        if (!existingRelationship) {
            throw new Error(`User ${followerId} is not following ${followedId}`);
        }
        // Updated transaction submission
        const txPayload = {
            type: 'reputation',
            action: 'unfollow',
            requiresSignature: true,
            data: {
                followerId,
                followedId
            }
        };
        const txResult = await this.adapter.submitTransaction(txPayload);
        // Update follower counts
        await this.updateFollowerCounts(followerId, followedId, false);
        return {
            success: true
        };
    }
    /**
     * Get a specific relationship between users
     *
     * @param followerId User who is following
     * @param followedId User being followed
     * @returns Relationship if it exists, null otherwise
     */
    async getRelationship(followerId, followedId) {
        try {
            // Query the blockchain for the relationship with the updated interface
            const result = await this.adapter.queryObjects('reputation_relationship', {
                followerId,
                followedId
            }, { limit: 1, offset: 0 });
            return result.length > 0 ? result[0].data : null;
        }
        catch (error) {
            return null;
        }
    }
    /**
     * Get all users that a given user is following
     *
     * @param userId User's public key or identifier
     * @param pagination Pagination parameters
     * @returns Users being followed
     */
    async getFollowing(userId, pagination = { offset: 0, limit: 50 }) {
        // Query the blockchain for relationships with updated interface
        const result = await this.adapter.queryObjects('reputation_relationship', {
            followerId: userId
        }, pagination);
        // Transform results
        const relationships = result.map(state => state.data);
        const total = result.length;
        return {
            relationships,
            total,
            pagination: {
                offset: pagination.offset,
                limit: pagination.limit,
                hasMore: pagination.offset + relationships.length < total
            }
        };
    }
    /**
     * Get all users following a given user
     *
     * @param userId User's public key or identifier
     * @param pagination Pagination parameters
     * @returns Followers
     */
    async getFollowers(userId, pagination = { offset: 0, limit: 50 }) {
        // Query the blockchain for relationships with updated interface
        const result = await this.adapter.queryObjects('reputation_relationship', {
            followedId: userId
        }, pagination);
        // Transform results
        const relationships = result.map(state => state.data);
        const total = result.length;
        return {
            relationships,
            total,
            pagination: {
                offset: pagination.offset,
                limit: pagination.limit,
                hasMore: pagination.offset + relationships.length < total
            }
        };
    }
    /**
     * Calculate the Trust Score between two users
     *
     * @param sourceId User ID calculating trust from
     * @param targetId User ID calculating trust to
     * @param maxDepth Maximum social graph depth to traverse (default: 2)
     * @returns Trust Score (0-1)
     */
    async calculateTrustScore(sourceId, targetId, maxDepth = 2) {
        // If users are the same, trust is 1
        if (sourceId === targetId) {
            return 1;
        }
        // First check direct relationship
        const directRelationship = await this.getRelationship(sourceId, targetId);
        if (directRelationship) {
            return this.options.trustScoreParams?.directFollowerWeight || 0.75;
        }
        // If maxDepth is 1, we're done
        if (maxDepth === 1) {
            return 0;
        }
        // Check second-degree connections
        const followingResult = await this.getFollowing(sourceId, { offset: 0, limit: 100 });
        // For each user that sourceId follows, check if they follow targetId
        let secondDegreeWeight = 0;
        let checked = 0;
        for (const relationship of followingResult.relationships) {
            if (checked >= 100)
                break; // Limit the number of checks for performance
            const intermediateToTarget = await this.getRelationship(relationship.followedId, targetId);
            if (intermediateToTarget) {
                secondDegreeWeight = Math.max(secondDegreeWeight, this.options.trustScoreParams?.secondaryFollowerWeight || 0.25);
            }
            checked++;
        }
        return secondDegreeWeight;
    }
    /**
     * Update a user's reputation based on an action
     *
     * @param action Recommendation action
     * @returns Updated reputation
     */
    async updateReputationFromAction(action) {
        // Get current reputation
        let reputation;
        try {
            reputation = await this.getUserReputation(action.userId);
        }
        catch (error) {
            // Create new reputation if it doesn't exist
            reputation = await this.updateUserReputation(action.userId);
        }
        // Update based on action type
        switch (action.type) {
            case recommendation_1.RecommendationActionType.CREATE:
                reputation.totalRecommendations += 1;
                break;
            case recommendation_1.RecommendationActionType.UPVOTE:
                // Nothing to update for the voter
                break;
            case recommendation_1.RecommendationActionType.DOWNVOTE:
                // Nothing to update for the voter
                break;
            default:
                // No reputation change for other actions
                break;
        }
        // Recalculate reputation score
        reputation.reputationScore = this.calculateReputationScore(reputation);
        // Update verification level if needed
        reputation.verificationLevel = this.determineVerificationLevel(reputation);
        // Submit updates
        return this.updateUserReputation(action.userId, reputation);
    }
    /**
     * Update reputation when a user receives votes
     *
     * @param authorId Author of the recommendation
     * @param isUpvote Whether the vote is an upvote
     * @returns Updated reputation
     */
    async updateReputationFromVotes(authorId, isUpvote) {
        // Get current reputation
        let reputation;
        try {
            reputation = await this.getUserReputation(authorId);
        }
        catch (error) {
            // Create new reputation if it doesn't exist
            reputation = await this.updateUserReputation(authorId);
        }
        // Update vote counts
        if (isUpvote) {
            reputation.upvotesReceived += 1;
        }
        else {
            reputation.downvotesReceived += 1;
        }
        // Recalculate reputation score
        reputation.reputationScore = this.calculateReputationScore(reputation);
        // Update verification level if needed
        reputation.verificationLevel = this.determineVerificationLevel(reputation);
        // Submit updates
        return this.updateUserReputation(authorId, reputation);
    }
    /**
     * Update follower counts for users
     *
     * @private
     * @param followerId User who is following/unfollowing
     * @param followedId User being followed/unfollowed
     * @param isFollow Whether this is a follow (true) or unfollow (false)
     */
    async updateFollowerCounts(followerId, followedId, isFollow) {
        // Get current reputations
        let followerRep;
        let followedRep;
        try {
            followerRep = await this.getUserReputation(followerId);
        }
        catch (error) {
            followerRep = await this.updateUserReputation(followerId);
        }
        try {
            followedRep = await this.getUserReputation(followedId);
        }
        catch (error) {
            followedRep = await this.updateUserReputation(followedId);
        }
        // Update counts
        const delta = isFollow ? 1 : -1;
        followerRep.following += delta;
        followedRep.followers += delta;
        // Submit updates
        await this.updateUserReputation(followerId, followerRep);
        await this.updateUserReputation(followedId, followedRep);
    }
    /**
     * Calculate the reputation score based on user activity
     *
     * @private
     * @param reputation User reputation data
     * @returns Calculated reputation score (0-1)
     */
    calculateReputationScore(reputation) {
        // Implement reputation scoring algorithm
        // This is a simplified version - can be expanded based on requirements
        // Constants for calculation
        const BASE_SCORE = 0.1; // Everyone starts with some reputation
        const MAX_SCORE = 1.0;
        // Factors
        const RECOMMENDATION_FACTOR = 0.01; // Each recommendation adds to score
        const UPVOTE_FACTOR = 0.005; // Each upvote adds to score
        const DOWNVOTE_FACTOR = 0.01; // Each downvote reduces score
        const FOLLOWER_FACTOR = 0.002; // Each follower adds to score
        // Calculate score components
        const recommendationsComponent = Math.min(0.3, reputation.totalRecommendations * RECOMMENDATION_FACTOR);
        const upvotesComponent = Math.min(0.4, reputation.upvotesReceived * UPVOTE_FACTOR);
        const downvotesComponent = Math.min(0.3, reputation.downvotesReceived * DOWNVOTE_FACTOR);
        const followersComponent = Math.min(0.2, reputation.followers * FOLLOWER_FACTOR);
        // Calculate total score
        let score = BASE_SCORE + recommendationsComponent + upvotesComponent - downvotesComponent + followersComponent;
        // Ensure score is within bounds
        score = Math.max(0, Math.min(MAX_SCORE, score));
        return parseFloat(score.toFixed(3)); // Round to 3 decimal places
    }
    /**
     * Determine the verification level based on reputation
     *
     * @private
     * @param reputation User reputation data
     * @returns Verification level
     */
    determineVerificationLevel(reputation) {
        // Threshold for verification levels
        const VERIFIED_THRESHOLD = 0.5;
        const EXPERT_THRESHOLD = 0.8;
        if (reputation.reputationScore >= EXPERT_THRESHOLD) {
            return reputation_1.VerificationLevel.EXPERT;
        }
        else if (reputation.reputationScore >= VERIFIED_THRESHOLD) {
            return reputation_1.VerificationLevel.VERIFIED;
        }
        else {
            return reputation_1.VerificationLevel.BASIC;
        }
    }
}
exports.ReputationEngine = ReputationEngine;
//# sourceMappingURL=engine.js.map