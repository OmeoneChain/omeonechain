// code/poc/frontend/src/services/api.ts
// UPDATED VERSION: Added attribution endpoint, removed all /v1/ prefixes

// FIXED: Use environment variables properly
const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://redesigned-lamp-q74wgggqq9jjfxqjp-3001.app.github.dev/api';
const WS_BASE_URL = process.env.REACT_APP_WS_URL || 'ws://localhost:3001';

// Log the URLs being used
console.log('🔗 DEBUG: Using environment URLs:', {
  API_BASE_URL,
  WS_BASE_URL,
  REACT_APP_API_URL: process.env.REACT_APP_API_URL,
  REACT_APP_WS_URL: process.env.REACT_APP_WS_URL,
  NODE_ENV: process.env.NODE_ENV
});

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// Enhanced Trust Score interfaces
interface TrustScore {
  score: number;
  socialDistance: number;
  breakdown: {
    directFriends: number;
    friendsOfFriends: number;
    totalEndorsements: number;
    baseScore: number;
    socialMultiplier: number;
  };
  endorsers: Array<{
    userId: string;
    weight: number;
    reputation: number;
    socialDistance: 1 | 2; // 1 = direct, 2 = friend-of-friend
  }>;
  timestamp: string;
}

interface RecommendationWithTrust {
  id: string;
  serviceId: string;
  userId: string;
  rating: number;
  content: string;
  tags?: string[];
  trustScore: TrustScore;
  socialContext: {
    isFromFollowedUser: boolean;
    socialPath?: string[];
    endorsementCount: number;
  };
  createdAt: string;
  updatedAt: string;
}

// NEW: Onboarding interfaces
export interface OnboardingProgress {
  userId: string;
  isComplete: boolean;
  totalEarned: number;
  displayTotalEarned: string;
  completionPercentage: number;
  milestones: {
    followUsers: OnboardingMilestone;
    createRecommendations: OnboardingMilestone;
    engageWithPosts: OnboardingMilestone;
  };
  nextStep: string | null;
}

export interface OnboardingMilestone {
  name: string;
  description: string;
  requirement: number;
  current: number;
  isComplete: boolean;
  reward: number;
  displayReward: string;
  icon: string;
}

// NEW: Attribution Rewards interfaces
export interface AttributionReward {
  id: string;
  recommendation_id: string;
  recommendation_title: string;
  resharer: {
    id: string;
    username: string;
    display_name: string;
  };
  bonus_boca: number;
  bonus_base_units: number;
  created_at: string;
}

export interface AttributionRewardsResponse {
  attributions: AttributionReward[];
  total_earned_boca: number;
  total_earned_base_units: number;
  total_count: number;
  pagination: {
    limit: number;
    offset: number;
    has_more: boolean;
  };
}

// Social API interfaces
export interface User {
  id: string;
  username: string;
  display_name: string;
  avatar_url?: string;
  bio?: string;
  reputation_score: number;
  trust_score?: number;
  followers_count: number;
  following_count: number;
  recommendations_count: number;
  avg_trust_score: number;
  verification_status: 'basic' | 'verified' | 'expert';
  verification_level: 'basic' | 'verified' | 'expert';
  is_following: boolean;
  is_own_profile?: boolean;
  location_city?: string;
  created_at: string;
}

export interface FollowersResponse {
  followers: User[];
  total_count: number;
  page: number;
  per_page: number;
}

export interface FollowingResponse {
  following: User[];
  total_count: number;
  page: number;
  per_page: number;
}

export interface DiscoverUsersResponse {
  users: User[];
  total_count: number;
}

