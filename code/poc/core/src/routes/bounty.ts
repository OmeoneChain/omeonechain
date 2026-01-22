// File: code/poc/core/src/routes/bounty.ts
// Bounty System API Routes
// Handles: User-funded discovery requests, submissions, prize distribution, refunds, tips
//
// IMPORTANT: All operations use `discovery_requests` table (not `bounty_requests`)
// Column mapping for discovery_requests:
//   - creator_id (not requester_user_id)
//   - bounty_amount (not stake_amount_boca)
//   - expires_at (not deadline_at)
//   - response_count (not submission_count)
//   - location (not location_city/location_country)
//
// IMPORTANT: Submissions use `discovery_responses` table (not `bounty_submissions`)
// Column mapping for discovery_responses:
//   - responder_id (not user_id or submitter_user_id)
//   - response_text (not content or explanation)
//   - upvotes_count (not vote_count)
//   - recommendation_id (links to recommendations table)
//
// AWARD LOGIC: "Restaurant Wins, First Responder Paid"
//   - Creator selects winning restaurant_id (not response_id)
//   - System finds first response with recommendation pointing to that restaurant
//   - 90% of stake goes to first responder, 10% burned
//
// TIPPING: After award, creator can tip other helpful responses
//   - Tips come from creator's wallet (separate from bounty stake)
//   - 100% goes to responder (no burn on tips)
//   - Minimum tip: 0.5 BOCA
//
// Features: Flexible deadlines (1 hour - 12 weeks), multiple submissions
// Platform Fee: 10% burned from main prize
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
  MIN_STAKE: 0.0,          // BOCA
  PLATFORM_FEE: 10,        // Percent (burned from main prize)
  MIN_TIP: 0.5,            // BOCA (minimum tip amount)
  TIP_FEE: 0,              // Percent (no fee on tips - encourage generosity)
  MIN_DEADLINE_HOURS: 1,
  MAX_DEADLINE_HOURS: 2016, // 12 weeks
  DEADLINE_UNITS: ['hours', 'days', 'weeks'] as const
};

// =============================================================================
// VALIDATION SCHEMAS
// =============================================================================

const createBountySchema = z.object({
  title: z.string().min(5).max(255),
  description: z.string().min(5).max(2000).optional(),
  location: z.string().max(100).optional(),
  cuisine_type: z.string().max(100).optional(),
  occasion: z.string().max(100).optional(),
  budget_range: z.array(z.string()).max(4).optional(),
  dietary_restrictions: z.array(z.string()).max(10).optional(),
  stake_amount: z.number().min(BOUNTY_CONFIG.MIN_STAKE),
  expires_at: z.string().datetime().optional(),
  deadline_unit: z.enum(BOUNTY_CONFIG.DEADLINE_UNITS).optional(),
  deadline_amount: z.number().int().min(1).max(999).optional()
});

const submitSolutionSchema = z.object({
  bounty_id: z.string().uuid(),
  recommendation_id: z.string().uuid(),
  explanation: z.string().min(20).max(1000).optional()
});

// NEW: Award by restaurant_id (first responder logic)
// restaurant_id can be integer or string (DB uses integers)
const awardBountySchema = z.object({
  bounty_id: z.string().uuid(),
  restaurant_id: z.union([z.number(), z.string()]).transform(val => 
    typeof val === 'string' ? parseInt(val, 10) : val
  )
});

// NEW: Tip schema
const tipResponseSchema = z.object({
  bounty_id: z.string().uuid(),
  response_id: z.string().uuid(),
  amount: z.number().min(BOUNTY_CONFIG.MIN_TIP)
});

// =============================================================================
// TYPES
// =============================================================================

interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    address?: string;
    email?: string;
    accountTier: 'verified' | 'wallet';
    authMethod: string;
  };
}

