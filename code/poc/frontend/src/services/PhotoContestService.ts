// File: frontend/src/services/PhotoContestService.ts
// NEW: "Serendipity Sunday" photo contest for BocaBoca v0.8

import { IOTAService } from './IOTAService';
import IOTA_TESTNET_CONFIG from '../config/testnet-config';

export interface PhotoNomination {
  id: string;
  nominatorId: string;
  recommendationId: string;
  photoUrl: string;
  title: string;
  description: string;
  nominatedAt: string;
  isFinalist: boolean;
  votes: number;
}

export interface PhotoFinalist {
  nominationId: string;
  nominatorId: string;
  recommendationId: string;
  photoUrl: string;
  title: string;
  description: string;
  votes: number;
  rank: number;
}

export interface PhotoContestStatus {
  week: string;
  phase: 'nomination' | 'finalist_selection' | 'voting' | 'completed';
  nominationsCount: number;
  finalistsCount: number;
  totalVotes: number;
  timeline: {
    nominationStart: string;
    nominationEnd: string;
    finalistSelection: string;
    votingEnd: string;
    announcement: string;
  };
  canNominate: boolean;
  canVote: boolean;
  hasUserNominated: boolean;
  hasUserVoted: boolean;
}

export interface PhotoContestResult {
  week: string;
  announcementDate: string;
  winners: Array<{
    place: number;
    nominationId: string;
    nominatorId: string;
    photoUrl: string;
    title: string;
    votes: number;
    prize: number; // base units
    displayPrize: string;
  }>;
  finalists: PhotoFinalist[];
  totalParticipants: number;
}

class PhotoContestService {
  private iotaService: IOTAService;
  private config: typeof IOTA_TESTNET_CONFIG;
  
  // Contest configuration
  private readonly PRIZE_POOL = 18000000; // 18 BOCA (6 decimals)
  private readonly FIRST_PRIZE = 10000000; // 10 BOCA
  private readonly SECOND_PRIZE = 5000000; // 5 BOCA
  private readonly THIRD_PRIZE = 3000000; // 3 BOCA
  private readonly FINALIST_COUNT = 10;
  private readonly MIN_NOMINATIONS = 3;

  constructor() {
    this.iotaService = new IOTAService();
    this.config = IOTA_TESTNET_CONFIG;
  }

  /**
   * Nominate a photo for the contest
   */
  async nominatePhoto(
    nominatorId: string,
    recommendationId: string,
    photoUrl: string,
    title: string,
    description: string
  ): Promise<{
    success: boolean;
    nominationId: string;
    error?: string;
  }> {
    try {
      console.log(`📸 Nominating photo for contest...`);
      console.log(`   Nominator: ${nominatorId}`);
      console.log(`   Recommendation: ${recommendationId}`);

      const result = await this.iotaService.executeContract(
        this.config.contracts.photo_contest.packageId,
        this.config.contracts.photo_contest.module,
        this.config.contracts.photo_contest.functions.nominate_photo,
        [nominatorId, recommendationId, photoUrl, title, description]
      );

      const nominationId = result?.objectChanges?.find(
        (change: any) => change.type === 'created'
      )?.objectId || `nomination_${Date.now()}`;

      console.log(`✅ Photo nominated: ${nominationId}`);

      return {
        success: true,
        nominationId
      };
    } catch (error) {
      console.error('❌ Failed to nominate photo:', error);
      return {
        success: false,
        nominationId: '',
        error: error.message
      };
    }
  }

  /**
   * Get current contest status
   */
  async getContestStatus(userId?: string): Promise<PhotoContestStatus> {
    try {
      console.log('📸 Getting photo contest status...');

      const timeline = this.getCurrentTimeline();
      const phase = this.getCurrentPhase(timeline);

      const nominations = await this.iotaService.executeContractQuery(
        this.config.contracts.photo_contest.packageId,
        this.config.contracts.photo_contest.module,
        this.config.contracts.photo_contest.functions.get_nominations,
        []
      );

      const finalists = await this.iotaService.executeContractQuery(
        this.config.contracts.photo_contest.packageId,
        this.config.contracts.photo_contest.module,
        this.config.contracts.photo_contest.functions.get_finalists,
        []
      );

      let hasUserNominated = false;
      let hasUserVoted = false;

      if (userId) {
        hasUserNominated = nominations.some((n: any) => n.nominatorId === userId);
        hasUserVoted = await this.hasUserVoted(userId);
      }

      const totalVotes = finalists.reduce((sum: number, f: any) => sum + (f.votes || 0), 0);

      return {
        week: this.getCurrentWeek(),
        phase,
        nominationsCount: nominations.length,
        finalistsCount: finalists.length,
        totalVotes,
        timeline,
        canNominate: phase === 'nomination' && !hasUserNominated,
        canVote: phase === 'voting' && !hasUserVoted,
        hasUserNominated,
        hasUserVoted
      };
    } catch (error) {
      console.error('❌ Failed to get contest status:', error);
      return this.createEmptyStatus();
    }
  }

  /**
   * Get current nominations
   */
  async getNominations(): Promise<PhotoNomination[]> {
    try {
      const nominations = await this.iotaService.executeContractQuery(
        this.config.contracts.photo_contest.packageId,
        this.config.contracts.photo_contest.module,
        this.config.contracts.photo_contest.functions.get_nominations,
        []
      );

      return nominations || [];
    } catch (error) {
      console.error('❌ Failed to get nominations:', error);
      return [];
    }
  }

