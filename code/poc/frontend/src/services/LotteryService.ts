// File: frontend/src/services/LotteryService.ts
// Unified lottery service - Facade pattern
// Coordinates between API (fast data) and Contract (verification/claims)

import LotteryApiService, { 
  LotteryStandings, 
  LeaderboardEntry, 
  LotteryHistory,
  UserLotteryHistory 
} from './LotteryApiService';
import LotteryContractService, {
  PrizeClaimResult,
  DrawingVerification
} from './LotteryContractService';

// Re-export types for convenience
export type {
  LotteryStandings,
  LeaderboardEntry,
  LotteryHistory,
  UserLotteryHistory,
  PrizeClaimResult,
  DrawingVerification
};

/**
 * Unified Lottery Service
 * 
 * This service acts as a facade, coordinating between:
 * - LotteryApiService: Fast data fetching from backend REST API
 * - LotteryContractService: Blockchain interactions for verification and claims
 * 
 * Usage:
 * - Use API methods for UI data (leaderboards, history, stats)
 * - Use contract methods for verification and prize claims
 */
class LotteryService {
  private api: LotteryApiService;
  private contract: LotteryContractService;

  constructor() {
    this.api = new LotteryApiService();
    this.contract = new LotteryContractService();
  }

  // =============================================================================
  // API METHODS (Fast data fetching for UI)
  // =============================================================================

  /**
   * Get current week's lottery standings
   * Source: Backend API (fast, cached)
   */
  async getCurrentStandings(): Promise<LotteryStandings> {
    return this.api.getCurrentStandings();
  }

  /**
   * Get current week's leaderboard
   * Source: Backend API (fast, cached)
   */
  async getLeaderboard(limit: number = 20): Promise<LeaderboardEntry[]> {
    return this.api.getLeaderboard(limit);
  }

  /**
   * Get past lottery results
   * Source: Backend API (fast, cached)
   */
  async getHistory(limit: number = 10, offset: number = 0): Promise<LotteryHistory> {
    return this.api.getHistory(limit, offset);
  }

  /**
   * Get user's lottery participation history
   * Source: Backend API (fast, cached)
   */
  async getUserHistory(
    userId: string,
    limit: number = 10,
    offset: number = 0
  ): Promise<UserLotteryHistory> {
    return this.api.getUserHistory(userId, limit, offset);
  }

  /**
   * Get next drawing date
   * Source: Calculated from API data
   */
  getNextDrawingDate(standings: LotteryStandings): Date {
    return this.api.getNextDrawingDate(standings);
  }

  /**
   * Format date for display
   * Source: Utility method
   */
  formatDate(dateString: string): string {
    return this.api.formatDate(dateString);
  }

  /**
   * Calculate time remaining until drawing
   * Source: Calculated from API data
   */
  getTimeRemaining(standings: LotteryStandings) {
    return this.api.getTimeRemaining(standings);
  }

  // =============================================================================
  // CONTRACT METHODS (Blockchain interactions)
  // =============================================================================

  /**
   * Verify lottery drawing on blockchain
   * Source: Smart contract query (authoritative)
   * Use this to verify drawing fairness
   */
  async verifyDrawing(drawingId: string): Promise<DrawingVerification> {
    return this.contract.verifyDrawing(drawingId);
  }

  /**
   * Claim lottery prize
   * Source: Smart contract transaction (authoritative)
   * Use this for winners to claim their prizes
   */
  async claimPrize(userId: string, drawingId: string): Promise<PrizeClaimResult> {
    return this.contract.claimPrize(userId, drawingId);
  }

  /**
   * Check if user has unclaimed prizes
   * Source: Smart contract query (authoritative)
   */
  async checkUnclaimedPrizes(userId: string) {
    return this.contract.checkUnclaimedPrizes(userId);
  }

  /**
   * Get on-chain lottery statistics
   * Source: Smart contract query (authoritative)
   */
  async getLotteryStats() {
    return this.contract.getLotteryStats();
  }

  /**
   * Verify VRF randomness for provably fair drawing
   * Source: Smart contract query (authoritative)
   */
  async verifyVRF(drawingId: string) {
    return this.contract.verifyVRF(drawingId);
  }

  // =============================================================================
  // HYBRID METHODS (Combine API and contract data)
  // =============================================================================

  /**
   * Get complete drawing details with verification
   * Combines fast API data with blockchain verification
   */
  async getDrawingWithVerification(drawingId: string): Promise<{
    apiData: any;
    verification: DrawingVerification;
    isVerified: boolean;
  }> {
    try {
      // Fetch from API for speed
      const history = await this.getHistory(1, 0);
      const apiData = history.drawings.find(d => d.id === drawingId);

      // Verify on-chain for trust
      const verification = await this.verifyDrawing(drawingId);

      return {
        apiData: apiData || null,
        verification,
        isVerified: verification.isValid,
      };
    } catch (error) {
      console.error('❌ Failed to get drawing with verification:', error);
      throw error;
    }
  }

  /**
   * Get user stats with unclaimed prize check
   * Combines API stats with blockchain prize check
   */
  async getUserStatsWithPrizes(userId: string): Promise<{
    history: UserLotteryHistory;
    unclaimedPrizes: any;
    hasUnclaimedPrizes: boolean;
  }> {
    try {
      const [history, unclaimedPrizes] = await Promise.all([
        this.getUserHistory(userId, 10, 0),
        this.checkUnclaimedPrizes(userId),
      ]);

      return {
        history,
        unclaimedPrizes,
        hasUnclaimedPrizes: unclaimedPrizes.hasUnclaimed,
      };
    } catch (error) {
      console.error('❌ Failed to get user stats with prizes:', error);
      throw error;
    }
  }
}

// Export singleton instance
const lotteryService = new LotteryService();
export default lotteryService;

// Also export class for testing/custom instances
export { LotteryService };