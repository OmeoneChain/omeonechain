import express from 'express';
import { SocialService } from '../../services/social-service';
import { authenticate } from '../middleware/auth';

const router = express.Router();
const socialService = new SocialService();

// ========================================
// DISCOVER USERS
// ========================================

router.get('/users', async (req, res) => {
  console.log('GET /api/social/users');
  
  try {
    const currentUser = req.user;
    const users = await socialService.getDiscoverUsers(currentUser?.id);
    
    console.log(`Returning ${users.length} users from database`);
    
    res.json({
      success: true,
      data: {
        users: users,
        total_count: users.length,
        source: 'database'
      }
    });
    
  } catch (error) {
    console.error('Error in GET /api/social/users:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch users from database',
      error: error.message
    });
  }
});

// ========================================
// DISCOVER USERS - Frontend expects this specific path
// ========================================
router.get('/users/discover', async (req, res) => {
  console.log('GET /api/social/users/discover');
  
  try {
    const currentUser = req.user;
    const limit = parseInt(req.query.limit as string) || 20;
    
    const users = await socialService.getDiscoverUsers(currentUser?.id);
    
    console.log(`Returning ${users.length} users from database for discover`);
    
    res.json({
      success: true,
      users: users.slice(0, limit), // Limit results as requested by frontend
      total_count: users.length,
      message: `Found ${users.length} users in database`,
      source: 'database'
    });
    
  } catch (error) {
    console.error('Error in GET /api/social/users/discover:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch users from database',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// ========================================
// FOLLOW OPERATIONS
// ========================================

router.post('/users/:userId/follow', authenticate, async (req, res) => {
  console.log('🔍 Follow route hit - authentication passed');
  console.log('- User ID from URL:', req.params.userId);
  console.log('- Authenticated user:', req.user);
  console.log('- Request body:', req.body);
  console.log('- Request headers:', req.headers);
  console.log('POST /api/social/users/:userId/follow');
  
  try {
    const followeeId = req.params.userId;
    const currentUser = req.user;
    
    console.log('Follow request:', {
      followerId: currentUser?.id,
      followeeId: followeeId
    });

    if (!currentUser?.id) {
      console.log('No authenticated user found');
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    if (currentUser.id === followeeId) {
      console.log('User trying to follow themselves');
      return res.status(400).json({
        success: false,
        message: 'Cannot follow yourself'
      });
    }

    const result = await socialService.followUser(currentUser.id, followeeId);
    
    if (result.success) {
      console.log('Follow operation successful');
      res.json({
        success: true,
        message: result.message,
        data: {
          follower_id: currentUser.id,
          following_id: followeeId,
          timestamp: new Date().toISOString()
        }
      });
    } else {
      console.log(`Follow operation failed: ${result.message}`);
      res.status(400).json({
        success: false,
        message: result.message
      });
    }

  } catch (error) {
    console.error('Unexpected error in follow route:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during follow operation',
      error: error.message
    });
  }
});

router.delete('/users/:userId/follow', async (req, res) => {
  console.log('DELETE /api/social/users/:userId/follow');
  
  try {
    const followeeId = req.params.userId;
    const currentUser = req.user;
    
    console.log('Unfollow request:', {
      followerId: currentUser?.id,
      followeeId: followeeId
    });

    if (!currentUser?.id) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    const result = await socialService.unfollowUser(currentUser.id, followeeId);
    
    if (result.success) {
      console.log('Unfollow operation successful');
      res.json({
        success: true,
        message: result.message,
        data: {
          follower_id: currentUser.id,
          following_id: followeeId,
          timestamp: new Date().toISOString()
        }
      });
    } else {
      console.log(`Unfollow operation failed: ${result.message}`);
      res.status(400).json({
        success: false,
        message: result.message
      });
    }

  } catch (error) {
    console.error('Unexpected error in unfollow route:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during unfollow operation',
      error: error.message
    });
  }
});

// ========================================
// FOLLOW STATUS CHECK
// ========================================

router.get('/users/:userId/follow-status', async (req, res) => {
  console.log('GET /api/social/users/:userId/follow-status');
  
  try {
    const followeeId = req.params.userId;
    const currentUser = req.user;
    
    if (!currentUser?.id) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    const isFollowing = await socialService.isFollowing(currentUser.id, followeeId);
    const userStats = await socialService.getUserStats(followeeId);
    
    console.log(`Follow status check: ${currentUser.id} → ${followeeId} = ${isFollowing}`);
    
    res.json({
      success: true,
      data: {
        is_following: isFollowing,
        user_stats: userStats,
        checked_at: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Error checking follow status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check follow status',
      error: error.message
    });
  }
});

// ========================================
// USER PROFILES AND STATS
// ========================================

router.get('/users/:userId/profile', async (req, res) => {
  try {
    const userId = req.params.userId;
    const currentUser = req.user;
    
    console.log(`Fetching profile for user: ${userId}`);

    const profile = await socialService.getUserProfile(userId, currentUser?.id);
    
    if (!profile) {
      console.log('User not found');
      return res.status(404).json({ 
        success: false,
        message: 'User not found' 
      });
    }

    console.log('Profile retrieved successfully');
    res.json(profile);

  } catch (error) {
    console.error('Error fetching user profile:', error);
    res.status(500).json({ 
      success: false,
      message: 'Internal server error',
      error: error.message 
    });
  }
});

router.get('/users/:userId/stats', async (req, res) => {
  console.log('GET /api/social/users/:userId/stats');
  
  try {
    const userId = req.params.userId;
    const stats = await socialService.getUserStats(userId);
    
    console.log(`Retrieved stats for user ${userId}`);
    
    res.json({
      success: true,
      data: stats
    });

  } catch (error) {
    console.error('Error fetching user stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user stats',
      error: error.message
    });
  }
});

// ========================================
// FOLLOWERS AND FOLLOWING
// ========================================

router.get('/users/:userId/followers', async (req, res) => {
  try {
    const userId = req.params.userId;
    const page = parseInt(req.query.page as string) || 1;
    const perPage = parseInt(req.query.per_page as string) || 20;
    
    console.log(`Fetching followers for user: ${userId}, page: ${page}`);

    const result = await socialService.getFollowers(userId, page, perPage);

    console.log(`Returning ${result.followers.length} followers`);
    res.json(result);

  } catch (error) {
    console.error('Error getting followers:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

router.get('/users/:userId/following', async (req, res) => {
  try {
    const userId = req.params.userId;
    const page = parseInt(req.query.page as string) || 1;
    const perPage = parseInt(req.query.per_page as string) || 20;
    
    console.log(`Fetching following for user: ${userId}, page: ${page}`);

    const result = await socialService.getFollowing(userId, page, perPage);

    console.log(`Returning ${result.following.length} following`);
    res.json(result);

  } catch (error) {
    console.error('Error getting following:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// ========================================
// SIMPLE DEBUG (Minimal)
// ========================================

router.get('/debug/info', async (req, res) => {
  try {
    const debugInfo = await socialService.getDebugInfo();
    
    res.json({
      success: true,
      message: 'Debug info retrieved',
      data: debugInfo
    });
    
  } catch (error) {
    console.error('Error in debug info:', error);
    res.status(500).json({
      success: false,
      message: 'Debug info failed',
      error: error.message
    });
  }
});

// ========================================
// HEALTH CHECK
// ========================================

router.get('/health', async (req, res) => {
  try {
    const debugInfo = await socialService.getDebugInfo();
    const userCount = debugInfo.realDatabaseUsers?.count || 0;
    
    res.json({
      status: 'healthy',
      service: 'social-service',
      database_users: userCount,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    res.status(500).json({
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

export default router;