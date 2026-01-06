// File: code/poc/core/src/routes/onboarding.ts
// Onboarding API Routes - White Paper v1.0 (Updated December 2025)
// Handles: Track 3 milestones (Follow, Recommendations, Engagement) + Progress tracking
// 
// Milestones (White Paper v1.0):
//   1. Follow 3 users → 5.0 BOCA
//   2. Create 5 recommendations → 25.0 BOCA
//   3. Engage with 10 posts from ≥3 authors → 20.0 BOCA
// Total: 50.0 BOCA

import { Router, Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';

const router = Router();

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase configuration for onboarding routes');
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// =============================================================================
// CONSTANTS
// =============================================================================

const MILESTONE_REQUIREMENTS = {
  FOLLOW: 3,
  RECOMMENDATIONS: 5,
  ENGAGEMENT_COUNT: 10,
  ENGAGEMENT_AUTHORS: 3
};

// White Paper v1.0 reward values (10x increase from v0.8)
const MILESTONE_REWARDS = {
  FOLLOW: 5000000,         // 5.0 BOCA in base units (6 decimals)
  RECOMMENDATIONS: 25000000, // 25.0 BOCA (5.0 per recommendation)
  ENGAGEMENT: 20000000     // 20.0 BOCA
};

// =============================================================================
// VALIDATION SCHEMAS
// =============================================================================

const trackActionSchema = z.object({
  action_type: z.enum(['follow', 'recommendation', 'engagement']),
  details: z.object({
    target_user_id: z.string().uuid().optional(),
    recommendation_id: z.string().uuid().optional(),
    author_id: z.string().uuid().optional(),
    engagement_type: z.enum(['like', 'save', 'comment', 'bookmark']).optional()
  }).optional()
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

interface OnboardingProgress {
  user_id: string;
  follow_count: number;
  follow_milestone_completed: boolean;
  follow_milestone_completed_at: string | null;
  recommendation_count: number;
  rec_milestone_completed: boolean;
  rec_milestone_completed_at: string | null;
  engagement_count: number;
  unique_authors_engaged: number;
  engagement_milestone_completed: boolean;
  engagement_milestone_completed_at: string | null;
  total_earned_base_units: number;
  is_complete: boolean;
  created_at: string;
  updated_at: string;
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Get or create onboarding progress for a user
 */
async function getOrCreateProgress(userId: string): Promise<OnboardingProgress | null> {
  // Try to get existing progress
  const { data: existing, error: fetchError } = await supabase
    .from('onboarding_progress')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (existing && !fetchError) {
    return existing;
  }

  // Create new progress record
  const { data: newProgress, error: createError } = await supabase
    .from('onboarding_progress')
    .insert({
      user_id: userId,
      follow_count: 0,
      recommendation_count: 0,
      engagement_count: 0,
      unique_authors_engaged: 0,
      total_earned_base_units: 0,
      is_complete: false
    })
    .select()
    .single();

  if (createError) {
    console.error('❌ Error creating onboarding progress:', createError);
    return null;
  }

  return newProgress;
}

/**
 * Format progress for frontend consumption
 */
function formatProgress(progress: OnboardingProgress) {
  return {
    user_id: progress.user_id,
    milestones: {
      follow: {
        required: MILESTONE_REQUIREMENTS.FOLLOW,
        current: progress.follow_count,
        completed: progress.follow_milestone_completed,
        completed_at: progress.follow_milestone_completed_at,
        reward_boca: 5.0,
        reward_base_units: MILESTONE_REWARDS.FOLLOW
      },
      recommendations: {
        required: MILESTONE_REQUIREMENTS.RECOMMENDATIONS,
        current: progress.recommendation_count,
        completed: progress.rec_milestone_completed,
        completed_at: progress.rec_milestone_completed_at,
        reward_boca: 25.0,
        reward_base_units: MILESTONE_REWARDS.RECOMMENDATIONS
      },
      engagement: {
        required_actions: MILESTONE_REQUIREMENTS.ENGAGEMENT_COUNT,
        required_authors: MILESTONE_REQUIREMENTS.ENGAGEMENT_AUTHORS,
        current_actions: progress.engagement_count,
        current_authors: progress.unique_authors_engaged,
        completed: progress.engagement_milestone_completed,
        completed_at: progress.engagement_milestone_completed_at,
        reward_boca: 20.0,
        reward_base_units: MILESTONE_REWARDS.ENGAGEMENT
      }
    },
    total_earned_boca: progress.total_earned_base_units / 1000000,
    total_earned_base_units: progress.total_earned_base_units,
    is_complete: progress.is_complete,
    completion_percentage: calculateCompletionPercentage(progress),
    next_milestone: getNextMilestone(progress)
  };
}

/**
 * Calculate overall completion percentage
 */
function calculateCompletionPercentage(progress: OnboardingProgress): number {
  let completed = 0;
  if (progress.follow_milestone_completed) completed++;
  if (progress.rec_milestone_completed) completed++;
  if (progress.engagement_milestone_completed) completed++;
  
  return Math.round((completed / 3) * 100);
}

/**
 * Determine next milestone to complete
 */
function getNextMilestone(progress: OnboardingProgress): string | null {
  if (!progress.follow_milestone_completed) return 'follow';
  if (!progress.rec_milestone_completed) return 'recommendations';
  if (!progress.engagement_milestone_completed) return 'engagement';
  return null;
}

/**
 * Check if milestone should be auto-completed
 */
function shouldCompleteMilestone(
  progress: OnboardingProgress,
  milestoneType: 'follow' | 'recommendations' | 'engagement'
): boolean {
  switch (milestoneType) {
    case 'follow':
      return !progress.follow_milestone_completed && 
             progress.follow_count >= MILESTONE_REQUIREMENTS.FOLLOW;
    case 'recommendations':
      return !progress.rec_milestone_completed && 
             progress.recommendation_count >= MILESTONE_REQUIREMENTS.RECOMMENDATIONS;
    case 'engagement':
      return !progress.engagement_milestone_completed && 
             progress.engagement_count >= MILESTONE_REQUIREMENTS.ENGAGEMENT_COUNT &&
             progress.unique_authors_engaged >= MILESTONE_REQUIREMENTS.ENGAGEMENT_AUTHORS;
    default:
      return false;
  }
}

// =============================================================================
// ROUTES
// =============================================================================

/**
 * GET /api/onboarding/progress/:userId
 * Get user's onboarding progress
 */
router.get(
  '/progress/:userId',
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { userId } = req.params;
      const currentUserId = req.user?.id;

      console.log(`📊 GET onboarding progress for user: ${userId}`);

      // Authorization: Users can only view their own progress
      if (userId !== currentUserId) {
        return res.status(403).json({
          success: false,
          error: 'You can only view your own onboarding progress'
        });
      }

      // Get or create progress
      const progress = await getOrCreateProgress(userId);

      if (!progress) {
        return res.status(500).json({
          success: false,
          error: 'Failed to get onboarding progress'
        });
      }

      console.log(`✅ Progress retrieved for user ${userId}`);

      res.json({
        success: true,
        progress: formatProgress(progress)
      });

    } catch (error) {
      console.error('❌ Error getting onboarding progress:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get onboarding progress'
      });
    }
  }
);

/**
 * POST /api/onboarding/milestones/follow
 * Award follow milestone (5.0 BOCA for following 3 users)
 */
router.post(
  '/milestones/follow',
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
      }

      console.log(`👥 POST complete follow milestone for user: ${userId}`);

      // Get progress
      const progress = await getOrCreateProgress(userId);

      if (!progress) {
        return res.status(500).json({
          success: false,
          error: 'Failed to get onboarding progress'
        });
      }

      // Check if already completed
      if (progress.follow_milestone_completed) {
        return res.status(400).json({
          success: false,
          error: 'Follow milestone already completed'
        });
      }

      // Check if requirements met
      if (progress.follow_count < MILESTONE_REQUIREMENTS.FOLLOW) {
        return res.status(400).json({
          success: false,
          error: `Must follow ${MILESTONE_REQUIREMENTS.FOLLOW} users to complete this milestone`,
          current_count: progress.follow_count,
          required_count: MILESTONE_REQUIREMENTS.FOLLOW
        });
      }

      // Mark milestone as completed
      const newTotalEarned = progress.total_earned_base_units + MILESTONE_REWARDS.FOLLOW;
      const allComplete = progress.rec_milestone_completed && 
                         progress.engagement_milestone_completed;

      const { data: updated, error: updateError } = await supabase
        .from('onboarding_progress')
        .update({
          follow_milestone_completed: true,
          follow_milestone_completed_at: new Date().toISOString(),
          total_earned_base_units: newTotalEarned,
          is_complete: allComplete
        })
        .eq('user_id', userId)
        .select()
        .single();

      if (updateError) {
        console.error('❌ Error completing follow milestone:', updateError);
        return res.status(500).json({
          success: false,
          error: 'Failed to complete follow milestone'
        });
      }

      console.log(`✅ Follow milestone completed for user ${userId} - Earned 5.0 BOCA`);

      res.json({
        success: true,
        message: 'Follow milestone completed! 🎉',
        milestone: 'follow',
        reward_boca: 5.0,
        reward_base_units: MILESTONE_REWARDS.FOLLOW,
        progress: formatProgress(updated)
      });

    } catch (error) {
      console.error('❌ Error completing follow milestone:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to complete follow milestone'
      });
    }
  }
);

