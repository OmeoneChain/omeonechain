// File: frontend/src/services/EscrowService.ts
// NEW: Escrow management for BocaBoca v0.8
// 7-day hold system for New tier users

import { IOTAService } from './IOTAService';
import IOTA_TESTNET_CONFIG from '../config/testnet-config';

export interface EscrowHold {
  id: string;
  userId: string;
  amount: number; // base units (6 decimals)
  displayAmount: string;
  recommendationId: string;
  createdAt: string;
  releaseAt: string;
  status: 'pending' | 'released' | 'forfeited';
  daysRemaining: number;
  canRelease: boolean;
}

export interface EscrowSummary {
  userId: string;
  totalEscrowed: number;
  displayTotal: string;
  pendingHolds: number;
  releasableHolds: number;
  forfeitedTotal: number;
  holds: EscrowHold[];
}

export interface EscrowReleaseResult {
  success: boolean;
  releasedAmount: number;
  displayAmount: string;
  transactionId?: string;
  error?: string;
}

export interface EscrowForfeitResult {
  success: boolean;
  forfeitedAmount: number;
  reporterReward: number; // 10%
  burnedAmount: number; // 90%
  reporterId: string;
  reason: string;
  transactionId?: string;
}

class EscrowService {
  private iotaService: IOTAService;
  private config: typeof IOTA_TESTNET_CONFIG;
  private readonly HOLD_DURATION_DAYS = 7;
  private readonly REPORTER_REWARD_PCT = 0.10; // 10%
  private readonly BURN_PCT = 0.90; // 90%

  constructor() {
    this.iotaService = new IOTAService();
    this.config = IOTA_TESTNET_CONFIG;
  }

  /**
   * Create escrow hold for New tier user reward
   */
  async createEscrowHold(
    userId: string,
    recommendationId: string,
    rewardAmount: number // in base units
  ): Promise<{
    success: boolean;
    escrowId: string;
    releaseDate: string;
    error?: string;
  }> {
    try {
      console.log(`🔒 Creating escrow hold for ${userId}...`);
      console.log(`   Amount: ${this.formatAmount(rewardAmount)}`);
      console.log(`   Recommendation: ${recommendationId}`);

      const result = await this.iotaService.executeContract(
        this.config.contracts.escrow.packageId,
        this.config.contracts.escrow.module,
        this.config.contracts.escrow.functions.create_escrow,
        [userId, recommendationId, rewardAmount.toString()]
      );

      const escrowId = result?.objectChanges?.find(
        (change: any) => change.type === 'created'
      )?.objectId || `escrow_${Date.now()}`;

      const releaseDate = new Date();
      releaseDate.setDate(releaseDate.getDate() + this.HOLD_DURATION_DAYS);

      console.log(`✅ Escrow created: ${escrowId}`);
      console.log(`   Release date: ${releaseDate.toISOString()}`);

      return {
        success: true,
        escrowId,
        releaseDate: releaseDate.toISOString()
      };
    } catch (error) {
      console.error('❌ Failed to create escrow hold:', error);
      return {
        success: false,
        escrowId: '',
        releaseDate: '',
        error: error.message
      };
    }
  }

  /**
   * Get escrow summary for user
   */
  async getEscrowSummary(userId: string): Promise<EscrowSummary> {
    try {
      console.log(`📊 Getting escrow summary for ${userId}...`);

      const escrowData = await this.iotaService.executeContractQuery(
        this.config.contracts.escrow.packageId,
        this.config.contracts.escrow.module,
        this.config.contracts.escrow.functions.get_escrow_status,
        [userId]
      );

      if (!escrowData || !escrowData.holds) {
        return this.createEmptySummary(userId);
      }

      // Process holds
      const holds: EscrowHold[] = escrowData.holds.map((hold: any) => 
        this.processHold(hold)
      );

      // Calculate totals
      const totalEscrowed = holds
        .filter(h => h.status === 'pending')
        .reduce((sum, h) => sum + h.amount, 0);

      const pendingHolds = holds.filter(h => h.status === 'pending').length;
      const releasableHolds = holds.filter(h => h.canRelease).length;
      const forfeitedTotal = holds
        .filter(h => h.status === 'forfeited')
        .reduce((sum, h) => sum + h.amount, 0);

      console.log(`✅ Escrow summary: ${pendingHolds} pending, ${releasableHolds} releasable`);

      return {
        userId,
        totalEscrowed,
        displayTotal: this.formatAmount(totalEscrowed),
        pendingHolds,
        releasableHolds,
        forfeitedTotal,
        holds
      };
    } catch (error) {
      console.error('❌ Failed to get escrow summary:', error);
      return this.createEmptySummary(userId);
    }
  }

