// File: frontend/src/services/PhotoContestApiService.ts
// REST API service for photo contest data fetching
// Handles fast data retrieval from backend API

import { AuthService } from './auth';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

// ==========================================
// TYPE DEFINITIONS
// ==========================================

export interface PhotoContestRound {
  id: string;
  week_start: string;
  week_end: string;
  phase: 'nomination' | 'finalist_selection' | 'voting' | 'completed';
  nominations_count: number;
  finalists_count: number;
  total_votes: number;
  created_at: string;
}

export interface PhotoNomination {
  id: string;
  round_id: string;
  user_id: string;
  recommendation_id: string;
  photo_url: string;
  restaurant_name: string;
  created_at: string;
  is_finalist: boolean;
  username?: string;
  display_name?: string;
}

export interface PhotoFinalist {
  id: string;
  round_id: string;
  nomination_id: string;
  user_id: string;
  photo_url: string;
  restaurant_name: string;
  vote_count: number;
  rank?: number;
  username?: string;
  display_name?: string;
}

export interface PhotoContestCurrent {
  success: boolean;
  round: PhotoContestRound;
  timeline: {
    nomination_start: string;
    nomination_end: string;
    finalist_selection: string;
    voting_start: string;
    voting_end: string;
    announcement: string;
  };
  user_status?: {
    has_nominated: boolean;
    has_voted: boolean;
    nomination_id?: string;
  };
  phase_info: {
    current_phase: string;
    can_nominate: boolean;
    can_vote: boolean;
    time_remaining: {
      days: number;
      hours: number;
      minutes: number;
    };
  };
}

export interface PhotoContestHistory {
  success: boolean;
  rounds: Array<{
    id: string;
    week_start: string;
    week_end: string;
    nominations_count: number;
    total_votes: number;
    winners: Array<{
      place: number;
      user_id: string;
      username: string;
      display_name?: string;
      photo_url: string;
      restaurant_name: string;
      vote_count: number;
      prize: number;
    }>;
    announcement_date: string;
  }>;
  pagination: {
    limit: number;
    offset: number;
    total: number;
    has_more: boolean;
  };
}

// ==========================================
// API SERVICE CLASS
// ==========================================

class PhotoContestApiService {
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
    console.log(`📸 [PhotoContest API] ${options.method || 'GET'} ${url}`);

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
   * Get current week's photo contest status
   * GET /api/photo-contest/current
   */
  async getCurrentContest(): Promise<PhotoContestCurrent> {
    try {
      console.log('📸 Fetching current photo contest...');

      const response = await this.fetchWithAuth('/photo-contest/current');
      const data = await response.json();

      console.log('✅ Current contest fetched:', {
        phase: data.round?.phase,
        nominations: data.round?.nominations_count,
        finalists: data.round?.finalists_count,
      });

      return data;
    } catch (error) {
      console.error('❌ Failed to fetch current contest:', error);
      throw error;
    }
  }

  /**
   * Nominate a photo for the contest
   * POST /api/photo-contest/nominate
   * 
   * Note: Requires wallet-tier authentication
   */
  async nominatePhoto(recommendationId: string): Promise<{
    success: boolean;
    nomination: PhotoNomination;
    message: string;
  }> {
    try {
      console.log(`📸 Nominating photo for recommendation ${recommendationId}...`);

      const response = await this.fetchWithAuth('/photo-contest/nominate', {
        method: 'POST',
        body: JSON.stringify({ recommendation_id: recommendationId }),
      });

      const data = await response.json();

      console.log('✅ Photo nominated:', data.nomination?.id);

      return data;
    } catch (error) {
      console.error('❌ Failed to nominate photo:', error);
      throw error;
    }
  }

  /**
   * Get current week's finalists
   * GET /api/photo-contest/finalists
   */
  async getFinalists(): Promise<{
    success: boolean;
    round_id: string;
    finalists: PhotoFinalist[];
    user_vote?: {
      voted_for: string;
      voted_at: string;
    };
  }> {
    try {
      console.log('📸 Fetching photo contest finalists...');

      const response = await this.fetchWithAuth('/photo-contest/finalists');
      const data = await response.json();

      console.log(`✅ Finalists fetched: ${data.finalists?.length || 0} entries`);

      return data;
    } catch (error) {
      console.error('❌ Failed to fetch finalists:', error);
      throw error;
    }
  }

