// File: code/poc/core/src/routes/comments.ts
// Comments API Routes - Phase 1 Social Features
// UPDATED: White Paper v1.0 token rewards
// - Comment reward: 0.50 BOCA (was 0.05) to RECOMMENDATION AUTHOR (not commenter)
// - Reply reward: 0.50 BOCA to RECOMMENDATION AUTHOR
// Handles: Create, Read, Update, Delete comments + nested replies + likes

import { Router, Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { getRewardService, RewardResult } from '../services/reward-service';

const rewardService = getRewardService();

const router = Router();

/**
 * Update engagement points on a recommendation and check for validation bonus
 * White Paper v1.02: +10.0 BOCA when recommendation reaches 3.0 engagement points
 * 
 * Point values (weighted by engager's tier):
 * - Like/upvote: 1.0 × tier weight
 * - Save/bookmark: 1.0 × tier weight  
 * - Comment: 0.5 × tier weight
 * 
 * Tier weights: new=0.5, established=1.0, trusted=1.5
 */
async function updateEngagementPoints(
  recommendationId: string, 
  engagerId: string, 
  actionType: 'like' | 'save' | 'comment'
): Promise<void> {
  try {
    // Get engager's tier weight
    const { data: engager } = await supabase
      .from('users')
      .select('reputation_tier')
      .eq('id', engagerId)
      .single();
    
    const tierWeights: Record<string, number> = {
      'new': 0.5,
      'established': 1.0,
      'trusted': 1.5
    };
    const tierWeight = tierWeights[engager?.reputation_tier || 'established'] || 1.0;
    
    // Calculate points based on action type
    const basePoints: Record<string, number> = {
      'like': 1.0,
      'save': 1.0,
      'comment': 0.5
    };
    const pointsToAdd = basePoints[actionType] * tierWeight;
    
    // Get current recommendation state
    const { data: rec } = await supabase
      .from('recommendations')
      .select('engagement_points, validation_bonus_awarded, author_id')
      .eq('id', recommendationId)
      .single();
    
    if (!rec) return;
    
    const currentPoints = rec.engagement_points || 0;
    const newPoints = currentPoints + pointsToAdd;
    
    // Update engagement points
    await supabase
      .from('recommendations')
      .update({ engagement_points: newPoints })
      .eq('id', recommendationId);
    
    console.log(`📊 Engagement points: ${currentPoints.toFixed(2)} → ${newPoints.toFixed(2)} (+${pointsToAdd.toFixed(2)} from ${actionType})`);
    
    // Check if validation bonus threshold reached (3.0 points)
    if (newPoints >= 3.0 && !rec.validation_bonus_awarded) {
      console.log(`🎯 [VALIDATION] Recommendation reached 3.0 points! Awarding +10.0 BOCA bonus...`);
      
      try {
        const validationResult = await rewardService.awardValidationBonus(
          rec.author_id,
          recommendationId
        );
        
        if (validationResult.success) {
          // Mark as awarded to prevent double-awarding
          await supabase
            .from('recommendations')
            .update({ validation_bonus_awarded: true })
            .eq('id', recommendationId);
          
          console.log(`✅ [VALIDATION] Bonus awarded: ${validationResult.displayAmount} BOCA`);
          if (validationResult.txDigest) {
            console.log(`   TX: ${validationResult.txDigest}`);
          }
        } else {
          console.error(`❌ [VALIDATION] Bonus failed: ${validationResult.error}`);
        }
      } catch (validationError) {
        console.error('❌ [VALIDATION] Exception:', validationError);
      }
    }
  } catch (error) {
    console.error('⚠️ Error updating engagement points:', error);
    // Non-fatal - don't break the main flow
  }
}

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase configuration for comments routes');
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// =============================================================================
// CONSTANTS - White Paper v1.0 Values
// =============================================================================

const COMMENT_REWARD_BASE = 0.50; // 0.50 BOCA base reward for receiving a comment

// =============================================================================
// VALIDATION SCHEMAS
// =============================================================================

const createCommentSchema = z.object({
  content: z.string()
    .min(1, 'Comment cannot be empty')
    .max(1000, 'Comment must be less than 1000 characters')
    .trim()
});

const replyToCommentSchema = z.object({
  content: z.string()
    .min(1, 'Reply cannot be empty')
    .max(1000, 'Reply must be less than 1000 characters')
    .trim()
});

const updateCommentSchema = z.object({
  content: z.string()
    .min(1, 'Comment cannot be empty')
    .max(1000, 'Comment must be less than 1000 characters')
    .trim()
});

const getCommentsQuerySchema = z.object({
  limit: z.string().optional().transform((val) => val ? Math.min(parseInt(val) || 50, 100) : 50),
  offset: z.string().optional().transform((val) => val ? parseInt(val) : 0),
  sort: z.enum(['newest', 'oldest', 'most_liked']).optional().default('newest')
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

interface CommentWithAuthor {
  id: string;
  recommendation_id: string;
  user_id: string;
  parent_comment_id: string | null;
  content: string;
  likes_count: number;
  replies_count: number;
  is_edited: boolean;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
  edited_at: string | null;
  author: {
    id: string;
    username: string;
    display_name: string;
    avatar_url: string | null;
  };
  user_has_liked?: boolean;
  replies?: CommentWithAuthor[];
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Get tier multiplier for a user
 * White Paper v1.0: New=0.5x, Established=1.0x, Trusted=1.5x
 */
async function getTierMultiplier(userId: string): Promise<{ multiplier: number; tier: string }> {
  const { data: userData } = await supabase
    .from('users')
    .select('account_tier')
    .eq('id', userId)
    .single();

  const tierMultipliers: Record<string, number> = {
    'new': 0.5,
    'established': 1.0,
    'trusted': 1.5
  };

  const userTier = userData?.account_tier || 'established';
  const multiplier = tierMultipliers[userTier] || 1.0;

  return { multiplier, tier: userTier };
}

/**
 * Calculate token reward based on commenter's tier
 * White Paper v1.0: Engagement rewards are weighted by the ENGAGER's tier
 */
async function calculateCommentReward(commenterId: string): Promise<{ reward: number; tier: string; multiplier: number }> {
  const { multiplier, tier } = await getTierMultiplier(commenterId);
  const reward = COMMENT_REWARD_BASE * multiplier;

  console.log(`💰 Comment reward: ${reward} BOCA (base: ${COMMENT_REWARD_BASE}, commenter tier: ${tier}, multiplier: ${multiplier})`);
  
  return { reward, tier, multiplier };
}

/**
 * Award tokens to user
 */
async function awardTokens(userId: string, amount: number): Promise<void> {
  const { data: user } = await supabase
    .from('users')
    .select('tokens_earned')
    .eq('id', userId)
    .single();
    
  const newAmount = (user?.tokens_earned || 0) + amount;
  
  const { error } = await supabase
    .from('users')
    .update({ tokens_earned: newAmount })
    .eq('id', userId);
    
  if (error) throw error;
}

/**
 * Format comment with author info and user interaction state
 */
async function formatComment(
  comment: any, 
  currentUserId?: string
): Promise<CommentWithAuthor> {
  
  console.log('🔍 Formatting comment:', comment.id, 'author_id:', comment.author_id);
  
  // Get author info
  const { data: author, error: authorError } = await supabase
    .from('users')
    .select('id, username, display_name, avatar_url')
    .eq('id', comment.author_id)
    .single();

  console.log('👤 Author data:', author);
  console.log('❌ Author error:', authorError);

  // Check if current user has liked this comment
  let userHasLiked = false;
  if (currentUserId) {
    const { data: likeData } = await supabase
      .from('comment_likes')
      .select('id')
      .eq('comment_id', comment.id)
      .eq('user_id', currentUserId)
      .single();
    
    userHasLiked = !!likeData;
  }

  return {
    id: comment.id,
    recommendation_id: comment.recommendation_id,
    user_id: comment.author_id,
    parent_comment_id: comment.parent_comment_id,
    content: comment.is_deleted ? '[deleted]' : comment.content,
    likes_count: comment.likes_count || 0,
    replies_count: comment.replies_count || 0,
    is_edited: comment.is_edited || false,
    is_deleted: comment.is_deleted || false,
    created_at: comment.created_at,
    updated_at: comment.updated_at,
    edited_at: comment.edited_at,
    author: author ? {
      id: author.id,
      name: author.display_name || author.username,
      username: author.username,
      avatar: author.avatar_url || '/default-avatar.png',
      reputation: 0,
      verificationLevel: 'basic'
    } : {
      id: comment.author_id,
      name: 'Anonymous',
      username: 'anonymous',
      avatar: '/default-avatar.png',
      reputation: 0
    },
    user_has_liked: userHasLiked
  };
}

/**
 * Build nested comment tree (max 3 levels)
 */
async function buildCommentTree(
  comments: any[],
  parentId: string | null = null,
  currentUserId?: string,
  level: number = 0
): Promise<CommentWithAuthor[]> {
  // Limit nesting to 3 levels
  if (level >= 3) {
    return [];
  }

  const children = comments.filter(c => c.parent_comment_id === parentId);
  
  const formattedChildren = await Promise.all(
    children.map(async (comment) => {
      const formatted = await formatComment(comment, currentUserId);
      
      // Recursively get replies
      const replies = await buildCommentTree(
        comments, 
        comment.id, 
        currentUserId, 
        level + 1
      );
      
      if (replies.length > 0) {
        formatted.replies = replies;
      }
      
      return formatted;
    })
  );

  return formattedChildren;
}

/**
 * Check if user can edit comment (within 5 minute window)
 */
function canEditComment(createdAt: string): boolean {
  const created = new Date(createdAt).getTime();
  const now = Date.now();
  const fiveMinutes = 5 * 60 * 1000;
  
  return (now - created) < fiveMinutes;
}

// =============================================================================
// ROUTES
// =============================================================================

/**
 * GET /api/recommendations/:id/comments
 * Get all comments for a recommendation with nested replies
 */
router.get(
  '/recommendations/:recommendationId/comments',
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { recommendationId } = req.params;
      const currentUserId = req.user?.id;

      console.log(`📝 GET comments for recommendation: ${recommendationId}`);

      // Validate query params
      const validation = getCommentsQuerySchema.safeParse(req.query);
      if (!validation.success) {
        return res.status(400).json({
          success: false,
          error: 'Invalid query parameters',
          details: validation.error.errors
        });
      }

      const { limit, offset, sort } = validation.data;

      // Check if recommendation exists
      const { data: recommendation, error: recError } = await supabase
        .from('recommendations')
        .select('id, comments_count')
        .eq('id', recommendationId)
        .single();

      if (recError || !recommendation) {
        return res.status(404).json({
          success: false,
          error: 'Recommendation not found'
        });
      }

      // Get all comments WITH USER DATA
      let query = supabase
        .from('recommendation_comments')
        .select(`
          *,
          user:author_id (
            id,
            username,
            display_name,
            avatar_url
          )
        `)
        .eq('recommendation_id', recommendationId)
        .eq('is_deleted', false);

      // Apply sorting
      switch (sort) {
        case 'oldest':
          query = query.order('created_at', { ascending: true });
          break;
        case 'most_liked':
          query = query.order('likes_count', { ascending: false });
          break;
        case 'newest':
        default:
          query = query.order('created_at', { ascending: false });
      }

      const { data: allComments, error: commentsError } = await query;

      if (commentsError) {
        console.error('❌ Error fetching comments:', commentsError);
        return res.status(500).json({
          success: false,
          error: 'Failed to fetch comments'
        });
      }

      // Build comment tree
      const topLevelComments = allComments?.filter(c => c.parent_comment_id === null) || [];
      const commentTree = await buildCommentTree(
        allComments || [],
        null,
        currentUserId
      );

      // Apply pagination to tree
      const paginatedTree = commentTree.slice(offset, offset + limit);

      console.log(`✅ Retrieved ${paginatedTree.length} top-level comments (total: ${topLevelComments.length})`);

      res.json({
        success: true,
        comments: paginatedTree,
        total_comments: recommendation.comments_count || 0,
        top_level_count: topLevelComments.length,
        pagination: {
          limit,
          offset,
          has_more: (offset + limit) < topLevelComments.length
        },
        sort
      });

    } catch (error) {
      console.error('❌ Error fetching comments:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch comments'
      });
    }
  }
);

/**
 * POST /api/recommendations/:id/comments
 * Create a new comment on a recommendation
 * White Paper v1.0: Awards 0.50 BOCA (tier-weighted) to RECOMMENDATION AUTHOR
 */
router.post(
  '/recommendations/:recommendationId/comments',
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { recommendationId } = req.params;
      const userId = req.user?.id; // The commenter

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
      }

      console.log(`💬 POST comment on recommendation ${recommendationId} by user ${userId}`);

      // Validate request body
      const validation = createCommentSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({
          success: false,
          error: 'Invalid comment data',
          details: validation.error.errors
        });
      }

      const { content } = validation.data;

      // Check if recommendation exists and get author
      const { data: recommendation, error: recError } = await supabase
        .from('recommendations')
        .select('id, author_id')
        .eq('id', recommendationId)
        .single();

      if (recError || !recommendation) {
        return res.status(404).json({
          success: false,
          error: 'Recommendation not found'
        });
      }

      // Create comment
      const { data: newComment, error: createError } = await supabase
        .from('recommendation_comments')
        .insert({
          recommendation_id: recommendationId,
          author_id: userId,
          content: content,
          parent_comment_id: null,
          likes_count: 0,
          replies_count: 0,
          is_edited: false,
          is_deleted: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (createError) {
        console.error('❌ Error creating comment:', createError);
        return res.status(500).json({
          success: false,
          error: 'Failed to create comment',
          details: createError.message
        });
      }

      console.log(`✅ Comment created: ${newComment.id}`);

      // Note: comments_count is automatically updated by database trigger
      // trg_update_recommendation_comment_count

      // =========================================================================
      // Award token reward via TWO-TIER REWARD SERVICE
      // White Paper v1.02: "Receive comment" = 0.50 BOCA base, tier-weighted
      // =========================================================================
      let commentRewardResult: RewardResult | null = null;
      
      // Don't award tokens if commenting on your own recommendation
      if (recommendation.author_id !== userId) {
        console.log(`💰 [TWO-TIER] Awarding comment reward to author ${recommendation.author_id}...`);
        
        try {
          commentRewardResult = await rewardService.awardCommentReceived(
            recommendation.author_id,  // Author receives reward
            recommendationId,
            userId                     // Commenter's tier determines weight
          );
          
          if (commentRewardResult.success) {
            console.log(`✅ [TWO-TIER] Comment reward: ${commentRewardResult.displayAmount} BOCA (${commentRewardResult.method})`);
            if (commentRewardResult.txDigest) {
              console.log(`   TX: ${commentRewardResult.txDigest}`);
            }
            
            // Update engagement points for validation bonus tracking
            await updateEngagementPoints(recommendationId, userId, 'comment');
          } else {
            console.error(`❌ [TWO-TIER] Comment reward failed: ${commentRewardResult.error}`);
          }
        } catch (rewardError) {
          console.error('❌ [TWO-TIER] Comment reward exception:', rewardError);
        }
      } else {
        console.log(`ℹ️ No reward - user commented on their own recommendation`);
      }
      
      // Format comment with author info
      const formattedComment = await formatComment(newComment, userId);

      console.log('📦 Formatted comment being sent to frontend:', JSON.stringify(formattedComment, null, 2));

      res.status(201).json({
        success: true,
        comment: formattedComment,
        reward: commentRewardResult ? {
          tokens_awarded: commentRewardResult.displayAmount,
          recipient: recommendation.author_id,
          recipient_type: 'recommendation_author',
          reason: 'receive_comment',
          method: commentRewardResult.method,
          tx_digest: commentRewardResult.txDigest || null,
          success: commentRewardResult.success
        } : null,
        message: 'Comment created successfully'
      });

    } catch (error) {
      console.error('❌ Error creating comment:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create comment'
      });
    }
  }
);

