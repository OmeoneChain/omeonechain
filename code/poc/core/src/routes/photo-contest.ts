// File: code/poc/core/src/routes/photo-contest.ts
// Weekly Photo Contest System API Routes
// Handles: Nominations, finalist selection, voting, winner announcement
//
// Weekly Cycle: Monday-Sunday
// Timeline: Mon-Wed nominations, Thu 9AM finalists, Thu-Sat voting, Sun 8:15pm winners
// Prizes: 1st (100 BOCA), 2nd (50 BOCA), 3rd (30 BOCA)
// Nomination Reward: 0.5 BOCA per submission

import { Router, Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';
import cron from 'node-cron';

const router = Router();

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase configuration for photo contest routes');
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// =============================================================================
// CONSTANTS
// =============================================================================

const CONTEST_CONFIG = {
  PRIZES: {
    FIRST: 100.0,   // BOCA
    SECOND: 50.0,   // BOCA
    THIRD: 30.0     // BOCA
  },
  NOMINATION_REWARD: 0.5, // BOCA
  FINALIST_COUNT: 10,
  HOMEPAGE_FEATURE_DAYS: 7, // Winners featured for 1 week
  MIN_NOMINATIONS_FOR_CONTEST: 10 // Minimum nominations needed to proceed
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

interface Nomination {
  id: string;
  recommendation_id: string;
  nominator_user_id: string;
  is_finalist: boolean;
  vote_count: number;
  created_at: string;
}

interface ContestRound {
  id: string;
  week_start: string;
  week_end: string;
  status: string;
  total_nominations: number;
  total_finalists: number;
  total_votes: number;
  nomination_start: string;
  nomination_end: string;
  finalist_selection_at: string;
  voting_start: string;
  voting_end: string;
  winner_announcement_at: string;
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Get current week's photo contest round
 */
async function getCurrentRound(): Promise<ContestRound | null> {
  const { data, error } = await supabase.rpc('get_or_create_current_contest_round');
  
  if (error) {
    console.error('❌ Error getting current round:', error);
    return null;
  }

  // Get full round details
  const { data: round, error: roundError } = await supabase
    .from('photo_contest_rounds')
    .select('*')
    .eq('id', data)
    .single();

  if (roundError) {
    console.error('❌ Error fetching round details:', roundError);
    return null;
  }

  return round;
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
 * Select random finalists (Thursday 9 AM)
 */
async function selectFinalists(roundId: string): Promise<number> {
  try {
    console.log(`🎲 Selecting finalists for round ${roundId}`);

    // Check current status
    const { data: round } = await supabase
      .from('photo_contest_rounds')
      .select('status, total_nominations')
      .eq('id', roundId)
      .single();

    if (!round) {
      console.error('❌ Round not found');
      return 0;
    }

    if (round.status !== 'nominations') {
      console.log(`⚠️ Round status is ${round.status}, not nominations`);
      return 0;
    }

    // Check minimum nominations
    if (round.total_nominations < CONTEST_CONFIG.MIN_NOMINATIONS_FOR_CONTEST) {
      console.log(`⚠️ Not enough nominations (${round.total_nominations}/${CONTEST_CONFIG.MIN_NOMINATIONS_FOR_CONTEST})`);
      
      // Cancel round
      await supabase
        .from('photo_contest_rounds')
        .update({ 
          status: 'cancelled',
          updated_at: new Date().toISOString()
        })
        .eq('id', roundId);

      return 0;
    }

    // Select random finalists using database function
    const { data: finalistCount, error } = await supabase
      .rpc('select_random_finalists', {
        p_round_id: roundId,
        p_finalist_count: CONTEST_CONFIG.FINALIST_COUNT
      });

    if (error) {
      console.error('❌ Error selecting finalists:', error);
      return 0;
    }

    console.log(`✅ Selected ${finalistCount} finalists`);
    return finalistCount || 0;

  } catch (error) {
    console.error('❌ Error in selectFinalists:', error);
    return 0;
  }
}

/**
 * Announce winners and award prizes (Sunday 8:15 PM)
 */
async function announceWinners(roundId: string): Promise<boolean> {
  try {
    console.log(`🏆 Announcing winners for round ${roundId}`);

    // Check current status
    const { data: round } = await supabase
      .from('photo_contest_rounds')
      .select('status, total_votes')
      .eq('id', roundId)
      .single();

    if (!round) {
      console.error('❌ Round not found');
      return false;
    }

    if (round.status !== 'voting') {
      console.log(`⚠️ Round status is ${round.status}, not voting`);
      return false;
    }

    // Get winners using database function
    const { data: winners, error } = await supabase
      .rpc('determine_contest_winners', {
        p_round_id: roundId
      });

    if (error || !winners || winners.length === 0) {
      console.error('❌ Error determining winners:', error);
      return false;
    }

    const winner = winners[0];

    if (!winner.first_place_id) {
      console.log('⚠️ No winners found (no votes cast)');
      
      // Cancel round
      await supabase
        .from('photo_contest_rounds')
        .update({ 
          status: 'cancelled',
          updated_at: new Date().toISOString()
        })
        .eq('id', roundId);

      return false;
    }

    // Get nomination details for winners
    const { data: nominations } = await supabase
      .from('photo_contest_nominations')
      .select('id, recommendation_id, nominator_user_id')
      .in('id', [winner.first_place_id, winner.second_place_id, winner.third_place_id].filter(Boolean));

    if (!nominations) {
      console.error('❌ Error fetching winner nominations');
      return false;
    }

    const firstPlace = nominations.find(n => n.id === winner.first_place_id);
    const secondPlace = nominations.find(n => n.id === winner.second_place_id);
    const thirdPlace = nominations.find(n => n.id === winner.third_place_id);

    // Award prizes and update nominations
    const prizeResults = await Promise.all([
      // First place
      firstPlace ? Promise.all([
        awardTokens(firstPlace.nominator_user_id, CONTEST_CONFIG.PRIZES.FIRST, 'Photo contest - 1st place'),
        supabase.from('photo_contest_nominations').update({ won_prize: 'first' }).eq('id', firstPlace.id),
        supabase.from('recommendations').update({
          contest_winner_place: 'first',
          contest_winner_week: round.week_start,
          featured_on_homepage: true,
          homepage_feature_expires_at: new Date(Date.now() + CONTEST_CONFIG.HOMEPAGE_FEATURE_DAYS * 24 * 60 * 60 * 1000).toISOString()
        }).eq('id', firstPlace.recommendation_id)
      ]) : null,
      
      // Second place
      secondPlace ? Promise.all([
        awardTokens(secondPlace.nominator_user_id, CONTEST_CONFIG.PRIZES.SECOND, 'Photo contest - 2nd place'),
        supabase.from('photo_contest_nominations').update({ won_prize: 'second' }).eq('id', secondPlace.id),
        supabase.from('recommendations').update({
          contest_winner_place: 'second',
          contest_winner_week: round.week_start,
          featured_on_homepage: true,
          homepage_feature_expires_at: new Date(Date.now() + CONTEST_CONFIG.HOMEPAGE_FEATURE_DAYS * 24 * 60 * 60 * 1000).toISOString()
        }).eq('id', secondPlace.recommendation_id)
      ]) : null,
      
      // Third place
      thirdPlace ? Promise.all([
        awardTokens(thirdPlace.nominator_user_id, CONTEST_CONFIG.PRIZES.THIRD, 'Photo contest - 3rd place'),
        supabase.from('photo_contest_nominations').update({ won_prize: 'third' }).eq('id', thirdPlace.id),
        supabase.from('recommendations').update({
          contest_winner_place: 'third',
          contest_winner_week: round.week_start,
          featured_on_homepage: true,
          homepage_feature_expires_at: new Date(Date.now() + CONTEST_CONFIG.HOMEPAGE_FEATURE_DAYS * 24 * 60 * 60 * 1000).toISOString()
        }).eq('id', thirdPlace.recommendation_id)
      ]) : null
    ]);

    // Update round with results
    const { error: updateError } = await supabase
      .from('photo_contest_rounds')
      .update({
        status: 'completed',
        first_place_recommendation_id: firstPlace?.recommendation_id,
        second_place_recommendation_id: secondPlace?.recommendation_id,
        third_place_recommendation_id: thirdPlace?.recommendation_id,
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', roundId);

    if (updateError) {
      console.error('❌ Error updating round with winners:', updateError);
      return false;
    }

    console.log('🎉 Winners announced and prizes awarded!');
    return true;

  } catch (error) {
    console.error('❌ Error in announceWinners:', error);
    return false;
  }
}

// =============================================================================
// CRON JOBS
// =============================================================================

/**
 * Select finalists - Every Thursday at 09:00
 */
cron.schedule('0 9 * * 4', async () => {
  console.log('⏰ CRON: Selecting photo contest finalists (Thursday 9 AM)');
  try {
    const round = await getCurrentRound();
    if (round && round.status === 'nominations') {
      const finalistCount = await selectFinalists(round.id);
      if (finalistCount > 0) {
        console.log(`✅ CRON: Selected ${finalistCount} finalists`);
      } else {
        console.log('⚠️ CRON: Contest cancelled (not enough nominations)');
      }
    }
  } catch (error) {
    console.error('❌ CRON: Error selecting finalists:', error);
  }
}, {
  timezone: "UTC"
});

/**
 * Announce winners - Every Sunday at 20:15 (8:15 PM)
 */
cron.schedule('15 20 * * 0', async () => {
  console.log('⏰ CRON: Announcing photo contest winners (Sunday 8:15 PM)');
  try {
    const round = await getCurrentRound();
    if (round && round.status === 'voting') {
      const success = await announceWinners(round.id);
      if (success) {
        console.log('✅ CRON: Winners announced successfully');
      } else {
        console.log('⚠️ CRON: No winners (no votes cast)');
      }
    }
  } catch (error) {
    console.error('❌ CRON: Error announcing winners:', error);
  }
}, {
  timezone: "UTC"
});

console.log('📅 Photo contest cron jobs scheduled:');
console.log('   - Finalist Selection: Every Thursday at 09:00 UTC');
console.log('   - Winner Announcement: Every Sunday at 20:15 UTC');

// =============================================================================
// API ROUTES
// =============================================================================

/**
 * GET /api/photo-contest/current
 * Get current week's contest information
 */
router.get('/current', async (req: AuthenticatedRequest, res: Response) => {
  try {
    console.log('📊 GET current photo contest info');

    const round = await getCurrentRound();
    
    if (!round) {
      return res.status(404).json({
        success: false,
        error: 'No current round found'
      });
    }

    // Check if user has already nominated this week
    let userNomination = null;
    if (req.user?.id) {
      const { data: nomination } = await supabase
        .from('photo_contest_nominations')
        .select('id, recommendation_id, is_finalist, vote_count, created_at')
        .eq('round_id', round.id)
        .eq('nominator_user_id', req.user.id)
        .maybeSingle();

      userNomination = nomination;
    }

    // Check if user has voted this week
    let userHasVoted = false;
    if (req.user?.id) {
      const { data: vote } = await supabase
        .from('photo_contest_votes')
        .select('id')
        .eq('round_id', round.id)
        .eq('voter_user_id', req.user.id)
        .maybeSingle();

      userHasVoted = !!vote;
    }

    res.json({
      success: true,
      round: {
        id: round.id,
        week_start: round.week_start,
        week_end: round.week_end,
        status: round.status,
        total_nominations: round.total_nominations,
        total_finalists: round.total_finalists,
        total_votes: round.total_votes,
        timeline: {
          nomination_start: round.nomination_start,
          nomination_end: round.nomination_end,
          finalist_selection_at: round.finalist_selection_at,
          voting_start: round.voting_start,
          voting_end: round.voting_end,
          winner_announcement_at: round.winner_announcement_at
        }
      },
      prizes: CONTEST_CONFIG.PRIZES,
      nomination_reward: CONTEST_CONFIG.NOMINATION_REWARD,
      user_status: req.user ? {
        has_nominated: !!userNomination,
        nomination: userNomination,
        has_voted: userHasVoted
      } : null
    });

  } catch (error) {
    console.error('❌ Error fetching current contest:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch contest information'
    });
  }
});

/**
 * POST /api/photo-contest/nominate
 * Submit a photo nomination (requires auth)
 */
router.post('/nominate', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    const { recommendation_id } = req.body;

    if (!recommendation_id) {
      return res.status(400).json({
        success: false,
        error: 'recommendation_id is required'
      });
    }

    // Check wallet tier (only wallet users can nominate)
    if (req.user.accountTier !== 'wallet_full') {
      return res.status(403).json({
        success: false,
        error: 'Wallet connection required to nominate photos',
        message: 'Connect your wallet to participate in the photo contest and earn rewards',
        requires_upgrade: true
      });
    }

    console.log(`📸 POST nominate photo by user ${userId}`);

    // Get current round
    const round = await getCurrentRound();
    if (!round) {
      return res.status(404).json({
        success: false,
        error: 'No active contest round'
      });
    }

    // Check if nominations are open
    if (round.status !== 'nominations') {
      return res.status(400).json({
        success: false,
        error: `Nominations are closed (current status: ${round.status})`
      });
    }

    // Check if recommendation exists and has photos
    const { data: recommendation, error: recError } = await supabase
      .from('recommendations')
      .select('id, author_id, title, photos')
      .eq('id', recommendation_id)
      .single();

    if (recError || !recommendation) {
      return res.status(404).json({
        success: false,
        error: 'Recommendation not found'
      });
    }

    // Verify user owns the recommendation
    if (recommendation.author_id !== userId) {
      return res.status(403).json({
        success: false,
        error: 'You can only nominate your own recommendations',
        message: 'Photo contest nominations must be for recommendations you created'
      });
    }

    // Check if recommendation has photos
    if (!recommendation.photos || recommendation.photos.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Recommendation must have at least one photo'
      });
    }

    // Check if user already nominated this week
    const { data: existingNomination } = await supabase
      .from('photo_contest_nominations')
      .select('id')
      .eq('round_id', round.id)
      .eq('nominator_user_id', userId)
      .maybeSingle();

    if (existingNomination) {
      return res.status(400).json({
        success: false,
        error: 'You have already nominated a photo this week',
        existing_nomination_id: existingNomination.id
      });
    }

    // Check if this recommendation was already nominated this week
    const { data: dupNomination } = await supabase
      .from('photo_contest_nominations')
      .select('id, nominator_user_id')
      .eq('round_id', round.id)
      .eq('recommendation_id', recommendation_id)
      .maybeSingle();

    if (dupNomination) {
      return res.status(400).json({
        success: false,
        error: 'This recommendation has already been nominated this week'
      });
    }

    // Create nomination
    const { data: nomination, error: nominationError } = await supabase
      .from('photo_contest_nominations')
      .insert({
        round_id: round.id,
        recommendation_id: recommendation_id,
        nominator_user_id: userId,
        nomination_reward_boca: CONTEST_CONFIG.NOMINATION_REWARD,
        nomination_reward_paid: false
      })
      .select()
      .single();

    if (nominationError) {
      console.error('❌ Error creating nomination:', nominationError);
      return res.status(500).json({
        success: false,
        error: 'Failed to create nomination'
      });
    }

    // Award nomination reward
    const rewardSuccess = await awardTokens(
      userId,
      CONTEST_CONFIG.NOMINATION_REWARD,
      'Photo contest nomination'
    );

    if (rewardSuccess) {
      await supabase
        .from('photo_contest_nominations')
        .update({ nomination_reward_paid: true })
        .eq('id', nomination.id);
    }

    console.log(`✅ Nomination created: ${nomination.id}`);

    res.status(201).json({
      success: true,
      message: 'Photo nominated successfully',
      nomination: {
        id: nomination.id,
        recommendation_id: recommendation_id,
        reward_earned: CONTEST_CONFIG.NOMINATION_REWARD
      }
    });

  } catch (error) {
    console.error('❌ Error submitting nomination:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to submit nomination'
    });
  }
});

