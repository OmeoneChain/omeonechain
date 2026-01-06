// File: code/poc/core/src/routes/bounty.ts
// Bounty System API Routes
// Handles: User-funded discovery requests, submissions, prize distribution, refunds
//
// Features: Flexible deadlines (1 hour - 12 weeks), multiple submissions, split prizes
// Platform Fee: 10% burned from distributed prizes
// Minimum Stake: 1.0 BOCA

import { Router, Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';

const router = Router();

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase configuration for bounty routes');
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// =============================================================================
// CONSTANTS
// =============================================================================

const BOUNTY_CONFIG = {
  MIN_STAKE: 1.0,          // BOCA
  PLATFORM_FEE: 10,        // Percent
  MIN_DEADLINE_HOURS: 1,
  MAX_DEADLINE_HOURS: 2016, // 12 weeks
  DEADLINE_UNITS: ['hours', 'days', 'weeks'] as const
};

// =============================================================================
// VALIDATION SCHEMAS
// =============================================================================

const createBountySchema = z.object({
  title: z.string().min(10).max(255),
  description: z.string().min(20).max(2000),
  location_city: z.string().max(100).optional(),
  location_country: z.string().max(100).optional(),
  cuisine_type: z.string().max(100).optional(),
  tags: z.array(z.string()).max(10).optional(),
  stake_amount: z.number().min(BOUNTY_CONFIG.MIN_STAKE),
  deadline_unit: z.enum(BOUNTY_CONFIG.DEADLINE_UNITS),
  deadline_amount: z.number().int().min(1).max(999)
});

const submitSolutionSchema = z.object({
  bounty_id: z.string().uuid(),
  recommendation_id: z.string().uuid(),
  explanation: z.string().min(20).max(1000).optional()
});

const awardPrizesSchema = z.object({
  bounty_id: z.string().uuid(),
  prize_allocations: z.array(z.object({
    submission_id: z.string().uuid(),
    amount: z.number().positive()
  })).min(1)
});

// =============================================================================
// TYPES
// =============================================================================

interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    address?: string;
    email?: string;
    accountTier: 'email_basic' | 'wallet_full';
    authMethod: string;
  };
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Deduct tokens from user balance
 */
