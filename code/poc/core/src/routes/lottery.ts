// File: code/poc/core/src/routes/lottery.ts
// Weekly Lottery System API Routes
// Handles: Entry tracking, drawing execution, winner selection, prize distribution
//
// Weekly Cycle: Wednesday 00:00 → Tuesday 23:59
// Drawing: Tuesday 23:00 (automated via cron)
// Prizes: 1st (250 BOCA), 2nd (150 BOCA), 3rd (100 BOCA)
// Spotlight: 3 days for winners' recommendations
// VRF: IOTA Rebased for provably fair randomness

import { Router, Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';
import cron from 'node-cron';

const router = Router();

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase configuration for lottery routes');
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// =============================================================================
// CONSTANTS
// =============================================================================

const LOTTERY_CONFIG = {
  PRIZES: {
    FIRST: 250.0,   // BOCA
    SECOND: 150.0,  // BOCA
    THIRD: 100.0    // BOCA
  },
  SPOTLIGHT_DURATION_DAYS: 3,
  MIN_PARTICIPANTS: 20,
  MAX_PARTICIPANTS: 100,
  MIN_ENGAGEMENT_SCORE: 10, // Minimum score to qualify
  SPOTLIGHT_RECOMMENDATIONS: {
    FIRST: 3,
    SECOND: 2,
    THIRD: 1
  }
};

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

interface LotteryParticipant {
  user_id: string;
  engagement_score: number;
  ticket_count: number;
  username?: string;
  display_name?: string;
  avatar_url?: string;
}

interface DrawingResult {
  drawing_id: string;
  week_start: string;
  week_end: string;
  total_participants: number;
  total_tickets: number;
  winners: {
    first?: { user_id: string; username: string; prize: number };
    second?: { user_id: string; username: string; prize: number };
    third?: { user_id: string; username: string; prize: number };
  };
  drawn_at: string;
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Get current week's lottery drawing (Wed-Tue cycle)
 */
async function getCurrentDrawing(): Promise<any> {
  const { data, error } = await supabase.rpc('get_or_create_current_drawing');
  
  if (error) {
    console.error('❌ Error getting current drawing:', error);
    return null;
  }

  // Get full drawing details
  const { data: drawing } = await supabase
    .from('lottery_drawings')
    .select('*')
    .eq('id', data)
    .single();

  return drawing;
}

/**
 * Update all users' weekly engagement scores
 */
async function updateAllEngagementScores(): Promise<number> {
  const { data, error } = await supabase.rpc('update_all_weekly_engagement_scores');
  
  if (error) {
    console.error('❌ Error updating engagement scores:', error);
    return 0;
  }

  console.log(`✅ Updated ${data} user engagement scores`);
  return data;
}

/**
 * Get eligible participants for current drawing
 */
async function getEligibleParticipants(): Promise<LotteryParticipant[]> {
  // First, update all engagement scores
  await updateAllEngagementScores();

  // Get top participants by engagement score (wallet-tier only)
  const { data: users, error } = await supabase
    .from('users')
    .select('id, username, display_name, avatar_url, weekly_engagement_score, account_tier')
    .gte('weekly_engagement_score', LOTTERY_CONFIG.MIN_ENGAGEMENT_SCORE)
    .eq('account_tier', 'wallet_full') // Only wallet users can participate in lottery
    .order('weekly_engagement_score', { ascending: false })
    .limit(LOTTERY_CONFIG.MAX_PARTICIPANTS);

  if (error) {
    console.error('❌ Error fetching eligible participants:', error);
    return [];
  }

  // Calculate tickets for each participant
  const participants: LotteryParticipant[] = (users || []).map(user => ({
    user_id: user.id,
    username: user.username,
    display_name: user.display_name,
    avatar_url: user.avatar_url,
    engagement_score: user.weekly_engagement_score,
    ticket_count: Math.min(Math.floor(Math.sqrt(user.weekly_engagement_score)), 10)
  }));

  return participants;
}

/**
 * Award tokens to user
 */
async function awardTokens(
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
    const newBalance = currentBalance + amount;

    const { error } = await supabase
      .from('users')
      .update({ 
        tokens_earned: newBalance,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId);

    if (error) {
      console.error('❌ Error awarding tokens:', error);
      return false;
    }

    console.log(`💰 Awarded ${amount} BOCA to user ${userId} for: ${reason}`);
    return true;
  } catch (error) {
    console.error('❌ Error in awardTokens:', error);
    return false;
  }
}

/**
 * Spotlight winner's recommendations
 */
async function spotlightRecommendations(
  userId: string, 
  count: number,
  drawingId: string
): Promise<string[]> {
  try {
    // Get user's top recommendations by engagement
    const { data: recs, error } = await supabase
      .from('recommendations')
      .select('id, title, likes_count, saves_count, comments_count')
      .eq('author_id', userId)
      .eq('deleted_at', null)
      .order('likes_count', { ascending: false })
      .limit(count);

    if (error || !recs || recs.length === 0) {
      console.log(`⚠️ No recommendations found for user ${userId}`);
      return [];
    }

    const recIds = recs.map(r => r.id);
    const spotlightExpiry = new Date();
    spotlightExpiry.setDate(spotlightExpiry.getDate() + LOTTERY_CONFIG.SPOTLIGHT_DURATION_DAYS);

    // Spotlight the recommendations
    const { error: updateError } = await supabase
      .from('recommendations')
      .update({
        spotlighted: true,
        spotlighted_at: new Date().toISOString(),
        spotlight_expires_at: spotlightExpiry.toISOString()
      })
      .in('id', recIds);

    if (updateError) {
      console.error('❌ Error spotlighting recommendations:', updateError);
      return [];
    }

    console.log(`✨ Spotlighted ${recIds.length} recommendations for user ${userId}`);
    return recIds;

  } catch (error) {
    console.error('❌ Error in spotlightRecommendations:', error);
    return [];
  }
}

/**
 * Select winners using IOTA VRF (TODO: Implement actual IOTA VRF)
 * For now, uses crypto.randomBytes for secure randomness
 */
async function selectWinners(participants: LotteryParticipant[]): Promise<{
  first?: string;
  second?: string;
  third?: string;
}> {
  if (participants.length < 3) {
    console.log('⚠️ Not enough participants for all prizes');
    return {};
  }

  // Build weighted ticket pool
  const ticketPool: string[] = [];
  participants.forEach(p => {
    for (let i = 0; i < p.ticket_count; i++) {
      ticketPool.push(p.user_id);
    }
  });

  if (ticketPool.length === 0) {
    console.log('⚠️ No tickets in pool');
    return {};
  }

  console.log(`🎫 Total tickets in pool: ${ticketPool.length}`);

  // TODO: Replace with IOTA VRF
  // For now, using crypto.randomBytes for secure randomness
  const crypto = require('crypto');
  
  const selectRandomWinner = (pool: string[], excludeIds: string[] = []): string | undefined => {
    const eligiblePool = pool.filter(id => !excludeIds.includes(id));
    if (eligiblePool.length === 0) return undefined;
    
    const randomBytes = crypto.randomBytes(4);
    const randomIndex = randomBytes.readUInt32BE(0) % eligiblePool.length;
    return eligiblePool[randomIndex];
  };

  const firstPlace = selectRandomWinner(ticketPool);
  const secondPlace = firstPlace ? selectRandomWinner(ticketPool, [firstPlace]) : undefined;
  const thirdPlace = (firstPlace && secondPlace) 
    ? selectRandomWinner(ticketPool, [firstPlace, secondPlace]) 
    : undefined;

  console.log(`🏆 Winners selected: 1st=${firstPlace}, 2nd=${secondPlace}, 3rd=${thirdPlace}`);

  return {
    first: firstPlace,
    second: secondPlace,
    third: thirdPlace
  };
}

/**
 * Execute the weekly lottery drawing
 */
async function executeDrawing(): Promise<DrawingResult | null> {
  try {
    console.log('🎲 Starting weekly lottery drawing...');

    // Get current drawing
    const drawing = await getCurrentDrawing();
    if (!drawing) {
      console.error('❌ No current drawing found');
      return null;
    }

    // Check if already completed
    if (drawing.status === 'completed') {
      console.log('⚠️ Drawing already completed');
      return null;
    }

    // Get eligible participants
    const participants = await getEligibleParticipants();
    console.log(`👥 ${participants.length} eligible participants`);

    if (participants.length < LOTTERY_CONFIG.MIN_PARTICIPANTS) {
      console.log(`⚠️ Not enough participants (min: ${LOTTERY_CONFIG.MIN_PARTICIPANTS})`);
      
      // Update drawing status to cancelled
      await supabase
        .from('lottery_drawings')
        .update({ 
          status: 'cancelled',
          updated_at: new Date().toISOString()
        })
        .eq('id', drawing.id);

      return null;
    }

    // Create lottery entries for all participants
    const entries = participants.map(p => ({
      drawing_id: drawing.id,
      user_id: p.user_id,
      engagement_score: p.engagement_score,
      ticket_count: p.ticket_count,
      created_at: new Date().toISOString()
    }));

    const { error: entriesError } = await supabase
      .from('lottery_entries')
      .insert(entries);

    if (entriesError) {
      console.error('❌ Error creating lottery entries:', entriesError);
      return null;
    }

    console.log(`✅ Created ${entries.length} lottery entries`);

    // Select winners
    const winners = await selectWinners(participants);

    if (!winners.first) {
      console.error('❌ Failed to select winners');
      return null;
    }

    // Award prizes and spotlight recommendations
    const prizeResults = await Promise.all([
      // First place
      winners.first ? Promise.all([
        awardTokens(winners.first, LOTTERY_CONFIG.PRIZES.FIRST, 'Weekly lottery - 1st place'),
        spotlightRecommendations(winners.first, LOTTERY_CONFIG.SPOTLIGHT_RECOMMENDATIONS.FIRST, drawing.id)
      ]) : null,
      // Second place
      winners.second ? Promise.all([
        awardTokens(winners.second, LOTTERY_CONFIG.PRIZES.SECOND, 'Weekly lottery - 2nd place'),
        spotlightRecommendations(winners.second, LOTTERY_CONFIG.SPOTLIGHT_RECOMMENDATIONS.SECOND, drawing.id)
      ]) : null,
      // Third place
      winners.third ? Promise.all([
        awardTokens(winners.third, LOTTERY_CONFIG.PRIZES.THIRD, 'Weekly lottery - 3rd place'),
        spotlightRecommendations(winners.third, LOTTERY_CONFIG.SPOTLIGHT_RECOMMENDATIONS.THIRD, drawing.id)
      ]) : null
    ]);

    // Update lottery entries with winners and spotlighted recs
    if (winners.first) {
      await supabase
        .from('lottery_entries')
        .update({ 
          won_prize: 'first',
          spotlighted_recommendation_ids: prizeResults[0]?.[1] || []
        })
        .eq('drawing_id', drawing.id)
        .eq('user_id', winners.first);
    }

    if (winners.second) {
      await supabase
        .from('lottery_entries')
        .update({ 
          won_prize: 'second',
          spotlighted_recommendation_ids: prizeResults[1]?.[1] || []
        })
        .eq('drawing_id', drawing.id)
        .eq('user_id', winners.second);
    }

    if (winners.third) {
      await supabase
        .from('lottery_entries')
        .update({ 
          won_prize: 'third',
          spotlighted_recommendation_ids: prizeResults[2]?.[1] || []
        })
        .eq('drawing_id', drawing.id)
        .eq('user_id', winners.third);
    }

    // Calculate total tickets
    const totalTickets = participants.reduce((sum, p) => sum + p.ticket_count, 0);

    // Update drawing with results
    const { error: updateError } = await supabase
      .from('lottery_drawings')
      .update({
        status: 'completed',
        total_participants: participants.length,
        total_tickets: totalTickets,
        first_place_winner_id: winners.first,
        second_place_winner_id: winners.second,
        third_place_winner_id: winners.third,
        drawn_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', drawing.id);

    if (updateError) {
      console.error('❌ Error updating drawing results:', updateError);
      return null;
    }

    // Get winner details for response
    const winnerDetails = await Promise.all([
      winners.first ? supabase.from('users').select('username').eq('id', winners.first).single() : null,
      winners.second ? supabase.from('users').select('username').eq('id', winners.second).single() : null,
      winners.third ? supabase.from('users').select('username').eq('id', winners.third).single() : null
    ]);

    const result: DrawingResult = {
      drawing_id: drawing.id,
      week_start: drawing.week_start,
      week_end: drawing.week_end,
      total_participants: participants.length,
      total_tickets: totalTickets,
      winners: {
        first: winners.first ? {
          user_id: winners.first,
          username: winnerDetails[0]?.data?.username || 'Unknown',
          prize: LOTTERY_CONFIG.PRIZES.FIRST
        } : undefined,
        second: winners.second ? {
          user_id: winners.second,
          username: winnerDetails[1]?.data?.username || 'Unknown',
          prize: LOTTERY_CONFIG.PRIZES.SECOND
        } : undefined,
        third: winners.third ? {
          user_id: winners.third,
          username: winnerDetails[2]?.data?.username || 'Unknown',
          prize: LOTTERY_CONFIG.PRIZES.THIRD
        } : undefined
      },
      drawn_at: new Date().toISOString()
    };

    console.log('🎉 Lottery drawing completed successfully!');
    console.log(JSON.stringify(result, null, 2));

    return result;

  } catch (error) {
    console.error('❌ Error executing lottery drawing:', error);
    return null;
  }
}

/**
 * Reset weekly engagement scores (runs Wednesday 00:00)
 */
async function resetWeeklyScores(): Promise<number> {
  const { data, error } = await supabase.rpc('reset_weekly_engagement_scores');
  
  if (error) {
    console.error('❌ Error resetting weekly scores:', error);
    return 0;
  }

  console.log(`✅ Reset ${data} user weekly engagement scores`);
  return data;
}

// =============================================================================
// CRON JOBS
// =============================================================================

/**
 * Schedule lottery drawing - Every Tuesday at 23:00 (11 PM)
 */
cron.schedule('0 23 * * 2', async () => {
  console.log('⏰ CRON: Running weekly lottery drawing (Tuesday 11 PM)');
  try {
    const result = await executeDrawing();
    if (result) {
      console.log('✅ CRON: Lottery drawing completed successfully');
    } else {
      console.log('⚠️ CRON: Lottery drawing cancelled (not enough participants)');
    }
  } catch (error) {
    console.error('❌ CRON: Error in lottery drawing:', error);
  }
}, {
  timezone: "UTC"
});

/**
 * Schedule weekly reset - Every Wednesday at 00:00 (midnight)
 */
cron.schedule('0 0 * * 3', async () => {
  console.log('⏰ CRON: Resetting weekly engagement scores (Wednesday midnight)');
  try {
    const resetCount = await resetWeeklyScores();
    console.log(`✅ CRON: Reset ${resetCount} weekly scores`);
  } catch (error) {
    console.error('❌ CRON: Error resetting weekly scores:', error);
  }
}, {
  timezone: "UTC"
});

console.log('📅 Lottery cron jobs scheduled:');
console.log('   - Drawing: Every Tuesday at 23:00 UTC');
console.log('   - Reset: Every Wednesday at 00:00 UTC');

// =============================================================================
// API ROUTES
// =============================================================================

/**
 * GET /api/lottery/current
 * Get current week's lottery information
 */
router.get('/current', async (req: AuthenticatedRequest, res: Response) => {
  try {
    console.log('📊 GET current lottery info');

    const drawing = await getCurrentDrawing();
    
    if (!drawing) {
      return res.status(404).json({
        success: false,
        error: 'No current drawing found'
      });
    }

    // Get participant count
    const { count: participantCount } = await supabase
      .from('lottery_entries')
      .select('*', { count: 'exact', head: true })
      .eq('drawing_id', drawing.id);

    // Get user's stats if authenticated
    let userStats = null;
    if (req.user?.id) {
      const { data: user } = await supabase
        .from('users')
        .select('weekly_engagement_score')
        .eq('id', req.user.id)
        .single();

      if (user) {
        const engagementScore = user.weekly_engagement_score || 0;
        const ticketCount = Math.min(Math.floor(Math.sqrt(engagementScore)), 10);
        
        userStats = {
          engagement_score: engagementScore,
          ticket_count: ticketCount,
          is_eligible: engagementScore >= LOTTERY_CONFIG.MIN_ENGAGEMENT_SCORE
        };
      }
    }

    res.json({
      success: true,
      drawing: {
        id: drawing.id,
        week_start: drawing.week_start,
        week_end: drawing.week_end,
        status: drawing.status,
        total_participants: participantCount || 0,
        min_participants: LOTTERY_CONFIG.MIN_PARTICIPANTS,
        max_participants: LOTTERY_CONFIG.MAX_PARTICIPANTS
      },
      prizes: LOTTERY_CONFIG.PRIZES,
      user_stats: userStats
    });

  } catch (error) {
    console.error('❌ Error fetching current lottery:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch lottery information'
    });
  }
});

/**
 * GET /api/lottery/leaderboard
 * Get current week's leaderboard (top participants by engagement score)
 */
router.get('/leaderboard', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    
    console.log(`📊 GET lottery leaderboard (limit: ${limit})`);

    // Update engagement scores first
    await updateAllEngagementScores();

    // Get top participants
    const { data: users, error } = await supabase
      .from('users')
      .select('id, username, display_name, avatar_url, weekly_engagement_score')
      .gte('weekly_engagement_score', LOTTERY_CONFIG.MIN_ENGAGEMENT_SCORE)
      .order('weekly_engagement_score', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('❌ Error fetching leaderboard:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch leaderboard'
      });
    }

    const leaderboard = (users || []).map((user, index) => {
      const ticketCount = Math.min(Math.floor(Math.sqrt(user.weekly_engagement_score)), 10);
      return {
        rank: index + 1,
        user: {
          id: user.id,
          username: user.username,
          display_name: user.display_name,
          avatar_url: user.avatar_url
        },
        engagement_score: user.weekly_engagement_score,
        ticket_count: ticketCount
      };
    });

    res.json({
      success: true,
      leaderboard,
      total_entries: leaderboard.length
    });

  } catch (error) {
    console.error('❌ Error fetching leaderboard:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch leaderboard'
    });
  }
});