/**
 * GET /api/photo-contest/finalists
 * Get current finalists (available during voting phase)
 */
router.get('/finalists', async (req: AuthenticatedRequest, res: Response) => {
  try {
    console.log('📊 GET photo contest finalists');

    const round = await getCurrentRound();
    
    if (!round) {
      return res.status(404).json({
        success: false,
        error: 'No current round found'
      });
    }

    // Check if finalists have been selected
    if (round.status !== 'voting' && round.status !== 'completed') {
      return res.status(400).json({
        success: false,
        error: 'Finalists not yet selected',
        current_status: round.status
      });
    }

    // Get finalists with recommendation details
    const { data: finalists, error } = await supabase
      .from('photo_contest_nominations')
      .select(`
        id,
        vote_count,
        won_prize,
        recommendation:recommendation_id (
          id,
          title,
          content,
          photos,
          author_id,
          author:author_id (
            id,
            username,
            display_name,
            avatar_url
          ),
          restaurant:restaurant_id (
            id,
            name
          )
        )
      `)
      .eq('round_id', round.id)
      .eq('is_finalist', true)
      .order('vote_count', { ascending: false });

    if (error) {
      console.error('❌ Error fetching finalists:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch finalists'
      });
    }

    res.json({
      success: true,
      round_id: round.id,
      status: round.status,
      total_votes: round.total_votes,
      finalists: (finalists || []).map(f => ({
        nomination_id: f.id,
        vote_count: f.vote_count,
        won_prize: f.won_prize,
        recommendation: {
          id: f.recommendation.id,
          title: f.recommendation.title,
          content: f.recommendation.content,
          photos: f.recommendation.photos,
          author: {
            id: f.recommendation.author.id,
            username: f.recommendation.author.username,
            display_name: f.recommendation.author.display_name,
            avatar_url: f.recommendation.author.avatar_url
          },
          restaurant: f.recommendation.restaurant ? {
            id: f.recommendation.restaurant.id,
            name: f.recommendation.restaurant.name
          } : null
        }
      }))
    });

  } catch (error) {
    console.error('❌ Error fetching finalists:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch finalists'
    });
  }
});

