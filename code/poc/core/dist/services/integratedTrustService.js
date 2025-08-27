"use strict";
// File: code/poc/core/src/services/integratedTrustService.ts
// Integration service combining your existing TrustScoreCalculator, ReputationEngine, and SocialService
Object.defineProperty(exports, "__esModule", { value: true });
exports.integratedTrustService = exports.IntegratedTrustService = void 0;
const trust_score_calculator_1 = require("../reputation/trust-score-calculator");
const social_service_1 = require("./social-service");
const supabase_js_1 = require("@supabase/supabase-js");
// Configuration
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabase = (0, supabase_js_1.createClient)(supabaseUrl, supabaseKey);
class IntegratedTrustService {
    constructor() {
        this.reputationEngine = null;
        this.trustCalculator = new trust_score_calculator_1.TrustScoreCalculator();
    }
    /**
     * Initialize with reputation engine (when available)
     */
    async initialize(reputationEngine) {
        this.reputationEngine = reputationEngine || null;
    }
    /**
     * Get recommendations with personalized trust scores using your existing calculator
     */
    async getPersonalizedRecommendations(userId, options = {}) {
        try {
            const { category, city, limit = 20, offset = 0, minTrustScore = 0, trustFeedOnly = false } = options;
            // Get base recommendations from Supabase
            let query = supabase
                .from('recommendations')
                .select(`
          id,
          restaurant_id,
          author_id,
          title,
          content,
          category,
          trust_score,
          upvotes_count,
          saves_count,
          created_at,
          author:author_id (
            id,
            username,
            display_name,
            avatar_url,
            reputation_score
          ),
          restaurant:restaurant_id (
            id,
            name,
            category,
            city,
            average_trust_score
          )
        `)
                .eq('is_archived', false)
                .order('created_at', { ascending: false });
            // Apply filters
            if (category) {
                query = query.eq('category', category);
            }
            if (city) {
                query = query.eq('restaurant.city', city);
            }
            // If trust feed only, get social connections first
            if (trustFeedOnly && userId) {
                const { following } = await social_service_1.socialService.getFollowing(userId, 1, 1000);
                const followingIds = following.map(f => f.user.id);
                if (followingIds.length > 0) {
                    query = query.in('author_id', followingIds);
                }
                else {
                    // No following, return empty
                    return { recommendations: [], total: 0 };
                }
            }
            const { data: recommendations, error, count } = await query
                .range(offset, offset + limit - 1);
            if (error || !recommendations) {
                console.error('Get recommendations error:', error);
                return { recommendations: [], total: 0 };
            }
            // Get social connections for trust calculation
            const socialConnections = await this.getSocialConnectionsForUser(userId);
            // Calculate personalized trust scores using your existing calculator
            const personalizedRecommendations = [];
            for (const rec of recommendations) {
                const trustScoreInput = {
                    targetContentId: rec.id,
                    evaluatingUserId: userId,
                    socialConnections,
                    userInteractions: await this.getUserInteractions(userId, rec.id),
                    contentMetadata: {
                        contentId: rec.id,
                        authorId: rec.author_id,
                        createdAt: new Date(rec.created_at),
                        category: rec.category,
                        tags: [] // Could be extracted from content
                    }
                };
                const trustResult = this.trustCalculator.calculateTrustScore(trustScoreInput);
                // Apply minimum trust threshold
                if (trustResult.finalScore >= minTrustScore) {
                    personalizedRecommendations.push({
                        ...rec,
                        personal_trust_score: trustResult.finalScore,
                        trust_breakdown: trustResult.breakdown,
                        social_path: trustResult.socialPath,
                        trust_explanation: this.generateTrustExplanation(trustResult)
                    });
                }
            }
            // Sort by personal trust score (highest first)
            personalizedRecommendations.sort((a, b) => (b.personal_trust_score || 0) - (a.personal_trust_score || 0));
            return {
                recommendations: personalizedRecommendations,
                total: count || 0
            };
        }
        catch (error) {
            console.error('Get personalized recommendations error:', error);
            return { recommendations: [], total: 0 };
        }
    }
    /**
     * Follow a user using your existing social service
     */
    async followUser(followerId, followingId) {
        try {
            const result = await social_service_1.socialService.followUser(followerId, followingId);
            // Update reputation engine if available
            if (this.reputationEngine && result.success) {
                try {
                    await this.reputationEngine.followUser(followerId, followingId);
                }
                catch (repError) {
                    console.warn('Reputation engine follow update failed:', repError);
                    // Don't fail the whole operation
                }
            }
            return result;
        }
        catch (error) {
            console.error('Follow user error:', error);
            return { success: false, message: 'Failed to follow user' };
        }
    }
    /**
     * Unfollow a user
     */
    async unfollowUser(followerId, followingId) {
        try {
            const result = await social_service_1.socialService.unfollowUser(followerId, followingId);
            // Update reputation engine if available
            if (this.reputationEngine && result.success) {
                try {
                    await this.reputationEngine.unfollowUser(followerId, followingId);
                }
                catch (repError) {
                    console.warn('Reputation engine unfollow update failed:', repError);
                    // Don't fail the whole operation
                }
            }
            return result;
        }
        catch (error) {
            console.error('Unfollow user error:', error);
            return { success: false, message: 'Failed to unfollow user' };
        }
    }
    /**
     * Get followers with trust context
     */
    async getFollowersWithTrust(userId, page = 1, perPage = 20) {
        return social_service_1.socialService.getFollowers(userId, page, perPage);
    }
    /**
     * Get following with trust context
     */
    async getFollowingWithTrust(userId, page = 1, perPage = 20) {
        return social_service_1.socialService.getFollowing(userId, page, perPage);
    }
    /**
     * Get user social stats using your existing service
     */
    async getUserSocialStats(userId) {
        try {
            return await social_service_1.socialService.getSocialStats(userId);
        }
        catch (error) {
            console.error('Get user social stats error:', error);
            return {
                followers_count: 0,
                following_count: 0,
                mutual_follows_count: 0,
                recommendations_count: 0,
                avg_trust_score: 0
            };
        }
    }
    /**
     * Calculate trust score between users using your existing reputation engine
     */
    async calculateTrustBetweenUsers(fromUserId, toUserId) {
        try {
            if (this.reputationEngine) {
                const trustScore = await this.reputationEngine.calculateTrustScore(fromUserId, toUserId);
                // Get social distance from reputation engine
                const relationship = await this.reputationEngine.getRelationship(fromUserId, toUserId);
                const socialDistance = relationship ? relationship.distance : null;
                let explanation = 'No connection';
                if (socialDistance === 1) {
                    explanation = 'Direct connection (following)';
                }
                else if (socialDistance === 2) {
                    explanation = 'Friend of friend';
                }
                return {
                    trustScore,
                    socialDistance,
                    explanation
                };
            }
            else {
                // Fallback to Supabase-based calculation
                const isFollowing = await social_service_1.socialService.isFollowing(fromUserId, toUserId);
                return {
                    trustScore: isFollowing ? 0.75 : 0,
                    socialDistance: isFollowing ? 1 : null,
                    explanation: isFollowing ? 'Direct connection (following)' : 'No connection'
                };
            }
        }
        catch (error) {
            console.error('Calculate trust between users error:', error);
            return {
                trustScore: 0,
                socialDistance: null,
                explanation: 'Error calculating trust'
            };
        }
    }
    /**
     * Get trust network statistics for a user
     */
    async getTrustNetworkStats(userId) {
        try {
            const [followersRes, followingRes] = await Promise.all([
                social_service_1.socialService.getFollowers(userId, 1, 1000),
                social_service_1.socialService.getFollowing(userId, 1, 1000)
            ]);
            // Calculate second-degree connections
            let secondDegreeCount = 0;
            const secondDegreeUsers = new Set();
            for (const following of followingRes.following) {
                const theirFollowing = await social_service_1.socialService.getFollowing(following.user.id, 1, 100);
                for (const secondDegree of theirFollowing.following) {
                    if (secondDegree.user.id !== userId && !followingRes.following.some(f => f.user.id === secondDegree.user.id)) {
                        secondDegreeUsers.add(secondDegree.user.id);
                    }
                }
            }
            secondDegreeCount = secondDegreeUsers.size;
            // Calculate average trust weight (using default weights for now)
            const totalConnections = followingRes.following.length;
            const averageTrustWeight = totalConnections > 0 ? 0.75 : 0; // Default direct follow weight
            // Calculate network density (connections / possible connections)
            const totalUsers = followersRes.total_count + followingRes.total_count;
            const networkDensity = totalUsers > 1 ? (totalConnections / totalUsers) : 0;
            return {
                userId,
                directConnections: followingRes.total_count,
                secondDegreeConnections: secondDegreeCount,
                totalNetworkSize: followingRes.total_count + secondDegreeCount,
                averageTrustWeight,
                networkDensity
            };
        }
        catch (error) {
            console.error('Get trust network stats error:', error);
            return {
                userId,
                directConnections: 0,
                secondDegreeConnections: 0,
                totalNetworkSize: 0,
                averageTrustWeight: 0,
                networkDensity: 0
            };
        }
    }
    /**
     * Search users with your existing service
     */
    async searchUsers(query, filters = {}, page = 1, perPage = 20) {
        return social_service_1.socialService.searchUsers({
            query,
            ...filters
        }, page, perPage);
    }
    /**
     * Get follow suggestions using your existing service
     */
    async getFollowSuggestions(userId, limit = 10) {
        return social_service_1.socialService.getFollowSuggestions(userId, limit);
    }
    /**
     * Helper: Get social connections for trust calculation
     */
    async getSocialConnectionsForUser(userId) {
        try {
            const { following } = await social_service_1.socialService.getFollowing(userId, 1, 1000);
            return following.map(f => ({
                fromUserId: userId,
                toUserId: f.user.id,
                connectionType: 'follow',
                establishedAt: new Date(f.connected_since),
                trustWeight: 0.75 // Default weight, could be made configurable
            }));
        }
        catch (error) {
            console.error('Get social connections error:', error);
            return [];
        }
    }
    /**
     * Helper: Get user interactions for trust calculation
     */
    async getUserInteractions(userId, contentId) {
        try {
            // Get upvotes and saves for this content
            const [upvotes, saves] = await Promise.all([
                supabase
                    .from('upvotes')
                    .select('user_id, created_at, social_distance, trust_weight')
                    .eq('recommendation_id', contentId),
                supabase
                    .from('saves')
                    .select('user_id, created_at, social_distance, trust_weight')
                    .eq('recommendation_id', contentId)
            ]);
            const interactions = [];
            // Add upvotes
            if (upvotes.data) {
                for (const upvote of upvotes.data) {
                    interactions.push({
                        userId: upvote.user_id,
                        contentId,
                        interactionType: 'upvote',
                        timestamp: new Date(upvote.created_at),
                        socialDistance: upvote.social_distance || 0
                    });
                }
            }
            // Add saves
            if (saves.data) {
                for (const save of saves.data) {
                    interactions.push({
                        userId: save.user_id,
                        contentId,
                        interactionType: 'save',
                        timestamp: new Date(save.created_at),
                        socialDistance: save.social_distance || 0
                    });
                }
            }
            return interactions;
        }
        catch (error) {
            console.error('Get user interactions error:', error);
            return [];
        }
    }
    /**
     * Helper: Generate human-readable trust explanation
     */
    generateTrustExplanation(trustResult) {
        const { finalScore, breakdown, socialPath } = trustResult;
        if (finalScore === 0)
            return 'No social connection found';
        const parts = [];
        if (breakdown.socialTrustWeight > 0) {
            if (socialPath.length === 1) {
                parts.push('Direct connection');
            }
            else if (socialPath.length === 2) {
                parts.push('Friend of friend');
            }
            else {
                parts.push(`${socialPath.length - 1} degrees of separation`);
            }
        }
        if (breakdown.qualitySignals > 0) {
            parts.push('Quality signals from network');
        }
        if (breakdown.recencyFactor > 0.5) {
            parts.push('Recent activity');
        }
        if (breakdown.diversityBonus > 0) {
            parts.push('Diverse endorsements');
        }
        return parts.length > 0 ? parts.join(', ') : 'Based on network activity';
    }
    /**
     * Helper: Check if user meets trust threshold using your calculator
     */
    meetsTrustThreshold(trustScore) {
        return this.trustCalculator.meetsTrustThreshold(trustScore);
    }
    /**
     * Helper: Get trust category for UI display using your calculator
     */
    getTrustCategory(trustScore) {
        return this.trustCalculator.getTrustCategory(trustScore);
    }
    /**
     * Refresh social stats materialized view
     */
    async refreshSocialStats() {
        try {
            await social_service_1.socialService.refreshSocialStats();
        }
        catch (error) {
            console.error('Refresh social stats error:', error);
        }
    }
}
exports.IntegratedTrustService = IntegratedTrustService;
// Export singleton instance
exports.integratedTrustService = new IntegratedTrustService();
//# sourceMappingURL=integratedTrustService.js.map