  /**
   * Vote for a finalist
   * POST /api/photo-contest/vote
   * 
   * Note: Anyone can vote (email-tier or wallet-tier)
   */
  async vote(nominationId: string): Promise<{
    success: boolean;
    message: string;
    vote: {
      nomination_id: string;
      voted_at: string;
    };
  }> {
    try {
      console.log(`📸 Voting for nomination ${nominationId}...`);

      const response = await this.fetchWithAuth('/photo-contest/vote', {
        method: 'POST',
        body: JSON.stringify({ nomination_id: nominationId }),
      });

      const data = await response.json();

      console.log('✅ Vote recorded');

      return data;
    } catch (error) {
      console.error('❌ Failed to vote:', error);
      throw error;
    }
  }

  /**
   * Get past photo contest results
   * GET /api/photo-contest/history
   */
  async getHistory(
    limit: number = 10,
    offset: number = 0
  ): Promise<PhotoContestHistory> {
    try {
      console.log(`📸 Fetching photo contest history (limit: ${limit}, offset: ${offset})...`);

      const response = await this.fetchWithAuth(
        `/photo-contest/history?limit=${limit}&offset=${offset}`
      );

      const data = await response.json();

      console.log(`✅ History fetched: ${data.rounds?.length || 0} rounds`);

      return data;
    } catch (error) {
      console.error('❌ Failed to fetch photo contest history:', error);
      throw error;
    }
  }

  // ==========================================
  // UTILITY METHODS
  // ==========================================

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
   * Get time remaining until a deadline
   */
  getTimeRemaining(targetDate: string): {
    days: number;
    hours: number;
    minutes: number;
    total: number;
  } {
    const now = new Date();
    const target = new Date(targetDate);
    const total = target.getTime() - now.getTime();

    return {
      days: Math.floor(total / (1000 * 60 * 60 * 24)),
      hours: Math.floor((total / (1000 * 60 * 60)) % 24),
      minutes: Math.floor((total / (1000 * 60)) % 60),
      total,
    };
  }

  /**
   * Get human-readable phase name
   */
  getPhaseName(phase: string): string {
    const phases: Record<string, string> = {
      nomination: 'Nominations Open',
      finalist_selection: 'Selecting Finalists',
      voting: 'Voting in Progress',
      completed: 'Winners Announced',
    };
    return phases[phase] || phase;
  }

  /**
   * Get next deadline based on current phase
   */
  getNextDeadline(timeline: PhotoContestCurrent['timeline'], phase: string): string {
    switch (phase) {
      case 'nomination':
        return timeline.nomination_end;
      case 'finalist_selection':
        return timeline.voting_start;
      case 'voting':
        return timeline.voting_end;
      case 'completed':
        return timeline.announcement;
      default:
        return timeline.nomination_end;
    }
  }

  /**
   * Format prize amount
   */
  formatPrize(baseUnits: number): string {
    const amount = baseUnits / 1_000_000; // Assuming 6 decimals
    return `${amount.toFixed(2)} BOCA`;
  }

  /**
   * Get prize amounts by place
   */
  getPrizeAmounts(): {
    first: number;
    second: number;
    third: number;
    total: number;
  } {
    return {
      first: 10_000_000,  // 10 BOCA
      second: 5_000_000,  // 5 BOCA
      third: 3_000_000,   // 3 BOCA
      total: 18_000_000,  // 18 BOCA
    };
  }

  /**
   * Get place emoji
   */
  getPlaceEmoji(place: number): string {
    const emojis: Record<number, string> = {
      1: '🥇',
      2: '🥈',
      3: '🥉',
    };
    return emojis[place] || '🏆';
  }
}

// Export singleton instance
const photoContestApiService = new PhotoContestApiService();
export default photoContestApiService;

// Also export class for testing/custom instances
export { PhotoContestApiService };