interface DiscoveryRequest {
  id: string;
  creator_id: string;
  title: string;
  description?: string;
  location?: string;
  cuisine_type?: string;
  occasion?: string;
  budget_range?: string[];
  dietary_restrictions?: string[];
  bounty_amount: number;
  bounty_status: string;
  status: string;
  expires_at: string;
  response_count: number;
  view_count: number;
  best_answer_id?: string;
  created_at: string;
  updated_at: string;
  closed_at?: string;
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Add tokens to user's balance
 */
async function addTokens(userId: string, amount: number, reason: string): Promise<boolean> {
  try {
    // Get current balance
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('tokens_earned')
      .eq('id', userId)
      .single();

    if (userError || !user) {
      console.error('❌ Failed to get user for token award:', userError);
      return false;
    }

    // Update balance
    const newBalance = (user.tokens_earned || 0) + amount;
    const { error: updateError } = await supabase
      .from('users')
      .update({ 
        tokens_earned: newBalance,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId);

    if (updateError) {
      console.error('❌ Failed to update user tokens:', updateError);
      return false;
    }

    console.log(`💰 Added ${amount} BOCA to user ${userId}: ${reason}`);
    return true;
  } catch (error) {
    console.error('❌ Error in addTokens:', error);
    return false;
  }
}

/**
 * Deduct tokens from user's balance (for tips)
 */
async function deductTokens(userId: string, amount: number, reason: string): Promise<boolean> {
  try {
    // Get current balance
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('tokens_earned')
      .eq('id', userId)
      .single();

    if (userError || !user) {
      console.error('❌ Failed to get user for token deduction:', userError);
      return false;
    }

    // Check sufficient balance
    if ((user.tokens_earned || 0) < amount) {
      console.error(`❌ Insufficient balance: ${user.tokens_earned} < ${amount}`);
      return false;
    }

    // Update balance
    const newBalance = (user.tokens_earned || 0) - amount;
    const { error: updateError } = await supabase
      .from('users')
      .update({ 
        tokens_earned: newBalance,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId);

    if (updateError) {
      console.error('❌ Failed to update user tokens:', updateError);
      return false;
    }

    console.log(`💸 Deducted ${amount} BOCA from user ${userId}: ${reason}`);
    return true;
  } catch (error) {
    console.error('❌ Error in deductTokens:', error);
    return false;
  }
}

/**
 * Check user's token balance
 */
async function getTokenBalance(userId: string): Promise<number> {
  try {
    const { data: user, error } = await supabase
      .from('users')
      .select('tokens_earned')
      .eq('id', userId)
      .single();

    if (error || !user) return 0;
    return user.tokens_earned || 0;
  } catch (error) {
    return 0;
  }
}

/**
 * Calculate expiration date from unit and amount
 */
function calculateExpiresAt(unit: string, amount: number): string {
  const now = new Date();
  let hours = amount;
  
  switch (unit) {
    case 'days':
      hours = amount * 24;
      break;
    case 'weeks':
      hours = amount * 24 * 7;
      break;
    default:
      hours = amount;
  }
  
  // Clamp to valid range
  hours = Math.max(BOUNTY_CONFIG.MIN_DEADLINE_HOURS, Math.min(hours, BOUNTY_CONFIG.MAX_DEADLINE_HOURS));
  
  now.setTime(now.getTime() + hours * 60 * 60 * 1000);
  return now.toISOString();
}

/**
 * Format bounty response for API
 */
function formatBountyResponse(bounty: DiscoveryRequest) {
  return {
    id: bounty.id,
    creator_id: bounty.creator_id,
    title: bounty.title,
    description: bounty.description,
    location: bounty.location,
    cuisine_type: bounty.cuisine_type,
    occasion: bounty.occasion,
    budget_range: bounty.budget_range,
    dietary_restrictions: bounty.dietary_restrictions,
    stake_amount: bounty.bounty_amount,
    status: bounty.bounty_status || bounty.status || 'pending',
    expires_at: bounty.expires_at,
    response_count: bounty.response_count || 0,
    view_count: bounty.view_count || 0,
    best_answer_id: bounty.best_answer_id,
    created_at: bounty.created_at,
    updated_at: bounty.updated_at,
    closed_at: bounty.closed_at
  };
}

/**
 * Check if bounty has expired and update status if needed (lazy pattern)
 */
async function checkAndUpdateExpiredBounty(
  bountyId: string, 
  currentStatus: string, 
  expiresAt: string
): Promise<string> {
  // Only check 'open' or 'pending' bounties
  if (currentStatus !== 'open' && currentStatus !== 'pending') {
    return currentStatus;
  }
  
  const now = new Date();
  const expiry = new Date(expiresAt);
  
  if (now > expiry) {
    // Bounty has expired - update status
    const { error } = await supabase
      .from('discovery_requests')
      .update({ 
        bounty_status: 'expired',
        status: 'expired',
        updated_at: new Date().toISOString()
      })
      .eq('id', bountyId);
    
    if (error) {
      console.error(`❌ Failed to update expired bounty ${bountyId}:`, error);
      return currentStatus;
    }
    
    console.log(`⏰ Bounty ${bountyId} marked as expired (lazy update)`);
    return 'expired';
  }
  
  return currentStatus;
}

// =============================================================================
// ROUTES
// =============================================================================

/**
 * GET /api/bounty/list
 * Get all active bounties with pagination
 */
router.get('/list', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const {
      page = '1',
      limit = '20',
      status = 'open',
      sort = 'created_at',
      order = 'desc',
      location,
      cuisine_type,
      min_stake,
      max_stake
    } = req.query;

    const pageNum = parseInt(page as string) || 1;
    const limitNum = Math.min(parseInt(limit as string) || 20, 100);
    const offset = (pageNum - 1) * limitNum;

    console.log(`📋 GET bounty list: status=${status}, page=${pageNum}, limit=${limitNum}`);

    // Build query
    let query = supabase
      .from('discovery_requests')
      .select(`
        *,
        creator:creator_id (
          id,
          username,
          display_name,
          avatar_url
        )
      `, { count: 'exact' });

    // Status filter
    if (status && status !== 'all') {
      query = query.or(`bounty_status.eq.${status},status.eq.${status}`);
    }

    // Location filter
    if (location) {
      query = query.ilike('location', `%${location}%`);
    }

    // Cuisine filter
    if (cuisine_type) {
      query = query.eq('cuisine_type', cuisine_type);
    }

    // Stake range filter
    if (min_stake) {
      query = query.gte('bounty_amount', parseFloat(min_stake as string));
    }
    if (max_stake) {
      query = query.lte('bounty_amount', parseFloat(max_stake as string));
    }

    // Sorting
    const validSorts = ['created_at', 'bounty_amount', 'expires_at', 'response_count'];
    const sortField = validSorts.includes(sort as string) ? sort as string : 'created_at';
    const sortOrder = order === 'asc' ? true : false;
    query = query.order(sortField, { ascending: sortOrder });

    // Pagination
    query = query.range(offset, offset + limitNum - 1);

    const { data: bounties, error, count } = await query;

    if (error) {
      console.error('❌ Error fetching bounties:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch bounties'
      });
    }

    // Lazy expiration check for each bounty
    const processedBounties = await Promise.all(
      (bounties || []).map(async (bounty: any) => {
        const effectiveStatus = await checkAndUpdateExpiredBounty(
          bounty.id,
          bounty.bounty_status || bounty.status,
          bounty.expires_at
        );
        return {
          ...formatBountyResponse(bounty as DiscoveryRequest),
          status: effectiveStatus,
          creator: bounty.creator
        };
      })
    );

    // Filter out expired if we were looking for 'open' 
    const filteredBounties = status === 'open' 
      ? processedBounties.filter(b => b.status === 'open')
      : processedBounties;

    res.json({
      success: true,
      bounties: filteredBounties,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: count || 0,
        pages: Math.ceil((count || 0) / limitNum)
      }
    });

  } catch (error) {
    console.error('❌ Error in bounty list:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch bounties'
    });
  }
});

