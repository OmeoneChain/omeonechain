/**
 * BocaBoca Reward API Routes
 * ==========================
 * 
 * Express routes for token reward operations
 * Integrates with reward-service.ts for two-tier reward distribution
 * 
 * Target location: code/poc/core/src/api/routes/rewards.ts
 * 
 * @version 1.0.0
 */

import { Router, Request, Response, NextFunction } from 'express';
import { getRewardService, RewardAction } from '../../services/reward-service';
import { getIOTAClient } from '../../blockchain/iota-client';
import { formatBoca } from '../../blockchain/contracts';

const router = Router();
const rewardService = getRewardService();
const iotaClient = getIOTAClient();

// =============================================================================
// MIDDLEWARE
// =============================================================================

/**
 * Authentication middleware - ensures user is logged in
 * Expects req.user to be set by auth middleware upstream
 */
const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user?.id) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required',
    });
  }
  next();
};

/**
 * Admin middleware - ensures user has admin privileges
 */
const requireAdmin = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user?.isAdmin) {
    return res.status(403).json({
      success: false,
      error: 'Admin access required',
    });
  }
  next();
};

// =============================================================================
// REWARD ROUTES - User Actions
// =============================================================================

/**
 * POST /api/rewards/recommendation
 * Award tokens for creating a recommendation
 * 
 * Body: { recommendationId: string }
 */
router.post('/recommendation', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { recommendationId } = req.body;

    if (!recommendationId) {
      return res.status(400).json({
        success: false,
        error: 'recommendationId is required',
      });
    }

    const result = await rewardService.awardRecommendation(userId, recommendationId);

    if (result.success) {
      return res.status(200).json({
        success: true,
        data: {
          action: result.action,
          amount: result.displayAmount,
          formatted: formatBoca(result.amount),
          method: result.method,
          txDigest: result.txDigest,
          pendingRewardId: result.pendingRewardId,
        },
        message: result.method === 'on_chain' 
          ? `Earned ${formatBoca(result.amount)}! Tokens sent to your wallet.`
          : `Earned ${formatBoca(result.amount)}! Connect a wallet to claim.`,
      });
    } else {
      return res.status(400).json({
        success: false,
        error: result.error,
      });
    }
  } catch (error) {
    console.error('[RewardRoutes] POST /recommendation error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to process reward',
    });
  }
});

/**
 * POST /api/rewards/upvote
 * Award tokens for upvoting (to voter) and receiving upvote (to author)
 * 
 * Body: { recommendationId: string, authorId: string, isFirstUpvote?: boolean }
 */
router.post('/upvote', requireAuth, async (req: Request, res: Response) => {
  try {
    const voterId = req.user!.id;
    const { recommendationId, authorId, isFirstUpvote } = req.body;

    if (!recommendationId || !authorId) {
      return res.status(400).json({
        success: false,
        error: 'recommendationId and authorId are required',
      });
    }

    // Award upvote_given to voter
    const voterResult = await rewardService.awardUpvoteGiven(voterId, recommendationId);

    // Award upvote_received to author (if not self-upvote)
    let authorResult = null;
    if (authorId !== voterId) {
      authorResult = await rewardService.awardUpvoteReceived(authorId, recommendationId, voterId);
    }

    // Award first upvote bonus if applicable
    let firstUpvoteResult = null;
    if (isFirstUpvote) {
      firstUpvoteResult = await rewardService.awardFirstUpvoteBonus(voterId, recommendationId);
    }

    return res.status(200).json({
      success: true,
      data: {
        voter: {
          action: 'upvote_given',
          amount: voterResult.displayAmount,
          formatted: formatBoca(voterResult.amount),
          method: voterResult.method,
          success: voterResult.success,
        },
        author: authorResult ? {
          action: 'upvote_received',
          amount: authorResult.displayAmount,
          formatted: formatBoca(authorResult.amount),
          method: authorResult.method,
          success: authorResult.success,
        } : null,
        firstUpvoteBonus: firstUpvoteResult ? {
          action: 'first_upvote_bonus',
          amount: firstUpvoteResult.displayAmount,
          formatted: formatBoca(firstUpvoteResult.amount),
          method: firstUpvoteResult.method,
          success: firstUpvoteResult.success,
        } : null,
      },
    });
  } catch (error) {
    console.error('[RewardRoutes] POST /upvote error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to process upvote rewards',
    });
  }
});