// Base API client
class ApiClient {
  private baseUrl: string;
  private headers: Record<string, string>;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
    this.headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };
    
    // Log the base URL being used
    console.log('🚀 ApiClient initialized with URL:', this.baseUrl);
  }

  // FIXED: Add authentication headers
  private getAuthHeaders(): Record<string, string> {
    const token = localStorage.getItem('omeone_auth_token');
    const headers = { ...this.headers };
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    return headers;
  }

  private async request<T>(
    endpoint: string, 
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    // FIXED: Remove /api prefix since it's already in base URL
    const cleanEndpoint = endpoint.startsWith('/api') ? endpoint.substring(4) : endpoint;
    const fullUrl = `${this.baseUrl}${cleanEndpoint}`;
    
    // Log each request for debugging
    console.log(`📡 API Request: ${options.method || 'GET'} ${fullUrl}`);
    
    try {
      const response = await fetch(fullUrl, {
        ...options,
        headers: {
          ...this.getAuthHeaders(),
          ...options.headers,
        },
      });

      console.log(`📊 API Response: ${response.status} ${response.statusText}`);

      if (!response.ok) {
        // Try to get error details
        let errorMessage = `HTTP error! status: ${response.status}`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch {
          // If response isn't JSON, use the status text
          errorMessage = response.statusText || errorMessage;
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();
      console.log('✅ API Success:', data);
      
      return data;
    } catch (error) {
      console.error('❌ API request failed:', {
        url: fullUrl,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async get<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  async post<T>(endpoint: string, data: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async put<T>(endpoint: string, data: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async patch<T>(endpoint: string, data: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async delete<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }
}

// Initialize API client
const apiClient = new ApiClient();

// ========== AUTH API ==========

export const authApi = {
  async getChallenge(walletAddress: string): Promise<ApiResponse<{ challenge: string; message: string }>> {
    console.log('🔐 Getting auth challenge for:', walletAddress);
    return apiClient.post('/auth/challenge', {
      walletAddress: walletAddress
    });
  },

  async verifySignature(walletAddress: string, signature: string, challenge: string): Promise<ApiResponse<{ token: string; user: any }>> {
    console.log('🔐 Verifying signature for:', walletAddress);
    return apiClient.post('/auth/login', {
      walletAddress,
      signature,
      challenge
    });
  },

  async getCurrentUser(): Promise<any> {
    const response = await apiClient.get('/auth/me');
    return response.data || response; // Handle both ApiResponse<T> and direct data
  },

  async updateProfile(profileData: any): Promise<ApiResponse<any>> {
    return apiClient.patch('/auth/profile', profileData);
  }
};

// ========== ONBOARDING API ==========

export const onboardingApi = {
  /**
   * Get user's onboarding progress
   */
  async getProgress(userId: string): Promise<OnboardingProgress> {
    console.log(`📊 Getting onboarding progress for user: ${userId}`);
    const response = await apiClient.get(`/onboarding/progress/${userId}`);
    
    if (response.data) {
      return response.data;
    }
    return response as OnboardingProgress;
  },

  /**
   * Complete follow milestone
   */
  async completeFollowMilestone(userId: string): Promise<ApiResponse<any>> {
    console.log(`👥 Completing follow milestone for user: ${userId}`);
    return apiClient.post(`/onboarding/milestones/follow`, { userId });
  },

  /**
   * Complete recommendation milestone
   */
  async completeRecommendationMilestone(userId: string): Promise<ApiResponse<any>> {
    console.log(`📝 Completing recommendation milestone for user: ${userId}`);
    return apiClient.post(`/onboarding/milestones/recommendations`, { userId });
  },

  /**
   * Complete engagement milestone
   */
  async completeEngagementMilestone(userId: string): Promise<ApiResponse<any>> {
    console.log(`💬 Completing engagement milestone for user: ${userId}`);
    return apiClient.post(`/onboarding/milestones/engagement`, { userId });
  },

  /**
   * Track onboarding action
   */
  async trackAction(
    userId: string,
    action: 'follow' | 'recommendation' | 'engagement',
    details?: any
  ): Promise<ApiResponse<any>> {
    return apiClient.post(`/onboarding/track`, {
      userId,
      action,
      details
    });
  }
};

// ========== SOCIAL API ==========

export const socialApi = {
  
  // Search users by name/username
  async searchUsers(
    query: string, 
    city?: string, 
    limit: number = 20
  ): Promise<DiscoverUsersResponse> {
    console.log(`🔍 Searching users: "${query}", city: ${city}, limit: ${limit}`);
  
    const params = new URLSearchParams();
    params.append('q', query);
    params.append('limit', limit.toString());
    if (city) {
      params.append('city', city);
    }

    const response = await apiClient.get(`/social/users/search?${params}`);
  
    if (response.data) {
      return response.data;
    }
    return response as DiscoverUsersResponse;
  },
  
  // Get user's followers
  async getFollowers(userId: string, page: number = 1, perPage: number = 20): Promise<FollowersResponse> {
    console.log(`📱 Getting followers for user: ${userId}, page: ${page}`);
    const response = await apiClient.get(`/social/users/${userId}/followers?page=${page}&per_page=${perPage}`);
    
    // Handle both direct response and ApiResponse wrapper
    if (response.data) {
      return response.data;
    }
    return response as FollowersResponse;
  },

  // Get users that this user is following
  async getFollowing(userId: string, page: number = 1, perPage: number = 20): Promise<FollowingResponse> {
    console.log(`📱 Getting following for user: ${userId}, page: ${page}`);
    const response = await apiClient.get(`/social/users/${userId}/following?page=${page}&per_page=${perPage}`);
    
    // Handle both direct response and ApiResponse wrapper
    if (response.data) {
      return response.data;
    }
    return response as FollowingResponse;
  },

  // Follow a user
  async followUser(userId: string): Promise<{ success: boolean; message: string }> {
    console.log(`👤 Following user: ${userId}`);
    const response = await apiClient.post(`/social/users/${userId}/follow`, {});
    
    if (response.error) {
      throw new Error(response.error);
    }
    
    return response.data || response;
  },

  // Unfollow a user
  async unfollowUser(userId: string): Promise<{ success: boolean; message: string }> {
    console.log(`👤 Unfollowing user: ${userId}`);
    const response = await apiClient.delete(`/social/users/${userId}/follow`);
    
    if (response.error) {
      throw new Error(response.error);
    }
    
    return response.data || response;
  },

  // Get user profile with follow status
  async getUserProfile(userId: string): Promise<User> {
    console.log(`👤 Getting profile for user: ${userId}`);
    const response = await apiClient.get(`/social/users/${userId}/profile`);
    
    if (response.error) {
      throw new Error(response.error);
    }
    
    return response.data || response;
  },

  // Discover users
  async discoverUsers(
    limit: number = 10, 
    city?: string,
    sortBy: string = 'followers_count'
  ): Promise<DiscoverUsersResponse> {
    console.log(`🔍 Discovering users, limit: ${limit}, city: ${city}, sortBy: ${sortBy}`);
    const params = new URLSearchParams();
    params.append('limit', limit.toString());
    params.append('sortBy', sortBy);
    if (city) {
      params.append('city', city);
    }

    const response = await apiClient.get(`/social/users/discover?${params}`);
  
    if (response.data) {
      return response.data;
    }
    return response as DiscoverUsersResponse;
  },

  // Check follow status
  async getFollowStatus(userId: string): Promise<{ is_following: boolean; is_followed_by: boolean; relationship_type: string }> {
    console.log(`🔍 Checking follow status for user: ${userId}`);
    const response = await apiClient.get(`/social/follow/status/${userId}`);
    
    return response.data || response;
  },

  // Get social stats
  async getSocialStats(userId: string): Promise<any> {
    console.log(`📊 Getting social stats for user: ${userId}`);
    const response = await apiClient.get(`/social/users/${userId}/stats`);
    
    return response.data || response;
  }
};

// ========== RECOMMENDATION API ==========

export const recommendationApi = {
  async getRecommendations(params?: {
    category?: string;
    location?: string;
    limit?: number;
    includeTrustScore?: boolean;
  }): Promise<ApiResponse<RecommendationWithTrust[]>> {
    const queryParams = new URLSearchParams();
    if (params?.category) queryParams.append('category', params.category);
    if (params?.location) queryParams.append('location', params.location);
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.includeTrustScore) queryParams.append('includeTrustScore', 'true');
    
    const endpoint = `/recommendations${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    return apiClient.get(endpoint);
  },

  async getRecommendation(id: string, includeTrustScore: boolean = true): Promise<ApiResponse<RecommendationWithTrust>> {
    const params = includeTrustScore ? '?includeTrustScore=true' : '';
    return apiClient.get(`/recommendations/${id}${params}`);
  },

  async createRecommendation(recommendation: {
    serviceId: string;
    rating: number;
    content: string;
    tags?: string[];
  }): Promise<ApiResponse<RecommendationWithTrust>> {
    return apiClient.post('/recommendations', recommendation);
  },

  async upvoteRecommendation(id: string): Promise<ApiResponse<{ success: boolean; newTrustScore?: number }>> {
    return apiClient.post(`/recommendations/${id}/upvote`, {});
  },

  async saveRecommendation(id: string): Promise<ApiResponse<{ success: boolean; newTrustScore?: number }>> {
    return apiClient.post(`/recommendations/${id}/save`, {});
  },

  // Mark comment as helpful
  async markCommentHelpful(
    commentId: string,
    recommendationId: string
  ): Promise<ApiResponse<{ success: boolean; bonusAwarded: number }>> {
    console.log(`⭐ Marking comment ${commentId} as helpful`);
    return apiClient.post(`/recommendations/${recommendationId}/comments/${commentId}/helpful`, {});
  },

  // Boost recommendation
  async boostRecommendation(
    recommendationId: string
  ): Promise<ApiResponse<{ success: boolean; reward: number }>> {
    console.log(`🚀 Boosting recommendation ${recommendationId}`);
    return apiClient.post(`/recommendations/${recommendationId}/boost`, {});
  },

  // Reshare recommendation
  async reshareRecommendation(
    recommendationId: string
  ): Promise<ApiResponse<{ 
    success: boolean; 
    resharerReward: number;
    attributionBonus: number;
  }>> {
    console.log(`🔄 Resharing recommendation ${recommendationId}`);
    return apiClient.post(`/recommendations/${recommendationId}/reshare`, {});
  },

  // NEW: Get attribution rewards for a user
  async getAttributionRewards(
    userId: string, 
    limit: number = 20, 
    offset: number = 0
  ): Promise<AttributionRewardsResponse> {
    console.log(`💰 Getting attribution rewards for user: ${userId}`);
    const response = await apiClient.get(
      `/recommendations/attribution/${userId}?limit=${limit}&offset=${offset}`
    );
    
    // Handle both direct response and ApiResponse wrapper
    if (response.data) {
      return response.data as AttributionRewardsResponse;
    }
    
    // Backend returns data directly (not wrapped in ApiResponse)
    return response as AttributionRewardsResponse;
  }
};

// ========== USER API ==========

export const userApi = {
  async getCurrentUser() {
    return apiClient.get('/auth/me');
  },

  async getTrustScore(userId: string) {
    return apiClient.get(`/users/${userId}/trust-score`);
  },

  async getSocialGraph(userId: string): Promise<ApiResponse<{
    followers: string[];
    following: string[];
    mutualConnections: string[];
    socialDistance: Record<string, number>;
  }>> {
    return apiClient.get(`/users/${userId}/social-graph`);
  },

  async followUser(userId: string): Promise<ApiResponse<{ success: boolean }>> {
    return apiClient.post(`/follow`, {
      following_id: userId
    });
  },

  async unfollowUser(userId: string): Promise<ApiResponse<{ success: boolean }>> {
    return apiClient.delete(`/follow/${userId}`);
  }
};

// Enhanced Health check
export const healthApi = {
  async check() {
    try {
      const healthUrl = API_BASE_URL.replace('/api', '') + '/health';
      console.log('🏥 Health check URL:', healthUrl);
      
      const response = await fetch(healthUrl);
      const result = await response.json();
      console.log('🏥 Health check result:', result);
      return result;
    } catch (error) {
      console.error('❌ Health check failed:', error);
      return { status: 'unhealthy', error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }
};

export default apiClient;