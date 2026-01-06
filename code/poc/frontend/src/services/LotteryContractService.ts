// File: frontend/src/services/LotteryContractService.ts
// Smart contract service for lottery blockchain interactions
// Handles prize claiming, verification, and on-chain operations

import { IOTAService } from './IOTAService';
import IOTA_TESTNET_CONFIG from '../config/testnet-config';

export interface PrizeClaimResult {
  success: boolean;
  transactionId?: string;
  prizeAmount?: number;
  error?: string;
}

export interface DrawingVerification {
  isValid: boolean;
  drawingId: string;
  blockHeight?: number;
  transactionId?: string;
  winners?: {
    first?: string;
    second?: string;
    third?: string;
  };
}

class LotteryContractService {
  private iotaService: IOTAService;
  private config: typeof IOTA_TESTNET_CONFIG;

  constructor() {
    this.iotaService = new IOTAService();
    this.config = IOTA_TESTNET_CONFIG;
  }

  /**
   * Verify lottery drawing on blockchain
   * Checks that the drawing was executed correctly and fairly
   */
  async verifyDrawing(drawingId: string): Promise<DrawingVerification> {
    try {
      console.log(`🔍 Verifying lottery drawing ${drawingId} on-chain...`);

      // Query the smart contract for drawing details
      const result = await this.iotaService.executeContractQuery(
        this.config.contracts.lottery.packageId,
        this.config.contracts.lottery.module,
        this.config.contracts.lottery.functions.get_drawing_details,
        [drawingId]
      );

      if (!result) {
        return {
          isValid: false,
          drawingId,
          error: 'Drawing not found on chain',
        };
      }

      console.log('✅ Drawing verified on-chain:', result);

      return {
        isValid: true,
        drawingId,
        blockHeight: result.blockHeight,
        transactionId: result.transactionId,
        winners: {
          first: result.firstPlaceWinner,
          second: result.secondPlaceWinner,
          third: result.thirdPlaceWinner,
        },
      };
    } catch (error) {
      console.error('❌ Failed to verify drawing:', error);
      return {
        isValid: false,
        drawingId,
        error: error instanceof Error ? error.message : 'Verification failed',
      };
    }
  }

  /**
   * Claim lottery prize (for winners)
   * Executes smart contract transaction to transfer tokens
   */
  async claimPrize(userId: string, drawingId: string): Promise<PrizeClaimResult> {
    try {
      console.log(`💰 Claiming lottery prize for user ${userId}, drawing ${drawingId}...`);

      // Execute smart contract to claim prize
      const result = await this.iotaService.executeContract(
        this.config.contracts.lottery.packageId,
        this.config.contracts.lottery.module,
        this.config.contracts.lottery.functions.claim_prize,
        [userId, drawingId]
      );

      if (!result) {
        return {
          success: false,
          error: 'Failed to execute claim transaction',
        };
      }

      const prizeAmount = result.prizeAmount || 0;
      const transactionId = result.digest || result.transactionId;

      console.log(`✅ Prize claimed successfully: ${prizeAmount} BOCA`);
      console.log(`   Transaction ID: ${transactionId}`);

      return {
        success: true,
        transactionId,
        prizeAmount,
      };
    } catch (error) {
      console.error('❌ Failed to claim prize:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Claim failed',
      };
    }
  }

  /**
   * Check if user has unclaimed prizes
   */
  async checkUnclaimedPrizes(userId: string): Promise<{
    hasUnclaimed: boolean;
    prizes: Array<{
      drawingId: string;
      place: 'first' | 'second' | 'third';
      amount: number;
      weekEnd: string;
    }>;
  }> {
    try {
      console.log(`🔍 Checking unclaimed prizes for user ${userId}...`);

      const result = await this.iotaService.executeContractQuery(
        this.config.contracts.lottery.packageId,
        this.config.contracts.lottery.module,
        this.config.contracts.lottery.functions.get_unclaimed_prizes,
        [userId]
      );

      if (!result || !result.prizes || result.prizes.length === 0) {
        return {
          hasUnclaimed: false,
          prizes: [],
        };
      }

      console.log(`✅ Found ${result.prizes.length} unclaimed prizes`);

      return {
        hasUnclaimed: true,
        prizes: result.prizes,
      };
    } catch (error) {
      console.error('❌ Failed to check unclaimed prizes:', error);
      return {
        hasUnclaimed: false,
        prizes: [],
      };
    }
  }

  /**
   * Get on-chain lottery statistics
   */
  async getLotteryStats(): Promise<{
    totalDrawings: number;
    totalPrizesDistributed: number;
    totalParticipants: number;
    totalTickets: number;
  }> {
    try {
      console.log('📊 Fetching on-chain lottery statistics...');

      const result = await this.iotaService.executeContractQuery(
        this.config.contracts.lottery.packageId,
        this.config.contracts.lottery.module,
        this.config.contracts.lottery.functions.get_stats,
        []
      );

      return {
        totalDrawings: result?.totalDrawings || 0,
        totalPrizesDistributed: result?.totalPrizesDistributed || 0,
        totalParticipants: result?.totalParticipants || 0,
        totalTickets: result?.totalTickets || 0,
      };
    } catch (error) {
      console.error('❌ Failed to fetch lottery stats:', error);
      return {
        totalDrawings: 0,
        totalPrizesDistributed: 0,
        totalParticipants: 0,
        totalTickets: 0,
      };
    }
  }

  /**
   * Verify VRF randomness for a drawing (provably fair verification)
   */
  async verifyVRF(drawingId: string): Promise<{
    isValid: boolean;
    vrfProof?: string;
    randomness?: string;
  }> {
    try {
      console.log(`🔍 Verifying VRF randomness for drawing ${drawingId}...`);

      // TODO: Implement IOTA Rebased VRF verification
      // This will verify that the random number used for winner selection
      // was generated fairly using verifiable random function

      const result = await this.iotaService.executeContractQuery(
        this.config.contracts.lottery.packageId,
        this.config.contracts.lottery.module,
        this.config.contracts.lottery.functions.verify_vrf,
        [drawingId]
      );

      return {
        isValid: result?.isValid || false,
        vrfProof: result?.proof,
        randomness: result?.randomness,
      };
    } catch (error) {
      console.error('❌ Failed to verify VRF:', error);
      return {
        isValid: false,
      };
    }
  }
}

export default LotteryContractService;