/**
 * GET /api/lottery/history
 * Get past lottery results
 */
router.get('/history', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 10, 50);
    const offset = parseInt(req.query.offset as string) || 0;

    console.log(`📊 GET lottery history (limit: ${limit}, offset: ${offset})`);

    const { data: drawings, error } = await supabase
      .from('lottery_drawings')
      .select(`
        id,
        week_start,
        week_end,
        status,
        total_participants,
        total_tickets,
        first_place_winner_id,
        first_place_prize_boca,
        second_place_winner_id,
        second_place_prize_boca,
        third_place_winner_id,
        third_place_prize_boca,
        drawn_at,
        first_place:first_place_winner_id (username, display_name, avatar_url),
        second_place:second_place_winner_id (username, display_name, avatar_url),
        third_place:third_place_winner_id (username, display_name, avatar_url)
      `)
      .eq('status', 'completed')
      .order('week_start', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('❌ Error fetching lottery history:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch lottery history'
      });
    }

    const { count: totalCount } = await supabase
      .from('lottery_drawings')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'completed');

    res.json({
      success: true,
      drawings: (drawings || []).map(d => ({
        id: d.id,
        week_start: d.week_start,
        week_end: d.week_end,
        total_participants: d.total_participants,
        total_tickets: d.total_tickets,
        winners: {
          first: d.first_place_winner_id ? {
            user_id: d.first_place_winner_id,
            username: d.first_place?.username,
            display_name: d.first_place?.display_name,
            avatar_url: d.first_place?.avatar_url,
            prize: d.first_place_prize_boca
          } : null,
          second: d.second_place_winner_id ? {
            user_id: d.second_place_winner_id,
            username: d.second_place?.username,
            display_name: d.second_place?.display_name,
            avatar_url: d.second_place?.avatar_url,
            prize: d.second_place_prize_boca
          } : null,
          third: d.third_place_winner_id ? {
            user_id: d.third_place_winner_id,
            username: d.third_place?.username,
            display_name: d.third_place?.display_name,
            avatar_url: d.third_place?.avatar_url,
            prize: d.third_place_prize_boca
          } : null
        },
        drawn_at: d.drawn_at
      })),
      pagination: {
        limit,
        offset,
        total: totalCount || 0,
        has_more: (offset + limit) < (totalCount || 0)
      }
    });

  } catch (error) {
    console.error('❌ Error fetching lottery history:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch lottery history'
    });
  }
});