/**
 * GET /api/bounty/my-requests
 * Get bounties created by the authenticated user
 */
router.get('/my-requests', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    const { status } = req.query;

    console.log(`📋 GET my bounties for user ${userId}`);

    let query = supabase
      .from('discovery_requests')
      .select('*')
      .eq('creator_id', userId)
      .order('created_at', { ascending: false });

    if (status && status !== 'all') {
      query = query.or(`bounty_status.eq.${status},status.eq.${status}`);
    }

    const { data: bounties, error } = await query;

    if (error) {
      console.error('❌ Error fetching user bounties:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch your bounties'
      });
    }

    // Lazy expiration check
    const processedBounties = await Promise.all(
      (bounties || []).map(async (bounty: any) => {
        const effectiveStatus = await checkAndUpdateExpiredBounty(
          bounty.id,
          bounty.bounty_status || bounty.status,
          bounty.expires_at
        );
        return {
          ...formatBountyResponse(bounty as DiscoveryRequest),
          status: effectiveStatus
        };
      })
    );

    res.json({
      success: true,
      bounties: processedBounties
    });

  } catch (error) {
    console.error('❌ Error fetching user bounties:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch your bounties'
    });
  }
});

/**
 * GET /api/bounty/my-submissions
 * Get submissions the authenticated user has made to bounties
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

    console.log(`📋 GET my submissions for user ${userId}`);

    const { data: submissions, error } = await supabase
      .from('discovery_responses')
      .select(`
        id,
        response_text,
        recommendation_id,
        is_best_answer,
        created_at,
        request:request_id (
          id,
          title,
          bounty_amount,
          bounty_status,
          status,
          expires_at,
          creator:creator_id (
            id,
            username,
            display_name
          )
        ),
        recommendation:recommendation_id (
          id,
          title,
          restaurant:restaurant_id (
            id,
            name
          )
        )
      `)
      .eq('responder_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Error fetching user submissions:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch your submissions'
      });
    }

    res.json({
      success: true,
      submissions: submissions || []
    });

  } catch (error) {
    console.error('❌ Error fetching user submissions:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch your submissions'
    });
  }
});

/**
 * POST /api/bounty/create
 * Create a new bounty (requires auth + sufficient tokens)
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

    // Validate request body
    const validation = createBountySchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: 'Invalid bounty data',
        details: validation.error.errors
      });
    }

    const data = validation.data;
    console.log(`🎯 POST create bounty by user ${userId}: "${data.title}" for ${data.stake_amount} BOCA`);

    // Check user has sufficient tokens
    const balance = await getTokenBalance(userId);
    if (balance < data.stake_amount) {
      return res.status(400).json({
        success: false,
        error: `Insufficient tokens. You have ${balance} BOCA, need ${data.stake_amount} BOCA`
      });
    }

    // Calculate expiration
    let expiresAt: string;
    if (data.expires_at) {
      expiresAt = data.expires_at;
    } else if (data.deadline_unit && data.deadline_amount) {
      expiresAt = calculateExpiresAt(data.deadline_unit, data.deadline_amount);
    } else {
      // Default: 7 days
      expiresAt = calculateExpiresAt('days', 7);
    }

    // Deduct tokens from creator
    const deductSuccess = await deductTokens(userId, data.stake_amount, `Bounty stake for "${data.title}"`);
    if (!deductSuccess) {
      return res.status(500).json({
        success: false,
        error: 'Failed to stake tokens'
      });
    }

    // Create bounty
    const { data: bounty, error: createError } = await supabase
      .from('discovery_requests')
      .insert({
        creator_id: userId,
        title: data.title,
        description: data.description,
        location: data.location,
        cuisine_type: data.cuisine_type,
        occasion: data.occasion,
        budget_range: data.budget_range,
        dietary_restrictions: data.dietary_restrictions,
        bounty_amount: data.stake_amount,
        bounty_status: 'open',
        status: 'open',
        expires_at: expiresAt,
        response_count: 0,
        view_count: 0
      })
      .select()
      .single();

    if (createError || !bounty) {
      console.error('❌ Error creating bounty:', createError);
      // Refund tokens
      await addTokens(userId, data.stake_amount, 'Bounty creation failed - refund');
      return res.status(500).json({
        success: false,
        error: 'Failed to create bounty'
      });
    }

    // Log transaction
    try {
      await supabase
        .from('bounty_transactions')
        .insert({
          bounty_id: bounty.id,
          transaction_type: 'stake',
          from_user_id: userId,
          to_user_id: null,
          amount_boca: data.stake_amount,
          notes: `Bounty created: "${data.title}"`
        });
    } catch (txError) {
      console.warn('⚠️ Could not log bounty transaction:', txError);
    }

    console.log(`✅ Bounty created: ${bounty.id}`);

    res.status(201).json({
      success: true,
      bounty: formatBountyResponse(bounty as DiscoveryRequest)
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
 * GET /api/bounty/:id
 * Get bounty details by ID
 */
