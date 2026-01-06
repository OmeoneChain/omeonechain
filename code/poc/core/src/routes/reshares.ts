// File: code/poc/core/src/routes/reshares.ts
// Reshares API Routes - Phase 1 Social Features
// Handles: Create reshare, Remove reshare, List user reshares

import { Router, Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';

const router = Router();

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase configuration for reshares routes');
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// =============================================================================
// VALIDATION SCHEMAS
// =============================================================================

const createReshareSchema = z.object({
  comment: z.string()
    .max(280, 'Reshare comment must be less than 280 characters')
    .trim()
    .optional()
});

const getUserResharesQuerySchema = z.object({
  limit: z.string().optional().transform((val) => val ? Math.min(parseInt(val) || 20, 100) : 20),
  offset: z.string().optional().transform((val) => val ? parseInt(val) : 0)
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

interface ReshareWithDetails {
  id: string;
  user_id: string;
  recommendation_id: string;
  comment: string | null;
  created_at: string;
  user: {
    id: string;
    username: string;
    display_name: string;
    avatar_url: string | null;
  };
  recommendation: {
    id: string;
    title: string;
    content: string;
    category: string;
    author_id: string;
    restaurant_id: number | null;
    trust_score: number;
    upvotes_count: number;
    saves_count: number;
    created_at: string;
    author: {
      id: string;
      username: string;
      display_name: string;
      avatar_url: string | null;
    };
  };
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Format reshare with full user and recommendation details
 * FIXED: Added better error handling and changed .single() to .maybeSingle()
 */
async function formatReshare(reshare: any): Promise<ReshareWithDetails> {
  console.log('📦 Formatting reshare:', reshare.id, 'for recommendation:', reshare.recommendation_id);
  
  // Get resharer's info
  const { data: resharer, error: resharerError } = await supabase
    .from('users')
    .select('id, username, display_name, avatar_url')
    .eq('id', reshare.user_id)
    .maybeSingle();

  if (resharerError) {
    console.error('❌ Error fetching resharer:', resharerError);
  }

  // Get recommendation with author info - FIXED: Use maybeSingle() instead of single()
  // FIXED: Use correct column names (likes_count and saves_count, not upvotes_count)
  const { data: recommendation, error: recError } = await supabase
    .from('recommendations')
    .select(`
      id,
      title,
      content,
      category,
      author_id,
      restaurant_id,
      trust_score,
      likes_count,
      saves_count,
      created_at
    `)
    .eq('id', reshare.recommendation_id)
    .maybeSingle();

  if (recError) {
    console.error('❌ Error fetching recommendation:', recError);
  }

  if (!recommendation) {
    console.warn('⚠️ Recommendation not found:', reshare.recommendation_id);
  } else {
    console.log('✅ Found recommendation:', recommendation.title);
  }

  // Get original author info
  let originalAuthor = null;
  if (recommendation && recommendation.author_id) {
    const { data: author, error: authorError } = await supabase
      .from('users')
      .select('id, username, display_name, avatar_url')
      .eq('id', recommendation.author_id)
      .maybeSingle();
    
    if (authorError) {
      console.error('❌ Error fetching author:', authorError);
    }
    
    originalAuthor = author;
  }

  return {
    id: reshare.id,
    user_id: reshare.user_id,
    recommendation_id: reshare.recommendation_id,
    comment: reshare.comment,
    created_at: reshare.created_at,
    user: resharer || {
      id: reshare.user_id,
      username: 'deleted_user',
      display_name: 'Deleted User',
      avatar_url: null
    },
    recommendation: recommendation ? {
      id: recommendation.id,
      title: recommendation.title,
      content: recommendation.content,
      category: recommendation.category,
      author_id: recommendation.author_id,
      restaurant_id: recommendation.restaurant_id,
      trust_score: recommendation.trust_score,
      upvotes_count: recommendation.likes_count || 0, // Map likes_count to upvotes_count for API compatibility
      saves_count: recommendation.saves_count || 0,
      created_at: recommendation.created_at,
      author: originalAuthor || {
        id: recommendation.author_id || '',
        username: 'deleted_user',
        display_name: 'Deleted User',
        avatar_url: null
      }
    } : {
      id: reshare.recommendation_id,
      title: '[Deleted Recommendation]',
      content: '',
      category: '',
      author_id: '',
      restaurant_id: null,
      trust_score: 0,
      upvotes_count: 0,
      saves_count: 0,
      created_at: reshare.created_at,
      author: {
        id: '',
        username: 'deleted_user',
        display_name: 'Deleted User',
        avatar_url: null
      }
    }
  };
}

// =============================================================================
// ROUTES
// =============================================================================

/**
 * POST /api/recommendations/:id/reshare
 * Reshare a recommendation to user's feed with optional commentary
 */
router.post(
  '/recommendations/:recommendationId/reshare',
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { recommendationId } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
      }

      console.log(`🔄 POST reshare recommendation ${recommendationId} by user ${userId}`);

      // Validate request body
      const validation = createReshareSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({
          success: false,
          error: 'Invalid reshare data',
          details: validation.error.errors
        });
      }

      const { comment } = validation.data;

      // Check if recommendation exists
      const { data: recommendation, error: recError } = await supabase
        .from('recommendations')
        .select('id, author_id, title')
        .eq('id', recommendationId)
        .single();

      if (recError || !recommendation) {
        return res.status(404).json({
          success: false,
          error: 'Recommendation not found'
        });
      }

      // Check if user already reshared this recommendation
      const { data: existingReshare } = await supabase
        .from('recommendation_reshares')
        .select('id')
        .eq('user_id', userId)
        .eq('recommendation_id', recommendationId)
        .maybeSingle();

      if (existingReshare) {
        return res.status(400).json({
          success: false,
          error: 'You have already reshared this recommendation',
          reshare_id: existingReshare.id
        });
      }

      // Create reshare
      const { data: newReshare, error: createError } = await supabase
        .from('recommendation_reshares')
        .insert({
          user_id: userId,
          recommendation_id: recommendationId,
          comment: comment || null,
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (createError) {
        console.error('❌ Error creating reshare:', createError);
        return res.status(500).json({
          success: false,
          error: 'Failed to create reshare',
          details: createError.message
        });
      }

      console.log(`✅ Reshare created: ${newReshare.id}`);

      // 💰 Award tokens: 0.2 BOCA to resharer + 0.1 BOCA attribution to original author
      let tokensEarned = 0.2;
      let attributionAwarded = 0;

      // Award 0.2 BOCA to the resharer
      const { data: resharerData } = await supabase
        .from('users')
        .select('tokens_earned')
        .eq('id', userId)
        .single();
      
      const newResharerBalance = (resharerData?.tokens_earned || 0) + tokensEarned;
      await supabase
        .from('users')
        .update({ tokens_earned: newResharerBalance })
        .eq('id', userId);

      console.log(`💰 Awarded ${tokensEarned} BOCA to resharer ${userId}`);

      // Award 0.1 BOCA attribution bonus to original author (if different user)
      if (recommendation.author_id !== userId) {
        attributionAwarded = 0.1;
        
        const { data: authorData } = await supabase
          .from('users')
          .select('tokens_earned')
          .eq('id', recommendation.author_id)
          .single();
        
        const newAuthorBalance = (authorData?.tokens_earned || 0) + attributionAwarded;
        await supabase
          .from('users')
          .update({ tokens_earned: newAuthorBalance })
          .eq('id', recommendation.author_id);

        console.log(`💰 Awarded ${attributionAwarded} BOCA attribution to author ${recommendation.author_id}`);
      }

      // Format reshare with full details
      const formattedReshare = await formatReshare(newReshare);

      // Note: The trigger trg_update_recommendation_reshare_count will automatically
      // update the reshares_count on the recommendation table

      res.status(201).json({
        success: true,
        reshare: formattedReshare,
        tokens_earned: tokensEarned, // 💰 Resharer reward
        attribution_bonus: attributionAwarded, // 💰 Author bonus
        message: comment 
          ? 'Recommendation reshared with commentary' 
          : 'Recommendation reshared successfully'
      });

    } catch (error) {
      console.error('❌ Error creating reshare:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create reshare'
      });
    }
  }
);

/**
 * DELETE /api/recommendations/:id/reshare
 * Remove a reshare from user's feed
 */
router.delete(
  '/recommendations/:recommendationId/reshare',
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { recommendationId } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
      }

      console.log(`🗑️ DELETE reshare of recommendation ${recommendationId} by user ${userId}`);

      // Find the reshare
      const { data: existingReshare, error: findError } = await supabase
        .from('recommendation_reshares')
        .select('id')
        .eq('user_id', userId)
        .eq('recommendation_id', recommendationId)
        .maybeSingle();

      if (findError || !existingReshare) {
        return res.status(404).json({
          success: false,
          error: 'Reshare not found'
        });
      }

      // Delete the reshare
      const { error: deleteError } = await supabase
        .from('recommendation_reshares')
        .delete()
        .eq('id', existingReshare.id);

      if (deleteError) {
        console.error('❌ Error deleting reshare:', deleteError);
        return res.status(500).json({
          success: false,
          error: 'Failed to delete reshare',
          details: deleteError.message
        });
      }

      console.log(`✅ Reshare deleted: ${existingReshare.id}`);

      // Note: The trigger trg_update_recommendation_reshare_count will automatically
      // update the reshares_count on the recommendation table

      res.json({
        success: true,
        message: 'Reshare removed successfully',
        reshare_id: existingReshare.id
      });

    } catch (error) {
      console.error('❌ Error deleting reshare:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete reshare'
      });
    }
  }
);

