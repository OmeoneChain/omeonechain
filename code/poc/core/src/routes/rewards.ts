// File: code/poc/core/src/routes/rewards.ts
// Rewards API Routes - White Paper v1.0
// Handles: Helpful comments (2.0 BOCA), Boosts (1.0 BOCA), 
//          Reshare attribution (1.0 BOCA), First reviewer checks
//
// Reward Types Covered:
//   - Helpful comment marking: 2.0 BOCA to commenter
//   - Boost (amplify without endorsement): 1.0 BOCA to booster (deducted on removal)
//   - Reshare attribution: 1.0 BOCA to original author
//   - First reviewer bonus: +10.0 BOCA (tracked, awarded elsewhere)

import { Router, Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';

const router = Router();

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase configuration for rewards routes');
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// =============================================================================
// CONSTANTS
// =============================================================================

const REWARD_AMOUNTS = {
  HELPFUL_COMMENT: 2000000,     // 2.0 BOCA in base units
  BOOST: 1000000,               // 1.0 BOCA
  RESHARE_ATTRIBUTION: 1000000, // 1.0 BOCA
  FIRST_REVIEWER: 10000000      // 10.0 BOCA
};

// =============================================================================
// VALIDATION SCHEMAS
// =============================================================================

const reshareAttributionSchema = z.object({
  resharer_comment: z.string().max(280).optional()
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
 * Award tokens to user (update their balance)
 * In production, this would call smart contract
 */
async function awardTokens(
  userId: string, 
  amount: number, 
  reason: string
): Promise<boolean> {
  try {
    // Get current balance
    const { data: user } = await supabase
      .from('users')
      .select('tokens_earned')
      .eq('id', userId)
      .single();

    const currentBalance = user?.tokens_earned || 0;
    const newBalance = currentBalance + (amount / 1000000); // Convert base units to BOCA

    // Update balance
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

    console.log(`💰 Awarded ${amount / 1000000} BOCA to user ${userId} for: ${reason}`);
    return true;
  } catch (error) {
    console.error('❌ Error in awardTokens:', error);
    return false;
  }
}

// =============================================================================
// ROUTES
// =============================================================================

/**
 * POST /api/recommendations/:recId/comments/:commentId/helpful
 * Mark a comment as helpful (2.0 BOCA reward to commenter)
 * Only recommendation author can mark comments as helpful
 * Only ONE helpful comment per recommendation
 */
router.post(
  '/recommendations/:recId/comments/:commentId/helpful',
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { recId, commentId } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
      }

      console.log(`⭐ POST mark comment ${commentId} as helpful by user ${userId}`);

      // Get recommendation to verify authorship
      const { data: recommendation, error: recError } = await supabase
        .from('recommendations')
        .select('id, author_id, title')
        .eq('id', recId)
        .single();

      if (recError || !recommendation) {
        return res.status(404).json({
          success: false,
          error: 'Recommendation not found'
        });
      }

      // Check if current user is the recommendation author
      if (recommendation.author_id !== userId) {
        return res.status(403).json({
          success: false,
          error: 'Only the recommendation author can mark comments as helpful'
        });
      }

      // Get the comment
      const { data: comment, error: commentError } = await supabase
        .from('recommendation_comments')
        .select('id, author_id, content, is_helpful, is_deleted')
        .eq('id', commentId)
        .eq('recommendation_id', recId)
        .single();

      if (commentError || !comment) {
        return res.status(404).json({
          success: false,
          error: 'Comment not found'
        });
      }

      // Check if comment is deleted
      if (comment.is_deleted) {
        return res.status(400).json({
          success: false,
          error: 'Cannot mark a deleted comment as helpful'
        });
      }

      // Check if already marked as helpful
      if (comment.is_helpful) {
        return res.status(400).json({
          success: false,
          error: 'This comment is already marked as helpful'
        });
      }

      // Check if another comment on this recommendation is already helpful
      const { data: existingHelpful } = await supabase
        .from('recommendation_comments')
        .select('id')
        .eq('recommendation_id', recId)
        .eq('is_helpful', true)
        .neq('id', commentId)
        .maybeSingle();

      if (existingHelpful) {
        return res.status(400).json({
          success: false,
          error: 'Another comment is already marked as helpful for this recommendation',
          existing_helpful_comment_id: existingHelpful.id
        });
      }

      // Mark comment as helpful
      const { data: updated, error: updateError } = await supabase
        .from('recommendation_comments')
        .update({
          is_helpful: true,
          marked_helpful_at: new Date().toISOString(),
          marked_helpful_by: userId
        })
        .eq('id', commentId)
        .select()
        .single();

      if (updateError) {
        console.error('❌ Error marking comment as helpful:', updateError);
        return res.status(500).json({
          success: false,
          error: 'Failed to mark comment as helpful'
        });
      }

      // Award 2.0 BOCA to commenter
      const rewardSuccess = await awardTokens(
        comment.author_id,
        REWARD_AMOUNTS.HELPFUL_COMMENT,
        'Helpful comment'
      );

      if (!rewardSuccess) {
        console.error('⚠️ Comment marked as helpful but reward failed');
      }

      console.log(`✅ Comment ${commentId} marked as helpful - Awarded 2.0 BOCA to ${comment.author_id}`);

      res.json({
        success: true,
        message: 'Comment marked as helpful',
        comment_id: commentId,
        commenter_id: comment.author_id,
        reward_boca: 2.0,
        reward_base_units: REWARD_AMOUNTS.HELPFUL_COMMENT,
        reward_awarded: rewardSuccess
      });

    } catch (error) {
      console.error('❌ Error marking comment as helpful:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to mark comment as helpful'
      });
    }
  }
);

