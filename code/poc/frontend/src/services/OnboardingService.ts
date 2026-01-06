// File: frontend/src/services/OnboardingService.ts
// UPDATED: Connected to real backend API endpoints
// Tracks and rewards user's initial journey: Follow 3 accounts (0.5 BOCA), 
// Create 5 recs (2.5 BOCA), Engage with 10 posts (2.0 BOCA)

import { onboardingApi } from './api';

export interface OnboardingProgress {
  userId: string;
  isComplete: boolean;
  totalEarned: number; // base units (6 decimals)
  displayTotalEarned: string;
  milestones: {
    followUsers: OnboardingMilestone;
    createRecommendations: OnboardingMilestone;
    engageWithPosts: OnboardingMilestone;
  };
  nextStep: string | null;
  completionPercentage: number;
}

export interface OnboardingMilestone {
  name: string;
  description: string;
  requirement: number;
  current: number;
  isComplete: boolean;
  reward: number; // base units
  displayReward: string;
  icon: string;
  completedAt?: string;
}

export interface OnboardingStats {
  totalUsersOnboarded: number;
  averageCompletionTime: number; // days
  completionRate: number; // percentage
  totalRewardsDistributed: number;
}

class OnboardingService {
  // Onboarding reward amounts (6 decimals)
  private readonly FOLLOW_REWARD = 500000; // 0.5 BOCA
  private readonly RECOMMENDATION_REWARD = 2500000; // 2.5 BOCA
  private readonly ENGAGEMENT_REWARD = 2000000; // 2.0 BOCA
  private readonly TOTAL_POSSIBLE = 5000000; // 5.0 BOCA total

  // Requirements
  private readonly FOLLOW_REQUIREMENT = 3; // Follow ≥3 accounts
  private readonly REC_REQUIREMENT = 5; // Create 5 recommendations
  private readonly ENGAGEMENT_REQUIREMENT = 10; // Engage with 10 posts from ≥3 authors

  constructor() {
    console.log('📚 OnboardingService initialized');
  }

  /**
   * Get user's complete onboarding progress from backend
   */
  async getOnboardingProgress(userId: string): Promise<OnboardingProgress> {
    try {
      console.log(`📊 Getting onboarding progress for ${userId}...`);

      // Fetch from backend API
      const response = await onboardingApi.getProgress(userId);

      // Handle the response structure from backend
      const progressData = response.progress || response;

      // Map backend response to frontend format
      const progress: OnboardingProgress = {
        userId: progressData.user_id || userId,
        isComplete: progressData.is_complete || false,
        totalEarned: progressData.total_earned_base_units || 0,
        displayTotalEarned: this.formatAmount(progressData.total_earned_base_units || 0),
        milestones: {
          followUsers: this.mapMilestone(progressData.milestones.follow, '👥'),
          createRecommendations: this.mapMilestone(progressData.milestones.recommendations, '📝'),
          engageWithPosts: this.mapMilestone(progressData.milestones.engagement, '💬')
        },
        nextStep: progressData.next_milestone || null,
        completionPercentage: progressData.completion_percentage || 0
      };

      console.log(`✅ Onboarding progress: ${progress.completionPercentage}% complete`);
      return progress;

    } catch (error) {
      console.error('❌ Failed to get onboarding progress:', error);
      // Return empty progress on error
      return this.createEmptyProgress(userId);
    }
  }

  /**
   * Check if user has completed onboarding
   */
  async isOnboardingComplete(userId: string): Promise<boolean> {
    try {
      const progress = await this.getOnboardingProgress(userId);
      return progress.isComplete;
    } catch (error) {
      console.error('❌ Failed to check onboarding completion:', error);
      return false;
    }
  }