/**
 * POST /api/comments/:commentId/reply
 * Reply to an existing comment
 * White Paper v1.0: Awards 0.50 BOCA (tier-weighted) to RECOMMENDATION AUTHOR
 */
router.post(
  '/comments/:commentId/reply',
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { commentId } = req.params;
      const userId = req.user?.id; // The replier

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
      }

      console.log(`↩️ POST reply to comment ${commentId} by user ${userId}`);

      // Validate request body
      const validation = replyToCommentSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({
          success: false,
          error: 'Invalid reply data',
          details: validation.error.errors
        });
      }

      const { content } = validation.data;

      // Get parent comment
      const { data: parentComment, error: parentError } = await supabase
        .from('recommendation_comments')
        .select('id, recommendation_id, parent_comment_id, is_deleted')
        .eq('id', commentId)
        .single();

      if (parentError || !parentComment) {
        return res.status(404).json({
          success: false,
          error: 'Parent comment not found'
        });
      }

      if (parentComment.is_deleted) {
        return res.status(400).json({
          success: false,
          error: 'Cannot reply to a deleted comment'
        });
      }

      // Get recommendation to find author for reward
      const { data: recommendation, error: recError } = await supabase
        .from('recommendations')
        .select('id, author_id')
        .eq('id', parentComment.recommendation_id)
        .single();

      if (recError || !recommendation) {
        return res.status(404).json({
          success: false,
          error: 'Recommendation not found'
        });
      }

      // Check nesting level (max 3 levels)
      let nestingLevel = 1;
      let currentParentId = parentComment.parent_comment_id;
      
      while (currentParentId && nestingLevel < 3) {
        const { data: ancestor } = await supabase
          .from('recommendation_comments')
          .select('parent_comment_id')
          .eq('id', currentParentId)
          .single();
        
        if (ancestor?.parent_comment_id) {
          nestingLevel++;
          currentParentId = ancestor.parent_comment_id;
        } else {
          break;
        }
      }

      if (nestingLevel >= 3) {
        return res.status(400).json({
          success: false,
          error: 'Maximum nesting level (3) reached. Please reply to a higher-level comment.'
        });
      }

      // Create reply
      const { data: newReply, error: createError } = await supabase
        .from('recommendation_comments')
        .insert({
          recommendation_id: parentComment.recommendation_id,
          author_id: userId,
          parent_comment_id: commentId,
          content: content,
          likes_count: 0,
          replies_count: 0,
          is_edited: false,
          is_deleted: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (createError) {
        console.error('❌ Error creating reply:', createError);
        return res.status(500).json({
          success: false,
          error: 'Failed to create reply',
          details: createError.message
        });
      }

      console.log(`✅ Reply created: ${newReply.id}`);

      // Update parent comment's replies_count
      const { data: parentData } = await supabase
        .from('recommendation_comments')
        .select('replies_count')
        .eq('id', commentId)
        .single();

      await supabase
        .from('recommendation_comments')
        .update({ replies_count: (parentData?.replies_count || 0) + 1 })
        .eq('id', commentId);

      // Calculate and award token reward to RECOMMENDATION AUTHOR
      // White Paper v1.0: Replies also count as engagement on the recommendation
      let tokensAwarded = 0;
      let rewardRecipient = null;
      
      // Don't award tokens if replying on your own recommendation
      if (recommendation.author_id !== userId) {
        const { reward, tier, multiplier } = await calculateCommentReward(userId);
        await awardTokens(recommendation.author_id, reward);
        tokensAwarded = reward;
        rewardRecipient = recommendation.author_id;
        console.log(`💰 Awarded ${reward} BOCA to recommendation author ${recommendation.author_id} for reply (replier tier: ${tier})`);
      } else {
        console.log(`ℹ️ No reward - user replied on their own recommendation`);
      }

      // Format reply with author info
      const formattedReply = await formatComment(newReply, userId);

      res.status(201).json({
        success: true,
        comment: formattedReply,
        parent_comment_id: commentId,
        reward: {
          tokens_awarded: tokensAwarded,
          recipient: rewardRecipient,
          recipient_type: 'recommendation_author',
          reason: 'receive_reply'
        },
        message: 'Reply created successfully'
      });

    } catch (error) {
      console.error('❌ Error creating reply:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create reply'
      });
    }
  }
);