  /**
   * Get finalists for voting
   */
  async getFinalists(): Promise<PhotoFinalist[]> {
    try {
      const finalists = await this.iotaService.executeContractQuery(
        this.config.contracts.photo_contest.packageId,
        this.config.contracts.photo_contest.module,
        this.config.contracts.photo_contest.functions.get_finalists,
        []
      );

      return finalists
        .map((f: any, index: number) => ({
          ...f,
          rank: index + 1
        }))
        .sort((a: any, b: any) => b.votes - a.votes);
    } catch (error) {
      console.error('❌ Failed to get finalists:', error);
      return [];
    }
  }

  /**
   * Vote for a finalist
   */
  async vote(
    voterId: string,
    nominationId: string
  ): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      console.log(`🗳️ Voting for finalist ${nominationId}...`);

      await this.iotaService.executeContract(
        this.config.contracts.photo_contest.packageId,
        this.config.contracts.photo_contest.module,
        this.config.contracts.photo_contest.functions.vote,
        [voterId, nominationId]
      );

      console.log('✅ Vote recorded');

      return { success: true };
    } catch (error) {
      console.error('❌ Failed to vote:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get contest results
   */
  async getContestResults(week: string): Promise<PhotoContestResult | null> {
    try {
      // Query past contest results
      return null;
    } catch (error) {
      console.error('❌ Failed to get contest results:', error);
      return null;
    }
  }

  /**
   * Claim prize (for winners)
   */
  async claimPrize(
    userId: string,
    week: string
  ): Promise<{
    success: boolean;
    prize: number;
    displayPrize: string;
    place: number;
    transactionId?: string;
    error?: string;
  }> {
    try {
      console.log(`🎁 Claiming photo contest prize for ${userId}...`);

      const result = await this.iotaService.executeContract(
        this.config.contracts.photo_contest.packageId,
        this.config.contracts.photo_contest.module,
        this.config.contracts.photo_contest.functions.claim_prize,
        [userId, week]
      );

      const prize = result?.prize || 0;
      const place = result?.place || 0;
      const transactionId = result?.digest || `tx_${Date.now()}`;

      console.log(`✅ Prize claimed: ${this.formatAmount(prize)} (${this.getPlaceName(place)} place)`);

      return {
        success: true,
        prize,
        displayPrize: this.formatAmount(prize),
        place,
        transactionId
      };
    } catch (error) {
      console.error('❌ Failed to claim prize:', error);
      return {
        success: false,
        prize: 0,
        displayPrize: '0.00 BOCA',
        place: 0,
        error: error.message
      };
    }
  }

  // ========== HELPER METHODS ==========

  /**
   * Get current contest timeline
   */
  private getCurrentTimeline(): PhotoContestStatus['timeline'] {
    const now = new Date();
    const monday = this.getNextMonday(now);
    
    const nominationStart = new Date(monday);
    nominationStart.setUTCHours(0, 0, 0, 0);
    
    const nominationEnd = new Date(monday);
    nominationEnd.setDate(nominationEnd.getDate() + 2); // Wednesday
    nominationEnd.setUTCHours(23, 59, 59, 999);
    
    const finalistSelection = new Date(monday);
    finalistSelection.setDate(finalistSelection.getDate() + 3); // Thursday
    finalistSelection.setUTCHours(9, 0, 0, 0);
    
    const votingEnd = new Date(monday);
    votingEnd.setDate(votingEnd.getDate() + 5); // Saturday
    votingEnd.setUTCHours(23, 59, 59, 999);
    
    const announcement = new Date(monday);
    announcement.setDate(announcement.getDate() + 6); // Sunday
    announcement.setUTCHours(20, 15, 0, 0); // 8:15pm UTC

    return {
      nominationStart: nominationStart.toISOString(),
      nominationEnd: nominationEnd.toISOString(),
      finalistSelection: finalistSelection.toISOString(),
      votingEnd: votingEnd.toISOString(),
      announcement: announcement.toISOString()
    };
  }

  /**
   * Determine current phase
   */
  private getCurrentPhase(timeline: PhotoContestStatus['timeline']): PhotoContestStatus['phase'] {
    const now = new Date();
    
    if (now < new Date(timeline.nominationEnd)) {
      return 'nomination';
    } else if (now < new Date(timeline.finalistSelection)) {
      return 'finalist_selection';
    } else if (now < new Date(timeline.votingEnd)) {
      return 'voting';
    } else {
      return 'completed';
    }
  }

  /**
   * Check if user has voted
   */
  private async hasUserVoted(userId: string): Promise<boolean> {
    try {
      // Query voting records
      return false;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get next Monday
   */
  private getNextMonday(date: Date): Date {
    const d = new Date(date);
    const day = d.getDay();
    const diff = day === 0 ? 1 : (8 - day);
    d.setDate(d.getDate() + diff);
    return d;
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
   * Get week number
   */
  private getWeekNumber(date: Date): number {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
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

  /**
   * Get place name
   */
  private getPlaceName(place: number): string {
    const places = ['', 'First', 'Second', 'Third'];
    return places[place] || `${place}th`;
  }

  /**
   * Create empty status
   */
  private createEmptyStatus(): PhotoContestStatus {
    const timeline = this.getCurrentTimeline();
    return {
      week: this.getCurrentWeek(),
      phase: this.getCurrentPhase(timeline),
      nominationsCount: 0,
      finalistsCount: 0,
      totalVotes: 0,
      timeline,
      canNominate: false,
      canVote: false,
      hasUserNominated: false,
      hasUserVoted: false
    };
  }
}

export default PhotoContestService;