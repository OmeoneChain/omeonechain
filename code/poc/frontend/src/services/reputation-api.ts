/**
 * reputation-api.ts - Reputation API Service Layer
 * 
 * Location: code/poc/frontend/src/services/reputation-api.ts
 * 
 * Centralized service for all reputation-related API calls
 */

// Types for API responses and requests
export interface UserReputation {
  userId: string;
  reputationScore: number;
  verificationLevel: 'basic' | 'verified' | 'expert';
  specializations: string[];
  activeSince: string;
  totalRecommendations: number;
  upvotesReceived: number;
  downvotesReceived: number;
  followers: number;
  following: number;
  tokenRewardsEarned: number;
  reputationHistory?: {
    weeklyCalculations: Array<{
      week: string;
      score: number;
      change: number;
    }>;
    lastCalculated: string;
    verificationCount: number;
    penaltyCount: number;
  };
  socialMetrics?: {
    networkDensity: number;
    avgTrustWeight: number;
    connectionQuality: string;
  };
}

export interface TrustScore {
  sourceId: string;
  targetId: string;
  trustScore: number;
  pathAnalysis: {
    directConnection: boolean;
    shortestPath: number;
    trustMultiplier: number;
  };
}

export interface FollowRelationship {
  followerId: string;
  followedId: string;
  timestamp: string;
  distance: number;
  trustWeight: number;
}

export interface RelationshipResult {
  relationships: FollowRelationship[];
  total: number;
  pagination: {
    offset: number;
    limit: number;
  };
}

export interface SocialGraphAnalytics {
  userId: string;
  networkSize: number;
  density: number;
  clusters: Array<{
    id: string;
    size: number;
    topic: string;
  }>;
  influenceScore: number;
  pathStrengths: Array<{
    targetId: string;
    strength: number;
    path: string[];
  }>;
  geographicDistribution: Array<{
    region: string;
    count: number;
    percentage: number;
  }>;
  interestClusters: Array<{
    category: string;
    strength: number;
    connections: number;
  }>;
}

export interface DiscoveryScore {
  userId: string;
  eligibilityScore: number;
  activeIncentives: ActiveIncentive[];
  potentialBonus: number;
  regionCoverage: number;
  categoryExpertise: number;
  recommendations: {
    eligible: number;
    needed: number;
  };
}

export interface ActiveIncentive {
  campaignId: string;
  title: string;
  description: string;
  bonusMultiplier: number;
  targetRecommendations: number;
  currentProgress: number;
  region: string;
  category: string;
  expiresAt: string;
  minTrustScore: number;
  bonusPool: number;
  participantCount: number;
}

export interface VerificationSubmission {
  evidence: string;
  category: string;
  timestamp: string;
}

export interface VerificationResult {
  verificationId: string;
  status: 'pending' | 'approved' | 'rejected';
  requiredVerifications: number;
  currentVerifications: number;
}

export interface UserVerifications {
  userId: string;
  currentLevel: 'basic' | 'verified' | 'expert';
  pending: Array<{
    verificationId: string;
    submittedAt: string;
    evidence: string;
    category: string;
    status: string;
  }>;
  completed: Array<{
    verificationId: string;
    completedAt: string;
    verifierId: string;
    category: string;
  }>;
  history: Array<{
    timestamp: string;
    action: string;
    level: string;
    verifierId?: string;
  }>;
  nextMilestone: {
    level: string;
    verificationsNeeded: number;
    currentCount: number;
  };
}

export interface ClaimBonusRequest {
  campaignId: string;
  recommendationIds: string[];
}

export interface ClaimBonusResult {
  success: boolean;
  bonusAmount: number;
  campaignId: string;
  transactionId: string;
  claimedRecommendations: string[];
}

// API Configuration
const API_BASE = process.env.REACT_APP_API_BASE || '/api/v1';

class ReputationAPIError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string
  ) {
    super(message);
    this.name = 'ReputationAPIError';
  }
}

// Helper function to get auth token
const getAuthToken = (): string | null => {
  return localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
};

// Helper function to make authenticated requests
const makeRequest = async <T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> => {
  const token = getAuthToken();
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
    let errorCode = `HTTP_${response.status}`;

    try {
      const errorData = await response.json();
      errorMessage = errorData.message || errorData.error || errorMessage;
      errorCode = errorData.code || errorCode;
    } catch {
      // If response is not JSON, use default message
    }

    throw new ReputationAPIError(errorMessage, response.status, errorCode);
  }

  try {
    return await response.json();
  } catch {
    // Handle empty responses
    return {} as T;
  }
};

// Main ReputationAPI class
export class ReputationAPI {
  /**
   * Get user reputation details
   */
  static async getUserReputation(userId: string): Promise<UserReputation> {
    return makeRequest<UserReputation>(`/users/${userId}/reputation`);
  }

