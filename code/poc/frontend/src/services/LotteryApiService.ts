// File: frontend/src/services/LotteryApiService.ts
// REST API service for lottery data fetching
// Handles fast data retrieval from backend API

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

export interface LotteryStandings {
  success: boolean;
  drawing: {
    id: string;
    week_start: string;
    week_end: string;
    status: 'active' | 'completed' | 'cancelled';
    total_participants: number;
    min_participants: number;
    max_participants: number;
  };
  prizes: {
    FIRST: number;
    SECOND: number;
    THIRD: number;
  };
  user_stats?: {
    engagement_score: number;
    ticket_count: number;
    is_eligible: boolean;
  };
}

export interface LeaderboardEntry {
  rank: number;
  user: {
    id: string;
    username: string;
    display_name?: string;
    avatar_url?: string;
  };
  engagement_score: number;
  ticket_count: number;
}

export interface LotteryHistory {
  success: boolean;
  drawings: Array<{
    id: string;
    week_start: string;
    week_end: string;
    total_participants: number;
    total_tickets: number;
    winners: {
      first?: {
        user_id: string;
        username: string;
        display_name?: string;
        avatar_url?: string;
        prize: number;
      };
      second?: {
        user_id: string;
        username: string;
        display_name?: string;
        avatar_url?: string;
        prize: number;
      };
      third?: {
        user_id: string;
        username: string;
        display_name?: string;
        avatar_url?: string;
        prize: number;
      };
    };
    drawn_at: string;
  }>;
  pagination: {
    limit: number;
    offset: number;
    total: number;
    has_more: boolean;
  };
}

export interface UserLotteryHistory {
  success: boolean;
  user_id: string;
  stats: {
    total_participations: number;
    total_wins: number;
    total_prizes_won: number;
  };
  entries: Array<{
    id: string;
    drawing: {
      id: string;
      week_start: string;
      week_end: string;
      status: string;
      drawn_at: string;
    };
    engagement_score: number;
    ticket_count: number;
    won_prize?: 'first' | 'second' | 'third';
    prize_amount: number;
    spotlighted_recommendations: string[];
    created_at: string;
  }>;
  pagination: {
    limit: number;
    offset: number;
    total: number;
    has_more: boolean;
  };
}

class LotteryApiService {
  private getAuthToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('authToken');
  }

  private async fetchWithAuth(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<Response> {
    const token = this.getAuthToken();
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    return fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });
  }

  /**
   * Get current week's lottery information
   */
  async getCurrentStandings(): Promise<LotteryStandings> {
    try {
      console.log('📊 Fetching current lottery standings from API...');
      
      const response = await this.fetchWithAuth('/lottery/current');
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      console.log('✅ Lottery standings fetched:', data);
      
      return data;
    } catch (error) {
      console.error('❌ Failed to fetch lottery standings:', error);
      throw error;
    }
  }

  /**
   * Get current week's leaderboard
   */
  async getLeaderboard(limit: number = 20): Promise<LeaderboardEntry[]> {
    try {
      console.log(`📊 Fetching lottery leaderboard (limit: ${limit})...`);
      
      const response = await this.fetchWithAuth(`/lottery/leaderboard?limit=${limit}`);
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      console.log(`✅ Leaderboard fetched: ${data.leaderboard?.length || 0} entries`);
      
      return data.leaderboard || [];
    } catch (error) {
      console.error('❌ Failed to fetch leaderboard:', error);
      throw error;
    }
  }

  /**
   * Get past lottery results
   */
  async getHistory(limit: number = 10, offset: number = 0): Promise<LotteryHistory> {
    try {
      console.log(`📊 Fetching lottery history (limit: ${limit}, offset: ${offset})...`);
      
      const response = await this.fetchWithAuth(
        `/lottery/history?limit=${limit}&offset=${offset}`
      );
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      console.log(`✅ History fetched: ${data.drawings?.length || 0} drawings`);
      
      return data;
    } catch (error) {
      console.error('❌ Failed to fetch lottery history:', error);
      throw error;
    }
  }

  /**
   * Get user's lottery participation history
   */
  async getUserHistory(
    userId: string,
    limit: number = 10,
    offset: number = 0
  ): Promise<UserLotteryHistory> {
    try {
      console.log(`📊 Fetching user lottery history for ${userId}...`);
      
      const response = await this.fetchWithAuth(
        `/lottery/user/${userId}/history?limit=${limit}&offset=${offset}`
      );
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      console.log(`✅ User history fetched: ${data.entries?.length || 0} entries`);
      
      return data;
    } catch (error) {
      console.error('❌ Failed to fetch user lottery history:', error);
      throw error;
    }
  }

  /**
   * Get next drawing date (calculated from current standings)
   */
  getNextDrawingDate(standings: LotteryStandings): Date {
    // Drawing happens every Tuesday at 23:00 UTC
    const weekEnd = new Date(standings.drawing.week_end);
    weekEnd.setUTCHours(23, 0, 0, 0);
    return weekEnd;
  }

  /**
   * Format date for display
   */
  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  }

  /**
   * Calculate time remaining until drawing
   */
  getTimeRemaining(standings: LotteryStandings): {
    days: number;
    hours: number;
    minutes: number;
    total: number;
  } {
    const now = new Date();
    const drawingDate = this.getNextDrawingDate(standings);
    const total = drawingDate.getTime() - now.getTime();
    
    return {
      days: Math.floor(total / (1000 * 60 * 60 * 24)),
      hours: Math.floor((total / (1000 * 60 * 60)) % 24),
      minutes: Math.floor((total / (1000 * 60)) % 60),
      total,
    };
  }
}

const lotteryApiService = new LotteryApiService();
export default lotteryApiService;