/**
 * POST /api/recommendations/:recId/boost
 * Boost a recommendation (1.0 BOCA to booster)
 * Boost = amplify without explicit endorsement (vs reshare with commentary)
 */
router.post(
  '/recommendations/:recId/boost',
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { recId } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
      }

      console.log(`🚀 POST boost recommendation ${recId} by user ${userId}`);

      // Check if recommendation exists
      const { data: recommendation, error: recError } = await supabase
        .from('recommendations')
        .select('id, author_id, title')
        .eq('id', recId)
        .single();

      if (recError || !recommendation) {
        return res.status(404).json({
          success: false,
          error: 'Recommendation not found'
        });
      }

      // Check if user already boosted this recommendation
      const { data: existingBoost } = await supabase
        .from('recommendation_boosts')
        .select('id')
        .eq('recommendation_id', recId)
        .eq('booster_user_id', userId)
        .maybeSingle();

      if (existingBoost) {
        return res.status(400).json({
          success: false,
          error: 'You have already boosted this recommendation',
          boost_id: existingBoost.id
        });
      }

      // Create boost record
      const { data: newBoost, error: boostError } = await supabase
        .from('recommendation_boosts')
        .insert({
          recommendation_id: recId,
          booster_user_id: userId,
          reward_earned_base_units: REWARD_AMOUNTS.BOOST,
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (boostError) {
        console.error('❌ Error creating boost:', boostError);
        return res.status(500).json({
          success: false,
          error: 'Failed to boost recommendation',
          details: boostError.message
        });
      }

      // Award 1.0 BOCA to booster
      const rewardSuccess = await awardTokens(
        userId,
        REWARD_AMOUNTS.BOOST,
        'Boosted recommendation'
      );

      console.log(`✅ Recommendation ${recId} boosted by ${userId} - Earned 1.0 BOCA`);

      res.status(201).json({
        success: true,
        message: 'Recommendation boosted',
        boost_id: newBoost.id,
        recommendation_id: recId,
        booster_id: userId,
        reward_boca: 1.0,
        reward_base_units: REWARD_AMOUNTS.BOOST,
        reward_awarded: rewardSuccess
      });

    } catch (error) {
      console.error('❌ Error boosting recommendation:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to boost recommendation'
      });
    }
  }
);