/**
 * GET /api/users/:userId/reshares
 * Get all reshares by a specific user
 */
router.get(
  '/users/:userId/reshares',
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { userId } = req.params;
      const currentUserId = req.user?.id;

      console.log(`📋 GET reshares for user: ${userId}`);

      // Validate query params
      const validation = getUserResharesQuerySchema.safeParse(req.query);
      if (!validation.success) {
        return res.status(400).json({
          success: false,
          error: 'Invalid query parameters',
          details: validation.error.errors
        });
      }

      const { limit, offset } = validation.data;

      // Check if user exists
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('id, username, display_name')
        .eq('id', userId)
        .maybeSingle();

      if (userError || !user) {
        return res.status(404).json({
          success: false,
          error: 'User not found'
        });
      }

      // Get user's reshares
      const { data: reshares, error: resharesError } = await supabase
        .from('recommendation_reshares')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (resharesError) {
        console.error('❌ Error fetching reshares:', resharesError);
        return res.status(500).json({
          success: false,
          error: 'Failed to fetch reshares'
        });
      }

      console.log(`🔍 Found ${reshares?.length || 0} raw reshares for user ${userId}`);

      // Format all reshares with details
      const formattedReshares = await Promise.all(
        (reshares || []).map(reshare => formatReshare(reshare))
      );

      console.log(`✅ Formatted ${formattedReshares.length} reshares successfully`);

      // Get total count for pagination
      const { count: totalCount } = await supabase
        .from('recommendation_reshares')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId);

      res.json({
        success: true,
        reshares: formattedReshares,
        total_count: totalCount || 0,
        pagination: {
          limit,
          offset,
          has_more: (offset + limit) < (totalCount || 0)
        },
        user: {
          id: user.id,
          username: user.username,
          display_name: user.display_name
        }
      });

    } catch (error) {
      console.error('❌ Error fetching user reshares:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch user reshares'
      });
    }
  }
);

