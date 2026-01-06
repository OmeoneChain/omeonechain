// File: frontend/src/services/LotteryService.ts
// NEW: Weekly lottery system for BocaBoca v0.8

import { IOTAService } from './IOTAService';
import IOTA_TESTNET_CONFIG from '../config/testnet-config';

export interface LotteryStandings {
  week: string;
  topUsers: Array<{
    userId: string;
    weeklyEngagement: number;
    tickets: number;
    rank: number;
    isEligible: boolean;
  }>;
  currentUserRank?: number;
  eligibilityCutoff: number; // Top 50
  drawDate: string;
}

export interface LotteryResult {
  week: string;
  drawDate: string;
  winners: Array<{
    userId: string;
    place: number;
    prize: number; // base units (6 decimals)
    displayPrize: string;
    weeklyEngagement: number;
    tickets: number;
  }>;
  totalPrizePool: number;
  displayTotalPool: string;
  participants: number;
}

export interface UserLotteryStats {
  userId: string;
  weeklyStats: {
    engagement: number;
    tickets: number;
    rank: number;
    isEligible: boolean;
    estimatedWinChance: number; // percentage
  };
  lifetimeStats: {
    totalWins: number;
    totalPrizesWon: number;
    displayTotalPrizes: string;
    weeksParticipated: number;
    avgRank: number;
    bestRank: number;
    winHistory: Array<{
      week: string;
      place: number;
      prize: number;
      date: string;
    }>;
  };
}

class LotteryService {
  private iotaService: IOTAService;
  private config: typeof IOTA_TESTNET_CONFIG;
  
  // Lottery configuration
  private readonly PRIZE_POOL = 50000000; // 50 BOCA (6 decimals)
  private readonly FIRST_PRIZE = 25000000; // 25 BOCA
  private readonly SECOND_PRIZE = 15000000; // 15 BOCA
  private readonly THIRD_PRIZE = 10000000; // 10 BOCA
  private readonly TOP_ELIGIBLE = 50;
  private readonly MIN_ENGAGEMENT = 1.0;

  constructor() {
    this.iotaService = new IOTAService();
    this.config = IOTA_TESTNET_CONFIG;
  }

  /**
   * Get current week's lottery standings
   */
  async getCurrentStandings(viewerUserId?: string): Promise<LotteryStandings> {
    try {
      console.log('🏆 Getting lottery standings...');

      const standings = await this.iotaService.executeContractQuery(
        this.config.contracts.lottery.packageId,
        this.config.contracts.lottery.module,
        this.config.contracts.lottery.functions.get_current_standings,
        []
      );

      // Get draw date (Sunday 8pm UTC)
      const drawDate = this.getNextDrawDate();

      const topUsers = standings.users.map((user: any, index: number) => ({
        userId: user.userId,
        weeklyEngagement: user.engagementScore,
        tickets: this.calculateTickets(user.engagementScore),
        rank: index + 1,
        isEligible: index < this.TOP_ELIGIBLE && user.engagementScore >= this.MIN_ENGAGEMENT
      }));

      let currentUserRank = undefined;
      if (viewerUserId) {
        currentUserRank = topUsers.findIndex((u: any) => u.userId === viewerUserId) + 1;
      }

      return {
        week: this.getCurrentWeek(),
        topUsers,
        currentUserRank,
        eligibilityCutoff: this.TOP_ELIGIBLE,
        drawDate
      };
    } catch (error) {
      console.error('❌ Failed to get standings:', error);
      return this.createEmptyStandings();
    }
  }

  /**
   * Get user's lottery statistics
   */
  async getUserStats(userId: string): Promise<UserLotteryStats> {
    try {
      console.log(`📊 Getting lottery stats for ${userId}...`);

      const weeklyScore = await this.iotaService.executeContractQuery(
        this.config.contracts.lottery.packageId,
        this.config.contracts.lottery.module,
        this.config.contracts.lottery.functions.get_weekly_score,
        [userId]
      );

      const lifetimeStats = await this.iotaService.executeContractQuery(
        this.config.contracts.lottery.packageId,
        this.config.contracts.lottery.module,
        this.config.contracts.lottery.functions.get_lifetime_stats,
        [userId]
      );

      const tickets = this.calculateTickets(weeklyScore.engagementScore);
      const winChance = this.estimateWinChance(weeklyScore.rank, tickets);

      return {
        userId,
        weeklyStats: {
          engagement: weeklyScore.engagementScore,
          tickets,
          rank: weeklyScore.rank,
          isEligible: weeklyScore.rank <= this.TOP_ELIGIBLE && weeklyScore.engagementScore >= this.MIN_ENGAGEMENT,
          estimatedWinChance: winChance
        },
        lifetimeStats: {
          totalWins: lifetimeStats.totalWins || 0,
          totalPrizesWon: lifetimeStats.totalPrizesWon || 0,
          displayTotalPrizes: this.formatAmount(lifetimeStats.totalPrizesWon || 0),
          weeksParticipated: lifetimeStats.weeksParticipated || 0,
          avgRank: lifetimeStats.avgRank || 0,
          bestRank: lifetimeStats.bestRank || 0,
          winHistory: lifetimeStats.winHistory || []
        }
      };
    } catch (error) {
      console.error('❌ Failed to get user stats:', error);
      return this.createEmptyUserStats(userId);
    }
  }

