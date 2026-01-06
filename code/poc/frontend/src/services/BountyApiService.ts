// File: frontend/src/services/BountyApiService.ts
// REST API service for bounty system data fetching
// Handles fast data retrieval from backend API

import { AuthService } from './auth';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

// ==========================================
// TYPE DEFINITIONS
// ==========================================

export interface Bounty {
  id: string;
  title: string;
  description: string;
  category: string;
  cuisine_type?: string;
  location?: {
    city: string;
    region: string;
    country?: string;
  };
  creator_id: string;
  creator_username?: string;
  creator_display_name?: string;
  total_pledged: number; // base units
  pledge_count: number;
  status: 'active' | 'voting' | 'awarded' | 'expired' | 'refunded';
  created_at: string;
  deadline?: string;
  submission_count: number;
  winner_id?: string;
  winner_submission_id?: string;
}

export interface BountySubmission {
  id: string;
  bounty_id: string;
  recommendation_id: string;
  submitter_id: string;
  submitter_username?: string;
  submitter_display_name?: string;
  submitted_at: string;
  vote_count: number;
  is_winner: boolean;
  restaurant_name?: string;
  restaurant_id?: string;
}

export interface BountyDetails {
  success: boolean;
  bounty: Bounty;
  submissions: BountySubmission[];
  user_status?: {
    has_pledged: boolean;
    pledge_amount: number;
    has_submitted: boolean;
    submission_id?: string;
    has_voted: boolean;
  };
}

export interface ActiveBounties {
  success: boolean;
  bounties: Bounty[];
  pagination: {
    limit: number;
    offset: number;
    total: number;
    has_more: boolean;
  };
}

export interface UserBountyActivity {
  success: boolean;
  user_id: string;
  stats: {
    created_count: number;
    pledged_count: number;
    submitted_count: number;
    won_count: number;
    total_pledged: number;
    total_won: number;
  };
  created: Bounty[];
  pledged: Array<{
    bounty: Bounty;
    pledge_amount: number;
    pledged_at: string;
  }>;
  submitted: Array<{
    bounty: Bounty;
    submission: BountySubmission;
  }>;
  won: Array<{
    bounty: Bounty;
    submission: BountySubmission;
    prize_amount: number;
  }>;
}

// ==========================================
// API SERVICE CLASS
// ==========================================

class BountyApiService {
  /**
   * Get authorization headers
   */
  private getAuthHeaders(): HeadersInit {
    const token = AuthService.getToken();
    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  }