/**
 * POST /api/rewards/comment
 * Award tokens for commenting on a recommendation
 * 
 * Body: { recommendationId: string, commentId: string }
 */
router.post('/comment', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { recommendationId, commentId } = req.body;

    if (!recommendationId) {
      return res.status(400).json({
        success: false,
        error: 'recommendationId is required',
      });
    }

    const result = await rewardService.awardReward(userId, 'comment', {
      recommendation_id: recommendationId,
      comment_id: commentId,
    });

    return res.status(200).json({
      success: result.success,
      data: result.success ? {
        action: result.action,
        amount: result.displayAmount,
        formatted: formatBoca(result.amount),
        method: result.method,
      } : null,
      error: result.error,
    });
  } catch (error) {
    console.error('[RewardRoutes] POST /comment error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to process reward',
    });
  }
});

/**
 * POST /api/rewards/share
 * Award tokens for sharing a recommendation
 * 
 * Body: { recommendationId: string, platform?: string }
 */
router.post('/share', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { recommendationId, platform } = req.body;

    if (!recommendationId) {
      return res.status(400).json({
        success: false,
        error: 'recommendationId is required',
      });
    }

    const result = await rewardService.awardReward(userId, 'share', {
      recommendation_id: recommendationId,
      platform,
    });

    return res.status(200).json({
      success: result.success,
      data: result.success ? {
        action: result.action,
        amount: result.displayAmount,
        formatted: formatBoca(result.amount),
        method: result.method,
      } : null,
      error: result.error,
    });
  } catch (error) {
    console.error('[RewardRoutes] POST /share error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to process reward',
    });
  }
});

/**
 * POST /api/rewards/daily-login
 * Award tokens for daily login/check-in
 */
router.post('/daily-login', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;

    const result = await rewardService.awardDailyLogin(userId);

    if (result.success) {
      return res.status(200).json({
        success: true,
        data: {
          action: result.action,
          amount: result.displayAmount,
          formatted: formatBoca(result.amount),
          method: result.method,
        },
        message: `Daily reward: ${formatBoca(result.amount)}`,
      });
    } else {
      return res.status(400).json({
        success: false,
        error: result.error,
      });
    }
  } catch (error) {
    console.error('[RewardRoutes] POST /daily-login error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to process daily login reward',
    });
  }
});

/**
 * POST /api/rewards/referral
 * Award tokens for successful referral
 * 
 * Body: { refereeId: string }
 */
router.post('/referral', requireAuth, async (req: Request, res: Response) => {
  try {
    const referrerId = req.user!.id;
    const { refereeId } = req.body;

    if (!refereeId) {
      return res.status(400).json({
        success: false,
        error: 'refereeId is required',
      });
    }

    const result = await rewardService.awardReferral(referrerId, refereeId);

    return res.status(200).json({
      success: result.success,
      data: result.success ? {
        action: result.action,
        amount: result.displayAmount,
        formatted: formatBoca(result.amount),
        method: result.method,
      } : null,
      error: result.error,
    });
  } catch (error) {
    console.error('[RewardRoutes] POST /referral error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to process referral reward',
    });
  }
});

/**
 * POST /api/rewards/profile-complete
 * Award tokens for completing profile
 */
router.post('/profile-complete', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;

    const result = await rewardService.awardProfileComplete(userId);

    return res.status(200).json({
      success: result.success,
      data: result.success ? {
        action: result.action,
        amount: result.displayAmount,
        formatted: formatBoca(result.amount),
        method: result.method,
      } : null,
      error: result.error,
    });
  } catch (error) {
    console.error('[RewardRoutes] POST /profile-complete error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to process reward',
    });
  }
});

/**
 * POST /api/rewards/new-restaurant
 * Award tokens for adding a new restaurant
 * 
 * Body: { restaurantId: string }
 */
router.post('/new-restaurant', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { restaurantId } = req.body;

    const result = await rewardService.awardReward(userId, 'new_restaurant', {
      restaurant_id: restaurantId,
    });

    return res.status(200).json({
      success: result.success,
      data: result.success ? {
        action: result.action,
        amount: result.displayAmount,
        formatted: formatBoca(result.amount),
        method: result.method,
      } : null,
      error: result.error,
    });
  } catch (error) {
    console.error('[RewardRoutes] POST /new-restaurant error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to process reward',
    });
  }
});

