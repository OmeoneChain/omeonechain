// Enhanced version of your existing code/poc/frontend/src/services/api.ts
// This adds Trust Score functionality to your existing API service

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api/v1';

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

// Base API client (keeping your existing structure)
class ApiClient {
  private baseUrl: string;
  private headers: Record<string, string>;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
    this.headers = {
      'Content-Type': 'application/json',
      'x-user-id': 'user1' // Mock user ID - replace with actual auth
    };
  }

  setUserId(userId: string) {
    this.headers['x-user-id'] = userId;
  }

  private async request<T>(
    endpoint: string, 
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        ...options,
        headers: {
          ...this.headers,
          ...options.headers,
        },
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || `HTTP error! status: ${response.status}`);
      }

      return data;
    } catch (error) {
      console.error('API request failed:', error);
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

  async delete<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }
}

// Initialize API client
const apiClient = new ApiClient();

// NEW: Trust Score API
export const trustScoreApi = {
  async getTrustScore(recommendationId: string, userId?: string): Promise<ApiResponse<TrustScore>> {
    const params = userId ? `?userId=${userId}` : '';
    return apiClient.get(`/recommendations/${recommendationId}/trust-score${params}`);
  },

  async getTrustScoreBreakdown(recommendationId: string, userId: string): Promise<ApiResponse<TrustScore>> {
    return apiClient.get(`/recommendations/${recommendationId}/trust-breakdown?userId=${userId}`);
  },

  async getUserTrustScore(userId: string): Promise<ApiResponse<{ overallScore: number; reputationLevel: string }>> {
    return apiClient.get(`/users/${userId}/trust-score`);
  },

  async updateTrustSignal(recommendationId: string, signalType: 'save' | 'upvote' | 'share'): Promise<ApiResponse<{ success: boolean; newTrustScore: number }>> {
    return apiClient.post(`/recommendations/${recommendationId}/trust-signal`, {
      userId: 'user1', // Replace with actual user ID
      signalType
    });
  },

  // Mock data generator for testing while backend is being set up
  generateMockTrustScore(recommendationId: string): TrustScore {
    const mockEndorsers = [
      { userId: 'friend1', weight: 0.75, reputation: 0.8, socialDistance: 1 as const },
      { userId: 'friend2', weight: 0.75, reputation: 0.9, socialDistance: 1 as const },
      { userId: 'friend_of_friend1', weight: 0.25, reputation: 0.7, socialDistance: 2 as const },
    ];

    const baseScore = 0.3;
    const socialMultiplier = mockEndorsers.reduce((sum, endorser) => sum + (endorser.weight * endorser.reputation), 0);
    const finalScore = Math.min(baseScore * (1 + socialMultiplier), 1.0);

    return {
      score: finalScore,
      socialDistance: 1.2,
      breakdown: {
        directFriends: 2,
        friendsOfFriends: 1,
        totalEndorsements: 3,
        baseScore,
        socialMultiplier
      },
      endorsers: mockEndorsers,
      timestamp: new Date().toISOString()
    };
  }
};

// Enhanced Recommendations API (keeping your existing structure + adding trust scores)
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
    return apiClient.post('/recommendations', {
      ...recommendation,
      userId: 'user1' // Replace with actual user ID
    });
  },

  async upvoteRecommendation(id: string): Promise<ApiResponse<{ success: boolean; newTrustScore?: number }>> {
    return apiClient.post(`/recommendations/${id}/upvote`, {
      userId: 'user1' // Replace with actual user ID
    });
  },

  async saveRecommendation(id: string): Promise<ApiResponse<{ success: boolean; newTrustScore?: number }>> {
    return apiClient.post(`/recommendations/${id}/save`, {
      userId: 'user1' // Replace with actual user ID
    });
  }
};

// Enhanced User API (keeping your existing + adding social graph)
export const userApi = {
  async getCurrentUser() {
    return apiClient.get('/users/me');
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
    return apiClient.post(`/users/${userId}/follow`, {
      followerId: 'user1' // Replace with actual user ID
    });
  },

  async unfollowUser(userId: string): Promise<ApiResponse<{ success: boolean }>> {
    return apiClient.post(`/users/${userId}/unfollow`, {
      followerId: 'user1' // Replace with actual user ID
    });
  }
};