/**
 * DELETE /api/recommendations/:recId/boost
 * Remove boost from a recommendation and deduct the reward
 */
router.delete(
  '/recommendations/:recId/boost',
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { recId } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
      }

      console.log(`🗑️ DELETE boost of recommendation ${recId} by user ${userId}`);

      // Find the boost
      const { data: existingBoost, error: findError } = await supabase
        .from('recommendation_boosts')
        .select('id, reward_earned_base_units')
        .eq('recommendation_id', recId)
        .eq('booster_user_id', userId)
        .maybeSingle();

      if (findError || !existingBoost) {
        return res.status(404).json({
          success: false,
          error: 'Boost not found'
        });
      }

      // Deduct the reward before deleting the boost
      const rewardBoca = existingBoost.reward_earned_base_units / 1000000;
      const { error: refundError } = await supabase.rpc('deduct_tokens', {
        p_user_id: userId,
        p_amount: rewardBoca
      });

      if (refundError) {
        console.error('❌ Error deducting tokens:', refundError);
        return res.status(500).json({
          success: false,
          error: 'Failed to deduct tokens'
        });
      }

      // Delete the boost
      const { error: deleteError } = await supabase
        .from('recommendation_boosts')
        .delete()
        .eq('id', existingBoost.id);

      if (deleteError) {
        console.error('❌ Error removing boost:', deleteError);
        return res.status(500).json({
          success: false,
          error: 'Failed to remove boost'
        });
      }

      console.log(`✅ Boost removed and ${rewardBoca} BOCA deducted from user ${userId}`);

      res.json({
        success: true,
        message: 'Boost removed and reward deducted',
        boost_id: existingBoost.id,
        recommendation_id: recId,
        tokens_deducted: rewardBoca
      });

    } catch (error) {
      console.error('❌ Error removing boost:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to remove boost'
      });
    }
  }
);

/**
 * POST /api/recommendations/:recId/reshare-attribution
 * Track reshare attribution (1.0 BOCA to original author)
 * Called when someone reshares a recommendation
 */
router.post(
  '/recommendations/:recId/reshare-attribution',
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { recId } = req.params;
      const userId = req.user?.id; // The resharer

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
      }

      console.log(`🔄 POST reshare attribution for recommendation ${recId} by user ${userId}`);

      // Validate request body
      const validation = reshareAttributionSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({
          success: false,
          error: 'Invalid reshare data',
          details: validation.error.errors
        });
      }

      // Get recommendation to find original author
      const { data: recommendation, error: recError } = await supabase
        .from('recommendations')
        .select('id, author_id, title')
        .eq('id', recId)
        .single();

      if (recError || !recommendation) {
        return res.status(404).json({
          success: false,
          error: 'Recommendation not found'
        });
      }

      // Don't award attribution if resharing your own content
      if (recommendation.author_id === userId) {
        return res.status(400).json({
          success: false,
          error: 'Cannot earn attribution bonus for resharing your own content'
        });
      }

      // Check if this reshare attribution already exists
      const { data: existingAttribution } = await supabase
        .from('attribution_rewards')
        .select('id')
        .eq('recommendation_id', recId)
        .eq('resharer_id', userId)
        .eq('original_author_id', recommendation.author_id)
        .maybeSingle();

      if (existingAttribution) {
        return res.status(400).json({
          success: false,
          error: 'Attribution already recorded for this reshare',
          attribution_id: existingAttribution.id
        });
      }

      // Create attribution record
      const { data: newAttribution, error: attributionError } = await supabase
        .from('attribution_rewards')
        .insert({
          original_author_id: recommendation.author_id,
          recommendation_id: recId,
          resharer_id: userId,
          bonus_amount_base_units: REWARD_AMOUNTS.RESHARE_ATTRIBUTION,
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (attributionError) {
        console.error('❌ Error creating attribution:', attributionError);
        return res.status(500).json({
          success: false,
          error: 'Failed to record attribution',
          details: attributionError.message
        });
      }

      // Award 1.0 BOCA to original author
      const rewardSuccess = await awardTokens(
        recommendation.author_id,
        REWARD_AMOUNTS.RESHARE_ATTRIBUTION,
        'Attribution bonus (content reshared)'
      );

      console.log(`✅ Attribution bonus awarded to ${recommendation.author_id} for reshare by ${userId} - 1.0 BOCA`);

      res.status(201).json({
        success: true,
        message: 'Attribution bonus awarded to original author',
        attribution_id: newAttribution.id,
        original_author_id: recommendation.author_id,
        resharer_id: userId,
        recommendation_id: recId,
        bonus_boca: 1.0,
        bonus_base_units: REWARD_AMOUNTS.RESHARE_ATTRIBUTION,
        reward_awarded: rewardSuccess
      });

    } catch (error) {
      console.error('❌ Error recording reshare attribution:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to record reshare attribution'
      });
    }
  }
);