  /**
   * Get lottery results for a specific week
   */
  async getLotteryResults(week: string): Promise<LotteryResult | null> {
    try {
      // Query past lottery results
      // This would be implemented via events or state queries
      return null;
    } catch (error) {
      console.error('❌ Failed to get lottery results:', error);
      return null;
    }
  }

  /**
   * Get recent lottery winners
   */
  async getRecentWinners(limit: number = 10): Promise<Array<{
    week: string;
    place: number;
    userId: string;
    prize: number;
    displayPrize: string;
    drawDate: string;
  }>> {
    try {
      // Query recent winners from events
      return [];
    } catch (error) {
      console.error('❌ Failed to get recent winners:', error);
      return [];
    }
  }

  /**
   * Claim lottery prize (for winners)
   */
  async claimPrize(
    userId: string,
    week: string
  ): Promise<{
    success: boolean;
    prize: number;
    displayPrize: string;
    transactionId?: string;
    error?: string;
  }> {
    try {
      console.log(`🎁 Claiming lottery prize for ${userId} (week: ${week})...`);

      const result = await this.iotaService.executeContract(
        this.config.contracts.lottery.packageId,
        this.config.contracts.lottery.module,
        this.config.contracts.lottery.functions.claim_prize,
        [userId, week]
      );

      const prize = result?.prize || 0;
      const transactionId = result?.digest || `tx_${Date.now()}`;

      console.log(`✅ Prize claimed: ${this.formatAmount(prize)}`);

      return {
        success: true,
        prize,
        displayPrize: this.formatAmount(prize),
        transactionId
      };
    } catch (error) {
      console.error('❌ Failed to claim prize:', error);
      return {
        success: false,
        prize: 0,
        displayPrize: '0.00 BOCA',
        error: error.message
      };
    }
  }

  // ========== HELPER METHODS ==========

  /**
   * Calculate lottery tickets using √(engagement_score) formula
   */
  private calculateTickets(engagementScore: number): number {
    if (engagementScore < this.MIN_ENGAGEMENT) return 0;
    return Math.floor(Math.sqrt(engagementScore));
  }

  /**
   * Estimate win chance based on rank and tickets
   */
  private estimateWinChance(rank: number, tickets: number): number {
    if (rank > this.TOP_ELIGIBLE) return 0;
    // Simplified calculation - actual would depend on total tickets
    const baseChance = (tickets / 100) * 100; // percentage
    return Math.min(baseChance, 50); // cap at 50%
  }

  /**
   * Get current week identifier
   */
  private getCurrentWeek(): string {
    const now = new Date();
    const year = now.getFullYear();
    const week = this.getWeekNumber(now);
    return `${year}-W${week.toString().padStart(2, '0')}`;
  }

  /**
   * Get week number of year
   */
  private getWeekNumber(date: Date): number {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  }

  /**
   * Get next draw date (Sunday 8pm UTC)
   */
  private getNextDrawDate(): string {
    const now = new Date();
    const daysUntilSunday = (7 - now.getDay()) % 7 || 7;
    const sunday = new Date(now);
    sunday.setDate(now.getDate() + daysUntilSunday);
    sunday.setUTCHours(20, 0, 0, 0); // 8pm UTC
    return sunday.toISOString();
  }

  /**
   * Format token amount
   */
  private formatAmount(baseUnits: number): string {
    const amount = baseUnits / 1_000_000;
    return `${amount.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })} BOCA`;
  }

  /**
   * Create empty standings
   */
  private createEmptyStandings(): LotteryStandings {
    return {
      week: this.getCurrentWeek(),
      topUsers: [],
      eligibilityCutoff: this.TOP_ELIGIBLE,
      drawDate: this.getNextDrawDate()
    };
  }

  /**
   * Create empty user stats
   */
  private createEmptyUserStats(userId: string): UserLotteryStats {
    return {
      userId,
      weeklyStats: {
        engagement: 0,
        tickets: 0,
        rank: 0,
        isEligible: false,
        estimatedWinChance: 0
      },
      lifetimeStats: {
        totalWins: 0,
        totalPrizesWon: 0,
        displayTotalPrizes: '0.00 BOCA',
        weeksParticipated: 0,
        avgRank: 0,
        bestRank: 0,
        winHistory: []
      }
    };
  }
}

export default LotteryService;