router.get('/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const bountyId = req.params.id;

    console.log(`📋 GET bounty details: ${bountyId}`);

    const { data: bounty, error } = await supabase
      .from('discovery_requests')
      .select(`
        *,
        creator:creator_id (
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

    // Lazy expiration check
    const effectiveStatus = await checkAndUpdateExpiredBounty(
      bounty.id,
      bounty.bounty_status || bounty.status,
      bounty.expires_at
    );

    // Get responses with recommendation and restaurant details
    const { data: responses } = await supabase
      .from('discovery_responses')
      .select(`
        id,
        response_text,
        recommendation_id,
        upvotes_count,
        is_best_answer,
        created_at,
        responder:responder_id (
          id,
          username,
          display_name,
          avatar_url
        ),
        recommendation:recommendation_id (
          id,
          title,
          restaurant_id,
          restaurant:restaurant_id (
            id,
            name,
            cuisine_type,
            address
          )
        )
      `)
      .eq('request_id', bountyId)
      .order('created_at', { ascending: true }); // Oldest first for first-responder visibility

    // Increment view count
    await supabase
      .from('discovery_requests')
      .update({ 
        view_count: (bounty.view_count || 0) + 1,
        updated_at: new Date().toISOString()
      })
      .eq('id', bountyId);

    res.json({
      success: true,
      bounty: {
        ...formatBountyResponse(bounty as DiscoveryRequest),
        status: effectiveStatus,
        creator: bounty.creator,
        responses: responses || []
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
 * Submit a solution/response to a bounty (requires auth)
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
      .from('discovery_requests')
      .select('id, status, bounty_status, expires_at, creator_id')
      .eq('id', bounty_id)
      .single();

    if (bountyError || !bounty) {
      return res.status(404).json({
        success: false,
        error: 'Bounty not found'
      });
    }

    // Check and update expiration status first
    const effectiveStatus = await checkAndUpdateExpiredBounty(
      bounty.id,
      bounty.bounty_status || bounty.status,
      bounty.expires_at
    );

    if (effectiveStatus !== 'open') {
      return res.status(400).json({
        success: false,
        error: `Bounty is not accepting submissions (status: ${effectiveStatus})`
      });
    }

    // Check user isn't the bounty creator
    if (bounty.creator_id === userId) {
      return res.status(400).json({
        success: false,
        error: 'Cannot submit solutions to your own bounty'
      });
    }

    // Check recommendation exists and belongs to user
    const { data: recommendation, error: recError } = await supabase
      .from('recommendations')
      .select('id, author_id, restaurant_id')
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

    // Check if user already submitted to this bounty (any recommendation)
    const { data: existingUserResponse } = await supabase
      .from('discovery_responses')
      .select('id')
      .eq('request_id', bounty_id)
      .eq('responder_id', userId)
      .maybeSingle();

    if (existingUserResponse) {
      return res.status(400).json({
        success: false,
        error: 'You have already submitted a response to this bounty'
      });
    }

    // Check if this specific recommendation already submitted
    const { data: existingRecResponse } = await supabase
      .from('discovery_responses')
      .select('id')
      .eq('request_id', bounty_id)
      .eq('recommendation_id', recommendation_id)
      .maybeSingle();

    if (existingRecResponse) {
      return res.status(400).json({
        success: false,
        error: 'This recommendation has already been submitted to this bounty'
      });
    }

    // Create response/submission
    const { data: response, error: responseError } = await supabase
      .from('discovery_responses')
      .insert({
        request_id: bounty_id,
        responder_id: userId,
        recommendation_id,
        response_text: explanation || 'Recommendation submitted as response',
        upvotes_count: 0,
        is_best_answer: false
      })
      .select()
      .single();

    if (responseError) {
      console.error('❌ Error creating response:', responseError);
      return res.status(500).json({
        success: false,
        error: 'Failed to submit solution'
      });
    }

    // Increment response count
    await supabase
      .from('discovery_requests')
      .update({ 
        response_count: supabase.rpc ? undefined : 1, // Will use raw SQL below
        updated_at: new Date().toISOString()
      })
      .eq('id', bounty_id);

    // Increment response count properly
    await supabase.rpc('increment_response_count', { request_id: bounty_id }).catch(() => {
      // Fallback: direct update
      supabase
        .from('discovery_requests')
        .update({ response_count: (bounty as any).response_count ? (bounty as any).response_count + 1 : 1 })
        .eq('id', bounty_id);
    });

    console.log(`✅ Response submitted: ${response.id}`);

    res.status(201).json({
      success: true,
      submission: {
        id: response.id,
        bounty_id,
        recommendation_id,
        created_at: response.created_at
      }
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
 * POST /api/bounty/award
 * Award bounty to winning restaurant (first responder gets prize)
 * 
 * NEW LOGIC: "Restaurant Wins, First Responder Paid"
 * - Creator selects restaurant_id (the winning restaurant)
 * - System finds first response that recommended that restaurant
 * - 90% of stake goes to first responder, 10% burned
 */
router.post('/award', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    // Validate request
    const validation = awardBountySchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: 'Invalid award data. Required: bounty_id, restaurant_id',
        details: validation.error.errors
      });
    }

    const { bounty_id, restaurant_id } = validation.data;

    console.log(`🏆 POST award bounty ${bounty_id} to restaurant ${restaurant_id} by user ${userId}`);

    // Check bounty exists and user is creator
    const { data: bounty, error: bountyError } = await supabase
      .from('discovery_requests')
      .select('id, creator_id, bounty_amount, status, bounty_status, best_answer_id')
      .eq('id', bounty_id)
      .single();

    if (bountyError || !bounty) {
      return res.status(404).json({
        success: false,
        error: 'Bounty not found'
      });
    }

    if (bounty.creator_id !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Only bounty creator can award prizes'
      });
    }

    const currentStatus = bounty.bounty_status || bounty.status;
    if (currentStatus !== 'open' && currentStatus !== 'pending') {
      return res.status(400).json({
        success: false,
        error: `Cannot award prizes for bounty with status: ${currentStatus}`
      });
    }

    if (bounty.best_answer_id) {
      return res.status(400).json({
        success: false,
        error: 'Bounty has already been awarded'
      });
    }

    // Find all responses - check both old (recommendation_id) and new (restaurant_recommendations) formats
    const { data: responses, error: responsesError } = await supabase
      .from('discovery_responses')
      .select(`
        id,
        responder_id,
        recommendation_id,
        restaurant_recommendations,
        created_at,
        recommendation:recommendation_id (
          id,
          restaurant_id
        )
      `)
      .eq('request_id', bounty_id)
      .order('created_at', { ascending: true }); // Oldest first

        if (responsesError) {
          console.error('❌ Error fetching responses:', responsesError);
          return res.status(500).json({
            success: false,
            error: 'Failed to fetch responses'
          });
        }

    // Find first response with matching restaurant_id
    // Check both old format (recommendation.restaurant_id) and new format (restaurant_recommendations array)
    const restaurantIdNum = typeof restaurant_id === 'string' ? parseInt(restaurant_id, 10) : restaurant_id;

    const winningResponse = (responses || []).find((r: any) => {
      // Check old format: recommendation table link
      if (r.recommendation?.restaurant_id === restaurantIdNum) {
        return true;
      }
  
      // Check new format: restaurant_recommendations JSONB array
      if (r.restaurant_recommendations && Array.isArray(r.restaurant_recommendations)) {
        return r.restaurant_recommendations.some((rec: any) => 
          rec.restaurant_id === restaurantIdNum || 
          parseInt(rec.restaurant_id, 10) === restaurantIdNum
        );
      }
  
      return false;
    });

    if (!winningResponse) {
      return res.status(400).json({
        success: false,
        error: 'No responses found for this restaurant. Select a restaurant that was actually recommended.'
      });
    }

    console.log(`🎯 First responder for restaurant ${restaurant_id}: response ${winningResponse.id} by user ${winningResponse.responder_id}`);

    // Calculate prize after platform fee
    const platformFee = bounty.bounty_amount * (BOUNTY_CONFIG.PLATFORM_FEE / 100);
    const prizeAmount = bounty.bounty_amount - platformFee;

    // Award tokens to winner (first responder)
    const awardSuccess = await addTokens(
      winningResponse.responder_id,
      prizeAmount,
      `Bounty prize - first to recommend winning restaurant (bounty: ${bounty_id})`
    );

    if (!awardSuccess) {
      return res.status(500).json({
        success: false,
        error: 'Failed to award prize tokens'
      });
    }

    // Update bounty status and best answer
    const { error: updateError } = await supabase
      .from('discovery_requests')
      .update({
        status: 'closed',
        bounty_status: 'awarded',
        best_answer_id: winningResponse.id,
        closed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', bounty_id);

    if (updateError) {
      console.error('❌ Error updating bounty status:', updateError);
      // Note: Tokens already awarded, so we don't roll back
    }

    // Mark response as best answer
    await supabase
      .from('discovery_responses')
      .update({ is_best_answer: true })
      .eq('id', winningResponse.id);

    // Record transaction
    try {
      await supabase
        .from('bounty_transactions')
        .insert({
          bounty_id: bounty_id,
          transaction_type: 'award',
          from_user_id: userId,
          to_user_id: winningResponse.responder_id,
          amount_boca: prizeAmount,
          notes: `First responder prize for restaurant ${restaurant_id} (${BOUNTY_CONFIG.PLATFORM_FEE}% fee burned: ${platformFee.toFixed(2)} BOCA)`
        });

      // Also record the burn
      await supabase
        .from('bounty_transactions')
        .insert({
          bounty_id: bounty_id,
          transaction_type: 'burn',
          from_user_id: userId,
          to_user_id: null,
          amount_boca: platformFee,
          notes: `Platform fee burned (${BOUNTY_CONFIG.PLATFORM_FEE}%)`
        });
    } catch (txError) {
      console.warn('⚠️ Could not log bounty transaction:', txError);
    }

    console.log(`✅ Bounty ${bounty_id} awarded: ${prizeAmount.toFixed(2)} BOCA to user ${winningResponse.responder_id} (first responder)`);

    res.json({
      success: true,
      message: 'Bounty awarded to first responder',
      winning_response_id: winningResponse.id,
      winner_user_id: winningResponse.responder_id,
      restaurant_id: restaurant_id,
      prize_amount: prizeAmount,
      platform_fee_burned: platformFee,
      tip_suggestion: 'You can now tip other helpful responses using POST /api/bounty/tip'
    });

  } catch (error) {
    console.error('❌ Error awarding bounty:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to award bounty'
    });
  }
});

/**
 * POST /api/bounty/tip
 * Tip another response that was helpful (after bounty is awarded)
 * Tips come from creator's wallet, 100% goes to responder (no burn)
 */
router.post('/tip', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    // Validate request
    const validation = tipResponseSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: `Invalid tip data. Minimum tip: ${BOUNTY_CONFIG.MIN_TIP} BOCA`,
        details: validation.error.errors
      });
    }

    const { bounty_id, response_id, amount } = validation.data;

    console.log(`💝 POST tip ${amount} BOCA on response ${response_id} in bounty ${bounty_id} by user ${userId}`);

    // Check bounty exists and user is creator
    const { data: bounty, error: bountyError } = await supabase
      .from('discovery_requests')
      .select('id, creator_id, status, bounty_status, best_answer_id')
      .eq('id', bounty_id)
      .single();

    if (bountyError || !bounty) {
      return res.status(404).json({
        success: false,
        error: 'Bounty not found'
      });
    }

    if (bounty.creator_id !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Only bounty creator can tip responses'
      });
    }

    const currentStatus = bounty.bounty_status || bounty.status;
    // Bounty must be closed/awarded before tipping other responses
    if (currentStatus !== 'closed' && currentStatus !== 'awarded') {
      return res.status(400).json({
        success: false,
        error: 'Must award the main bounty before tipping other responses'
      });
    }

    // Check response exists and belongs to this bounty
    const { data: response, error: responseError } = await supabase
      .from('discovery_responses')
      .select('id, responder_id, is_best_answer')
      .eq('id', response_id)
      .eq('request_id', bounty_id)
      .single();

    if (responseError || !response) {
      return res.status(404).json({
        success: false,
        error: 'Response not found for this bounty'
      });
    }

    // Can't tip yourself
    if (response.responder_id === userId) {
      return res.status(400).json({
        success: false,
        error: 'Cannot tip your own response'
      });
    }

    // Check creator has sufficient balance
    const balance = await getTokenBalance(userId);
    if (balance < amount) {
      return res.status(400).json({
        success: false,
        error: `Insufficient tokens. You have ${balance.toFixed(2)} BOCA, need ${amount.toFixed(2)} BOCA`
      });
    }

    // Deduct from creator
    const deductSuccess = await deductTokens(userId, amount, `Tip for helpful response ${response_id}`);
    if (!deductSuccess) {
      return res.status(500).json({
        success: false,
        error: 'Failed to deduct tip from your wallet'
      });
    }

    // Credit to responder (100%, no burn on tips)
    const creditSuccess = await addTokens(response.responder_id, amount, `Tip received for response ${response_id}`);
    if (!creditSuccess) {
      // Refund the creator
      await addTokens(userId, amount, 'Tip failed - refund');
      return res.status(500).json({
        success: false,
        error: 'Failed to send tip to responder'
      });
    }

    // Record transaction
    try {
      await supabase
        .from('bounty_transactions')
        .insert({
          bounty_id: bounty_id,
          transaction_type: 'tip',
          from_user_id: userId,
          to_user_id: response.responder_id,
          amount_boca: amount,
          notes: `Tip for helpful response (response_id: ${response_id})`
        });
    } catch (txError) {
      console.warn('⚠️ Could not log tip transaction:', txError);
    }

    console.log(`✅ Tip sent: ${amount.toFixed(2)} BOCA from ${userId} to ${response.responder_id}`);

    res.json({
      success: true,
      message: 'Tip sent successfully',
      tip_amount: amount,
      recipient_user_id: response.responder_id,
      response_id: response_id
    });

  } catch (error) {
    console.error('❌ Error sending tip:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send tip'
    });
  }
});

/**
 * POST /api/bounty/refund
 * Request refund for expired bounty with no responses (only creator)
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

    // Check bounty exists and user is creator
    const { data: bounty, error: bountyError } = await supabase
      .from('discovery_requests')
      .select('id, creator_id, bounty_amount, status, bounty_status, expires_at, response_count')
      .eq('id', bounty_id)
      .single();

    if (bountyError || !bounty) {
      return res.status(404).json({
        success: false,
        error: 'Bounty not found'
      });
    }

    if (bounty.creator_id !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Only bounty creator can request refund'
      });
    }

    // Check and update expiration status
    const effectiveStatus = await checkAndUpdateExpiredBounty(
      bounty.id,
      bounty.bounty_status || bounty.status,
      bounty.expires_at
    );

    // Must be expired
    if (effectiveStatus !== 'expired') {
      return res.status(400).json({
        success: false,
        error: `Bounty must be expired to request refund (current status: ${effectiveStatus})`
      });
    }

    // Must have no responses
    if ((bounty.response_count || 0) > 0) {
      return res.status(400).json({
        success: false,
        error: 'Cannot refund bounty with responses. Please award to a response instead.'
      });
    }

    // Process refund (full amount - no fee for expired bounties with no responses)
    const refundAmount = bounty.bounty_amount;

    const refundSuccess = await addTokens(
      userId,
      refundAmount,
      `Refund for expired bounty ${bounty_id}`
    );

    if (!refundSuccess) {
      return res.status(500).json({
        success: false,
        error: 'Failed to process refund'
      });
    }

    // Update bounty status
    await supabase
      .from('discovery_requests')
      .update({
        status: 'refunded',
        bounty_status: 'refunded',
        closed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', bounty_id);

    // Record transaction
    try {
      await supabase
        .from('bounty_transactions')
        .insert({
          bounty_id: bounty_id,
          transaction_type: 'refund',
          from_user_id: null,
          to_user_id: userId,
          amount_boca: refundAmount,
          notes: 'Expired bounty with no responses - full refund'
        });
    } catch (txError) {
      console.warn('⚠️ Could not log refund transaction:', txError);
    }

    console.log(`✅ Bounty ${bounty_id} refunded: ${refundAmount} BOCA to user ${userId}`);

    res.json({
      success: true,
      message: 'Refund processed successfully',
      refund_amount: refundAmount
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
 * DELETE /api/bounty/:id
 * Cancel a bounty (only if no responses and not expired)
 */
router.delete('/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const bountyId = req.params.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    console.log(`🗑️ DELETE bounty ${bountyId} by user ${userId}`);

    // Check bounty exists and user is creator
    const { data: bounty, error: bountyError } = await supabase
      .from('discovery_requests')
      .select('id, creator_id, bounty_amount, status, bounty_status, response_count')
      .eq('id', bountyId)
      .single();

    if (bountyError || !bounty) {
      return res.status(404).json({
        success: false,
        error: 'Bounty not found'
      });
    }

    if (bounty.creator_id !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Only bounty creator can cancel'
      });
    }

    const currentStatus = bounty.bounty_status || bounty.status;
    if (currentStatus !== 'open' && currentStatus !== 'pending') {
      return res.status(400).json({
        success: false,
        error: `Cannot cancel bounty with status: ${currentStatus}`
      });
    }

    if ((bounty.response_count || 0) > 0) {
      return res.status(400).json({
        success: false,
        error: 'Cannot cancel bounty that has responses'
      });
    }

    // Refund tokens
    const refundSuccess = await addTokens(
      userId,
      bounty.bounty_amount,
      `Bounty cancelled - refund for ${bountyId}`
    );

    if (!refundSuccess) {
      return res.status(500).json({
        success: false,
        error: 'Failed to refund tokens'
      });
    }

    // Update status to cancelled
    await supabase
      .from('discovery_requests')
      .update({
        status: 'cancelled',
        bounty_status: 'cancelled',
        closed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', bountyId);

    // Record transaction
    try {
      await supabase
        .from('bounty_transactions')
        .insert({
          bounty_id: bountyId,
          transaction_type: 'cancel',
          from_user_id: null,
          to_user_id: userId,
          amount_boca: bounty.bounty_amount,
          notes: 'Bounty cancelled by creator - full refund'
        });
    } catch (txError) {
      console.warn('⚠️ Could not log cancel transaction:', txError);
    }

    console.log(`✅ Bounty ${bountyId} cancelled, ${bounty.bounty_amount} BOCA refunded`);

    res.json({
      success: true,
      message: 'Bounty cancelled and tokens refunded',
      refund_amount: bounty.bounty_amount
    });

  } catch (error) {
    console.error('❌ Error cancelling bounty:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to cancel bounty'
    });
  }
});

export default router;