  /**
   * Complete follow milestone (follow ≥3 accounts)
   */
  async completeFollowMilestone(userId: string): Promise<{
    success: boolean;
    reward: number;
    displayReward: string;
    message: string;
    error?: string;
  }> {
    try {
      console.log(`👥 Attempting to complete follow milestone for ${userId}...`);

      const response = await onboardingApi.completeFollowMilestone(userId);

      if (response.success) {
        console.log('✅ Follow milestone completed!');
        return {
          success: true,
          reward: response.data?.reward_base_units || this.FOLLOW_REWARD,
          displayReward: this.formatAmount(response.data?.reward_base_units || this.FOLLOW_REWARD),
          message: response.data?.message || '🎉 You followed 3 users! Welcome to the community.'
        };
      } else {
        return {
          success: false,
          reward: 0,
          displayReward: '0.00 BOCA',
          message: response.error || 'Failed to complete milestone',
          error: response.error
        };
      }
    } catch (error) {
      console.error('❌ Failed to complete follow milestone:', error);
      return {
        success: false,
        reward: 0,
        displayReward: '0.00 BOCA',
        message: 'Failed to award milestone',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Complete recommendation milestone (create 5 recs)
   */
  async completeRecommendationMilestone(userId: string): Promise<{
    success: boolean;
    reward: number;
    displayReward: string;
    message: string;
    error?: string;
  }> {
    try {
      console.log(`📝 Attempting to complete recommendation milestone for ${userId}...`);

      const response = await onboardingApi.completeRecommendationMilestone(userId);

      if (response.success) {
        console.log('✅ Recommendation milestone completed!');
        return {
          success: true,
          reward: response.data?.reward_base_units || this.RECOMMENDATION_REWARD,
          displayReward: this.formatAmount(response.data?.reward_base_units || this.RECOMMENDATION_REWARD),
          message: response.data?.message || '🎉 You created 5 recommendations! Keep sharing great spots.'
        };
      } else {
        return {
          success: false,
          reward: 0,
          displayReward: '0.00 BOCA',
          message: response.error || 'Failed to complete milestone',
          error: response.error
        };
      }
    } catch (error) {
      console.error('❌ Failed to complete recommendation milestone:', error);
      return {
        success: false,
        reward: 0,
        displayReward: '0.00 BOCA',
        message: 'Failed to award milestone',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Complete engagement milestone (engage with 10 posts from ≥3 authors)
   */
  async completeEngagementMilestone(userId: string): Promise<{
    success: boolean;
    reward: number;
    displayReward: string;
    message: string;
    error?: string;
  }> {
    try {
      console.log(`💬 Attempting to complete engagement milestone for ${userId}...`);

      const response = await onboardingApi.completeEngagementMilestone(userId);

      if (response.success) {
        console.log('✅ Engagement milestone completed!');
        return {
          success: true,
          reward: response.data?.reward_base_units || this.ENGAGEMENT_REWARD,
          displayReward: this.formatAmount(response.data?.reward_base_units || this.ENGAGEMENT_REWARD),
          message: response.data?.message || '🎉 You engaged with the community! You\'re now part of BocaBoca.'
        };
      } else {
        return {
          success: false,
          reward: 0,
          displayReward: '0.00 BOCA',
          message: response.error || 'Failed to complete milestone',
          error: response.error
        };
      }
    } catch (error) {
      console.error('❌ Failed to complete engagement milestone:', error);
      return {
        success: false,
        reward: 0,
        displayReward: '0.00 BOCA',
        message: 'Failed to award milestone',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Track user action that contributes to onboarding
   * This can be called automatically when users perform actions
   */
  async trackOnboardingAction(
    userId: string,
    action: 'follow' | 'recommendation' | 'engagement',
    details?: any
  ): Promise<void> {
    try {
      console.log(`📈 Tracking onboarding action: ${action} for ${userId}`);

      await onboardingApi.trackAction(userId, action, details);

      console.log(`✅ Onboarding action tracked: ${action}`);
    } catch (error) {
      console.warn('⚠️ Failed to track onboarding action:', error);
      // Don't throw - tracking failures shouldn't break user flow
    }
  }

  /**
   * Get suggested next action for user
   */
  async getNextAction(userId: string): Promise<{
    action: string;
    description: string;
    icon: string;
    route?: string;
  } | null> {
    try {
      const progress = await this.getOnboardingProgress(userId);

      if (progress.isComplete) {
        return null; // All done!
      }

      // Determine next action based on incomplete milestones
      if (!progress.milestones.followUsers.isComplete) {
        const remaining = progress.milestones.followUsers.requirement - progress.milestones.followUsers.current;
        return {
          action: 'Follow Users',
          description: `Follow ${remaining} more user${remaining > 1 ? 's' : ''} to earn 0.5 BOCA`,
          icon: '👥',
          route: '/discover' // or wherever users can find people to follow
        };
      }

      if (!progress.milestones.createRecommendations.isComplete) {
        const remaining = progress.milestones.createRecommendations.requirement - progress.milestones.createRecommendations.current;
        return {
          action: 'Create Recommendations',
          description: `Create ${remaining} more recommendation${remaining > 1 ? 's' : ''} to earn 2.5 BOCA`,
          icon: '📝',
          route: '/create'
        };
      }

      if (!progress.milestones.engageWithPosts.isComplete) {
        const remaining = progress.milestones.engageWithPosts.requirement - progress.milestones.engageWithPosts.current;
        return {
          action: 'Engage with Community',
          description: `Interact with ${remaining} more post${remaining > 1 ? 's' : ''} to earn 2.0 BOCA`,
          icon: '💬',
          route: '/feed'
        };
      }

      return null;
    } catch (error) {
      console.error('❌ Failed to get next action:', error);
      return null;
    }
  }

  /**
   * Check if user can claim a milestone reward
   */
  async canClaimMilestone(
    userId: string, 
    milestoneType: 'follow' | 'recommendations' | 'engagement'
  ): Promise<boolean> {
    try {
      const progress = await this.getOnboardingProgress(userId);
      
      switch (milestoneType) {
        case 'follow':
          return !progress.milestones.followUsers.isComplete && 
                 progress.milestones.followUsers.current >= progress.milestones.followUsers.requirement;
        case 'recommendations':
          return !progress.milestones.createRecommendations.isComplete && 
                 progress.milestones.createRecommendations.current >= progress.milestones.createRecommendations.requirement;
        case 'engagement':
          return !progress.milestones.engageWithPosts.isComplete && 
                 progress.milestones.engageWithPosts.current >= progress.milestones.engageWithPosts.requirement;
        default:
          return false;
      }
    } catch (error) {
      console.error('❌ Failed to check milestone claim status:', error);
      return false;
    }
  }

  // ========== HELPER METHODS ==========

  /**
   * Map backend milestone data to frontend format
   */
  private mapMilestone(backendMilestone: any, icon: string): OnboardingMilestone {
    return {
      name: this.getMilestoneName(backendMilestone),
      description: this.getMilestoneDescription(backendMilestone),
      requirement: backendMilestone.required || backendMilestone.required_actions || 0,
      current: backendMilestone.current || backendMilestone.current_actions || 0,
      isComplete: backendMilestone.completed || false,
      reward: backendMilestone.reward_base_units || 0,
      displayReward: this.formatAmount(backendMilestone.reward_base_units || 0),
      icon,
      completedAt: backendMilestone.completed_at || undefined
    };
  }

  /**
   * Get milestone name from backend data
   */
  private getMilestoneName(milestone: any): string {
    if (milestone.required === this.FOLLOW_REQUIREMENT) return 'Follow Users';
    if (milestone.required === this.REC_REQUIREMENT) return 'Create Recommendations';
    return 'Engage with Community';
  }

  /**
   * Get milestone description
   */
  private getMilestoneDescription(milestone: any): string {
    if (milestone.required === this.FOLLOW_REQUIREMENT) {
      return 'Follow at least 3 users to build your network';
    }
    if (milestone.required === this.REC_REQUIREMENT) {
      return 'Share your first 5 restaurant recommendations';
    }
    return 'Like, save, or comment on 10 posts from at least 3 different users';
  }

  /**
   * Create empty progress object
   */
  private createEmptyProgress(userId: string): OnboardingProgress {
    return {
      userId,
      isComplete: false,
      totalEarned: 0,
      displayTotalEarned: '0.00 BOCA',
      milestones: {
        followUsers: {
          name: 'Follow Users',
          description: 'Follow at least 3 users to build your network',
          requirement: this.FOLLOW_REQUIREMENT,
          current: 0,
          isComplete: false,
          reward: this.FOLLOW_REWARD,
          displayReward: this.formatAmount(this.FOLLOW_REWARD),
          icon: '👥'
        },
        createRecommendations: {
          name: 'Create Recommendations',
          description: 'Share your first 5 restaurant recommendations',
          requirement: this.REC_REQUIREMENT,
          current: 0,
          isComplete: false,
          reward: this.RECOMMENDATION_REWARD,
          displayReward: this.formatAmount(this.RECOMMENDATION_REWARD),
          icon: '📝'
        },
        engageWithPosts: {
          name: 'Engage with Community',
          description: 'Like, save, or comment on 10 posts from at least 3 different users',
          requirement: this.ENGAGEMENT_REQUIREMENT,
          current: 0,
          isComplete: false,
          reward: this.ENGAGEMENT_REWARD,
          displayReward: this.formatAmount(this.ENGAGEMENT_REWARD),
          icon: '💬'
        }
      },
      nextStep: `Follow ${this.FOLLOW_REQUIREMENT} users`,
      completionPercentage: 0
    };
  }

  /**
   * Format token amount with 6 decimal precision
   */
  private formatAmount(baseUnits: number): string {
    const amount = baseUnits / 1_000_000;
    return `${amount.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })} BOCA`;
  }
}

// Export singleton instance
const onboardingService = new OnboardingService();
export default onboardingService;

// Also export the class for testing
export { OnboardingService };