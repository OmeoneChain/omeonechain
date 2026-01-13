/**
 * BocaBoca Reward Service
 * =======================
 * 
 * Business logic layer for token reward distribution
 * Implements two-tier system:
 *   - email_basic users: Rewards stored in Supabase pending_tokens
 *   - wallet_full users: Rewards minted on-chain immediately
 * 
 * Target location: code/poc/core/src/services/reward-service.ts
 * 
 * @version 1.1.0 - Added users.tokens_earned sync for frontend compatibility
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { 
  IOTAClient, 
  getIOTAClient, 
  MintResult, 
  TransactionResult 
} from '../blockchain/iota-client';
import { 
  REWARDS, 
  REWARDS_DISPLAY,
  USER_TIERS,
  TOKEN_CONFIG,
  toBaseUnits,
  toDisplayAmount,
  formatBoca,
  calculateTieredReward,
} from '../blockchain/contracts';

// =============================================================================
// TYPES & INTERFACES
// =============================================================================

export type UserAuthTier = 'email_basic' | 'wallet_full';

export type RewardAction = 
  | 'recommendation'
  | 'recommendation_email'      // Separate action for email-tier creation (2.5 BOCA)
  | 'first_reviewer'            // First review of a new restaurant (+10.0 BOCA)
  | 'upvote_given'
  | 'upvote_received'
  | 'save_received'             // For bookmark/save engagement
  | 'comment_received'          // Author earns when someone comments (0.5 BOCA)
  | 'first_upvote_bonus'
  | 'comment'                   // Commenter reward (if applicable)
  | 'share'                     // Reshare reward (2.0 BOCA to resharer)
  | 'reshare_attribution'       // Attribution to original author (1.0 BOCA)
  | 'boost'
  | 'daily_login'
  | 'streak_bonus_7_day'
  | 'referral'
  | 'profile_complete'
  | 'new_restaurant'
  | 'photo_upload'
  | 'validation_bonus'          // +10.0 BOCA when rec reaches 3.0 engagement points
  | 'list_creation'             // 5.0 BOCA for creating list with 5+ items
  | 'list_10_saves'             // 10.0 BOCA when list reaches 10 saves
  | 'list_50_saves';            // 20.0 BOCA when list reaches 50 saves

export interface User {
  id: string;
  email?: string;
  wallet_address?: string;
  account_tier: UserAuthTier;      // Maps to your 'account_tier' column
  trust_tier: 1 | 2 | 3;           // Derived from 'reputation_tier' column
  reputation_tier: string;         // Raw value: 'new', 'established', 'trusted'
  created_at: string;
  tokens_earned?: number;          // NEW: Current balance for sync
}

export interface PendingReward {
  id: string;
  user_id: string;
  action: RewardAction;
  amount: number;          // Base units
  display_amount: number;  // Display units
  created_at: string;
  claimed_at?: string;
  tx_digest?: string;
  status: 'pending' | 'claimed' | 'expired' | 'failed';
  metadata?: Record<string, unknown>;
}

export interface RewardResult {
  success: boolean;
  action: RewardAction;
  amount: number;           // Base units
  displayAmount: number;    // Display units
  method: 'on_chain' | 'pending';
  txDigest?: string;
  pendingRewardId?: string;
  newBalance?: number;      // NEW: Updated tokens_earned balance
  error?: string;
}

export interface ClaimResult {
  success: boolean;
  totalClaimed: number;     // Base units
  displayAmount: number;    // Display units
  txDigest?: string;
  rewardsClaimed: number;   // Count of rewards claimed
  error?: string;
}

export interface RewardEligibility {
  eligible: boolean;
  reason?: string;
  cooldownRemaining?: number;  // Seconds until eligible
  dailyLimitRemaining?: number;
}

export interface DailyRewardStats {
  date: string;
  totalEarned: number;
  actionCounts: Record<RewardAction, number>;
}

export interface RewardServiceConfig {
  /** Supabase URL */
  supabaseUrl?: string;
  
  /** Supabase service role key */
  supabaseKey?: string;
  
  /** Enable anti-abuse checks */
  enableAntiAbuse?: boolean;
  
  /** Daily reward cap per user (in display units) */
  dailyRewardCap?: number;
  
  /** Cooldown between same actions (seconds) */
  actionCooldowns?: Partial<Record<RewardAction, number>>;
}

// =============================================================================
// CONSTANTS
// =============================================================================