/**
 * POST /api/photo-contest/vote
 * Vote for a finalist (requires auth, free)
 */
router.post('/vote', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    const { nomination_id } = req.body;

    if (!nomination_id) {
      return res.status(400).json({
        success: false,
        error: 'nomination_id is required'
      });
    }

    console.log(`🗳️ POST vote for nomination ${nomination_id} by user ${userId}`);

    // Get current round
    const round = await getCurrentRound();
    if (!round) {
      return res.status(404).json({
        success: false,
        error: 'No active contest round'
      });
    }

    // Check if voting is open
    if (round.status !== 'voting') {
      return res.status(400).json({
        success: false,
        error: `Voting is not open (current status: ${round.status})`
      });
    }

    // Check if nomination exists and is a finalist
    const { data: nomination, error: nomError } = await supabase
      .from('photo_contest_nominations')
      .select('id, is_finalist')
      .eq('id', nomination_id)
      .eq('round_id', round.id)
      .single();

    if (nomError || !nomination) {
      return res.status(404).json({
        success: false,
        error: 'Nomination not found'
      });
    }

    if (!nomination.is_finalist) {
      return res.status(400).json({
        success: false,
        error: 'Can only vote for finalists'
      });
    }

    // Check if user already voted this week
    const { data: existingVote } = await supabase
      .from('photo_contest_votes')
      .select('id')
      .eq('round_id', round.id)
      .eq('voter_user_id', userId)
      .maybeSingle();

    if (existingVote) {
      return res.status(400).json({
        success: false,
        error: 'You have already voted this week'
      });
    }

    // Create vote (trigger will increment vote_count automatically)
    const { data: vote, error: voteError } = await supabase
      .from('photo_contest_votes')
      .insert({
        round_id: round.id,
        nomination_id: nomination_id,
        voter_user_id: userId
      })
      .select()
      .single();

    if (voteError) {
      console.error('❌ Error creating vote:', voteError);
      return res.status(500).json({
        success: false,
        error: 'Failed to cast vote'
      });
    }

    console.log(`✅ Vote cast: ${vote.id}`);

    res.status(201).json({
      success: true,
      message: 'Vote cast successfully',
      vote_id: vote.id
    });

  } catch (error) {
    console.error('❌ Error casting vote:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to cast vote'
    });
  }
});

