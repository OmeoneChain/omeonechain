// File: frontend/src/services/LotteryUtilities.ts
// Lottery utility functions and constants
// Pure functions for calculations, formatting, and data transformation

// =============================================================================
// CONSTANTS
// =============================================================================

export const LOTTERY_CONFIG = {
  PRIZE_POOL: 50_000_000, // 50 BOCA (6 decimals)
  FIRST_PRIZE: 25_000_000, // 25 BOCA
  SECOND_PRIZE: 15_000_000, // 15 BOCA
  THIRD_PRIZE: 10_000_000, // 10 BOCA
  TOP_ELIGIBLE: 50,
  MIN_ENGAGEMENT: 1.0,
};

// Display values (for UI)
export const LOTTERY_PRIZES = {
  FIRST: 25.0,
  SECOND: 15.0,
  THIRD: 10.0,
  TOTAL: 50.0,
};

// =============================================================================
// TICKET CALCULATIONS
// =============================================================================

/**
 * Calculate lottery tickets using √(engagement_score) formula
 * Capped at 10 tickets maximum
 */
export function calculateTickets(engagementScore: number): number {
  if (engagementScore < LOTTERY_CONFIG.MIN_ENGAGEMENT) {
    return 0;
  }
  return Math.min(Math.floor(Math.sqrt(engagementScore)), 10);
}

/**
 * Estimate win chance based on rank and tickets
 * Simplified calculation - actual depends on total tickets in pool
 */
export function estimateWinChance(rank: number, tickets: number): number {
  if (rank > LOTTERY_CONFIG.TOP_ELIGIBLE) {
    return 0;
  }
  // Simplified: (tickets / 100) * 100 = percentage
  const baseChance = (tickets / 100) * 100;
  return Math.min(baseChance, 50); // Cap at 50%
}

// =============================================================================
// DATE & WEEK CALCULATIONS
// =============================================================================

/**
 * Get current week identifier (ISO week format)
 * Format: YYYY-Www (e.g., "2025-W47")
 */
export function getCurrentWeek(): string {
  const now = new Date();
  const year = now.getFullYear();
  const week = getWeekNumber(now);
  return `${year}-W${week.toString().padStart(2, '0')}`;
}

/**
 * Get ISO week number of year (1-53)
 */
export function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

/**
 * Get next lottery drawing date (Tuesday 8pm UTC)
 */
export function getNextDrawDate(): string {
  const now = new Date();
  const daysUntilTuesday = (2 - now.getDay() + 7) % 7 || 7;
  const tuesday = new Date(now);
  tuesday.setDate(now.getDate() + daysUntilTuesday);
  tuesday.setUTCHours(20, 0, 0, 0); // 8pm UTC
  return tuesday.toISOString();
}

/**
 * Calculate time remaining until a specific date
 */