/**
 * POST /api/rewards/photo-upload
 * Award tokens for uploading a photo
 * 
 * Body: { recommendationId?: string, photoId?: string }
 */
router.post('/photo-upload', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { recommendationId, photoId } = req.body;

    const result = await rewardService.awardReward(userId, 'photo_upload', {
      recommendation_id: recommendationId,
      photo_id: photoId,
    });

    return res.status(200).json({
      success: result.success,
      data: result.success ? {
        action: result.action,
        amount: result.displayAmount,
        formatted: formatBoca(result.amount),
        method: result.method,
      } : null,
      error: result.error,
    });
  } catch (error) {
    console.error('[RewardRoutes] POST /photo-upload error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to process reward',
    });
  }
});

// =============================================================================
// PENDING REWARDS ROUTES
// =============================================================================

/**
 * GET /api/rewards/pending
 * Get user's pending rewards (for email_basic users)
 */
router.get('/pending', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;

    const [balance, rewards] = await Promise.all([
      rewardService.getPendingBalance(userId),
      rewardService.getPendingRewards(userId),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        balance: balance.balance,
        displayBalance: balance.displayBalance,
        rewards: rewards.map(r => ({
          id: r.id,
          action: r.action,
          amount: r.display_amount,
          formatted: formatBoca(r.amount),
          createdAt: r.created_at,
          status: r.status,
        })),
        count: rewards.length,
      },
    });
  } catch (error) {
    console.error('[RewardRoutes] GET /pending error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch pending rewards',
    });
  }
});

/**
 * POST /api/rewards/claim
 * Claim all pending rewards (when user connects wallet)
 * 
 * Body: { walletAddress: string }
 */
router.post('/claim', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { walletAddress } = req.body;

    if (!walletAddress) {
      return res.status(400).json({
        success: false,
        error: 'walletAddress is required',
      });
    }

    // Validate wallet address format (0x + 64 hex chars)
    if (!/^0x[a-fA-F0-9]{64}$/.test(walletAddress)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid wallet address format',
      });
    }

    const result = await rewardService.claimPendingRewards(userId, walletAddress);

    if (result.success) {
      return res.status(200).json({
        success: true,
        data: {
          totalClaimed: result.totalClaimed,
          displayAmount: result.displayAmount,
          formatted: formatBoca(result.totalClaimed),
          rewardsClaimed: result.rewardsClaimed,
          txDigest: result.txDigest,
        },
        message: result.rewardsClaimed > 0
          ? `Successfully claimed ${formatBoca(result.totalClaimed)} (${result.rewardsClaimed} rewards)`
          : 'No pending rewards to claim',
      });
    } else {
      return res.status(400).json({
        success: false,
        error: result.error,
      });
    }
  } catch (error) {
    console.error('[RewardRoutes] POST /claim error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to claim rewards',
    });
  }
});

// =============================================================================
// STATS & INFO ROUTES
// =============================================================================

/**
 * GET /api/rewards/stats
 * Get user's reward statistics
 */
router.get('/stats', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;

    const [todayStats, lifetimeStats, pendingBalance] = await Promise.all([
      rewardService.getTodayRewardStats(userId),
      rewardService.getLifetimeStats(userId),
      rewardService.getPendingBalance(userId),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        today: {
          date: todayStats.date,
          earned: todayStats.totalEarned,
          formatted: formatBoca(todayStats.totalEarned),
          actions: todayStats.actionCounts,
        },
        lifetime: {
          earned: lifetimeStats.totalEarned,
          formatted: lifetimeStats.displayTotal,
          breakdown: lifetimeStats.actionBreakdown,
        },
        pending: {
          balance: pendingBalance.balance,
          formatted: pendingBalance.displayBalance,
        },
      },
    });
  } catch (error) {
    console.error('[RewardRoutes] GET /stats error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch reward stats',
    });
  }
});

/**
 * GET /api/rewards/eligibility/:action
 * Check if user is eligible for a specific reward action
 */
