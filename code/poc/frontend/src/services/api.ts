// code/poc/frontend/src/services/api.ts
// ENHANCED VERSION: Added social API functions to existing client

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

// NEW: Social API interfaces
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

// AUTH API - FIXED: Removed /v1/ prefix to match working backend routes
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

// NEW: Social API functions
export const socialApi = {
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
  async discoverUsers(limit: number = 10, city?: string): Promise<DiscoverUsersResponse> {
    console.log(`🔍 Discovering users, limit: ${limit}, city: ${city}`);
    const params = new URLSearchParams();
    params.append('limit', limit.toString());
    if (city) {
      params.append('city', city);
    }

    const response = await apiClient.get(`/social/users/discover?${params}`);
    
    // Handle both direct response and ApiResponse wrapper
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

// Rest of your existing APIs with corrected endpoints
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
    
    const endpoint = `/v1/recommendations${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    return apiClient.get(endpoint);
  },

  async getRecommendation(id: string, includeTrustScore: boolean = true): Promise<ApiResponse<RecommendationWithTrust>> {
    const params = includeTrustScore ? '?includeTrustScore=true' : '';
    return apiClient.get(`/v1/recommendations/${id}${params}`);
  },

  async createRecommendation(recommendation: {
    serviceId: string;
    rating: number;
    content: string;
    tags?: string[];
  }): Promise<ApiResponse<RecommendationWithTrust>> {
    return apiClient.post('/v1/recommendations', recommendation);
  },

  async upvoteRecommendation(id: string): Promise<ApiResponse<{ success: boolean; newTrustScore?: number }>> {
    return apiClient.post(`/v1/recommendations/${id}/upvote`, {});
  },

  async saveRecommendation(id: string): Promise<ApiResponse<{ success: boolean; newTrustScore?: number }>> {
    return apiClient.post(`/v1/recommendations/${id}/save`, {});
  }
};

// ENHANCED: Updated userApi with social functions
export const userApi = {
  async getCurrentUser() {
    return apiClient.get('/auth/me');
  },

  async getTrustScore(userId: string) {
    return apiClient.get(`/v1/users/${userId}/trust-score`);
  },

  async getSocialGraph(userId: string): Promise<ApiResponse<{
    followers: string[];
    following: string[];
    mutualConnections: string[];
    socialDistance: Record<string, number>;
  }>> {
    return apiClient.get(`/v1/users/${userId}/social-graph`);
  },

  // DEPRECATED: Use socialApi.followUser instead
  async followUser(userId: string): Promise<ApiResponse<{ success: boolean }>> {
    return apiClient.post(`/v1/follow`, {
      following_id: userId
    });
  },

  // DEPRECATED: Use socialApi.unfollowUser instead
  async unfollowUser(userId: string): Promise<ApiResponse<{ success: boolean }>> {
    return apiClient.delete(`/v1/follow/${userId}`);
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