export function getTimeRemaining(targetDate: Date | string): {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  total: number;
} {
  const now = new Date();
  const target = typeof targetDate === 'string' ? new Date(targetDate) : targetDate;
  const total = target.getTime() - now.getTime();

  return {
    days: Math.floor(total / (1000 * 60 * 60 * 24)),
    hours: Math.floor((total / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((total / (1000 * 60)) % 60),
    seconds: Math.floor((total / 1000) % 60),
    total,
  };
}

/**
 * Format time remaining as human-readable string
 */
export function formatTimeRemaining(targetDate: Date | string): string {
  const time = getTimeRemaining(targetDate);
  
  if (time.total <= 0) {
    return 'Drawing in progress';
  }

  if (time.days > 0) {
    return `${time.days}d ${time.hours}h`;
  }
  
  if (time.hours > 0) {
    return `${time.hours}h ${time.minutes}m`;
  }
  
  return `${time.minutes}m ${time.seconds}s`;
}

// =============================================================================
// FORMATTING
// =============================================================================

/**
 * Format token amount from base units (6 decimals) to display format
 */
export function formatAmount(baseUnits: number): string {
  const amount = baseUnits / 1_000_000;
  return `${amount.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} BOCA`;
}

/**
 * Format date for display
 */
export function formatDate(dateString: string, options?: Intl.DateTimeFormatOptions): string {
  const date = new Date(dateString);
  const defaultOptions: Intl.DateTimeFormatOptions = {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  };
  return date.toLocaleDateString('en-US', options || defaultOptions);
}

/**
 * Format date as relative time (e.g., "2 hours ago")
 */
export function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
  if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
  return 'just now';
}

/**
 * Format engagement score for display
 */
export function formatEngagementScore(score: number): string {
  return score.toFixed(1);
}

/**
 * Format percentage
 */
export function formatPercentage(value: number): string {
  return `${value.toFixed(1)}%`;
}

// =============================================================================
// EMPTY STATE CREATORS
// =============================================================================

/**
 * Create empty lottery standings object
 */
export function createEmptyStandings() {
  return {
    success: true,
    drawing: {
      id: '',
      week_start: '',
      week_end: getNextDrawDate(),
      status: 'active' as const,
      total_participants: 0,
      min_participants: LOTTERY_CONFIG.TOP_ELIGIBLE,
      max_participants: 100,
    },
    prizes: LOTTERY_PRIZES,
    user_stats: undefined,
  };
}

/**
 * Create empty user stats object
 */
export function createEmptyUserStats(userId: string) {
  return {
    success: true,
    user_id: userId,
    stats: {
      total_participations: 0,
      total_wins: 0,
      total_prizes_won: 0,
    },
    entries: [],
    pagination: {
      limit: 10,
      offset: 0,
      total: 0,
      has_more: false,
    },
  };
}

/**
 * Create empty leaderboard
 */
export function createEmptyLeaderboard() {
  return [];
}

// =============================================================================
// VALIDATION
// =============================================================================

/**
 * Check if user is eligible for lottery
 */
export function isEligible(engagementScore: number): boolean {
  return engagementScore >= LOTTERY_CONFIG.MIN_ENGAGEMENT;
}

/**
 * Check if drawing has minimum participants
 */
export function hasMinimumParticipants(count: number): boolean {
  return count >= LOTTERY_CONFIG.TOP_ELIGIBLE;
}

/**
 * Validate ticket count
 */
export function isValidTicketCount(tickets: number): boolean {
  return tickets >= 0 && tickets <= 10;
}

// =============================================================================
// DATA TRANSFORMATIONS
// =============================================================================

/**
 * Transform API leaderboard entry to display format
 */
export function transformLeaderboardEntry(entry: any, rank: number) {
  return {
    rank,
    user: {
      id: entry.id || entry.user_id,
      username: entry.username || `User ${entry.id?.slice(0, 8)}`,
      display_name: entry.display_name,
      avatar_url: entry.avatar_url,
    },
    engagement_score: entry.engagement_score || entry.weekly_engagement_score || 0,
    ticket_count: calculateTickets(entry.engagement_score || entry.weekly_engagement_score || 0),
    is_eligible: isEligible(entry.engagement_score || entry.weekly_engagement_score || 0),
  };
}

/**
 * Calculate rank badge color based on position
 */
export function getRankBadgeColor(rank: number): {
  backgroundColor: string;
  color: string;
} {
  if (rank === 1) {
    return { backgroundColor: '#FFD700', color: 'white' }; // Gold
  }
  if (rank === 2) {
    return { backgroundColor: '#C0C0C0', color: 'white' }; // Silver
  }
  if (rank === 3) {
    return { backgroundColor: '#CD7F32', color: 'white' }; // Bronze
  }
  return { backgroundColor: '#E5E5E5', color: '#666' }; // Gray
}

/**
 * Get prize emoji for placement
 */
export function getPrizeEmoji(place: 'first' | 'second' | 'third'): string {
  const emojis = {
    first: '🥇',
    second: '🥈',
    third: '🥉',
  };
  return emojis[place] || '🎁';
}

/**
 * Get prize amount for placement
 */
export function getPrizeAmount(place: 'first' | 'second' | 'third'): number {
  const prizes = {
    first: LOTTERY_PRIZES.FIRST,
    second: LOTTERY_PRIZES.SECOND,
    third: LOTTERY_PRIZES.THIRD,
  };
  return prizes[place] || 0;
}

// =============================================================================
// EXPORT ALL
// =============================================================================

export default {
  // Constants
  LOTTERY_CONFIG,
  LOTTERY_PRIZES,
  
  // Calculations
  calculateTickets,
  estimateWinChance,
  
  // Date & Week
  getCurrentWeek,
  getWeekNumber,
  getNextDrawDate,
  getTimeRemaining,
  formatTimeRemaining,
  
  // Formatting
  formatAmount,
  formatDate,
  formatRelativeTime,
  formatEngagementScore,
  formatPercentage,
  
  // Empty States
  createEmptyStandings,
  createEmptyUserStats,
  createEmptyLeaderboard,
  
  // Validation
  isEligible,
  hasMinimumParticipants,
  isValidTicketCount,
  
  // Transformations
  transformLeaderboardEntry,
  getRankBadgeColor,
  getPrizeEmoji,
  getPrizeAmount,
};