async function deductTokens(
  userId: string, 
  amount: number, 
  reason: string
): Promise<boolean> {
  try {
    const { data: user } = await supabase
      .from('users')
      .select('tokens_earned')
      .eq('id', userId)
      .single();

    const currentBalance = user?.tokens_earned || 0;

    if (currentBalance < amount) {
      console.error(`❌ Insufficient balance: ${currentBalance} < ${amount}`);
      return false;
    }

    const newBalance = currentBalance - amount;

    const { error } = await supabase
      .from('users')
      .update({ 
        tokens_earned: newBalance,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId);

    if (error) {
      console.error('❌ Error deducting tokens:', error);
      return false;
    }

    console.log(`💸 Deducted ${amount} BOCA from user ${userId} for: ${reason}`);
    return true;
  } catch (error) {
    console.error('❌ Error in deductTokens:', error);
    return false;
  }
}

/**
 * Validate deadline is within bounds
 */
function validateDeadline(unit: string, amount: number): boolean {
  let totalHours: number;

  switch (unit) {
    case 'hours':
      totalHours = amount;
      break;
    case 'days':
      totalHours = amount * 24;
      break;
    case 'weeks':
      totalHours = amount * 24 * 7;
      break;
    default:
      return false;
  }

  return totalHours >= BOUNTY_CONFIG.MIN_DEADLINE_HOURS && 
         totalHours <= BOUNTY_CONFIG.MAX_DEADLINE_HOURS;
}

/**
 * Calculate total of prize allocations
 */
function calculatePrizeTotal(allocations: Array<{ submission_id: string; amount: number }>): number {
  return allocations.reduce((sum, allocation) => sum + allocation.amount, 0);
}

// =============================================================================
// API ROUTES
// =============================================================================

/**
 * POST /api/bounty/create
 * Create a new bounty request (requires wallet-tier auth)
 */
router.post('/create', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    // Check wallet tier
    if (req.user.accountTier !== 'wallet_full') {
      return res.status(403).json({
        success: false,
        error: 'Wallet connection required to create bounties',
        requires_upgrade: true
      });
    }

    // Validate request body
    const validation = createBountySchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: 'Invalid bounty data',
        details: validation.error.errors
      });
    }

    const {
      title,
      description,
      location_city,
      location_country,
      cuisine_type,
      tags,
      stake_amount,
      deadline_unit,
      deadline_amount
    } = validation.data;

    console.log(`💰 POST create bounty by user ${userId}: ${stake_amount} BOCA`);

    // Validate deadline
    if (!validateDeadline(deadline_unit, deadline_amount)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid deadline',
        message: `Deadline must be between ${BOUNTY_CONFIG.MIN_DEADLINE_HOURS} hour and ${BOUNTY_CONFIG.MAX_DEADLINE_HOURS} hours (12 weeks)`
      });
    }

    // Check user has sufficient balance
    const { data: user } = await supabase
      .from('users')
      .select('tokens_earned')
      .eq('id', userId)
      .single();

    if (!user || user.tokens_earned < stake_amount) {
      return res.status(400).json({
        success: false,
        error: 'Insufficient token balance',
        required: stake_amount,
        available: user?.tokens_earned || 0
      });
    }

    // Calculate deadline timestamp
    const { data: deadlineTimestamp, error: deadlineError } = await supabase
      .rpc('calculate_bounty_deadline', {
        p_deadline_unit: deadline_unit,
        p_deadline_amount: deadline_amount
      });

    if (deadlineError) {
      console.error('❌ Error calculating deadline:', deadlineError);
      return res.status(500).json({
        success: false,
        error: 'Failed to calculate deadline'
      });
    }

    // Deduct stake from user balance
    const deductSuccess = await deductTokens(userId, stake_amount, 'Bounty stake');
    if (!deductSuccess) {
      return res.status(500).json({
        success: false,
        error: 'Failed to deduct stake amount'
      });
    }

    // Create bounty
    const { data: bounty, error: bountyError } = await supabase
      .from('bounty_requests')
      .insert({
        requester_user_id: userId,
        title,
        description,
        location_city,
        location_country,
        cuisine_type,
        tags,
        stake_amount_boca: stake_amount,
        remaining_amount_boca: stake_amount,
        platform_fee_percent: BOUNTY_CONFIG.PLATFORM_FEE,
        deadline_unit,
        deadline_amount,
        deadline_at: deadlineTimestamp,
        status: 'open'
      })
      .select()
      .single();

    if (bountyError) {
      console.error('❌ Error creating bounty:', bountyError);
      
      // Refund stake
      await supabase
        .from('users')
        .update({ tokens_earned: user.tokens_earned })
        .eq('id', userId);

      return res.status(500).json({
        success: false,
        error: 'Failed to create bounty'
      });
    }

    // Record stake transaction
    await supabase
      .from('bounty_transactions')
      .insert({
        bounty_id: bounty.id,
        transaction_type: 'stake',
        from_user_id: userId,
        amount_boca: stake_amount,
        notes: 'Bounty created - stake deposited'
      });

    console.log(`✅ Bounty created: ${bounty.id}`);

    res.status(201).json({
      success: true,
      message: 'Bounty created successfully',
      bounty: {
        id: bounty.id,
        title: bounty.title,
        stake_amount: bounty.stake_amount_boca,
        deadline: bounty.deadline_at,
        status: bounty.status
      }
    });

  } catch (error) {
    console.error('❌ Error creating bounty:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create bounty'
    });
  }
});

/**
 * GET /api/bounty/list
 * Get list of active bounties (public)
 */