/**
 * PATCH /api/comments/:commentId
 * Edit a comment (only within 5 minutes of creation)
 */
router.patch(
  '/comments/:commentId',
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { commentId } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
      }

      console.log(`✏️ PATCH comment ${commentId} by user ${userId}`);

      // Validate request body
      const validation = updateCommentSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({
          success: false,
          error: 'Invalid comment data',
          details: validation.error.errors
        });
      }

      const { content } = validation.data;

      // Get existing comment
      const { data: existingComment, error: fetchError } = await supabase
        .from('recommendation_comments')
        .select('*')
        .eq('id', commentId)
        .single();

      if (fetchError || !existingComment) {
        return res.status(404).json({
          success: false,
          error: 'Comment not found'
        });
      }

      // Check ownership
      if (existingComment.author_id !== userId) {
        return res.status(403).json({
          success: false,
          error: 'You can only edit your own comments'
        });
      }

      // Check if deleted
      if (existingComment.is_deleted) {
        return res.status(400).json({
          success: false,
          error: 'Cannot edit a deleted comment'
        });
      }

      // Check 5-minute edit window
      if (!canEditComment(existingComment.created_at)) {
        return res.status(400).json({
          success: false,
          error: 'Comments can only be edited within 5 minutes of creation'
        });
      }

      // Update comment
      const { data: updatedComment, error: updateError } = await supabase
        .from('recommendation_comments')
        .update({
          content: content,
          is_edited: true,
          edited_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', commentId)
        .select()
        .single();

      if (updateError) {
        console.error('❌ Error updating comment:', updateError);
        return res.status(500).json({
          success: false,
          error: 'Failed to update comment',
          details: updateError.message
        });
      }

      console.log(`✅ Comment updated: ${commentId}`);

      // Format comment with author info
      const formattedComment = await formatComment(updatedComment, userId);

      res.json({
        success: true,
        comment: formattedComment,
        message: 'Comment updated successfully'
      });

    } catch (error) {
      console.error('❌ Error updating comment:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update comment'
      });
    }
  }
);

