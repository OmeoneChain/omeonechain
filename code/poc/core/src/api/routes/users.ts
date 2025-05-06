/**
 * Users API Routes
 * 
 * API endpoints for user management and reputation
 * Based on Technical Specifications A.4.1
 */

import express, { Request, Response, NextFunction } from 'express';
import { ReputationEngine } from '../../reputation/engine';
import { ApiError } from '../middleware/error-handler';
import { authenticate, requireRoles } from '../middleware/auth';

/**
 * Create user routes
 * 
 * @param engine Reputation engine instance
 * @returns Express router
 */
export function createUserRoutes(engine: ReputationEngine) {
  const router = express.Router();
  
  /**
   * POST /users
   * Create user account
   */
  router.post('/', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { userId, walletAddress, pseudonym } = req.body;
      
      // Validate required fields
      if (!userId || !walletAddress) {
        throw ApiError.badRequest('User ID and wallet address are required');
      }
      
      // Create or update user reputation
      const userReputation = await engine.updateUserReputation(userId, {
        activeSince: new Date().toISOString(),
        // Other fields get default values
      });
      
      // Return created user reputation
      res.status(201).json({
        userId: userReputation.userId,
        reputationScore: userReputation.reputationScore,
        verificationLevel: userReputation.verificationLevel,
        activeSince: userReputation.activeSince,
        followers: userReputation.followers,
        following: userReputation.following
      });
    } catch (error) {
      next(error);
    }
  });
  
  /**
   * GET /users/:id
   * Get user profile
   */
  router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      
      // Get user reputation
      const userReputation = await engine.getUserReputation(id);
      
      // Return user profile
      res.json({
        userId: userReputation.userId,
        reputationScore: userReputation.reputationScore,
        verificationLevel: userReputation.verificationLevel,
        specializations: userReputation.specializations,
        activeSince: userReputation.activeSince,
        totalRecommendations: userReputation.totalRecommendations,
        upvotesReceived: userReputation.upvotesReceived,
        downvotesReceived: userReputation.downvotesReceived,
        followers: userReputation.followers,
        following: userReputation.following
      });
    } catch (error) {
      if ((error as Error).message.includes('not found')) {
        next(ApiError.notFound(`User not found: ${req.params.id}`));
      } else {
        next(error);
      }
    }
  });
  
  /**
   * PUT /users/:id
   * Update user profile
   */
  router.put('/:id', authenticate(), async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Validate user is authenticated
      if (!req.user) {
        throw ApiError.unauthorized('Authentication required to update profile');
      }
      
      const { id } = req.params;
      
      // Verify ownership (users can only update their own profile)
      if (id !== req.user.id) {
        throw ApiError.forbidden('You can only update your own profile');
      }
      
      const { pseudonym, specializations } = req.body;
      
      // Create updates object with only provided fields
      const updates: any = {};
      
      if (specializations !== undefined) updates.specializations = specializations;
      
      // Update user reputation
      const userReputation = await engine.updateUserReputation(id, updates);
      
      // Return updated user profile
      res.json({
        userId: userReputation.userId,
        reputationScore: userReputation.reputationScore,
        verificationLevel: userReputation.verificationLevel,
        specializations: userReputation.specializations,
        activeSince: userReputation.activeSince,
        totalRecommendations: userReputation.totalRecommendations,
        upvotesReceived: userReputation.upvotesReceived,
        downvotesReceived: userReputation.downvotesReceived,
        followers: userReputation.followers,
        following: userReputation.following
      });
    } catch (error) {
      next(error);
    }
  });
  
  /**
   * GET /users/:id/recommendations
   * Get user's recommendations
   */
  router.get('/:id/recommendations', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const { offset, limit } = req.query;
      
      // Forward request to recommendations endpoint
      // This assumes that the recommendations API is accessible
      const response = await fetch(`/api/v1/recommendations?author=${id}&offset=${offset || 0}&limit=${limit || 20}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch recommendations: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      // Return recommendations
      res.json(data);
    } catch (error) {
      next(error);
    }
  });
  
  /**
   * GET /users/:id/reputation
   * Get user's reputation details
   */
  router.get('/:id/reputation', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      
      // Get user reputation
      const userReputation = await engine.getUserReputation(id);
      
      // Return reputation details
      res.json({
        userId: userReputation.userId,
        reputationScore: userReputation.reputationScore,
        verificationLevel: userReputation.verificationLevel,
        specializations: userReputation.specializations,
        totalRecommendations: userReputation.totalRecommendations,
        upvotesReceived: userReputation.upvotesReceived,
        downvotesReceived: userReputation.downvotesReceived,
        tokenRewardsEarned: userReputation.tokenRewardsEarned
      });
    } catch (error) {
      if ((error as Error).message.includes('not found')) {
        next(ApiError.notFound(`User not found: ${req.params.id}`));
      } else {
        next(error);
      }
    }
  });
  
  /**
   * POST /users/:id/follow
   * Follow a user
   */
  router.post('/:id/follow', authenticate(), async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Validate user is authenticated
      if (!req.user) {
        throw ApiError.unauthorized('Authentication required to follow users');
      }
      
      const { id } = req.params;
      
      // Prevent self-following
      if (id === req.user.id) {
        throw ApiError.badRequest('You cannot follow yourself');
      }
      
      // Follow user
      const relationship = await engine.followUser(req.user.id, id);
      
      // Return result
      res.json({
        followerId: relationship.followerId,
        followedId: relationship.followedId,
        timestamp: relationship.timestamp,
        distance: relationship.distance,
        trustWeight: relationship.trustWeight
      });
    } catch (error) {
      next(error);
    }
  });
  
  /**
   * POST /users/:id/unfollow
   * Unfollow a user
   */
  router.post('/:id/unfollow', authenticate(), async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Validate user is authenticated
      if (!req.user) {
        throw ApiError.unauthorized('Authentication required to unfollow users');
      }
      
      const { id } = req.params;
      
      // Unfollow user
      const result = await engine.unfollowUser(req.user.id, id);
      
      // Return result
      res.json({
        success: result.success,
        message: 'User unfollowed successfully'
      });
    } catch (error) {
      next(error);
    }
  });
  
  /**
   * GET /users/:id/following
   * Get users that this user is following
   */
  router.get('/:id/following', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const { offset, limit } = req.query;
      
      // Parse pagination
      const pagination = {
        offset: offset ? parseInt(offset as string, 10) : 0,
        limit: limit ? parseInt(limit as string, 10) : 20
      };
      
      // Get following
      const result = await engine.getFollowing(id, pagination);
      
      // Return following
      res.json({
        relationships: result.relationships,
        total: result.total,
        pagination: result.pagination
      });
    } catch (error) {
      next(error);
    }
  });
  
  /**
   * GET /users/:id/followers
   * Get users following this user
   */
  router.get('/:id/followers', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const { offset, limit } = req.query;
      
      // Parse pagination
      const pagination = {
        offset: offset ? parseInt(offset as string, 10) : 0,
        limit: limit ? parseInt(limit as string, 10) : 20
      };
      
      // Get followers
      const result = await engine.getFollowers(id, pagination);
      
      // Return followers
      res.json({
        relationships: result.relationships,
        total: result.total,
        pagination: result.pagination
      });
    } catch (error) {
      next(error);
    }
  });
  
  /**
   * GET /users/:id/trust/:targetId
   * Calculate trust score between users
   */
  router.get('/:id/trust/:targetId', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id, targetId } = req.params;
      const { maxDepth } = req.query;
      
      // Calculate trust score
      const trustScore = await engine.calculateTrustScore(
        id,
        targetId,
        maxDepth ? parseInt(maxDepth as string, 10) : 2
      );
      
      // Return trust score
      res.json({
        sourceId: id,
        targetId,
        trustScore
      });
    } catch (error) {
      next(error);
    }
  });
  
  return router;
}

export default createUserRoutes;