  /**
   * Release escrow hold (after 7 days)
   */
  async releaseEscrow(
    escrowId: string,
    userId: string
  ): Promise<EscrowReleaseResult> {
    try {
      console.log(`🔓 Releasing escrow ${escrowId} for ${userId}...`);

      // Check eligibility
      const eligible = await this.checkReleaseEligibility(escrowId, userId);
      
      if (!eligible.canRelease) {
        return {
          success: false,
          releasedAmount: 0,
          displayAmount: '0.00 BOCA',
          error: eligible.reason
        };
      }

      // Execute release
      const result = await this.iotaService.executeContract(
        this.config.contracts.escrow.packageId,
        this.config.contracts.escrow.module,
        this.config.contracts.escrow.functions.release_escrow,
        [escrowId, userId]
      );

      const transactionId = result?.digest || `tx_${Date.now()}`;
      const amount = eligible.amount;

      console.log(`✅ Escrow released: ${this.formatAmount(amount)}`);

      return {
        success: true,
        releasedAmount: amount,
        displayAmount: this.formatAmount(amount),
        transactionId
      };
    } catch (error) {
      console.error('❌ Failed to release escrow:', error);
      return {
        success: false,
        releasedAmount: 0,
        displayAmount: '0.00 BOCA',
        error: error.message
      };
    }
  }

  /**
   * Batch release multiple escrow holds
   */
  async batchReleaseEscrow(
    userId: string
  ): Promise<{
    success: boolean;
    releasedCount: number;
    totalReleased: number;
    displayTotal: string;
    failedReleases: string[];
  }> {
    try {
      console.log(`🔓 Batch releasing escrow holds for ${userId}...`);

      // Get releasable holds
      const summary = await this.getEscrowSummary(userId);
      const releasableHolds = summary.holds.filter(h => h.canRelease);

      if (releasableHolds.length === 0) {
        return {
          success: true,
          releasedCount: 0,
          totalReleased: 0,
          displayTotal: '0.00 BOCA',
          failedReleases: []
        };
      }

      // Execute batch release on contract
      const escrowIds = releasableHolds.map(h => h.id);
      const result = await this.iotaService.executeContract(
        this.config.contracts.escrow.packageId,
        this.config.contracts.escrow.module,
        this.config.contracts.escrow.functions.batch_release,
        [userId, escrowIds]
      );

      const totalReleased = releasableHolds.reduce((sum, h) => sum + h.amount, 0);

      console.log(`✅ Batch release complete: ${releasableHolds.length} holds, ${this.formatAmount(totalReleased)}`);

      return {
        success: true,
        releasedCount: releasableHolds.length,
        totalReleased,
        displayTotal: this.formatAmount(totalReleased),
        failedReleases: []
      };
    } catch (error) {
      console.error('❌ Batch release failed:', error);
      return {
        success: false,
        releasedCount: 0,
        totalReleased: 0,
        displayTotal: '0.00 BOCA',
        failedReleases: []
      };
    }
  }

  /**
   * Forfeit escrow due to spam (moderator action)
   */
  async forfeitEscrow(
    escrowId: string,
    userId: string,
    reporterId: string,
    reason: string
  ): Promise<EscrowForfeitResult> {
    try {
      console.log(`⚠️ Forfeiting escrow ${escrowId} for spam...`);
      console.log(`   User: ${userId}`);
      console.log(`   Reporter: ${reporterId}`);
      console.log(`   Reason: ${reason}`);

      // Get escrow amount
      const summary = await this.getEscrowSummary(userId);
      const hold = summary.holds.find(h => h.id === escrowId);
      
      if (!hold) {
        return {
          success: false,
          forfeitedAmount: 0,
          reporterReward: 0,
          burnedAmount: 0,
          reporterId,
          reason: 'Escrow hold not found'
        };
      }

      // Execute forfeiture
      const result = await this.iotaService.executeContract(
        this.config.contracts.escrow.packageId,
        this.config.contracts.escrow.module,
        this.config.contracts.escrow.functions.forfeit_escrow,
        [escrowId, userId, reporterId, reason]
      );

      const forfeitedAmount = hold.amount;
      const reporterReward = Math.floor(forfeitedAmount * this.REPORTER_REWARD_PCT);
      const burnedAmount = Math.floor(forfeitedAmount * this.BURN_PCT);
      const transactionId = result?.digest || `tx_${Date.now()}`;

      console.log(`✅ Escrow forfeited:`);
      console.log(`   Total: ${this.formatAmount(forfeitedAmount)}`);
      console.log(`   Reporter reward: ${this.formatAmount(reporterReward)} (10%)`);
      console.log(`   Burned: ${this.formatAmount(burnedAmount)} (90%)`);

      return {
        success: true,
        forfeitedAmount,
        reporterReward,
        burnedAmount,
        reporterId,
        reason,
        transactionId
      };
    } catch (error) {
      console.error('❌ Failed to forfeit escrow:', error);
      return {
        success: false,
        forfeitedAmount: 0,
        reporterReward: 0,
        burnedAmount: 0,
        reporterId,
        reason: error.message
      };
    }
  }