/**
 * DELETE /api/comments/:commentId
 * Soft delete a comment (preserves thread context)
 */
router.delete(
  '/comments/:commentId',
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { commentId } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
      }

      console.log(`🗑️ DELETE comment ${commentId} by user ${userId}`);

      // Get existing comment
      const { data: existingComment, error: fetchError } = await supabase
        .from('recommendation_comments')
        .select('*')
        .eq('id', commentId)
        .single();

      if (fetchError || !existingComment) {
        return res.status(404).json({
          success: false,
          error: 'Comment not found'
        });
      }

      // Check ownership
      if (existingComment.author_id !== userId) {
        return res.status(403).json({
          success: false,
          error: 'You can only delete your own comments'
        });
      }

      // Check if already deleted
      if (existingComment.is_deleted) {
        return res.status(400).json({
          success: false,
          error: 'Comment is already deleted'
        });
      }

      // Soft delete
      const { error: deleteError } = await supabase
        .from('recommendation_comments')
        .update({
          is_deleted: true,
          content: '[deleted]',
          updated_at: new Date().toISOString()
        })
        .eq('id', commentId);

      if (deleteError) {
        console.error('❌ Error deleting comment:', deleteError);
        return res.status(500).json({
          success: false,
          error: 'Failed to delete comment',
          details: deleteError.message
        });
      }

      console.log(`✅ Comment soft deleted: ${commentId}`);

      res.json({
        success: true,
        message: 'Comment deleted successfully',
        comment_id: commentId
      });

    } catch (error) {
      console.error('❌ Error deleting comment:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete comment'
      });
    }
  }
);

