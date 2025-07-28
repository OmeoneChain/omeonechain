// API routes for social functionality

import { Router } from 'express';
import { socialService } from '../services/social-service';
import { authMiddleware } from '../middleware/auth';
import { validateRequest } from '../middleware/validation';
import { z } from 'zod';

const router = Router();

// Validation schemas
const followSchema = z.object({
  following_id: z.string().uuid('Invalid user ID')
});

const paginationSchema = z.object({
  page: z.string().optional().transform(val => val ? parseInt(val) : 1),
  per_page: z.string().optional().transform(val => val ? Math.min(parseInt(val) || 20, 100) : 20)
});

const userSearchSchema = z.object({
  query: z.string().optional(),
  min_reputation: z.string().optional().transform(val => val ? parseFloat(val) : undefined),
  has_recommendations: z.string().optional().transform(val => val === 'true'),
  location: z.string().optional(),
  verification_status: z.enum(['verified', 'expert', 'basic']).optional(),
  sort_by: z.enum(['reputation', 'followers', 'recent_activity', 'recommendations']).optional(),
  sort_order: z.enum(['asc', 'desc']).optional(),
  page: z.string().optional().transform(val => val ? parseInt(val) : 1),
  per_page: z.string().optional().transform(val => val ? Math.min(parseInt(val) || 20, 100) : 20)
});

// Follow a user
router.post('/follow', 
  authMiddleware,
  validateRequest(followSchema),
  async (req, res) => {
    try {
      const { following_id } = req.body;
      const follower_id = req.user.id;

      const result = await socialService.followUser(follower_id, following_id);

      if (result.success) {
        // Get updated stats
        const [followerStats, followingStats] = await Promise.all([
          socialService.getSocialStats(follower_id),
          socialService.getSocialStats(following_id)
        ]);

        res.json({
          success: true,
          message: result.message,
          following: true,
          follower_stats: followerStats,
          following_stats: followingStats
        });
      } else {
        res.status(400).json({
          success: false,
          message: result.message
        });
      }
    } catch (error) {
      console.error('Follow user error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }
);

// Unfollow a user
router.delete('/follow/:following_id',
  authMiddleware,
  async (req, res) => {
    try {
      const { following_id } = req.params;
      const follower_id = req.user.id;

      // Validate UUID
      if (!following_id.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid user ID format'
        });
      }

      const result = await socialService.unfollowUser(follower_id, following_id);

      if (result.success) {
        // Get updated stats
        const [followerStats, followingStats] = await Promise.all([
          socialService.getSocialStats(follower_id),
          socialService.getSocialStats(following_id)
        ]);

        res.json({
          success: true,
          message: result.message,
          following: false,
          follower_stats: followerStats,
          following_stats: followingStats
        });
      } else {
        res.status(400).json({
          success: false,
          message: result.message
        });
      }
    } catch (error) {
      console.error('Unfollow user error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }
);

// Check if following a user
router.get('/follow/status/:user_id',
  authMiddleware,
  async (req, res) => {
    try {
      const { user_id } = req.params;
      const current_user_id = req.user.id;

      const [isFollowing, isFollowedBy] = await Promise.all([
        socialService.isFollowing(current_user_id, user_id),
        socialService.isFollowing(user_id, current_user_id)
      ]);

      res.json({
        is_following: isFollowing,
        is_followed_by: isFollowedBy,
        relationship_type: isFollowing && isFollowedBy ? 'mutual' : 
                         isFollowing ? 'following' : 
                         isFollowedBy ? 'follower' : 'none'
      });
    } catch (error) {
      console.error('Check follow status error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }
);

// Get user's followers
router.get('/users/:user_id/followers',
  validateRequest(paginationSchema, 'query'),
  async (req, res) => {
    try {
      const { user_id } = req.params;
      const { page, per_page } = req.query;

      const followers = await socialService.getFollowers(user_id, page, per_page);

      res.json(followers);
    } catch (error) {
      console.error('Get followers error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }
);

// Get users that this user follows
router.get('/users/:user_id/following',
  validateRequest(paginationSchema, 'query'),
  async (req, res) => {
    try {
      const { user_id } = req.params;
      const { page, per_page } = req.query;

      const following = await socialService.getFollowing(user_id, page, per_page);

      res.json(following);
    } catch (error) {
      console.error('Get following error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }
);

// Get mutual follows between two users
router.get('/users/:user_id/mutual/:other_user_id',
  authMiddleware,
  async (req, res) => {
    try {
      const { user_id, other_user_id } = req.params;

      const mutualFollows = await socialService.getMutualFollows(user_id, other_user_id);

      res.json({
        mutual_follows: mutualFollows,
        count: mutualFollows.length
      });
    } catch (error) {
      console.error('Get mutual follows error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }
);

// Get social stats for a user
router.get('/users/:user_id/stats',
  async (req, res) => {
    try {
      const { user_id } = req.params;

      const stats = await socialService.getSocialStats(user_id);

      res.json(stats);
    } catch (error) {
      console.error('Get social stats error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }
);

// Search users
router.get('/users/search',
  validateRequest(userSearchSchema, 'query'),
  async (req, res) => {
    try {
      const { page, per_page, ...filters } = req.query;

      const results = await socialService.searchUsers(filters, page, per_page);

      res.json(results);
    } catch (error) {
      console.error('Search users error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }
);

// Get follow suggestions for current user
router.get('/suggestions',
  authMiddleware,
  async (req, res) => {
    try {
      const userId = req.user.id;
      const limit = parseInt(req.query.limit as string) || 10;

      const suggestions = await socialService.getFollowSuggestions(userId, Math.min(limit, 50));

      res.json(suggestions);
    } catch (error) {
      console.error('Get follow suggestions error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }
);

// Refresh social stats (admin only or scheduled job)
router.post('/admin/refresh-stats',
  authMiddleware,
  async (req, res) => {
    try {
      // TODO: Add admin role check
      await socialService.refreshSocialStats();

      res.json({
        success: true,
        message: 'Social stats refreshed successfully'
      });
    } catch (error) {
      console.error('Refresh social stats error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }
);

export default router;