  /**
   * Update user reputation/profile
   */
  static async updateUserProfile(
    userId: string,
    updates: {
      pseudonym?: string;
      specializations?: string[];
    }
  ): Promise<UserReputation> {
    return makeRequest<UserReputation>(`/users/${userId}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  /**
   * Calculate trust score between two users
   */
  static async getTrustScore(
    sourceId: string,
    targetId: string,
    maxDepth: number = 2
  ): Promise<TrustScore> {
    return makeRequest<TrustScore>(
      `/users/${sourceId}/trust/${targetId}?maxDepth=${maxDepth}`
    );
  }

  /**
   * Get social graph analytics for a user
   */
  static async getSocialGraphAnalytics(
    userId: string,
    depth: number = 2
  ): Promise<SocialGraphAnalytics> {
    return makeRequest<SocialGraphAnalytics>(
      `/users/${userId}/social-graph?depth=${depth}`
    );
  }

  /**
   * Follow a user
   */
  static async followUser(userId: string): Promise<FollowRelationship> {
    return makeRequest<FollowRelationship>(`/users/${userId}/follow`, {
      method: 'POST',
    });
  }

  /**
   * Unfollow a user
   */
  static async unfollowUser(userId: string): Promise<{ success: boolean; message: string }> {
    return makeRequest<{ success: boolean; message: string }>(`/users/${userId}/unfollow`, {
      method: 'POST',
    });
  }

  /**
   * Get users that the specified user is following
   */
  static async getFollowing(
    userId: string,
    pagination: { offset?: number; limit?: number } = {}
  ): Promise<RelationshipResult> {
    const params = new URLSearchParams();
    if (pagination.offset !== undefined) params.append('offset', pagination.offset.toString());
    if (pagination.limit !== undefined) params.append('limit', pagination.limit.toString());
    
    return makeRequest<RelationshipResult>(
      `/users/${userId}/following?${params.toString()}`
    );
  }

  /**
   * Get users following the specified user
   */
  static async getFollowers(
    userId: string,
    pagination: { offset?: number; limit?: number } = {}
  ): Promise<RelationshipResult> {
    const params = new URLSearchParams();
    if (pagination.offset !== undefined) params.append('offset', pagination.offset.toString());
    if (pagination.limit !== undefined) params.append('limit', pagination.limit.toString());
    
    return makeRequest<RelationshipResult>(
      `/users/${userId}/followers?${params.toString()}`
    );
  }

  /**
   * Get discovery incentive score and active campaigns
   */
  static async getDiscoveryScore(
    userId: string,
    filters: { region?: string; category?: string } = {}
  ): Promise<DiscoveryScore> {
    const params = new URLSearchParams();
    if (filters.region) params.append('region', filters.region);
    if (filters.category) params.append('category', filters.category);
    
    return makeRequest<DiscoveryScore>(
      `/users/${userId}/discovery-score?${params.toString()}`
    );
  }

  /**
   * Claim discovery incentive bonus
   */
  static async claimDiscoveryBonus(
    userId: string,
    claimData: ClaimBonusRequest
  ): Promise<ClaimBonusResult> {
    return makeRequest<ClaimBonusResult>(`/users/${userId}/claim-discovery-bonus`, {
      method: 'POST',
      body: JSON.stringify(claimData),
    });
  }

  /**
   * Submit community verification for a user
   */
  static async submitVerification(
    targetUserId: string,
    verification: VerificationSubmission
  ): Promise<VerificationResult> {
    return makeRequest<VerificationResult>(`/users/${targetUserId}/verify`, {
      method: 'POST',
      body: JSON.stringify(verification),
    });
  }

  /**
   * Get user's verification status and history
   */
  static async getUserVerifications(userId: string): Promise<UserVerifications> {
    return makeRequest<UserVerifications>(`/users/${userId}/verifications`);
  }

  /**
   * Get recommendation mode statistics (for Trust Mode toggle)
   */
  static async getRecommendationModeStats(): Promise<{
    trustRecommendations: number;
    globalRecommendations: number;
    averageTrustScore: number;
    socialConnections: number;
  }> {
    return makeRequest<{
      trustRecommendations: number;
      globalRecommendations: number;
      averageTrustScore: number;
      socialConnections: number;
    }>('/stats/recommendation-modes');
  }

  /**
   * Check if current user is following another user
   */
  static async isFollowing(currentUserId: string, targetUserId: string): Promise<boolean> {
    try {
      const following = await this.getFollowing(currentUserId, { limit: 1000 }); // Adjust based on your needs
      return following.relationships.some(rel => rel.followedId === targetUserId);
    } catch (error) {
      console.error('Error checking follow status:', error);
      return false;
    }
  }

  /**
   * Batch operations for efficiency
   */
  static async batchGetTrustScores(
    sourceId: string,
    targetIds: string[]
  ): Promise<Array<TrustScore | null>> {
    const promises = targetIds.map(async (targetId) => {
      try {
        return await this.getTrustScore(sourceId, targetId);
      } catch (error) {
        console.error(`Error getting trust score for ${targetId}:`, error);
        return null;
      }
    });

    return Promise.all(promises);
  }

  /**
   * Get user's network summary for quick display
   */
  static async getNetworkSummary(userId: string): Promise<{
    reputation: number;
    followers: number;
    following: number;
    verificationLevel: string;
    trustConnections: number;
  }> {
    try {
      const [reputation, socialGraph] = await Promise.all([
        this.getUserReputation(userId),
        this.getSocialGraphAnalytics(userId, 1),
      ]);

      return {
        reputation: reputation.reputationScore,
        followers: reputation.followers,
        following: reputation.following,
        verificationLevel: reputation.verificationLevel,
        trustConnections: socialGraph.networkSize,
      };
    } catch (error) {
      console.error('Error getting network summary:', error);
      throw error;
    }
  }

  /**
   * Search for users (if you want to add this endpoint later)
   */
  static async searchUsers(
    query: string,
    filters: {
      verificationLevel?: string;
      specialization?: string;
      minReputation?: number;
    } = {}
  ): Promise<Array<{
    userId: string;
    reputation: number;
    verificationLevel: string;
    specializations: string[];
    followers: number;
  }>> {
    const params = new URLSearchParams({ q: query });
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined) {
        params.append(key, value.toString());
      }
    });

    return makeRequest<Array<{
      userId: string;
      reputation: number;
      verificationLevel: string;
      specializations: string[];
      followers: number;
    }>>(`/users/search?${params.toString()}`);
  }
}

// Export error class for error handling in components
export { ReputationAPIError };

// Export default instance
export default ReputationAPI;