  /**
   * Fetch with error handling
   */
  private async fetchWithAuth(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<Response> {
    const url = `${API_BASE_URL}${endpoint}`;
    console.log(`🎯 [Bounty API] ${options.method || 'GET'} ${url}`);

    const response = await fetch(url, {
      ...options,
      headers: {
        ...this.getAuthHeaders(),
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ API error ${response.status}:`, errorText);
      throw new Error(`API error: ${response.status} - ${errorText}`);
    }

    return response;
  }

  // ==========================================
  // PUBLIC API METHODS
  // ==========================================

  /**
   * Get active bounties with optional filters
   * GET /api/bounties/active
   */
  async getActiveBounties(params?: {
    category?: string;
    cuisine_type?: string;
    min_pledge?: number;
    location?: string;
    limit?: number;
    offset?: number;
  }): Promise<ActiveBounties> {
    try {
      console.log('🎯 Fetching active bounties...');

      const queryParams = new URLSearchParams();
      if (params?.category) queryParams.append('category', params.category);
      if (params?.cuisine_type) queryParams.append('cuisine_type', params.cuisine_type);
      if (params?.min_pledge) queryParams.append('min_pledge', params.min_pledge.toString());
      if (params?.location) queryParams.append('location', params.location);
      if (params?.limit) queryParams.append('limit', params.limit.toString());
      if (params?.offset) queryParams.append('offset', params.offset.toString());

      const queryString = queryParams.toString();
      const endpoint = `/bounties/list${queryString ? `?status=open&${queryString}` : '?status=open'}`;

      const response = await this.fetchWithAuth(endpoint);
      const data = await response.json();

      console.log(`✅ Active bounties fetched: ${data.bounties?.length || 0} entries`);

      return data;
    } catch (error) {
      console.error('❌ Failed to fetch active bounties:', error);
      throw error;
    }
  }

  /**
   * Create a new bounty
   * POST /api/bounties/create
   * 
   * Note: Requires wallet-tier authentication
   */
  async createBounty(params: {
    title: string;
    description: string;
    category: string;
    cuisine_type?: string;
    initial_pledge: number;
    location?: {
      city: string;
      region: string;
      country?: string;
    };
    deadline_days?: number;
  }): Promise<{
    success: boolean;
    bounty: Bounty;
    message: string;
  }> {
    try {
      console.log(`🎯 Creating bounty: ${params.title}...`);

      const response = await this.fetchWithAuth('/bounties/create', {
        method: 'POST',
        body: JSON.stringify(params),
      });

      const data = await response.json();

      console.log('✅ Bounty created:', data.bounty?.id);

      return data;
    } catch (error) {
      console.error('❌ Failed to create bounty:', error);
      throw error;
    }
  }

  /**
   * Get bounty details with submissions
   * GET /api/bounties/:id
   */
  async getBountyDetails(bountyId: string): Promise<BountyDetails> {
    try {
      console.log(`🎯 Fetching bounty details for ${bountyId}...`);

      const response = await this.fetchWithAuth(`/bounties/${bountyId}`);
      const data = await response.json();

      console.log(`✅ Bounty details fetched: ${data.submissions?.length || 0} submissions`);

      return data;
    } catch (error) {
      console.error('❌ Failed to fetch bounty details:', error);
      throw error;
    }
  }

  /**
   * Pledge to a bounty
   * POST /api/bounties/:id/pledge
   * 
   * Note: Requires wallet-tier authentication
   */
  async pledgeToBounty(
    bountyId: string,
    amount: number
  ): Promise<{
    success: boolean;
    pledge: {
      id: string;
      bounty_id: string;
      amount: number;
      pledged_at: string;
    };
    new_total: number;
    message: string;
  }> {
    try {
      console.log(`🎯 Pledging ${amount} to bounty ${bountyId}...`);

      const response = await this.fetchWithAuth(`/bounties/${bountyId}/pledge`, {
        method: 'POST',
        body: JSON.stringify({ amount }),
      });

      const data = await response.json();

      console.log(`✅ Pledge successful: ${data.new_total} total`);

      return data;
    } catch (error) {
      console.error('❌ Failed to pledge to bounty:', error);
      throw error;
    }
  }

  /**
   * Submit a recommendation for a bounty
   * POST /api/bounties/:id/submit
   * 
   * Note: Requires wallet-tier authentication
   */
  async submitRecommendation(
    bountyId: string,
    recommendationId: string
  ): Promise<{
    success: boolean;
    submission: BountySubmission;
    message: string;
  }> {
    try {
      console.log(`🎯 Submitting recommendation ${recommendationId} to bounty ${bountyId}...`);

      const response = await this.fetchWithAuth(`/bounties/${bountyId}/submit`, {
        method: 'POST',
        body: JSON.stringify({ recommendation_id: recommendationId }),
      });

      const data = await response.json();

      console.log('✅ Submission recorded:', data.submission?.id);

      return data;
    } catch (error) {
      console.error('❌ Failed to submit recommendation:', error);
      throw error;
    }
  }

  /**
   * Vote on a bounty submission
   * POST /api/bounties/submissions/:id/vote
   * 
   * Note: Requires authentication (email-tier or wallet-tier)
   */
  async voteOnSubmission(submissionId: string): Promise<{
    success: boolean;
    vote: {
      submission_id: string;
      voted_at: string;
    };
    new_vote_count: number;
    message: string;
  }> {
    try {
      console.log(`🎯 Voting on submission ${submissionId}...`);

      const response = await this.fetchWithAuth(`/bounties/submissions/${submissionId}/vote`, {
        method: 'POST',
      });

      const data = await response.json();

      console.log('✅ Vote recorded');

      return data;
    } catch (error) {
      console.error('❌ Failed to vote on submission:', error);
      throw error;
    }
  }

  /**
   * Select winner for a bounty (creator only)
   * POST /api/bounties/:id/select-winner
   * 
   * Note: Requires wallet-tier authentication + bounty creator
   */
  async selectWinner(
    bountyId: string,
    submissionId: string
  ): Promise<{
    success: boolean;
    winner: {
      submission_id: string;
      user_id: string;
      prize_amount: number;
    };
    message: string;
  }> {
    try {
      console.log(`🎯 Selecting winner for bounty ${bountyId}...`);

      const response = await this.fetchWithAuth(`/bounties/${bountyId}/select-winner`, {
        method: 'POST',
        body: JSON.stringify({ submission_id: submissionId }),
      });

      const data = await response.json();

      console.log('✅ Winner selected:', data.winner?.user_id);

      return data;
    } catch (error) {
      console.error('❌ Failed to select winner:', error);
      throw error;
    }
  }

  /**
   * Get user's bounty activity
   * GET /api/bounties/user/:userId/activity
   */
  async getUserActivity(
    userId: string,
    limit: number = 10,
    offset: number = 0
  ): Promise<UserBountyActivity> {
    try {
      console.log(`🎯 Fetching bounty activity for user ${userId}...`);

      const response = await this.fetchWithAuth(
        `/bounties/user/${userId}/activity?limit=${limit}&offset=${offset}`
      );

      const data = await response.json();

      console.log('✅ User activity fetched');

      return data;
    } catch (error) {
      console.error('❌ Failed to fetch user activity:', error);
      throw error;
    }
  }

  // ==========================================
  // UTILITY METHODS
  // ==========================================

  /**
   * Format pledge amount
   */
  formatAmount(baseUnits: number): string {
    const amount = baseUnits / 1_000_000; // Assuming 6 decimals
    return `${amount.toFixed(2)} BOCA`;
  }

  /**
   * Calculate winner prize (90% of total)
   */
  calculateWinnerPrize(totalPledged: number): {
    winner: number;
    burned: number;
  } {
    const winner = Math.floor(totalPledged * 0.9);
    const burned = totalPledged - winner;
    return { winner, burned };
  }

  /**
   * Format date for display
   */
  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }

  /**
   * Get time since creation
   */
  getTimeAgo(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  }

  /**
   * Get status badge color
   */
  getStatusColor(status: string): string {
    const colors: Record<string, string> = {
      active: '#2D7A5F', // Green
      voting: '#1976D2', // Blue
      awarded: '#FF644A', // Coral
      expired: '#999999', // Gray
      refunded: '#E65441', // Red
    };
    return colors[status] || '#999999';
  }

  /**
   * Get category emoji
   */
  getCategoryEmoji(category: string): string {
    const emojis: Record<string, string> = {
      discovery: '🔍',
      recommendation: '⭐',
      challenge: '🎯',
      location: '📍',
      cuisine: '🍽️',
      occasion: '🎉',
    };
    return emojis[category] || '🎯';
  }
}

// Export singleton instance
const bountyApiService = new BountyApiService();
export default bountyApiService;

// Also export class for testing/custom instances
export { BountyApiService };