/**
 * GET /api/recommendations/attribution/:userId
 * Get attribution rewards earned by a user
 */
router.get(
  '/recommendations/attribution/:userId',
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { userId } = req.params;
      const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
      const offset = parseInt(req.query.offset as string) || 0;

      console.log(`📊 GET attribution rewards for user: ${userId}`);

      // Get attribution rewards
      const { data: attributions, error: attributionError } = await supabase
        .from('attribution_rewards')
        .select(`
          id,
          recommendation_id,
          resharer_id,
          bonus_amount_base_units,
          created_at,
          recommendations:recommendation_id (
            id,
            title
          ),
          resharer:resharer_id (
            id,
            username,
            display_name
          )
        `)
        .eq('original_author_id', userId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (attributionError) {
        console.error('❌ Error fetching attribution rewards:', attributionError);
        return res.status(500).json({
          success: false,
          error: 'Failed to fetch attribution rewards'
        });
      }

      // Calculate total earned
      const totalEarnedBaseUnits = (attributions || []).reduce(
        (sum, attr) => sum + (attr.bonus_amount_base_units || 0),
        0
      );

      // Get total count for pagination
      const { count: totalCount } = await supabase
        .from('attribution_rewards')
        .select('*', { count: 'exact', head: true })
        .eq('original_author_id', userId);

      console.log(`✅ Found ${attributions?.length || 0} attribution rewards for user ${userId}`);

      res.json({
        success: true,
        attributions: (attributions || []).map(attr => ({
          id: attr.id,
          recommendation_id: attr.recommendation_id,
          recommendation_title: attr.recommendations?.title || 'Unknown',
          resharer: {
            id: attr.resharer_id,
            username: attr.resharer?.username,
            display_name: attr.resharer?.display_name
          },
          bonus_boca: (attr.bonus_amount_base_units || 0) / 1000000,
          bonus_base_units: attr.bonus_amount_base_units,
          created_at: attr.created_at
        })),
        total_earned_boca: totalEarnedBaseUnits / 1000000,
        total_earned_base_units: totalEarnedBaseUnits,
        total_count: totalCount || 0,
        pagination: {
          limit,
          offset,
          has_more: (offset + limit) < (totalCount || 0)
        }
      });

    } catch (error) {
      console.error('❌ Error fetching attribution rewards:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch attribution rewards'
      });
    }
  }
);

/**
 * GET /api/restaurants/:restaurantId/first-reviewer-check
 * Check if a restaurant has a first reviewer and get first review info
 */