/** Default cooldowns in seconds */
const DEFAULT_COOLDOWNS: Record<RewardAction, number> = {
  recommendation: 60,          // 1 minute between recommendations
  recommendation_email: 60,    // Same cooldown for email tier
  first_reviewer: 0,           // No cooldown (one-time per restaurant)
  upvote_given: 5,             // 5 seconds between upvotes
  upvote_received: 0,          // No cooldown (triggered by others)
  save_received: 0,            // No cooldown (triggered by others)
  comment_received: 0,         // No cooldown (triggered by others)
  first_upvote_bonus: 0,       // No cooldown (triggered by others)
  comment: 30,                 // 30 seconds between comments
  share: 60,                   // 1 minute between shares
  reshare_attribution: 0,      // No cooldown (triggered by others)
  boost: 300,                  // 5 minutes between boosts
  daily_login: 86400,          // 24 hours
  streak_bonus_7_day: 604800,  // 7 days
  referral: 0,                 // No cooldown (triggered by referees)
  profile_complete: Infinity,  // One-time only
  new_restaurant: 300,         // 5 minutes between adding restaurants
  photo_upload: 60,            // 1 minute between photos
  validation_bonus: 0,         // No cooldown (triggered by engagement threshold)
  list_creation: 0,            // No cooldown (milestone-based)
  list_10_saves: 0,            // No cooldown (milestone-based)
  list_50_saves: 0,            // No cooldown (milestone-based)
};

/** Daily limits per action (0 = unlimited) */
const DAILY_ACTION_LIMITS: Partial<Record<RewardAction, number>> = {
  recommendation: 10,
  recommendation_email: 10,
  upvote_given: 50,
  comment: 30,
  share: 20,
  boost: 5,
  photo_upload: 10,
  new_restaurant: 5,
};

/** Default daily reward cap (100 BOCA) */
const DEFAULT_DAILY_CAP = 100;

/** 
 * Map action names to reward amounts (in base units)
 * White Paper v1.02 values
 */
const ACTION_TO_REWARD: Record<RewardAction, number> = {
  recommendation: REWARDS.RECOMMENDATION,           // 5.0 BOCA (wallet tier)
  recommendation_email: REWARDS.RECOMMENDATION / 2, // 2.5 BOCA (email tier)
  first_reviewer: REWARDS.REFERRAL,                 // 10.0 BOCA (same as referral amount)
  upvote_given: REWARDS.UPVOTE_GIVEN,               // 0.5 BOCA
  upvote_received: REWARDS.UPVOTE_RECEIVED,         // 1.0 BOCA base
  save_received: REWARDS.UPVOTE_RECEIVED,           // 1.0 BOCA base (same as upvote)
  comment_received: REWARDS.COMMENT,                // 0.5 BOCA base (tier-weighted)
  first_upvote_bonus: REWARDS.FIRST_UPVOTE_BONUS,   // 2.0 BOCA
  comment: REWARDS.COMMENT,                         // 0.5 BOCA
  share: REWARDS.FIRST_UPVOTE_BONUS,                // 2.0 BOCA (White Paper v1.02: reshare = 2.0)
  reshare_attribution: REWARDS.UPVOTE_RECEIVED,     // 1.0 BOCA (attribution to author)
  boost: REWARDS.BOOST,                             // 1.0 BOCA
  daily_login: REWARDS.DAILY_LOGIN,                 // 1.0 BOCA
  streak_bonus_7_day: REWARDS.STREAK_BONUS_7_DAY,   // 5.0 BOCA
  referral: REWARDS.REFERRAL,                       // 10.0 BOCA
  profile_complete: REWARDS.PROFILE_COMPLETE,       // 5.0 BOCA
  new_restaurant: REWARDS.NEW_RESTAURANT,           // 3.0 BOCA
  photo_upload: REWARDS.PHOTO_UPLOAD,               // 2.0 BOCA
  validation_bonus: REWARDS.REFERRAL,               // 10.0 BOCA (same as referral)
  list_creation: REWARDS.PROFILE_COMPLETE,          // 5.0 BOCA (list with 5+ items)
  list_10_saves: REWARDS.REFERRAL,                  // 10.0 BOCA (list reaches 10 saves)
  list_50_saves: REWARDS.REFERRAL * 2,              // 20.0 BOCA (list reaches 50 saves)
};

// =============================================================================
// REWARD SERVICE CLASS
// =============================================================================

export class RewardService {
  private supabase: SupabaseClient;
  private iotaClient: IOTAClient;
  private config: Required<RewardServiceConfig>;

