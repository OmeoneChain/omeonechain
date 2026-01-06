// File: frontend/src/services/BountyService.ts  
// NEW: User-pledged bounty system for BocaBoca v0.8

import { IOTAService } from './IOTAService';
import IOTA_TESTNET_CONFIG from '../config/testnet-config';

export interface Bounty {
  id: string;
  title: string;
  description: string;
  category: string;
  location?: {
    city: string;
    region: string;
  };
  creatorId: string;
  createdAt: string;
  totalPledged: number; // base units
  displayPledged: string;
  pledgeCount: number;
  status: 'active' | 'voting' | 'awarded' | 'expired';
  deadline: string;
  submissions: number;
  topSubmission?: {
    recommendationId: string;
    userId: string;
    votes: number;
  };
}

export interface BountySubmission {
  id: string;
  bountyId: string;
  recommendationId: string;
  submitterId: string;
  submittedAt: string;
  votes: number;
  isWinner: boolean;
}

export interface BountyPledge {
  id: string;
  bountyId: string;
  pledgerId: string;
  amount: number; // base units
  displayAmount: string;
  pledgedAt: string;
  refunded: boolean;
}

class BountyService {
  private iotaService: IOTAService;
  private config: typeof IOTA_TESTNET_CONFIG;
  
  // Bounty configuration
  private readonly MIN_PLEDGE = 1000000; // 1 BOCA (6 decimals)
  private readonly VOTING_PERIOD_DAYS = 7;
  private readonly MIN_VOTES = 3;

  constructor() {
    this.iotaService = new IOTAService();
    this.config = IOTA_TESTNET_CONFIG;
  }

  /**
   * Create a new bounty
   */
  async createBounty(
    creatorId: string,
    title: string,
    description: string,
    category: string,
    initialPledge: number, // base units
    location?: { city: string; region: string }
  ): Promise<{
    success: boolean;
    bountyId: string;
    error?: string;
  }> {
    try {
      console.log(`🎯 Creating bounty...`);
      console.log(`   Title: ${title}`);
      console.log(`   Initial pledge: ${this.formatAmount(initialPledge)}`);

      if (initialPledge < this.MIN_PLEDGE) {
        return {
          success: false,
          bountyId: '',
          error: `Minimum pledge is ${this.formatAmount(this.MIN_PLEDGE)}`
        };
      }

      const result = await this.iotaService.executeContract(
        this.config.contracts.bounty.packageId,
        this.config.contracts.bounty.module,
        this.config.contracts.bounty.functions.create_bounty,
        [
          creatorId,
          title,
          description,
          category,
          initialPledge.toString(),
          JSON.stringify(location || {})
        ]
      );

      const bountyId = result?.objectChanges?.find(
        (change: any) => change.type === 'created'
      )?.objectId || `bounty_${Date.now()}`;

      console.log(`✅ Bounty created: ${bountyId}`);

      return {
        success: true,
        bountyId
      };
    } catch (error) {
      console.error('❌ Failed to create bounty:', error);
      return {
        success: false,
        bountyId: '',
        error: error.message
      };
    }
  }

  /**
   * Pledge tokens to a bounty
   */
  async pledgeToBounty(
    bountyId: string,
    pledgerId: string,
    amount: number // base units
  ): Promise<{
    success: boolean;
    pledgeId: string;
    newTotal: number;
    displayTotal: string;
    error?: string;
  }> {
    try {
      console.log(`💰 Pledging to bounty ${bountyId}...`);
      console.log(`   Amount: ${this.formatAmount(amount)}`);

      if (amount < this.MIN_PLEDGE) {
        return {
          success: false,
          pledgeId: '',
          newTotal: 0,
          displayTotal: '0.00 BOCA',
          error: `Minimum pledge is ${this.formatAmount(this.MIN_PLEDGE)}`
        };
      }

      const result = await this.iotaService.executeContract(
        this.config.contracts.bounty.packageId,
        this.config.contracts.bounty.module,
        this.config.contracts.bounty.functions.pledge_to_bounty,
        [bountyId, pledgerId, amount.toString()]
      );

      const pledgeId = result?.objectChanges?.find(
        (change: any) => change.type === 'created'
      )?.objectId || `pledge_${Date.now()}`;

      // Get updated bounty total
      const bounty = await this.getBounty(bountyId);
      const newTotal = bounty?.totalPledged || 0;

      console.log(`✅ Pledge successful`);
      console.log(`   New total: ${this.formatAmount(newTotal)}`);

      return {
        success: true,
        pledgeId,
        newTotal,
        displayTotal: this.formatAmount(newTotal)
      };
    } catch (error) {
      console.error('❌ Failed to pledge to bounty:', error);
      return {
        success: false,
        pledgeId: '',
        newTotal: 0,
        displayTotal: '0.00 BOCA',
        error: error.message
      };
    }
  }

  /**
   * Submit recommendation for bounty
   */
  async submitRecommendation(
    bountyId: string,
    submitterId: string,
    recommendationId: string
  ): Promise<{
    success: boolean;
    submissionId: string;
    error?: string;
  }> {
    try {
      console.log(`📝 Submitting recommendation for bounty ${bountyId}...`);

      const result = await this.iotaService.executeContract(
        this.config.contracts.bounty.packageId,
        this.config.contracts.bounty.module,
        this.config.contracts.bounty.functions.submit_recommendation,
        [bountyId, submitterId, recommendationId]
      );

      const submissionId = result?.objectChanges?.find(
        (change: any) => change.type === 'created'
      )?.objectId || `submission_${Date.now()}`;

      console.log(`✅ Submission recorded: ${submissionId}`);

      return {
        success: true,
        submissionId
      };
    } catch (error) {
      console.error('❌ Failed to submit recommendation:', error);
      return {
        success: false,
        submissionId: '',
        error: error.message
      };
    }
  }