/**
 * GET /api/lottery/user/:userId/history
 * Get user's lottery participation history
 */
router.get('/user/:userId/history', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { userId } = req.params;
    const limit = Math.min(parseInt(req.query.limit as string) || 10, 50);
    const offset = parseInt(req.query.offset as string) || 0;

    console.log(`📊 GET lottery history for user: ${userId}`);

    const { data: entries, error } = await supabase
      .from('lottery_entries')
      .select(`
        id,
        engagement_score,
        ticket_count,
        won_prize,
        spotlighted_recommendation_ids,
        created_at,
        drawing:drawing_id (
          id,
          week_start,
          week_end,
          status,
          total_participants,
          total_tickets,
          drawn_at
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('❌ Error fetching user lottery history:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch user lottery history'
      });
    }

    const { count: totalCount } = await supabase
      .from('lottery_entries')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    // Calculate stats
    const totalWins = entries?.filter(e => e.won_prize).length || 0;
    const totalPrizes = entries?.reduce((sum, e) => {
      if (e.won_prize === 'first') return sum + LOTTERY_CONFIG.PRIZES.FIRST;
      if (e.won_prize === 'second') return sum + LOTTERY_CONFIG.PRIZES.SECOND;
      if (e.won_prize === 'third') return sum + LOTTERY_CONFIG.PRIZES.THIRD;
      return sum;
    }, 0) || 0;

    res.json({
      success: true,
      user_id: userId,
      stats: {
        total_participations: totalCount || 0,
        total_wins: totalWins,
        total_prizes_won: totalPrizes
      },
      entries: (entries || []).map(e => ({
        id: e.id,
        drawing: {
          id: e.drawing.id,
          week_start: e.drawing.week_start,
          week_end: e.drawing.week_end,
          status: e.drawing.status,
          drawn_at: e.drawing.drawn_at
        },
        engagement_score: e.engagement_score,
        ticket_count: e.ticket_count,
        won_prize: e.won_prize,
        prize_amount: e.won_prize === 'first' ? LOTTERY_CONFIG.PRIZES.FIRST :
                      e.won_prize === 'second' ? LOTTERY_CONFIG.PRIZES.SECOND :
                      e.won_prize === 'third' ? LOTTERY_CONFIG.PRIZES.THIRD : 0,
        spotlighted_recommendations: e.spotlighted_recommendation_ids || [],
        created_at: e.created_at
      })),
      pagination: {
        limit,
        offset,
        total: totalCount || 0,
        has_more: (offset + limit) < (totalCount || 0)
      }
    });

  } catch (error) {
    console.error('❌ Error fetching user lottery history:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch user lottery history'
    });
  }
});

/**
 * POST /api/lottery/draw (ADMIN ONLY)
 * Manually trigger lottery drawing (for testing or emergency)
 */
router.post('/draw', async (req: AuthenticatedRequest, res: Response) => {
  try {
    // TODO: Add admin authentication check
    const isAdmin = req.user?.id === process.env.ADMIN_USER_ID;
    
    if (!isAdmin) {
      return res.status(403).json({
        success: false,
        error: 'Admin access required'
      });
    }

    console.log('🎲 POST manual lottery drawing triggered');

    const result = await executeDrawing();

    if (!result) {
      return res.status(400).json({
        success: false,
        error: 'Drawing failed (not enough participants or already completed)'
      });
    }

    res.json({
      success: true,
      message: 'Lottery drawing completed',
      result
    });

  } catch (error) {
    console.error('❌ Error executing manual drawing:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to execute lottery drawing'
    });
  }
});

/**
 * POST /api/lottery/reset-week (ADMIN ONLY)
 * Manually reset weekly engagement scores (for testing)
 */
router.post('/reset-week', async (req: AuthenticatedRequest, res: Response) => {
  try {
    // TODO: Add admin authentication check
    const isAdmin = req.user?.id === process.env.ADMIN_USER_ID;
    
    if (!isAdmin) {
      return res.status(403).json({
        success: false,
        error: 'Admin access required'
      });
    }

    console.log('🔄 POST manual weekly reset triggered');

    const resetCount = await resetWeeklyScores();

    res.json({
      success: true,
      message: 'Weekly scores reset',
      users_reset: resetCount
    });

  } catch (error) {
    console.error('❌ Error resetting weekly scores:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to reset weekly scores'
    });
  }
});

// =============================================================================
// EXPORT
// =============================================================================

export default router;