/**
 * POST /api/comments/:commentId/like
 * Like or unlike a comment
 */
router.post(
  '/comments/:commentId/like',
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { commentId } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
      }

      console.log(`❤️ POST like comment ${commentId} by user ${userId}`);

      // Check if comment exists
      const { data: comment, error: commentError } = await supabase
        .from('recommendation_comments')
        .select('id, is_deleted, likes_count')
        .eq('id', commentId)
        .single();

      if (commentError || !comment) {
        return res.status(404).json({
          success: false,
          error: 'Comment not found'
        });
      }

      if (comment.is_deleted) {
        return res.status(400).json({
          success: false,
          error: 'Cannot like a deleted comment'
        });
      }

      // Check if user already liked this comment
      const { data: existingLike, error: likeCheckError } = await supabase
        .from('comment_likes')
        .select('id')
        .eq('comment_id', commentId)
        .eq('user_id', userId)
        .single();

      if (likeCheckError && likeCheckError.code !== 'PGRST116') {
        console.error('❌ Error checking existing like:', likeCheckError);
        return res.status(500).json({
          success: false,
          error: 'Database error'
        });
      }

      if (existingLike) {
        // Unlike
        const { error: deleteError } = await supabase
          .from('comment_likes')
          .delete()
          .eq('id', existingLike.id);

        if (deleteError) {
          console.error('❌ Error removing like:', deleteError);
          return res.status(500).json({
            success: false,
            error: 'Failed to unlike comment'
          });
        }

        console.log(`💔 Comment unliked: ${commentId}`);

        res.json({
          success: true,
          action: 'unliked',
          is_liked: false,
          message: 'Comment unliked successfully'
        });

      } else {
        // Like
        const { error: insertError } = await supabase
          .from('comment_likes')
          .insert({
            comment_id: commentId,
            user_id: userId,
            created_at: new Date().toISOString()
          });

        if (insertError) {
          console.error('❌ Error adding like:', insertError);
          return res.status(500).json({
            success: false,
            error: 'Failed to like comment'
          });
        }

        console.log(`❤️ Comment liked: ${commentId}`);

        res.json({
          success: true,
          action: 'liked',
          is_liked: true,
          message: 'Comment liked successfully'
        });
      }

    } catch (error) {
      console.error('❌ Error toggling comment like:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to toggle comment like'
      });
    }
  }
);

