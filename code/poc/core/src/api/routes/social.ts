import express from 'express';
import { SocialService } from '../../services/social-service';

// FIXED: Remove broken middleware/auth import
// OLD: import { authenticate as createAuth } from '../middleware/auth';
// NEW: Use direct middleware function (server.ts handles auth registration)

const router = express.Router();
const socialService = new SocialService();

// FIXED: Remove authenticate middleware from routes - server.ts handles it
// The authentication is handled at the server level in server.ts

// Get users for discovery
router.get('/users/discover', async (req, res) => {
  try {
    console.log('GET /api/social/users/discover');
    
    // Get current user from request (set by server.ts authenticate middleware)
    const currentUserId = req.user?.id;
    console.log('Fetching discover users for currentUserId:', currentUserId);
    
    const users = await socialService.getDiscoverUsers(currentUserId);
    
    console.log(`Returning ${users.length} users from database for discover`);
    res.json({ success: true, users });
  } catch (error) {
    console.error('Error fetching discover users:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch users'
    });
  }
});

// Get user's followers
router.get('/users/:userId/followers', async (req, res) => {
  try {
    const { userId } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    
    console.log(`Fetching followers for user: ${userId}, page: ${page}`);
    
    const result = await socialService.getFollowers(userId, page, limit);
    
    console.log(`Returning ${result.followers.length} followers`);
    res.json({
      success: true,
      followers: result.followers,
      pagination: result.pagination
    });
  } catch (error) {
    console.error('Error fetching followers:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch followers'
    });
  }
});

// Get users that a user is following
router.get('/users/:userId/following', async (req, res) => {
  try {
    const { userId } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    
    console.log(`Fetching following for user: ${userId}, page: ${page}`);
    
    const result = await socialService.getFollowing(userId, page, limit);
    
    console.log(`Returning ${result.following.length} following`);
    res.json({
      success: true,
      following: result.following,
      pagination: result.pagination
    });
  } catch (error) {
    console.error('Error fetching following:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch following'
    });
  }
});

// Follow a user - FIXED: No authenticate middleware needed (server.ts handles it)
router.post('/users/:userId/follow', async (req, res) => {
  try {
    console.log('🔍 Follow route hit - authentication passed');
    console.log('- User ID from URL:', req.params.userId);
    console.log('- Authenticated user:', req.user);
    console.log('- Request body:', req.body);
    console.log('- Request headers:', req.headers);
    
    const { userId } = req.params;
    const followerId = req.user?.id;
    
    if (!followerId) {
      console.log('No authenticated user found');
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }
    
    console.log('POST /api/social/users/:userId/follow');
    console.log('Follow request:', {
      followerId,
      followeeId: userId
    });
    
    console.log(`Follow operation: ${followerId} → ${userId}`);
    
    const result = await socialService.followUser(followerId, userId);
    
    if (result.success) {
      console.log('Follow operation successful');
      res.json({
        success: true,
        message: 'Successfully followed user',
        relationship: result.relationship
      });
    } else {
      console.log('Follow operation failed:', result.error);
      res.status(400).json({
        success: false,
        error: result.error
      });
    }
  } catch (error) {
    console.error('Error in follow route:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to follow user',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Unfollow a user - FIXED: No authenticate middleware needed
router.delete('/users/:userId/follow', async (req, res) => {
  try {
    const { userId } = req.params;
    const followerId = req.user?.id;
    
    if (!followerId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }
    
    console.log('DELETE /api/social/users/:userId/follow');
    console.log('Unfollow request:', {
      followerId,
      followeeId: userId
    });
    
    const result = await socialService.unfollowUser(followerId, userId);
    
    if (result.success) {
      res.json({
        success: true,
        message: 'Successfully unfollowed user'
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error
      });
    }
  } catch (error) {
    console.error('Error in unfollow route:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to unfollow user',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;