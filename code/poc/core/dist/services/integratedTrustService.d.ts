import { ReputationEngine } from '../reputation/engine';
export interface PersonalizedRecommendation {
    id: string;
    restaurant_id: string;
    author_id: string;
    title: string;
    content: string;
    category: string;
    trust_score: number;
    upvotes_count: number;
    saves_count: number;
    created_at: string;
    personal_trust_score?: number;
    trust_breakdown?: {
        socialTrustWeight: number;
        qualitySignals: number;
        recencyFactor: number;
        diversityBonus: number;
    };
    social_path?: Array<{
        userId: string;
        distance: number;
        contributionWeight: number;
    }>;
    trust_explanation?: string;
    author?: {
        id: string;
        username: string;
        display_name: string;
        avatar_url: string | null;
        reputation_score: number;
    };
    restaurant?: {
        id: string;
        name: string;
        category: string;
        city: string;
        average_trust_score: number;
    };
}
export interface TrustNetworkStats {
    userId: string;
    directConnections: number;
    secondDegreeConnections: number;
    totalNetworkSize: number;
    averageTrustWeight: number;
    networkDensity: number;
}
export declare class IntegratedTrustService {
    private trustCalculator;
    private reputationEngine;
    constructor();
    /**
     * Initialize with reputation engine (when available)
     */
    initialize(reputationEngine?: ReputationEngine): Promise<void>;
    /**
     * Get recommendations with personalized trust scores using your existing calculator
     */
    getPersonalizedRecommendations(userId: string, options?: {
        category?: string;
        city?: string;
        limit?: number;
        offset?: number;
        minTrustScore?: number;
        trustFeedOnly?: boolean;
    }): Promise<{
        recommendations: PersonalizedRecommendation[];
        total: number;
    }>;
    /**
     * Follow a user using your existing social service
     */
    followUser(followerId: string, followingId: string): Promise<{
        success: boolean;
        message: string;
    }>;
    /**
     * Unfollow a user
     */
    unfollowUser(followerId: string, followingId: string): Promise<{
        success: boolean;
        message: string;
    }>;
    /**
     * Get followers with trust context
     */
    getFollowersWithTrust(userId: string, page?: number, perPage?: number): Promise<FollowersResponse>;
    /**
     * Get following with trust context
     */
    getFollowingWithTrust(userId: string, page?: number, perPage?: number): Promise<FollowingResponse>;
    /**
     * Get user social stats using your existing service
     */
    getUserSocialStats(userId: string): Promise<any>;
    /**
     * Calculate trust score between users using your existing reputation engine
     */
    calculateTrustBetweenUsers(fromUserId: string, toUserId: string): Promise<{
        trustScore: number;
        socialDistance: number | null;
        explanation: string;
    }>;
    /**
     * Get trust network statistics for a user
     */
    getTrustNetworkStats(userId: string): Promise<TrustNetworkStats>;
    /**
     * Search users with your existing service
     */
    searchUsers(query: string, filters?: any, page?: number, perPage?: number): Promise<UserSearchResponse>;
    /**
     * Get follow suggestions using your existing service
     */
    getFollowSuggestions(userId: string, limit?: number): Promise<FollowSuggestionsResponse>;
    /**
     * Helper: Get social connections for trust calculation
     */
    private getSocialConnectionsForUser;
    /**
     * Helper: Get user interactions for trust calculation
     */
    private getUserInteractions;
    /**
     * Helper: Generate human-readable trust explanation
     */
    private generateTrustExplanation;
    /**
     * Helper: Check if user meets trust threshold using your calculator
     */
    meetsTrustThreshold(trustScore: number): boolean;
    /**
     * Helper: Get trust category for UI display using your calculator
     */
    getTrustCategory(trustScore: number): string;
    /**
     * Refresh social stats materialized view
     */
    refreshSocialStats(): Promise<void>;
}
export declare const integratedTrustService: IntegratedTrustService;