/**
 * DELETE /api/comments/:commentId/like
 * Unlike a comment (alternative endpoint)
 */
router.delete(
  '/comments/:commentId/like',
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { commentId } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
      }

      console.log(`💔 DELETE like on comment ${commentId} by user ${userId}`);

      // Check if like exists
      const { data: existingLike, error: likeCheckError } = await supabase
        .from('comment_likes')
        .select('id')
        .eq('comment_id', commentId)
        .eq('user_id', userId)
        .single();

      if (likeCheckError || !existingLike) {
        return res.status(404).json({
          success: false,
          error: 'Like not found'
        });
      }

      // Remove like
      const { error: deleteError } = await supabase
        .from('comment_likes')
        .delete()
        .eq('id', existingLike.id);

      if (deleteError) {
        console.error('❌ Error removing like:', deleteError);
        return res.status(500).json({
          success: false,
          error: 'Failed to unlike comment'
        });
      }

      console.log(`✅ Like removed from comment: ${commentId}`);

      res.json({
        success: true,
        action: 'unliked',
        is_liked: false,
        message: 'Comment unliked successfully'
      });

    } catch (error) {
      console.error('❌ Error removing comment like:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to unlike comment'
      });
    }
  }
);

// =============================================================================
// EXPORT
// =============================================================================

export default router;