// File: code/poc/core/src/server.ts
import express from 'express';
import cors from 'cors';
import { z } from 'zod';

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

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Mock auth middleware
const authMiddleware = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  // Mock user for testing
  req.user = { id: 'mock-user-id' };
  next();
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

// Routes
const router = express.Router();

// Real Zod validation schemas
const paginationSchema = z.object({
  page: z.string().optional().transform((val) => val ? parseInt(val) : 1),
  per_page: z.string().optional().transform((val) => val ? Math.min(parseInt(val) || 20, 100) : 20)
});

// Get user's followers - FIXED: Removed return statements
router.get('/users/:user_id/followers', async (req: express.Request, res: express.Response): Promise<void> => {
  try {
    const { user_id } = req.params;
    
    // Use proper zod validation
    const queryValidation = paginationSchema.safeParse(req.query);
    if (!queryValidation.success) {
      res.status(400).json({
        success: false,
        message: 'Invalid pagination parameters',
        errors: queryValidation.error.errors
      });
      return; // Early return without returning res.json()
    }
    
    const { page, per_page } = queryValidation.data;

    console.log(`GET /api/social/users/${user_id}/followers - page: ${page}, per_page: ${per_page}`);

    const followers = await socialService.getFollowers(user_id, page, per_page);
    res.json(followers); // Don't return this!
  } catch (error) {
    console.error('Get followers error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Get social stats for a user - FIXED: Added Promise<void> return type
router.get('/users/:user_id/stats', async (req: express.Request, res: express.Response): Promise<void> => {
  try {
    const { user_id } = req.params;
    console.log(`GET /api/social/users/${user_id}/stats`);

    const stats = await socialService.getSocialStats(user_id);
    res.json(stats); // Don't return this!
  } catch (error) {
    console.error('Get social stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Follow a user - FIXED: Added Promise<void> return type  
router.post('/follow', authMiddleware, async (req: express.Request, res: express.Response): Promise<void> => {
  try {
    const { following_id } = req.body;
    const follower_id = req.user!.id;

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

// Unfollow a user - FIXED: Added Promise<void> return type
router.delete('/follow/:following_id', authMiddleware, async (req: express.Request, res: express.Response): Promise<void> => {
  try {
    const { following_id } = req.params;
    const follower_id = req.user!.id;

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
app.get('/api/health', (req: express.Request, res: express.Response) => {
  res.json({ 
    status: 'OK', 
    message: 'OmeoneChain Core Express server is running',
    timestamp: new Date().toISOString()
  });
});

// Root route
app.get('/', (req: express.Request, res: express.Response) => {
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