  /**
   * Check if escrow can be released
   */
  async checkReleaseEligibility(
    escrowId: string,
    userId: string
  ): Promise<{
    canRelease: boolean;
    reason: string;
    amount: number;
    daysRemaining: number;
  }> {
    try {
      const eligibility = await this.iotaService.executeContractQuery(
        this.config.contracts.escrow.packageId,
        this.config.contracts.escrow.module,
        this.config.contracts.escrow.functions.check_release_eligibility,
        [escrowId, userId]
      );

      return {
        canRelease: eligibility.canRelease || false,
        reason: eligibility.reason || 'Unknown',
        amount: eligibility.amount || 0,
        daysRemaining: eligibility.daysRemaining || 0
      };
    } catch (error) {
      console.error('⚠️ Failed to check eligibility:', error);
      return {
        canRelease: false,
        reason: 'Failed to check eligibility',
        amount: 0,
        daysRemaining: 7
      };
    }
  }

  /**
   * Get escrow holds for a specific recommendation
   */
  async getEscrowByRecommendation(
    recommendationId: string
  ): Promise<EscrowHold | null> {
    try {
      // Query escrow by recommendation ID
      // This would need to be implemented in the contract
      // For now, return null
      return null;
    } catch (error) {
      console.error('❌ Failed to get escrow by recommendation:', error);
      return null;
    }
  }

  /**
   * Get total escrowed amount across all users (admin view)
   */
  async getTotalEscrowedAmount(): Promise<{
    total: number;
    displayTotal: string;
    pendingHolds: number;
    affectedUsers: number;
  }> {
    try {
      // This would query aggregate data from contract
      // For now, return mock data
      return {
        total: 0,
        displayTotal: '0.00 BOCA',
        pendingHolds: 0,
        affectedUsers: 0
      };
    } catch (error) {
      console.error('❌ Failed to get total escrowed:', error);
      return {
        total: 0,
        displayTotal: '0.00 BOCA',
        pendingHolds: 0,
        affectedUsers: 0
      };
    }
  }

  // ========== HELPER METHODS ==========

  /**
   * Process raw escrow hold data
   */
  private processHold(holdData: any): EscrowHold {
    const createdAt = new Date(holdData.createdAt);
    const releaseAt = new Date(holdData.releaseAt);
    const now = new Date();
    
    const daysRemaining = Math.max(
      0,
      Math.ceil((releaseAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    );
    
    const canRelease = now >= releaseAt && holdData.status === 'pending';

    return {
      id: holdData.id,
      userId: holdData.userId,
      amount: holdData.amount,
      displayAmount: this.formatAmount(holdData.amount),
      recommendationId: holdData.recommendationId,
      createdAt: holdData.createdAt,
      releaseAt: holdData.releaseAt,
      status: holdData.status,
      daysRemaining,
      canRelease
    };
  }

  /**
   * Create empty escrow summary
   */
  private createEmptySummary(userId: string): EscrowSummary {
    return {
      userId,
      totalEscrowed: 0,
      displayTotal: '0.00 BOCA',
      pendingHolds: 0,
      releasableHolds: 0,
      forfeitedTotal: 0,
      holds: []
    };
  }

  /**
   * Format token amount for display
   */
  private formatAmount(baseUnits: number): string {
    const amount = baseUnits / 1_000_000; // 6 decimals
    return `${amount.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })} BOCA`;
  }
}

export default EscrowService;