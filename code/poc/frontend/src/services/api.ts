// code/poc/frontend/src/services/api.ts
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api/v1';

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// Base API client
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

// Governance API
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

// User/Reputation API
export const userApi = {
  async getCurrentUser() {
    return apiClient.get('/users/me');
  },

  async getTrustScore(userId: string) {
    return apiClient.get(`/users/${userId}/trust-score`);
  }
};

// Token API
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

// Recommendations API
export const recommendationApi = {
  async getRecommendations(params?: {
    category?: string;
    location?: string;
    limit?: number;
  }) {
    const queryParams = new URLSearchParams();
    if (params?.category) queryParams.append('category', params.category);
    if (params?.location) queryParams.append('location', params.location);
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    
    const endpoint = `/recommendations${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    return apiClient.get(endpoint);
  },

  async createRecommendation(recommendation: {
    serviceId: string;
    rating: number;
    content: string;
    tags?: string[];
  }) {
    return apiClient.post('/recommendations', {
      ...recommendation,
      userId: 'user1' // Replace with actual user ID
    });
  }
};

// WebSocket connection for real-time updates
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
        // Trigger proposal list refresh
        window.dispatchEvent(new CustomEvent('proposalCreated', { detail: data.payload }));
        break;
      case 'VOTE_CAST':
        // Trigger proposal detail refresh
        window.dispatchEvent(new CustomEvent('voteCast', { detail: data.payload }));
        break;
      case 'TOKEN_REWARD':
        // Trigger balance refresh
        window.dispatchEvent(new CustomEvent('tokenReward', { detail: data.payload }));
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

// Health check
export const healthApi = {
  async check() {
    try {
      const response = await fetch(`${API_BASE_URL.replace('/api/v1', '')}/health`);
      return await response.json();
    } catch (error) {
      return { status: 'unhealthy', error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }
};

export default apiClient;