router.get('/list', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const offset = parseInt(req.query.offset as string) || 0;
    const status = req.query.status as string || 'open';
    const location_city = req.query.city as string;
    const location_country = req.query.country as string;
    const cuisine_type = req.query.cuisine as string;

    console.log(`📊 GET bounty list (status: ${status})`);

    let query = supabase
      .from('bounty_requests')
      .select(`
        id,
        title,
        description,
        location_city,
        location_country,
        cuisine_type,
        tags,
        stake_amount_boca,
        deadline_unit,
        deadline_amount,
        deadline_at,
        status,
        submission_count,
        created_at,
        requester:requester_user_id (
          id,
          username,
          display_name,
          avatar_url
        )
      `, { count: 'exact' })
      .eq('status', status)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    // Apply filters
    if (location_city) {
      query = query.ilike('location_city', `%${location_city}%`);
    }
    if (location_country) {
      query = query.ilike('location_country', `%${location_country}%`);
    }
    if (cuisine_type) {
      query = query.eq('cuisine_type', cuisine_type);
    }

    const { data: bounties, error, count } = await query;

    if (error) {
      console.error('❌ Error fetching bounties:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch bounties'
      });
    }

    res.json({
      success: true,
      bounties: (bounties || []).map(b => ({
        id: b.id,
        title: b.title,
        description: b.description,
        location: {
          city: b.location_city,
          country: b.location_country
        },
        cuisine_type: b.cuisine_type,
        tags: b.tags,
        stake_amount: b.stake_amount_boca,
        deadline: {
          unit: b.deadline_unit,
          amount: b.deadline_amount,
          timestamp: b.deadline_at
        },
        status: b.status,
        submission_count: b.submission_count,
        requester: {
          id: b.requester.id,
          username: b.requester.username,
          display_name: b.requester.display_name,
          avatar_url: b.requester.avatar_url
        },
        created_at: b.created_at
      })),
      pagination: {
        limit,
        offset,
        total: count || 0,
        has_more: (offset + limit) < (count || 0)
      }
    });

  } catch (error) {
    console.error('❌ Error fetching bounty list:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch bounty list'
    });
  }
});

/**
 * GET /api/bounty/:bountyId
 * Get detailed bounty information (public)
 */
router.get('/:bountyId', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { bountyId } = req.params;

    console.log(`📊 GET bounty details: ${bountyId}`);

    const { data: bounty, error } = await supabase
      .from('bounty_requests')
      .select(`
        *,
        requester:requester_user_id (
          id,
          username,
          display_name,
          avatar_url
        )
      `)
      .eq('id', bountyId)
      .single();

    if (error || !bounty) {
      return res.status(404).json({
        success: false,
        error: 'Bounty not found'
      });
    }

    // Get submissions count and details
    const { data: submissions } = await supabase
      .from('bounty_submissions')
      .select(`
        id,
        is_winner,
        prize_amount_boca,
        created_at,
        submitter:submitter_user_id (
          id,
          username,
          display_name,
          avatar_url
        ),
        recommendation:recommendation_id (
          id,
          title
        )
      `)
      .eq('bounty_id', bountyId)
      .order('created_at', { ascending: false });

    res.json({
      success: true,
      bounty: {
        id: bounty.id,
        title: bounty.title,
        description: bounty.description,
        location: {
          city: bounty.location_city,
          country: bounty.location_country
        },
        cuisine_type: bounty.cuisine_type,
        tags: bounty.tags,
        stake_amount: bounty.stake_amount_boca,
        remaining_amount: bounty.remaining_amount_boca,
        platform_fee_percent: bounty.platform_fee_percent,
        deadline: {
          unit: bounty.deadline_unit,
          amount: bounty.deadline_amount,
          timestamp: bounty.deadline_at
        },
        status: bounty.status,
        submission_count: bounty.submission_count,
        winner_count: bounty.winner_count,
        total_distributed: bounty.total_distributed_boca,
        total_burned: bounty.total_burned_boca,
        requester: {
          id: bounty.requester.id,
          username: bounty.requester.username,
          display_name: bounty.requester.display_name,
          avatar_url: bounty.requester.avatar_url
        },
        submissions: submissions || [],
        created_at: bounty.created_at,
        completed_at: bounty.completed_at
      }
    });

  } catch (error) {
    console.error('❌ Error fetching bounty details:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch bounty details'
    });
  }
});

/**
 * POST /api/bounty/submit
 * Submit a solution to a bounty (requires auth)
 */
