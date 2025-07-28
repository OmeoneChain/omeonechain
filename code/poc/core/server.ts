// File: code/poc/core/src/server.ts
import express from 'express';
import cors from 'cors';
import { z } from 'zod'; // Real zod import instead of mock

const app = express();
const PORT = process.env.PORT || 3001;

// Extend Express Request type for req.user
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        address?: string;
      };
    }
  }
}

// Middleware
app.use(cors());
app.use(express.json());

// Mock auth middleware
const authMiddleware = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  // Mock user for testing
  req.user = { id: 'mock-user-id' };
  next();
};

// Mock validation middleware
const validateRequest = (schema: any, type: string = 'body') => {
  return (req: express.Request, res: express.Response, next: express.NextFunction) => {
    // Skip validation for now
    next();
  };
};

// Mock social service
const socialService = {
  getFollowers: async (userId: string, page: number, perPage: number) => {
    console.log(`socialService.getFollowers called: userId=${userId}, page=${page}, perPage=${perPage}`);
    
    const mockFollowers = [
      {
        id: '1',
        user: {
          id: '1',
          username: 'alice_foodie',
          display_name: 'Alice Chen',
          avatar_url: null,
          followers_count: 245,
          recommendations_count: 89,
          avg_trust_score: 0.85,
          verification_status: 'verified',
          is_following: false
        }
      },
      {
        id: '2',
        user: {
          id: '2',
          username: 'bob_explorer',
          display_name: 'Bob Martinez',
          avatar_url: null,
          followers_count: 156,
          recommendations_count: 34,
          avg_trust_score: 0.72,
          verification_status: 'basic',
          is_following: true
        }
      },
      {
        id: '3',
        user: {
          id: '3',
          username: 'chef_sarah',
          display_name: 'Sarah Thompson',
          avatar_url: null,
          followers_count: 892,
          recommendations_count: 156,
          avg_trust_score: 0.94,
          verification_status: 'expert',
          is_following: false
        }
      }
    ];

    return {
      followers: mockFollowers,
      total: mockFollowers.length,
      page: page,
      per_page: perPage,
      has_more: false
    };
  },

  getSocialStats: async (userId: string) => {
    console.log(`socialService.getSocialStats called: userId=${userId}`);
    
    return {
      id: userId,
      username: `user_${userId.slice(0, 8)}`,
      display_name: 'Test User',
      avatar_url: null,
      followers_count: 3,
      following_count: 5,
      recommendations_count: 12,
      avg_trust_score: 0.75,
      verification_status: 'basic'
    };
  },

  followUser: async (followerId: string, followingId: string) => {
    console.log(`socialService.followUser called: ${followerId} -> ${followingId}`);
    return { success: true, message: 'Successfully followed user' };
  },

  unfollowUser: async (followerId: string, followingId: string) => {
    console.log(`socialService.unfollowUser called: ${followerId} -> ${followingId}`);
    return { success: true, message: 'Successfully unfollowed user' };
  }
};

// Routes (simplified version of your social.ts routes)
const router = express.Router();

// Real Zod validation schemas (fixed!)
const paginationSchema = z.object({
  page: z.string().optional().transform((val) => val ? parseInt(val) : 1),
  per_page: z.string().optional().transform((val) => val ? Math.min(parseInt(val) || 20, 100) : 20)
});

// Get user's followers
router.get('/users/:user_id/followers', async (req, res) => {
  try {
    const { user_id } = req.params;
    
    // Parse query parameters with proper validation
    const queryValidation = paginationSchema.safeParse(req.query);
    if (!queryValidation.success) {
      return res.status(400).json({
        success: false,
        message: 'Invalid pagination parameters',
        errors: queryValidation.error.errors
      });
    }
    
    const { page, per_page } = queryValidation.data;

    console.log(`GET /api/social/users/${user_id}/followers - page: ${page}, per_page: ${per_page}`);

    const followers = await socialService.getFollowers(user_id, page, per_page);
    res.json(followers);
  } catch (error) {
    console.error('Get followers error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Get social stats for a user
router.get('/users/:user_id/stats', async (req, res) => {
  try {
    const { user_id } = req.params;
    console.log(`GET /api/social/users/${user_id}/stats`);

    const stats = await socialService.getSocialStats(user_id);
    res.json(stats);
  } catch (error) {
    console.error('Get social stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Follow a user
router.post('/follow', authMiddleware, async (req, res) => {
  try {
    const { following_id } = req.body;
    const follower_id = req.user!.id; // Using ! since we know authMiddleware sets it

    console.log(`POST /api/social/follow - ${follower_id} -> ${following_id}`);

    const result = await socialService.followUser(follower_id, following_id);

    if (result.success) {
      res.json({
        success: true,
        message: result.message,
        following: true
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
});

// Unfollow a user
router.delete('/follow/:following_id', authMiddleware, async (req, res) => {
  try {
    const { following_id } = req.params;
    const follower_id = req.user!.id; // Using ! since we know authMiddleware sets it

    console.log(`DELETE /api/social/follow/${following_id} - follower: ${follower_id}`);

    const result = await socialService.unfollowUser(follower_id, following_id);

    if (result.success) {
      res.json({
        success: true,
        message: result.message,
        following: false
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
});

// Mount the router
app.use('/api/social', router);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'OmeoneChain Core Express server is running',
    timestamp: new Date().toISOString()
  });
});

// Root route
app.get('/', (req, res) => {
  res.json({ 
    message: 'OmeoneChain Core API Server',
    version: '0.1.0',
    endpoints: [
      'GET /api/health',
      'GET /api/social/users/:user_id/followers',
      'GET /api/social/users/:user_id/stats',
      'POST /api/social/follow',
      'DELETE /api/social/follow/:following_id'
    ]
  });
});

// Error handling
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ 
    success: false, 
    message: 'Internal server error' 
  });
});

// 404 handler
app.use((req: express.Request, res: express.Response) => {
  res.status(404).json({ 
    success: false, 
    message: `Route ${req.method} ${req.path} not found` 
  });
});

// Start server
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`🚀 OmeoneChain Core server running on http://localhost:${PORT}`);
    console.log(`📡 Health check: http://localhost:${PORT}/api/health`);
    console.log(`📊 API endpoints available at http://localhost:${PORT}/api/social/`);
  });
}

export default app;