router.get('/eligibility/:action', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const action = req.params.action as RewardAction;

    const validActions: RewardAction[] = [
      'recommendation', 'upvote_given', 'upvote_received', 'first_upvote_bonus',
      'comment', 'share', 'boost', 'daily_login', 'streak_bonus_7_day',
      'referral', 'profile_complete', 'new_restaurant', 'photo_upload'
    ];

    if (!validActions.includes(action)) {
      return res.status(400).json({
        success: false,
        error: `Invalid action. Must be one of: ${validActions.join(', ')}`,
      });
    }

    const eligibility = await rewardService.checkEligibility(userId, action);

    return res.status(200).json({
      success: true,
      data: {
        action,
        eligible: eligibility.eligible,
        reason: eligibility.reason,
        cooldownRemaining: eligibility.cooldownRemaining,
        dailyLimitRemaining: eligibility.dailyLimitRemaining,
      },
    });
  } catch (error) {
    console.error('[RewardRoutes] GET /eligibility error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to check eligibility',
    });
  }
});

/**
 * GET /api/rewards/balance
 * Get user's on-chain BOCA balance (for wallet users)
 */
router.get('/balance', requireAuth, async (req: Request, res: Response) => {
  try {
    const walletAddress = req.user?.walletAddress;

    if (!walletAddress) {
      return res.status(400).json({
        success: false,
        error: 'User does not have a connected wallet',
      });
    }

    const balance = await iotaClient.getBalance(walletAddress);

    return res.status(200).json({
      success: true,
      data: {
        balance: Number(balance.balance),
        displayBalance: balance.displayBalance,
        walletAddress,
      },
    });
  } catch (error) {
    console.error('[RewardRoutes] GET /balance error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch balance',
    });
  }
});

// =============================================================================
// ADMIN ROUTES
// =============================================================================

/**
 * POST /api/rewards/admin/mint
 * Admin endpoint to manually mint tokens to a user
 * 
 * Body: { userId: string, amount: number, reason: string }
 */
router.post('/admin/mint', requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { walletAddress, amount, reason } = req.body;

    if (!walletAddress || !amount || !reason) {
      return res.status(400).json({
        success: false,
        error: 'walletAddress, amount, and reason are required',
      });
    }

    if (amount <= 0 || amount > 10000) {
      return res.status(400).json({
        success: false,
        error: 'Amount must be between 0 and 10,000 BOCA',
      });
    }

    const result = await iotaClient.mintTokens(walletAddress, amount);

    if (result.success) {
      console.log(`[Admin] Minted ${amount} BOCA to ${walletAddress}. Reason: ${reason}. TX: ${result.digest}`);
      
      return res.status(200).json({
        success: true,
        data: {
          amount,
          formatted: formatBoca(Number(result.amount)),
          recipient: walletAddress,
          txDigest: result.digest,
          explorerUrl: result.explorerUrl,
        },
      });
    } else {
      return res.status(400).json({
        success: false,
        error: result.error,
      });
    }
  } catch (error) {
    console.error('[RewardRoutes] POST /admin/mint error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to mint tokens',
    });
  }
});

/**
 * GET /api/rewards/admin/health
 * Check blockchain connection health
 */
router.get('/admin/health', requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const health = await iotaClient.healthCheck();
    const sponsorStats = iotaClient.getSponsorStats();
    const circuitBreaker = iotaClient.getCircuitBreakerStatus();

    return res.status(200).json({
      success: true,
      data: {
        network: {
          healthy: health.healthy,
          latencyMs: health.latencyMs,
          error: health.error,
        },
        sponsorWallet: {
          address: iotaClient.getSponsorAddress(),
          dailyTransactions: sponsorStats.dailyTransactions,
          dailyGasSpent: sponsorStats.dailyGasSpent,
          remainingBudget: sponsorStats.remainingDailyBudget,
        },
        circuitBreaker: {
          isOpen: circuitBreaker.isOpen,
          failures: circuitBreaker.failures,
          lastFailure: circuitBreaker.lastFailure,
        },
      },
    });
  } catch (error) {
    console.error('[RewardRoutes] GET /admin/health error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to check health',
    });
  }
});

// =============================================================================
// TYPE AUGMENTATION
// =============================================================================

// Extend Express Request to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email?: string;
        walletAddress?: string;
        isAdmin?: boolean;
      };
    }
  }
}

// =============================================================================
// EXPORT
// =============================================================================

export default router;