/**
 * POST /api/onboarding/milestones/recommendations
 * Award recommendations milestone (25.0 BOCA for creating 5 recommendations)
 */
router.post(
  '/milestones/recommendations',
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
      }

      console.log(`📝 POST complete recommendations milestone for user: ${userId}`);

      // Get progress
      const progress = await getOrCreateProgress(userId);

      if (!progress) {
        return res.status(500).json({
          success: false,
          error: 'Failed to get onboarding progress'
        });
      }

      // Check if already completed
      if (progress.rec_milestone_completed) {
        return res.status(400).json({
          success: false,
          error: 'Recommendations milestone already completed'
        });
      }

      // Check if requirements met
      if (progress.recommendation_count < MILESTONE_REQUIREMENTS.RECOMMENDATIONS) {
        return res.status(400).json({
          success: false,
          error: `Must create ${MILESTONE_REQUIREMENTS.RECOMMENDATIONS} recommendations to complete this milestone`,
          current_count: progress.recommendation_count,
          required_count: MILESTONE_REQUIREMENTS.RECOMMENDATIONS
        });
      }

      // Mark milestone as completed
      const newTotalEarned = progress.total_earned_base_units + MILESTONE_REWARDS.RECOMMENDATIONS;
      const allComplete = progress.follow_milestone_completed && 
                         progress.engagement_milestone_completed;

      const { data: updated, error: updateError } = await supabase
        .from('onboarding_progress')
        .update({
          rec_milestone_completed: true,
          rec_milestone_completed_at: new Date().toISOString(),
          total_earned_base_units: newTotalEarned,
          is_complete: allComplete
        })
        .eq('user_id', userId)
        .select()
        .single();

      if (updateError) {
        console.error('❌ Error completing recommendations milestone:', updateError);
        return res.status(500).json({
          success: false,
          error: 'Failed to complete recommendations milestone'
        });
      }

      console.log(`✅ Recommendations milestone completed for user ${userId} - Earned 25.0 BOCA`);

      res.json({
        success: true,
        message: 'Recommendations milestone completed! 🎉',
        milestone: 'recommendations',
        reward_boca: 25.0,
        reward_base_units: MILESTONE_REWARDS.RECOMMENDATIONS,
        progress: formatProgress(updated)
      });

    } catch (error) {
      console.error('❌ Error completing recommendations milestone:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to complete recommendations milestone'
      });
    }
  }
);