/**
 * GET /api/photo-contest/history
 * Get past contest winners
 */
router.get('/history', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 10, 50);
    const offset = parseInt(req.query.offset as string) || 0;

    console.log(`📊 GET photo contest history (limit: ${limit}, offset: ${offset})`);

    const { data: rounds, error } = await supabase
      .from('photo_contest_rounds')
      .select(`
        id,
        week_start,
        week_end,
        status,
        total_nominations,
        total_finalists,
        total_votes,
        completed_at,
        first_place:first_place_recommendation_id (
          id,
          title,
          photos,
          author:author_id (username, display_name, avatar_url)
        ),
        second_place:second_place_recommendation_id (
          id,
          title,
          photos,
          author:author_id (username, display_name, avatar_url)
        ),
        third_place:third_place_recommendation_id (
          id,
          title,
          photos,
          author:author_id (username, display_name, avatar_url)
        )
      `)
      .eq('status', 'completed')
      .order('week_start', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('❌ Error fetching contest history:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch contest history'
      });
    }

    const { count: totalCount } = await supabase
      .from('photo_contest_rounds')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'completed');

    res.json({
      success: true,
      rounds: (rounds || []).map(r => ({
        id: r.id,
        week_start: r.week_start,
        week_end: r.week_end,
        total_nominations: r.total_nominations,
        total_votes: r.total_votes,
        winners: {
          first: r.first_place ? {
            recommendation_id: r.first_place.id,
            title: r.first_place.title,
            photos: r.first_place.photos,
            author: r.first_place.author,
            prize: CONTEST_CONFIG.PRIZES.FIRST
          } : null,
          second: r.second_place ? {
            recommendation_id: r.second_place.id,
            title: r.second_place.title,
            photos: r.second_place.photos,
            author: r.second_place.author,
            prize: CONTEST_CONFIG.PRIZES.SECOND
          } : null,
          third: r.third_place ? {
            recommendation_id: r.third_place.id,
            title: r.third_place.title,
            photos: r.third_place.photos,
            author: r.third_place.author,
            prize: CONTEST_CONFIG.PRIZES.THIRD
          } : null
        },
        completed_at: r.completed_at
      })),
      pagination: {
        limit,
        offset,
        total: totalCount || 0,
        has_more: (offset + limit) < (totalCount || 0)
      }
    });

  } catch (error) {
    console.error('❌ Error fetching contest history:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch contest history'
    });
  }
});