  /**
   * Vote on a submission
   */
  async voteOnSubmission(
    submissionId: string,
    voterId: string
  ): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      console.log(`🗳️ Voting on submission ${submissionId}...`);

      await this.iotaService.executeContract(
        this.config.contracts.bounty.packageId,
        this.config.contracts.bounty.module,
        this.config.contracts.bounty.functions.vote_on_submission,
        [submissionId, voterId]
      );

      console.log('✅ Vote recorded');

      return { success: true };
    } catch (error) {
      console.error('❌ Failed to vote on submission:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get active bounties
   */
  async getActiveBounties(filters?: {
    category?: string;
    minPledge?: number;
    location?: string;
  }): Promise<Bounty[]> {
    try {
      const bounties = await this.iotaService.executeContractQuery(
        this.config.contracts.bounty.packageId,
        this.config.contracts.bounty.module,
        this.config.contracts.bounty.functions.get_active_bounties,
        filters ? [JSON.stringify(filters)] : []
      );

      return (bounties || []).map((b: any) => this.processBounty(b));
    } catch (error) {
      console.error('❌ Failed to get active bounties:', error);
      return [];
    }
  }

  /**
   * Get bounty details
   */
  async getBounty(bountyId: string): Promise<Bounty | null> {
    try {
      const bounty = await this.iotaService.executeContractQuery(
        this.config.contracts.bounty.packageId,
        this.config.contracts.bounty.module,
        this.config.contracts.bounty.functions.get_bounty_details,
        [bountyId]
      );

      return bounty ? this.processBounty(bounty) : null;
    } catch (error) {
      console.error('❌ Failed to get bounty:', error);
      return null;
    }
  }

  /**
   * Get submissions for a bounty
   */
  async getBountySubmissions(bountyId: string): Promise<BountySubmission[]> {
    try {
      // Query submissions
      return [];
    } catch (error) {
      console.error('❌ Failed to get submissions:', error);
      return [];
    }
  }

  /**
   * Claim bounty (for winner)
   */
  async claimBounty(
    bountyId: string,
    winnerId: string
  ): Promise<{
    success: boolean;
    amount: number;
    displayAmount: string;
    transactionId?: string;
    error?: string;
  }> {
    try {
      console.log(`🎁 Claiming bounty ${bountyId}...`);

      const result = await this.iotaService.executeContract(
        this.config.contracts.bounty.packageId,
        this.config.contracts.bounty.module,
        this.config.contracts.bounty.functions.claim_bounty,
        [bountyId, winnerId]
      );

      const amount = result?.amount || 0;
      const transactionId = result?.digest || `tx_${Date.now()}`;

      console.log(`✅ Bounty claimed: ${this.formatAmount(amount)}`);

      return {
        success: true,
        amount,
        displayAmount: this.formatAmount(amount),
        transactionId
      };
    } catch (error) {
      console.error('❌ Failed to claim bounty:', error);
      return {
        success: false,
        amount: 0,
        displayAmount: '0.00 BOCA',
        error: error.message
      };
    }
  }

  /**
   * Refund bounty (if no valid submissions)
   */
  async refundBounty(
    bountyId: string,
    requesterId: string
  ): Promise<{
    success: boolean;
    refundedAmount: number;
    displayAmount: string;
    error?: string;
  }> {
    try {
      console.log(`💸 Requesting bounty refund ${bountyId}...`);

      const result = await this.iotaService.executeContract(
        this.config.contracts.bounty.packageId,
        this.config.contracts.bounty.module,
        this.config.contracts.bounty.functions.refund_bounty,
        [bountyId, requesterId]
      );

      const amount = result?.amount || 0;

      console.log(`✅ Bounty refunded: ${this.formatAmount(amount)}`);

      return {
        success: true,
        refundedAmount: amount,
        displayAmount: this.formatAmount(amount)
      };
    } catch (error) {
      console.error('❌ Failed to refund bounty:', error);
      return {
        success: false,
        refundedAmount: 0,
        displayAmount: '0.00 BOCA',
        error: error.message
      };
    }
  }

  /**
   * Get user's bounty activity
   */
  async getUserBountyActivity(userId: string): Promise<{
    created: Bounty[];
    pledged: Array<{ bounty: Bounty; pledge: BountyPledge }>;
    submitted: Array<{ bounty: Bounty; submission: BountySubmission }>;
    won: Array<{ bounty: Bounty; prize: number }>;
  }> {
    try {
      // Query user's bounty activities
      return {
        created: [],
        pledged: [],
        submitted: [],
        won: []
      };
    } catch (error) {
      console.error('❌ Failed to get user bounty activity:', error);
      return {
        created: [],
        pledged: [],
        submitted: [],
        won: []
      };
    }
  }

  // ========== HELPER METHODS ==========

  /**
   * Process raw bounty data
   */
  private processBounty(bountyData: any): Bounty {
    return {
      id: bountyData.id,
      title: bountyData.title,
      description: bountyData.description,
      category: bountyData.category,
      location: bountyData.location ? JSON.parse(bountyData.location) : undefined,
      creatorId: bountyData.creatorId,
      createdAt: bountyData.createdAt,
      totalPledged: bountyData.totalPledged,
      displayPledged: this.formatAmount(bountyData.totalPledged),
      pledgeCount: bountyData.pledgeCount,
      status: bountyData.status,
      deadline: bountyData.deadline,
      submissions: bountyData.submissions,
      topSubmission: bountyData.topSubmission
    };
  }

  /**
   * Format amount
   */
  private formatAmount(baseUnits: number): string {
    const amount = baseUnits / 1_000_000;
    return `${amount.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })} BOCA`;
  }
}

export default BountyService;