/**
 * POST /api/onboarding/milestones/engagement
 * Award engagement milestone (20.0 BOCA for 10 engagements from ≥3 authors)
 */
router.post(
  '/milestones/engagement',
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
      }

      console.log(`💬 POST complete engagement milestone for user: ${userId}`);

      // Get progress
      const progress = await getOrCreateProgress(userId);

      if (!progress) {
        return res.status(500).json({
          success: false,
          error: 'Failed to get onboarding progress'
        });
      }

      // Check if already completed
      if (progress.engagement_milestone_completed) {
        return res.status(400).json({
          success: false,
          error: 'Engagement milestone already completed'
        });
      }

      // Check if requirements met
      const countMet = progress.engagement_count >= MILESTONE_REQUIREMENTS.ENGAGEMENT_COUNT;
      const authorsMet = progress.unique_authors_engaged >= MILESTONE_REQUIREMENTS.ENGAGEMENT_AUTHORS;

      if (!countMet || !authorsMet) {
        return res.status(400).json({
          success: false,
          error: 'Engagement milestone requirements not met',
          requirements: {
            actions: {
              required: MILESTONE_REQUIREMENTS.ENGAGEMENT_COUNT,
              current: progress.engagement_count,
              met: countMet
            },
            unique_authors: {
              required: MILESTONE_REQUIREMENTS.ENGAGEMENT_AUTHORS,
              current: progress.unique_authors_engaged,
              met: authorsMet
            }
          }
        });
      }

      // Mark milestone as completed
      const newTotalEarned = progress.total_earned_base_units + MILESTONE_REWARDS.ENGAGEMENT;
      const allComplete = progress.follow_milestone_completed && 
                         progress.rec_milestone_completed;

      const { data: updated, error: updateError } = await supabase
        .from('onboarding_progress')
        .update({
          engagement_milestone_completed: true,
          engagement_milestone_completed_at: new Date().toISOString(),
          total_earned_base_units: newTotalEarned,
          is_complete: allComplete
        })
        .eq('user_id', userId)
        .select()
        .single();

      if (updateError) {
        console.error('❌ Error completing engagement milestone:', updateError);
        return res.status(500).json({
          success: false,
          error: 'Failed to complete engagement milestone'
        });
      }

      // FIXED: Award tokens to user balance
      const { error: awardError } = await supabase.rpc('award_engagement_milestone', {
        p_user_id: userId
      });

      if (awardError) {
        console.error('⚠️ Engagement milestone marked complete but token award failed:', awardError);
      }

      console.log(`✅ Engagement milestone completed for user ${userId} - Earned 20.0 BOCA`);

      res.json({
        success: true,
        message: 'Engagement milestone completed! 🎉',
        milestone: 'engagement',
        reward_boca: 20.0,
        reward_base_units: MILESTONE_REWARDS.ENGAGEMENT,
        progress: formatProgress(updated)
      });

    } catch (error) {
      console.error('❌ Error completing engagement milestone:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to complete engagement milestone'
      });
    }
  }
);