// Keep your existing APIs exactly as they are
export const governanceApi = {
  async getProposals() {
    return apiClient.get('/governance/proposals');
  },

  async getProposal(id: string) {
    return apiClient.get(`/governance/proposals/${id}`);
  },

  async createProposal(proposal: {
    title: string;
    description: string;
    category: string;
    executionParams?: any;
  }) {
    return apiClient.post('/governance/proposals', {
      ...proposal,
      userId: 'user1' // Replace with actual user ID
    });
  },

  async vote(proposalId: string, support: boolean) {
    return apiClient.post(`/governance/proposals/${proposalId}/vote`, {
      userId: 'user1', // Replace with actual user ID
      support
    });
  },

  async stake(amount: number, duration: number) {
    return apiClient.post('/governance/stake', {
      userId: 'user1', // Replace with actual user ID
      amount,
      duration
    });
  },

  async getStakingInfo(userId: string = 'user1') {
    return apiClient.get(`/governance/staking/${userId}`);
  }
};

export const tokenApi = {
  async getBalance(userId: string = 'user1') {
    return apiClient.get(`/tokens/balance/${userId}`);
  },

  async transfer(to: string, amount: number) {
    return apiClient.post('/tokens/transfer', {
      from: 'user1', // Replace with actual user ID
      to,
      amount
    });
  }
};

// Enhanced WebSocket service with Trust Score updates
class WebSocketService {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectInterval = 1000;

  connect() {
    try {
      const wsUrl = process.env.REACT_APP_WS_URL || 'ws://localhost:3001';
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        console.log('WebSocket connected');
        this.reconnectAttempts = 0;
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.handleMessage(data);
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };

      this.ws.onclose = () => {
        console.log('WebSocket disconnected');
        this.attemptReconnect();
      };

      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
      };
    } catch (error) {
      console.error('Failed to connect WebSocket:', error);
    }
  }

  private attemptReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(`Attempting to reconnect... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
      
      setTimeout(() => {
        this.connect();
      }, this.reconnectInterval * this.reconnectAttempts);
    } else {
      console.log('Max reconnection attempts reached');
    }
  }

  private handleMessage(data: any) {
    // Handle different types of real-time updates
    switch (data.type) {
      case 'PROPOSAL_CREATED':
        window.dispatchEvent(new CustomEvent('proposalCreated', { detail: data.payload }));
        break;
      case 'VOTE_CAST':
        window.dispatchEvent(new CustomEvent('voteCast', { detail: data.payload }));
        break;
      case 'TOKEN_REWARD':
        window.dispatchEvent(new CustomEvent('tokenReward', { detail: data.payload }));
        break;
      case 'TRUST_SCORE_UPDATED':
        // NEW: Handle trust score updates
        window.dispatchEvent(new CustomEvent('trustScoreUpdated', { detail: data.payload }));
        break;
      case 'RECOMMENDATION_ENDORSED':
        // NEW: Handle recommendation endorsements
        window.dispatchEvent(new CustomEvent('recommendationEndorsed', { detail: data.payload }));
        break;
      default:
        console.log('Unknown WebSocket message type:', data.type);
    }
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}

export const wsService = new WebSocketService();

// Enhanced Health check
export const healthApi = {
  async check() {
    try {
      const response = await fetch(`${API_BASE_URL.replace('/api/v1', '')}/health`);
      return await response.json();
    } catch (error) {
      return { status: 'unhealthy', error: error instanceof Error ? error.message : 'Unknown error' };
    }
  },

  async checkTrustScoreService() {
    try {
      // Test a basic trust score endpoint
      const response = await trustScoreApi.getUserTrustScore('user1');
      return { trustScoreService: response.success ? 'healthy' : 'unhealthy' };
    } catch (error) {
      return { trustScoreService: 'unhealthy', error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }
};

// NEW: React Hook for Trust Scores
export function useTrustScore(recommendationId: string, userId?: string) {
  const [trustScore, setTrustScore] = React.useState<TrustScore | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const fetchTrustScore = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const response = await trustScoreApi.getTrustScore(recommendationId, userId);
        if (response.success && response.data) {
          setTrustScore(response.data);
        } else {
          // Fallback to mock data for development
          setTrustScore(trustScoreApi.generateMockTrustScore(recommendationId));
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch trust score');
        // Use mock data on error
        setTrustScore(trustScoreApi.generateMockTrustScore(recommendationId));
      } finally {
        setLoading(false);
      }
    };

    if (recommendationId) {
      fetchTrustScore();
    }
  }, [recommendationId, userId]);

  return { trustScore, loading, error };
}

export default apiClient;