/**
 * POST /api/photo-contest/select-finalists (ADMIN ONLY)
 * Manually trigger finalist selection (for testing)
 */
router.post('/select-finalists', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const isAdmin = req.user?.id === process.env.ADMIN_USER_ID;
    
    if (!isAdmin) {
      return res.status(403).json({
        success: false,
        error: 'Admin access required'
      });
    }

    console.log('🎲 POST manual finalist selection triggered');

    const round = await getCurrentRound();
    if (!round) {
      return res.status(404).json({
        success: false,
        error: 'No current round found'
      });
    }

    const finalistCount = await selectFinalists(round.id);

    if (finalistCount === 0) {
      return res.status(400).json({
        success: false,
        error: 'Failed to select finalists (not enough nominations or wrong status)'
      });
    }

    res.json({
      success: true,
      message: 'Finalists selected',
      finalist_count: finalistCount
    });

  } catch (error) {
    console.error('❌ Error selecting finalists:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to select finalists'
    });
  }
});

/**
 * POST /api/photo-contest/announce-winners (ADMIN ONLY)
 * Manually trigger winner announcement (for testing)
 */
router.post('/announce-winners', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const isAdmin = req.user?.id === process.env.ADMIN_USER_ID;
    
    if (!isAdmin) {
      return res.status(403).json({
        success: false,
        error: 'Admin access required'
      });
    }

    console.log('🏆 POST manual winner announcement triggered');

    const round = await getCurrentRound();
    if (!round) {
      return res.status(404).json({
        success: false,
        error: 'No current round found'
      });
    }

    const success = await announceWinners(round.id);

    if (!success) {
      return res.status(400).json({
        success: false,
        error: 'Failed to announce winners (no votes or wrong status)'
      });
    }

    res.json({
      success: true,
      message: 'Winners announced successfully'
    });

  } catch (error) {
    console.error('❌ Error announcing winners:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to announce winners'
    });
  }
});

// =============================================================================
// EXPORT
// =============================================================================

export default router;