/**
 * GET /api/recommendations/:id/reshares
 * Get all users who reshared a specific recommendation
 */
router.get(
  '/recommendations/:recommendationId/reshares',
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { recommendationId } = req.params;

      console.log(`📋 GET reshares for recommendation: ${recommendationId}`);

      // Validate query params
      const validation = getUserResharesQuerySchema.safeParse(req.query);
      if (!validation.success) {
        return res.status(400).json({
          success: false,
          error: 'Invalid query parameters',
          details: validation.error.errors
        });
      }

      const { limit, offset } = validation.data;

      // Check if recommendation exists
      const { data: recommendation, error: recError } = await supabase
        .from('recommendations')
        .select('id, title, reshares_count')
        .eq('id', recommendationId)
        .maybeSingle();

      if (recError || !recommendation) {
        return res.status(404).json({
          success: false,
          error: 'Recommendation not found'
        });
      }

      // Get all reshares of this recommendation
      const { data: reshares, error: resharesError } = await supabase
        .from('recommendation_reshares')
        .select('*')
        .eq('recommendation_id', recommendationId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (resharesError) {
        console.error('❌ Error fetching reshares:', resharesError);
        return res.status(500).json({
          success: false,
          error: 'Failed to fetch reshares'
        });
      }

      // Get user details for each reshare
      const resharesWithUsers = await Promise.all(
        (reshares || []).map(async (reshare) => {
          const { data: user } = await supabase
            .from('users')
            .select('id, username, display_name, avatar_url')
            .eq('id', reshare.user_id)
            .maybeSingle();

          return {
            id: reshare.id,
            user_id: reshare.user_id,
            comment: reshare.comment,
            created_at: reshare.created_at,
            user: user || {
              id: reshare.user_id,
              username: 'deleted_user',
              display_name: 'Deleted User',
              avatar_url: null
            }
          };
        })
      );

      console.log(`✅ Retrieved ${resharesWithUsers.length} reshares for recommendation ${recommendationId}`);

      res.json({
        success: true,
        reshares: resharesWithUsers,
        total_count: recommendation.reshares_count || 0,
        pagination: {
          limit,
          offset,
          has_more: (offset + limit) < (recommendation.reshares_count || 0)
        },
        recommendation: {
          id: recommendation.id,
          title: recommendation.title
        }
      });

    } catch (error) {
      console.error('❌ Error fetching recommendation reshares:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch recommendation reshares'
      });
    }
  }
);

// =============================================================================
// EXPORT
// =============================================================================

export default router;