  constructor(config: RewardServiceConfig = {}) {
    this.config = {
      supabaseUrl: config.supabaseUrl || process.env.SUPABASE_URL || '',
      supabaseKey: config.supabaseKey || process.env.SUPABASE_SERVICE_ROLE_KEY || '',
      enableAntiAbuse: config.enableAntiAbuse ?? true,
      dailyRewardCap: config.dailyRewardCap || DEFAULT_DAILY_CAP,
      actionCooldowns: { ...DEFAULT_COOLDOWNS, ...config.actionCooldowns },
    };

    // Initialize Supabase client
    if (!this.config.supabaseUrl || !this.config.supabaseKey) {
      console.warn('[RewardService] Supabase credentials not configured. Pending rewards will not work.');
    }
    this.supabase = createClient(this.config.supabaseUrl, this.config.supabaseKey);

    // Get IOTA client singleton
    this.iotaClient = getIOTAClient();
  }

  // ===========================================================================
  // PUBLIC API - Core Reward Methods
  // ===========================================================================

  /**
   * Award tokens for a user action
   * Automatically handles two-tier logic:
   *   - wallet_full: Mints tokens on-chain
   *   - email_basic: Stores in pending_tokens table
   * 
   * ALSO updates users.tokens_earned for frontend display compatibility
   * 
   * @param userId - User's database ID
   * @param action - The action being rewarded
   * @param metadata - Optional metadata (e.g., recommendation ID)
   * @returns RewardResult with transaction details or pending reward ID
   */
  async awardReward(
    userId: string,
    action: RewardAction,
    metadata?: Record<string, unknown>
  ): Promise<RewardResult> {
    try {
      // Get user details
      const user = await this.getUser(userId);
      if (!user) {
        return this.errorResult(action, 'User not found');
      }

      // Check eligibility
      if (this.config.enableAntiAbuse) {
        const eligibility = await this.checkEligibility(userId, action);
        if (!eligibility.eligible) {
          return this.errorResult(action, eligibility.reason || 'Not eligible for reward');
        }
      }

      // Calculate reward amount
      // IMPORTANT: Tier weighting only applies to ENGAGEMENT rewards (upvote_received, save_received)
      // Creation rewards (recommendation, recommendation_email) are FLAT per White Paper v1.02
      const baseAmount = ACTION_TO_REWARD[action];
      
      // Determine if this is an engagement reward that should be tier-weighted
      const engagementActions: RewardAction[] = [
        'upvote_received', 
        'save_received', 
        'comment_received', 
        'reshare_attribution',  // Attribution reward weighted by resharer's tier
        'upvote_given'
      ];
      const isEngagementReward = engagementActions.includes(action);
      
      let tieredAmount: bigint;
      if (isEngagementReward) {
        // For engagement rewards, apply tier weighting
        // Use engager's tier if provided, otherwise use recipient's tier
        const tierForCalculation = metadata?.engager_trust_tier as (1 | 2 | 3) | undefined;
        tieredAmount = tierForCalculation 
          ? calculateTieredReward(baseAmount, tierForCalculation)
          : calculateTieredReward(baseAmount, user.trust_tier);
      } else {
        // For creation rewards (recommendation, daily_login, etc.), use flat amount
        tieredAmount = BigInt(baseAmount);
      }
      
      const displayAmount = toDisplayAmount(tieredAmount);

      // Route based on account tier
      if (user.account_tier === 'wallet_full' && user.wallet_address) {
        // On-chain minting for wallet users
        return this.mintRewardOnChain(user, action, tieredAmount, metadata);
      } else {
        // Store pending reward for email users
        return this.storePendingReward(user, action, tieredAmount, metadata);
      }
    } catch (error) {
      console.error(`[RewardService] awardReward error for ${action}:`, error);
      return this.errorResult(action, error instanceof Error ? error.message : 'Unknown error');
    }
  }