/**
 * POST /api/onboarding/track
 * Track user action and update counts (auto-award milestone if requirements met)
 */
router.post(
  '/track',
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
      }

      // Validate request body
      const validation = trackActionSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({
          success: false,
          error: 'Invalid action data',
          details: validation.error.errors
        });
      }

      const { action_type, details } = validation.data;

      console.log(`📍 POST track action '${action_type}' for user: ${userId}`);

      // Get progress
      let progress = await getOrCreateProgress(userId);

      if (!progress) {
        return res.status(500).json({
          success: false,
          error: 'Failed to get onboarding progress'
        });
      }

      // Update counts based on action type
      let updateData: any = {};
      let milestoneCompleted = false;
      let completedMilestone: string | null = null;
      let rewardEarned = 0;

      switch (action_type) {
        case 'follow':
          updateData.follow_count = progress.follow_count + 1;
          
          // Auto-complete milestone if requirements met
          if (shouldCompleteMilestone({ ...progress, follow_count: updateData.follow_count }, 'follow')) {
            updateData.follow_milestone_completed = true;
            updateData.follow_milestone_completed_at = new Date().toISOString();
            updateData.total_earned_base_units = progress.total_earned_base_units + MILESTONE_REWARDS.FOLLOW;
            milestoneCompleted = true;
            completedMilestone = 'follow';
            rewardEarned = MILESTONE_REWARDS.FOLLOW;
          }
          break;

        case 'recommendation':
          updateData.recommendation_count = progress.recommendation_count + 1;
          
          // Auto-complete milestone if requirements met
          if (shouldCompleteMilestone({ ...progress, recommendation_count: updateData.recommendation_count }, 'recommendations')) {
            updateData.rec_milestone_completed = true;
            updateData.rec_milestone_completed_at = new Date().toISOString();
            updateData.total_earned_base_units = progress.total_earned_base_units + MILESTONE_REWARDS.RECOMMENDATIONS;
            milestoneCompleted = true;
            completedMilestone = 'recommendations';
            rewardEarned = MILESTONE_REWARDS.RECOMMENDATIONS;
          }
          break;

        case 'engagement':
          // Track engagement in separate table for unique author counting
          if (details?.recommendation_id && details?.author_id && details?.engagement_type) {
            const { error: engagementError } = await supabase
              .from('onboarding_engagements')
              .insert({
                user_id: userId,
                author_id: details.author_id,
                recommendation_id: details.recommendation_id,
                engagement_type: details.engagement_type
              })
              .select();

            // If no error or duplicate key error, count it
            if (!engagementError || engagementError.code === '23505') {
              updateData.engagement_count = progress.engagement_count + 1;

              // Recalculate unique authors
              const { count: uniqueAuthors } = await supabase
                .from('onboarding_engagements')
                .select('author_id', { count: 'exact', head: true })
                .eq('user_id', userId);

              updateData.unique_authors_engaged = uniqueAuthors || 0;

              // Auto-complete milestone if requirements met
              const updatedProgress = { 
                ...progress, 
                engagement_count: updateData.engagement_count,
                unique_authors_engaged: updateData.unique_authors_engaged
              };
              
              if (shouldCompleteMilestone(updatedProgress, 'engagement')) {
                updateData.engagement_milestone_completed = true;
                updateData.engagement_milestone_completed_at = new Date().toISOString();
                updateData.total_earned_base_units = progress.total_earned_base_units + MILESTONE_REWARDS.ENGAGEMENT;
                milestoneCompleted = true;
                completedMilestone = 'engagement';
                rewardEarned = MILESTONE_REWARDS.ENGAGEMENT;
              }
            }
          }
          break;
      }

      // Update progress
      const { data: updated, error: updateError } = await supabase
        .from('onboarding_progress')
        .update(updateData)
        .eq('user_id', userId)
        .select()
        .single();

      if (updateError) {
        console.error('❌ Error updating onboarding progress:', updateError);
        return res.status(500).json({
          success: false,
          error: 'Failed to track action'
        });
      }

      console.log(`✅ Action tracked: ${action_type} for user ${userId}`);

      const response: any = {
        success: true,
        message: 'Action tracked successfully',
        action_type,
        progress: formatProgress(updated)
      };

      // Include milestone completion info if applicable
      if (milestoneCompleted && completedMilestone) {
        response.milestone_completed = true;
        response.completed_milestone = completedMilestone;
        response.reward_boca = rewardEarned / 1000000;
        response.reward_base_units = rewardEarned;
        console.log(`🎉 Milestone auto-completed: ${completedMilestone} - Earned ${rewardEarned / 1000000} BOCA`);
      }

      res.json(response);

    } catch (error) {
      console.error('❌ Error tracking action:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to track action'
      });
    }
  }
);

// =============================================================================
// EXPORT
// =============================================================================

export default router;