router.post('/submit', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    // Validate request body
    const validation = submitSolutionSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: 'Invalid submission data',
        details: validation.error.errors
      });
    }

    const { bounty_id, recommendation_id, explanation } = validation.data;

    console.log(`📝 POST submit solution by user ${userId} to bounty ${bounty_id}`);

    // Check bounty exists and is open
    const { data: bounty, error: bountyError } = await supabase
      .from('bounty_requests')
      .select('id, status, deadline_at, requester_user_id')
      .eq('id', bounty_id)
      .single();

    if (bountyError || !bounty) {
      return res.status(404).json({
        success: false,
        error: 'Bounty not found'
      });
    }

    if (bounty.status !== 'open') {
      return res.status(400).json({
        success: false,
        error: `Bounty is not accepting submissions (status: ${bounty.status})`
      });
    }

    // Check deadline hasn't passed
    if (new Date(bounty.deadline_at) < new Date()) {
      return res.status(400).json({
        success: false,
        error: 'Bounty deadline has passed'
      });
    }

    // Check user isn't the bounty requester
    if (bounty.requester_user_id === userId) {
      return res.status(400).json({
        success: false,
        error: 'Cannot submit solutions to your own bounty'
      });
    }

    // Check recommendation exists and belongs to user
    const { data: recommendation, error: recError } = await supabase
      .from('recommendations')
      .select('id, author_id')
      .eq('id', recommendation_id)
      .single();

    if (recError || !recommendation) {
      return res.status(404).json({
        success: false,
        error: 'Recommendation not found'
      });
    }

    if (recommendation.author_id !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Can only submit your own recommendations'
      });
    }

    // Check if this recommendation already submitted to this bounty
    const { data: existingSubmission } = await supabase
      .from('bounty_submissions')
      .select('id')
      .eq('bounty_id', bounty_id)
      .eq('recommendation_id', recommendation_id)
      .maybeSingle();

    if (existingSubmission) {
      return res.status(400).json({
        success: false,
        error: 'This recommendation has already been submitted to this bounty'
      });
    }

    // Create submission
    const { data: submission, error: submissionError } = await supabase
      .from('bounty_submissions')
      .insert({
        bounty_id,
        submitter_user_id: userId,
        recommendation_id,
        explanation
      })
      .select()
      .single();

    if (submissionError) {
      console.error('❌ Error creating submission:', submissionError);
      return res.status(500).json({
        success: false,
        error: 'Failed to submit solution'
      });
    }

    console.log(`✅ Submission created: ${submission.id}`);

    res.status(201).json({
      success: true,
      message: 'Solution submitted successfully',
      submission_id: submission.id
    });

  } catch (error) {
    console.error('❌ Error submitting solution:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to submit solution'
    });
  }
});

/**
 * POST /api/bounty/award-prizes
 * Award prizes to winning submissions (only bounty requester)
 */
router.post('/award-prizes', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    // Validate request body
    const validation = awardPrizesSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: 'Invalid prize allocation data',
        details: validation.error.errors
      });
    }

    const { bounty_id, prize_allocations } = validation.data;

    console.log(`🏆 POST award prizes for bounty ${bounty_id} by user ${userId}`);

    // Check bounty exists and user is requester
    const { data: bounty, error: bountyError } = await supabase
      .from('bounty_requests')
      .select('id, requester_user_id, stake_amount_boca, status')
      .eq('id', bounty_id)
      .single();

    if (bountyError || !bounty) {
      return res.status(404).json({
        success: false,
        error: 'Bounty not found'
      });
    }

    if (bounty.requester_user_id !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Only bounty requester can award prizes'
      });
    }

    if (bounty.status !== 'open') {
      return res.status(400).json({
        success: false,
        error: `Cannot award prizes for bounty with status: ${bounty.status}`
      });
    }

    // Validate total allocation equals stake
    const totalAllocated = calculatePrizeTotal(prize_allocations);
    if (Math.abs(totalAllocated - bounty.stake_amount_boca) > 0.000001) {
      return res.status(400).json({
        success: false,
        error: 'Prize allocation must equal stake amount',
        required: bounty.stake_amount_boca,
        provided: totalAllocated
      });
    }

    // Update bounty status to selecting_winners
    await supabase
      .from('bounty_requests')
      .update({ status: 'selecting_winners', updated_at: new Date().toISOString() })
      .eq('id', bounty_id);

    // Award prizes using database function
    const { data: result, error: awardError } = await supabase
      .rpc('award_bounty_prizes', {
        p_bounty_id: bounty_id,
        p_prize_allocations: prize_allocations
      });

    if (awardError || !result || result.length === 0) {
      console.error('❌ Error awarding prizes:', awardError);
      
      // Revert status
      await supabase
        .from('bounty_requests')
        .update({ status: 'open', updated_at: new Date().toISOString() })
        .eq('id', bounty_id);

      return res.status(500).json({
        success: false,
        error: result?.[0]?.error_message || 'Failed to award prizes'
      });
    }

    const prizeResult = result[0];

    if (!prizeResult.success) {
      return res.status(400).json({
        success: false,
        error: prizeResult.error_message
      });
    }

    console.log(`✅ Prizes awarded for bounty ${bounty_id}`);

    res.json({
      success: true,
      message: 'Prizes awarded successfully',
      total_awarded: prizeResult.total_awarded,
      total_burned: prizeResult.total_burned,
      winner_count: prizeResult.winner_count
    });

  } catch (error) {
    console.error('❌ Error awarding prizes:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to award prizes'
    });
  }
});