router.get(
  '/restaurants/:restaurantId/first-reviewer-check',
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { restaurantId } = req.params;

      console.log(`🔍 GET first reviewer check for restaurant: ${restaurantId}`);

      // Get restaurant info
      const { data: restaurant, error: restaurantError } = await supabase
        .from('restaurants')
        .select('id, name, first_reviewer_id, first_review_date, total_recommendations')
        .eq('id', parseInt(restaurantId))
        .single();

      if (restaurantError || !restaurant) {
        return res.status(404).json({
          success: false,
          error: 'Restaurant not found'
        });
      }

      // Get first reviewer details if exists
      let firstReviewer = null;
      if (restaurant.first_reviewer_id) {
        const { data: reviewer } = await supabase
          .from('users')
          .select('id, username, display_name, avatar_url')
          .eq('id', restaurant.first_reviewer_id)
          .maybeSingle();

        firstReviewer = reviewer;
      }

      // Check if first review bonus has been awarded
      let firstReviewBonusAwarded = false;
      if (restaurant.first_reviewer_id) {
        const { data: firstRec } = await supabase
          .from('recommendations')
          .select('first_reviewer_bonus_awarded')
          .eq('restaurant_id', parseInt(restaurantId))
          .eq('author_id', restaurant.first_reviewer_id)
          .order('created_at', { ascending: true })
          .limit(1)
          .maybeSingle();

        firstReviewBonusAwarded = firstRec?.first_reviewer_bonus_awarded || false;
      }

      console.log(`✅ First reviewer info retrieved for restaurant ${restaurantId}`);

      res.json({
        success: true,
        restaurant_id: restaurant.id,
        restaurant_name: restaurant.name,
        has_first_reviewer: !!restaurant.first_reviewer_id,
        first_reviewer: firstReviewer ? {
          id: firstReviewer.id,
          username: firstReviewer.username,
          display_name: firstReviewer.display_name,
          avatar_url: firstReviewer.avatar_url
        } : null,
        first_review_date: restaurant.first_review_date,
        total_recommendations: restaurant.total_recommendations,
        first_reviewer_bonus_awarded: firstReviewBonusAwarded,
        first_reviewer_bonus_boca: firstReviewBonusAwarded ? 10.0 : null
      });

    } catch (error) {
      console.error('❌ Error checking first reviewer:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to check first reviewer'
      });
    }
  }
);

/**
 * GET /api/users/:userId/boost-stats
 * Get boost statistics for a user (how many they've given and received)
 */
router.get(
  '/users/:userId/boost-stats',
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { userId } = req.params;

      console.log(`📊 GET boost stats for user: ${userId}`);

      // Count boosts given by user
      const { count: boostsGiven } = await supabase
        .from('recommendation_boosts')
        .select('*', { count: 'exact', head: true })
        .eq('booster_user_id', userId);

      // Count boosts received (on user's recommendations)
      const { data: userRecs } = await supabase
        .from('recommendations')
        .select('id')
        .eq('author_id', userId);

      const recIds = (userRecs || []).map(r => r.id);
      
      let boostsReceived = 0;
      let totalBoostRewards = 0;

      if (recIds.length > 0) {
        const { count, error: countError } = await supabase
          .from('recommendation_boosts')
          .select('*', { count: 'exact', head: true })
          .in('recommendation_id', recIds);

        boostsReceived = count || 0;

        // Calculate total rewards from boosts given
        const { data: boostRewards } = await supabase
          .from('recommendation_boosts')
          .select('reward_earned_base_units')
          .eq('booster_user_id', userId);

        totalBoostRewards = (boostRewards || []).reduce(
          (sum, boost) => sum + (boost.reward_earned_base_units || 0),
          0
        );
      }

      console.log(`✅ Boost stats retrieved for user ${userId}`);

      res.json({
        success: true,
        user_id: userId,
        boosts_given: boostsGiven || 0,
        boosts_received: boostsReceived,
        total_earned_from_boosting_boca: totalBoostRewards / 1000000,
        total_earned_from_boosting_base_units: totalBoostRewards
      });

    } catch (error) {
      console.error('❌ Error fetching boost stats:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch boost stats'
      });
    }
  }
);

// =============================================================================
// EXPORT
// =============================================================================

export default router;