  /**
   * Claim all pending rewards for a user
   * Called when email user upgrades to wallet user
   * 
   * @param userId - User's database ID
   * @param walletAddress - User's new wallet address
   * @returns ClaimResult with total claimed and transaction digest
   */
  async claimPendingRewards(userId: string, walletAddress: string): Promise<ClaimResult> {
    try {
      // Get all pending rewards
      const { data: pendingRewards, error } = await this.supabase
        .from('pending_tokens')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'pending')
        .order('created_at', { ascending: true });

      if (error) {
        throw new Error(`Failed to fetch pending rewards: ${error.message}`);
      }

      if (!pendingRewards || pendingRewards.length === 0) {
        return {
          success: true,
          totalClaimed: 0,
          displayAmount: 0,
          rewardsClaimed: 0,
        };
      }

      // Calculate total
      const totalAmount = pendingRewards.reduce(
        (sum, reward) => sum + BigInt(reward.amount),
        BigInt(0)
      );

      // Mint total to wallet
      const mintResult = await this.iotaClient.mintTokens(
        walletAddress,
        toDisplayAmount(totalAmount)
      );

      if (!mintResult.success) {
        // Mark rewards as failed
        await this.updatePendingRewardsStatus(
          pendingRewards.map(r => r.id),
          'failed'
        );

        return {
          success: false,
          totalClaimed: 0,
          displayAmount: 0,
          rewardsClaimed: 0,
          error: mintResult.error,
        };
      }

      // Mark rewards as claimed
      await this.updatePendingRewardsStatus(
        pendingRewards.map(r => r.id),
        'claimed',
        mintResult.digest
      );

      // Log the claim
      await this.logRewardEvent(userId, 'claim_pending', Number(totalAmount), {
        rewards_claimed: pendingRewards.length,
        tx_digest: mintResult.digest,
      });

      return {
        success: true,
        totalClaimed: Number(totalAmount),
        displayAmount: toDisplayAmount(totalAmount),
        txDigest: mintResult.digest,
        rewardsClaimed: pendingRewards.length,
      };
    } catch (error) {
      console.error('[RewardService] claimPendingRewards error:', error);
      return {
        success: false,
        totalClaimed: 0,
        displayAmount: 0,
        rewardsClaimed: 0,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get pending rewards balance for a user
   * 
   * @param userId - User's database ID
   * @returns Total pending balance in base and display units
   */
  async getPendingBalance(userId: string): Promise<{ balance: number; displayBalance: string }> {
    try {
      const { data, error } = await this.supabase
        .from('pending_tokens')
        .select('amount')
        .eq('user_id', userId)
        .eq('status', 'pending');

      if (error) {
        throw new Error(`Failed to fetch pending balance: ${error.message}`);
      }

      const total = (data || []).reduce((sum, r) => sum + Number(r.amount), 0);

      return {
        balance: total,
        displayBalance: formatBoca(total),
      };
    } catch (error) {
      console.error('[RewardService] getPendingBalance error:', error);
      return { balance: 0, displayBalance: '0.00 BOCA' };
    }
  }

  /**
   * Get pending rewards list for a user
   * 
   * @param userId - User's database ID
   * @returns Array of pending rewards
   */
  async getPendingRewards(userId: string): Promise<PendingReward[]> {
    try {
      const { data, error } = await this.supabase
        .from('pending_tokens')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) {
        throw new Error(`Failed to fetch pending rewards: ${error.message}`);
      }

      return (data || []).map(r => ({
        ...r,
        display_amount: toDisplayAmount(r.amount),
      }));
    } catch (error) {
      console.error('[RewardService] getPendingRewards error:', error);
      return [];
    }
  }

  // ===========================================================================
  // PUBLIC API - Eligibility & Stats
  // ===========================================================================

  /**
   * Check if user is eligible for a specific reward action
   * 
   * @param userId - User's database ID
   * @param action - The action to check
   * @returns Eligibility status with reason if not eligible
   */
  async checkEligibility(userId: string, action: RewardAction): Promise<RewardEligibility> {
    try {
      // Check cooldown
      const cooldown = this.config.actionCooldowns[action] || DEFAULT_COOLDOWNS[action];
      if (cooldown > 0 && cooldown !== Infinity) {
        const lastAction = await this.getLastActionTime(userId, action);
        if (lastAction) {
          const elapsed = (Date.now() - new Date(lastAction).getTime()) / 1000;
          if (elapsed < cooldown) {
            return {
              eligible: false,
              reason: `Please wait before performing this action again`,
              cooldownRemaining: Math.ceil(cooldown - elapsed),
            };
          }
        }
      }

      // Check one-time actions
      if (cooldown === Infinity) {
        const hasCompleted = await this.hasCompletedAction(userId, action);
        if (hasCompleted) {
          return {
            eligible: false,
            reason: 'This reward can only be earned once',
          };
        }
      }

      // Check daily limit
      const dailyLimit = DAILY_ACTION_LIMITS[action];
      if (dailyLimit && dailyLimit > 0) {
        const todayCount = await this.getTodayActionCount(userId, action);
        if (todayCount >= dailyLimit) {
          return {
            eligible: false,
            reason: `Daily limit reached for this action (${dailyLimit}/day)`,
            dailyLimitRemaining: 0,
          };
        }
      }

      // Check daily reward cap
      const todayStats = await this.getTodayRewardStats(userId);
      const todayTotal = toDisplayAmount(todayStats.totalEarned);
      if (todayTotal >= this.config.dailyRewardCap) {
        return {
          eligible: false,
          reason: `Daily reward cap reached (${this.config.dailyRewardCap} BOCA/day)`,
        };
      }

      return { eligible: true };
    } catch (error) {
      console.error('[RewardService] checkEligibility error:', error);
      // Fail open - allow reward if check fails
      return { eligible: true };
    }
  }

  /**
   * Get today's reward statistics for a user
   * 
   * @param userId - User's database ID
   * @returns Daily stats including total earned and action counts
   */
  async getTodayRewardStats(userId: string): Promise<DailyRewardStats> {
    const today = new Date().toISOString().split('T')[0];
    
    try {
      const { data, error } = await this.supabase
        .from('reward_events')
        .select('action, amount')
        .eq('user_id', userId)
        .gte('created_at', `${today}T00:00:00Z`)
        .lt('created_at', `${today}T23:59:59Z`);

      if (error) {
        throw new Error(`Failed to fetch daily stats: ${error.message}`);
      }

      const actionCounts: Record<RewardAction, number> = {} as Record<RewardAction, number>;
      let totalEarned = 0;

      for (const event of data || []) {
        actionCounts[event.action as RewardAction] = 
          (actionCounts[event.action as RewardAction] || 0) + 1;
        totalEarned += Number(event.amount);
      }

      return {
        date: today,
        totalEarned,
        actionCounts,
      };
    } catch (error) {
      console.error('[RewardService] getTodayRewardStats error:', error);
      return {
        date: today,
        totalEarned: 0,
        actionCounts: {} as Record<RewardAction, number>,
      };
    }
  }

  /**
   * Get lifetime reward statistics for a user
   * 
   * @param userId - User's database ID
   * @returns Total lifetime earnings and action breakdown
   */
  async getLifetimeStats(userId: string): Promise<{
    totalEarned: number;
    displayTotal: string;
    actionBreakdown: Record<RewardAction, { count: number; total: number }>;
  }> {
    try {
      const { data, error } = await this.supabase
        .from('reward_events')
        .select('action, amount')
        .eq('user_id', userId);

      if (error) {
        throw new Error(`Failed to fetch lifetime stats: ${error.message}`);
      }

      const breakdown: Record<RewardAction, { count: number; total: number }> = 
        {} as Record<RewardAction, { count: number; total: number }>;
      let totalEarned = 0;

      for (const event of data || []) {
        const action = event.action as RewardAction;
        if (!breakdown[action]) {
          breakdown[action] = { count: 0, total: 0 };
        }
        breakdown[action].count++;
        breakdown[action].total += Number(event.amount);
        totalEarned += Number(event.amount);
      }

      return {
        totalEarned,
        displayTotal: formatBoca(totalEarned),
        actionBreakdown: breakdown,
      };
    } catch (error) {
      console.error('[RewardService] getLifetimeStats error:', error);
      return {
        totalEarned: 0,
        displayTotal: '0.00 BOCA',
        actionBreakdown: {} as Record<RewardAction, { count: number; total: number }>,
      };
    }
  }

  // ===========================================================================
  // PUBLIC API - Convenience Methods for Specific Actions
  // ===========================================================================

  /** 
   * Award recommendation creation reward
   * Automatically handles account tier differentiation:
   *   - wallet_full: 5.0 BOCA
   *   - email_basic: 2.5 BOCA
   */
  async awardRecommendation(
    userId: string, 
    recommendationId: string,
    accountTier?: UserAuthTier | string
  ): Promise<RewardResult> {
    // Determine correct action based on account tier
    // If accountTier not provided, fetch it
    let tier = accountTier;
    if (!tier) {
      const user = await this.getUser(userId);
      tier = user?.account_tier || 'email_basic';
    }
  
    // Check for any wallet-based tier (handles 'wallet', 'wallet_full', etc.)
    const isWalletTier = tier?.toLowerCase().includes('wallet');
    const action: RewardAction = isWalletTier ? 'recommendation' : 'recommendation_email';
  
    return this.awardReward(userId, action, { recommendation_id: recommendationId });
  }

  /** Award upvote given reward (to the person giving the upvote) */
  async awardUpvoteGiven(userId: string, recommendationId: string): Promise<RewardResult> {
    return this.awardReward(userId, 'upvote_given', { recommendation_id: recommendationId });
  }

  /** 
   * Award upvote/like received reward (to the recommendation author)
   * Tier weighting is based on the ENGAGER's tier, not the author's
   */
  async awardUpvoteReceived(
    authorId: string, 
    recommendationId: string, 
    engagerId: string
  ): Promise<RewardResult> {
    // Get engager's trust tier for weighting
    const engager = await this.getUser(engagerId);
    const engagerTrustTier = engager?.trust_tier || 2; // Default to established
    
    return this.awardReward(authorId, 'upvote_received', { 
      recommendation_id: recommendationId,
      engager_id: engagerId,
      engager_trust_tier: engagerTrustTier,
    });
  }

  /**
   * Award save/bookmark received reward (to the recommendation author)
   * Tier weighting is based on the ENGAGER's tier, not the author's
   */
  async awardSaveReceived(
    authorId: string,
    recommendationId: string,
    engagerId: string
  ): Promise<RewardResult> {
    // Get engager's trust tier for weighting
    const engager = await this.getUser(engagerId);
    const engagerTrustTier = engager?.trust_tier || 2; // Default to established
    
    return this.awardReward(authorId, 'save_received', {
      recommendation_id: recommendationId,
      engager_id: engagerId,
      engager_trust_tier: engagerTrustTier,
    });
  }

  /** Award first upvote bonus */
  async awardFirstUpvoteBonus(userId: string, recommendationId: string): Promise<RewardResult> {
    return this.awardReward(userId, 'first_upvote_bonus', { recommendation_id: recommendationId });
  }

  /** Award daily login reward */
  async awardDailyLogin(userId: string): Promise<RewardResult> {
    return this.awardReward(userId, 'daily_login');
  }

  /** Award streak bonus */
  async awardStreakBonus(userId: string, streakDays: number): Promise<RewardResult> {
    return this.awardReward(userId, 'streak_bonus_7_day', { streak_days: streakDays });
  }

  /** Award referral reward */
  async awardReferral(referrerId: string, refereeId: string): Promise<RewardResult> {
    return this.awardReward(referrerId, 'referral', { referee_id: refereeId });
  }

  /** Award profile completion reward */
  async awardProfileComplete(userId: string): Promise<RewardResult> {
    return this.awardReward(userId, 'profile_complete');
  }

  /** Award comment reward (to commenter) */
  async awardComment(userId: string, recommendationId: string): Promise<RewardResult> {
    return this.awardReward(userId, 'comment', { recommendation_id: recommendationId });
  }

  /** Award share/reshare reward */
  async awardShare(userId: string, recommendationId: string): Promise<RewardResult> {
    return this.awardReward(userId, 'share', { recommendation_id: recommendationId });
  }

  /**
   * Award first reviewer bonus (+10.0 BOCA)
   * Given to the first person to review a new restaurant
   */
  async awardFirstReviewer(userId: string, restaurantId: number, recommendationId: string): Promise<RewardResult> {
    return this.awardReward(userId, 'first_reviewer', {
      restaurant_id: restaurantId,
      recommendation_id: recommendationId,
    });
  }

  /**
   * Award comment received reward (to the recommendation author)
   * Tier weighting is based on the ENGAGER's (commenter's) tier
   */
  async awardCommentReceived(
    authorId: string,
    recommendationId: string,
    commenterId: string
  ): Promise<RewardResult> {
    // Get commenter's trust tier for weighting
    const commenter = await this.getUser(commenterId);
    const commenterTrustTier = commenter?.trust_tier || 2; // Default to established
    
    return this.awardReward(authorId, 'comment_received', {
      recommendation_id: recommendationId,
      commenter_id: commenterId,
      engager_trust_tier: commenterTrustTier,
    });
  }

  /**
   * Award validation bonus (+10.0 BOCA)
   * Given when a recommendation reaches 3.0 engagement points
   */
  async awardValidationBonus(userId: string, recommendationId: string): Promise<RewardResult> {
    return this.awardReward(userId, 'validation_bonus', {
      recommendation_id: recommendationId,
    });
  }

  /**
   * Award reshare attribution reward (1.0 BOCA to original author)
   * Given to the author when their content is reshared
   */
  async awardReshareAttribution(
    authorId: string,
    recommendationId: string,
    resharerId: string
  ): Promise<RewardResult> {
    // Get resharer's trust tier for weighting
    const resharer = await this.getUser(resharerId);
    const resharerTrustTier = resharer?.trust_tier || 2;
    
    return this.awardReward(authorId, 'reshare_attribution', {
      recommendation_id: recommendationId,
      resharer_id: resharerId,
      engager_trust_tier: resharerTrustTier,
    });
  }

  /**
   * Award list creation reward (5.0 BOCA)
   * Given when user creates a list with 5+ items
   */
  async awardListCreation(userId: string, listId: string): Promise<RewardResult> {
    return this.awardReward(userId, 'list_creation', {
      list_id: listId,
    });
  }

  /**
   * Award list milestone reward (10.0 BOCA)
   * Given when a list reaches 10 saves
   */
  async awardList10Saves(userId: string, listId: string): Promise<RewardResult> {
    return this.awardReward(userId, 'list_10_saves', {
      list_id: listId,
    });
  }

  /**
   * Award list milestone reward (20.0 BOCA)
   * Given when a list reaches 50 saves
   */
  async awardList50Saves(userId: string, listId: string): Promise<RewardResult> {
    return this.awardReward(userId, 'list_50_saves', {
      list_id: listId,
    });
  }

  // ===========================================================================
  // INTERNAL - Database Operations
  // ===========================================================================

  private async getUser(userId: string): Promise<User | null> {
    const { data, error } = await this.supabase
      .from('users')
      .select('id, email, wallet_address, account_tier, reputation_tier, created_at, tokens_earned')
      .eq('id', userId)
      .single();

    if (error || !data) {
      return null;
    }

    // Map reputation_tier text to numeric trust_tier
    const trustTierMap: Record<string, 1 | 2 | 3> = {
      'new': 1,
      'established': 2,
      'trusted': 3,
    };

    return {
      ...data,
      account_tier: (data.account_tier as UserAuthTier) || 'email_basic',
      reputation_tier: data.reputation_tier || 'new',
      trust_tier: trustTierMap[data.reputation_tier?.toLowerCase()] || 1,
      tokens_earned: data.tokens_earned || 0,
    };
  }

  private async getLastActionTime(userId: string, action: RewardAction): Promise<string | null> {
    const { data } = await this.supabase
      .from('reward_events')
      .select('created_at')
      .eq('user_id', userId)
      .eq('action', action)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    return data?.created_at || null;
  }

  private async hasCompletedAction(userId: string, action: RewardAction): Promise<boolean> {
    const { count } = await this.supabase
      .from('reward_events')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('action', action);

    return (count || 0) > 0;
  }

  private async getTodayActionCount(userId: string, action: RewardAction): Promise<number> {
    const today = new Date().toISOString().split('T')[0];
    
    const { count } = await this.supabase
      .from('reward_events')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('action', action)
      .gte('created_at', `${today}T00:00:00Z`);

    return count || 0;
  }

  private async logRewardEvent(
    userId: string,
    action: string,
    amount: number,
    metadata?: Record<string, unknown>
  ): Promise<void> {
    await this.supabase.from('reward_events').insert({
      user_id: userId,
      action,
      amount,
      metadata,
      created_at: new Date().toISOString(),
    });
  }

  private async updatePendingRewardsStatus(
    rewardIds: string[],
    status: 'claimed' | 'failed' | 'expired',
    txDigest?: string
  ): Promise<void> {
    const updates: Record<string, unknown> = { 
      status,
      ...(status === 'claimed' ? { claimed_at: new Date().toISOString() } : {}),
      ...(txDigest ? { tx_digest: txDigest } : {}),
    };

    await this.supabase
      .from('pending_tokens')
      .update(updates)
      .in('id', rewardIds);
  }

  /**
   * NEW: Update users.tokens_earned for frontend display compatibility
   * This keeps the legacy balance column in sync while we transition
   */
  private async updateUserTokensEarned(
    userId: string, 
    amountToAdd: number
  ): Promise<number> {
    try {
      // Get current balance
      const { data: user, error: fetchError } = await this.supabase
        .from('users')
        .select('tokens_earned')
        .eq('id', userId)
        .single();

      if (fetchError) {
        console.error('[RewardService] Failed to fetch user balance:', fetchError);
        return 0;
      }

      const currentBalance = user?.tokens_earned || 0;
      const displayAmountToAdd = toDisplayAmount(amountToAdd);
      const newBalance = currentBalance + displayAmountToAdd;

      // Update balance
      const { error: updateError } = await this.supabase
        .from('users')
        .update({ tokens_earned: newBalance })
        .eq('id', userId);

      if (updateError) {
        console.error('[RewardService] Failed to update tokens_earned:', updateError);
        return currentBalance;
      }

      console.log(`💰 [RewardService] Updated tokens_earned: ${currentBalance.toFixed(2)} → ${newBalance.toFixed(2)} BOCA (+${displayAmountToAdd.toFixed(2)})`);
      return newBalance;
    } catch (error) {
      console.error('[RewardService] updateUserTokensEarned error:', error);
      return 0;
    }
  }

  // ===========================================================================
  // INTERNAL - Reward Distribution
  // ===========================================================================

  private async mintRewardOnChain(
    user: User,
    action: RewardAction,
    amount: bigint,
    metadata?: Record<string, unknown>
  ): Promise<RewardResult> {
    const displayAmount = toDisplayAmount(amount);

    const mintResult = await this.iotaClient.mintTokens(
      user.wallet_address!,
      displayAmount
    );

    // Log the reward event regardless of success
    await this.logRewardEvent(user.id, action, Number(amount), {
      ...metadata,
      method: 'on_chain',
      success: mintResult.success,
      tx_digest: mintResult.digest,
      error: mintResult.error,
    });

    if (!mintResult.success) {
      return {
        success: false,
        action,
        amount: Number(amount),
        displayAmount,
        method: 'on_chain',
        error: mintResult.error,
      };
    }

    // NEW: Update users.tokens_earned for frontend compatibility
    const newBalance = await this.updateUserTokensEarned(user.id, Number(amount));

    return {
      success: true,
      action,
      amount: Number(amount),
      displayAmount,
      method: 'on_chain',
      txDigest: mintResult.digest,
      newBalance,
    };
  }

  private async storePendingReward(
    user: User,
    action: RewardAction,
    amount: bigint,
    metadata?: Record<string, unknown>
  ): Promise<RewardResult> {
    const displayAmount = toDisplayAmount(amount);

    // Insert pending reward
    const { data, error } = await this.supabase
      .from('pending_tokens')
      .insert({
        user_id: user.id,
        action,
        amount: Number(amount),
        display_amount: displayAmount,
        status: 'pending',
        metadata,
        created_at: new Date().toISOString(),
      })
      .select('id')
      .single();

    if (error || !data) {
      return {
        success: false,
        action,
        amount: Number(amount),
        displayAmount,
        method: 'pending',
        error: `Failed to store pending reward: ${error?.message || 'Unknown error'}`,
      };
    }

    // Log the reward event
    await this.logRewardEvent(user.id, action, Number(amount), {
      ...metadata,
      method: 'pending',
      pending_reward_id: data.id,
    });

    // NEW: Update users.tokens_earned for frontend compatibility
    // Even for pending rewards, we update the display balance so users see their earnings
    const newBalance = await this.updateUserTokensEarned(user.id, Number(amount));

    return {
      success: true,
      action,
      amount: Number(amount),
      displayAmount,
      method: 'pending',
      pendingRewardId: data.id,
      newBalance,
    };
  }

  // ===========================================================================
  // INTERNAL - Helpers
  // ===========================================================================

  private errorResult(action: RewardAction, error: string): RewardResult {
    return {
      success: false,
      action,
      amount: 0,
      displayAmount: 0,
      method: 'pending',
      error,
    };
  }
}

// =============================================================================
// SINGLETON INSTANCE
// =============================================================================

let serviceInstance: RewardService | null = null;

/**
 * Get the singleton RewardService instance
 */
export function getRewardService(config?: RewardServiceConfig): RewardService {
  if (!serviceInstance) {
    serviceInstance = new RewardService(config);
  }
  return serviceInstance;
}

/**
 * Reset the singleton instance (useful for testing)
 */
export function resetRewardService(): void {
  serviceInstance = null;
}

// =============================================================================
// DATABASE SCHEMA (for reference - create in Supabase)
// =============================================================================

/**
 * Required Supabase tables:
 * 
 * -- pending_tokens: Stores rewards for email_basic users
 * CREATE TABLE pending_tokens (
 *   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 *   user_id UUID REFERENCES users(id) NOT NULL,
 *   action TEXT NOT NULL,
 *   amount BIGINT NOT NULL,
 *   display_amount DECIMAL(18,6) NOT NULL,
 *   status TEXT NOT NULL DEFAULT 'pending',
 *   metadata JSONB,
 *   created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 *   claimed_at TIMESTAMPTZ,
 *   tx_digest TEXT
 * );
 * 
 * -- reward_events: Audit log of all reward actions
 * CREATE TABLE reward_events (
 *   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 *   user_id UUID REFERENCES users(id) NOT NULL,
 *   action TEXT NOT NULL,
 *   amount BIGINT NOT NULL,
 *   metadata JSONB,
 *   created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
 * );
 * 
 * -- Indexes
 * CREATE INDEX idx_pending_tokens_user_status ON pending_tokens(user_id, status);
 * CREATE INDEX idx_reward_events_user_action ON reward_events(user_id, action);
 * CREATE INDEX idx_reward_events_user_date ON reward_events(user_id, created_at);
 */

// =============================================================================
// DEFAULT EXPORT
// =============================================================================

export default RewardService;