/**
 * POST /api/bounty/refund
 * Request refund for expired bounty with no submissions (only requester)
 */
router.post('/refund', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    const { bounty_id } = req.body;

    if (!bounty_id) {
      return res.status(400).json({
        success: false,
        error: 'bounty_id is required'
      });
    }

    console.log(`💸 POST refund request for bounty ${bounty_id} by user ${userId}`);

    // Check bounty exists and user is requester
    const { data: bounty, error: bountyError } = await supabase
      .from('bounty_requests')
      .select('id, requester_user_id, status')
      .eq('id', bounty_id)
      .single();

    if (bountyError || !bounty) {
      return res.status(404).json({
        success: false,
        error: 'Bounty not found'
      });
    }

    if (bounty.requester_user_id !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Only bounty requester can request refund'
      });
    }

    // Process refund using database function
    const { data: result, error: refundError } = await supabase
      .rpc('refund_expired_bounty', {
        p_bounty_id: bounty_id
      });

    if (refundError || !result || result.length === 0) {
      console.error('❌ Error processing refund:', refundError);
      return res.status(500).json({
        success: false,
        error: 'Failed to process refund'
      });
    }

    const refundResult = result[0];

    if (!refundResult.success) {
      return res.status(400).json({
        success: false,
        error: refundResult.error_message
      });
    }

    console.log(`✅ Refund processed for bounty ${bounty_id}`);

    res.json({
      success: true,
      message: 'Refund processed successfully',
      refund_amount: refundResult.refund_amount
    });

  } catch (error) {
    console.error('❌ Error processing refund:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process refund'
    });
  }
});

/**
 * GET /api/bounty/my-bounties
 * Get user's created bounties (requires auth)
 */
router.get('/my-bounties', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const offset = parseInt(req.query.offset as string) || 0;

    console.log(`📊 GET my bounties for user: ${userId}`);

    const { data: bounties, error, count } = await supabase
      .from('bounty_requests')
      .select(`
        id,
        title,
        stake_amount_boca,
        deadline_at,
        status,
        submission_count,
        winner_count,
        total_distributed_boca,
        created_at
      `, { count: 'exact' })
      .eq('requester_user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('❌ Error fetching user bounties:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch bounties'
      });
    }

    res.json({
      success: true,
      bounties: bounties || [],
      pagination: {
        limit,
        offset,
        total: count || 0,
        has_more: (offset + limit) < (count || 0)
      }
    });

  } catch (error) {
    console.error('❌ Error fetching user bounties:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch bounties'
    });
  }
});

/**
 * GET /api/bounty/my-submissions
 * Get user's submitted solutions (requires auth)
 */
router.get('/my-submissions', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const offset = parseInt(req.query.offset as string) || 0;

    console.log(`📊 GET my submissions for user: ${userId}`);

    const { data: submissions, error, count } = await supabase
      .from('bounty_submissions')
      .select(`
        id,
        is_winner,
        prize_amount_boca,
        created_at,
        bounty:bounty_id (
          id,
          title,
          stake_amount_boca,
          status
        ),
        recommendation:recommendation_id (
          id,
          title
        )
      `, { count: 'exact' })
      .eq('submitter_user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('❌ Error fetching user submissions:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch submissions'
      });
    }

    res.json({
      success: true,
      submissions: submissions || [],
      pagination: {
        limit,
        offset,
        total: count || 0,
        has_more: (offset + limit) < (count || 0)
      }
    });

  } catch (error) {
    console.error('❌ Error fetching user submissions:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch submissions'
    });
  }
});

// =============================================================================
// EXPORT
// =============================================================================

export default router;