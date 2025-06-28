/**
 * Users API Routes (v3 - Phase 5C Integration)
 * 
 * API endpoints for user management and reputation with Phase 5B integration
 * Includes social graph, discovery incentives, and community verification
 */

import express, { Request, Response, NextFunction } from 'express';
import { ReputationEngine } from '../../reputation/engine';
import { ApiError } from '../middleware/error-handler';
import { authenticate, requireRoles } from '../middleware/auth';
// Import adapter-specific types
import {
  UserReputationUpdate,
  FollowResult,
  UnfollowResult,
  FollowRelationship,
  PaginationOptions,
  RelationshipResult
} from '../../types/reputation-adapters';

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
      
      // Create or update user reputation with adapter-specific type
      const userReputation = await engine.updateUserReputation(userId, {
        activeSince: new Date().toISOString(),
        // Other fields get default values
      } as UserReputationUpdate);
      
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
      
      // Create updates object with adapter-specific type
      const updates: UserReputationUpdate = {};
      
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
   * Get user's detailed reputation metrics (Phase 5B integration)
   */
  router.get('/:id/reputation', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      
      // Get user reputation
      const userReputation = await engine.getUserReputation(id);
      
      // Return detailed reputation metrics
      res.json({
        userId: userReputation.userId,
        reputationScore: userReputation.reputationScore,
        verificationLevel: userReputation.verificationLevel,
        specializations: userReputation.specializations,
        totalRecommendations: userReputation.totalRecommendations,
        upvotesReceived: userReputation.upvotesReceived,
        downvotesReceived: userReputation.downvotesReceived,
        tokenRewardsEarned: userReputation.tokenRewardsEarned,
        // Phase 5B additions
        reputationHistory: {
          weeklyCalculations: userReputation.weeklyCalculations || [],
          lastCalculated: userReputation.lastCalculated,
          verificationCount: userReputation.verificationCount || 0,
          penaltyCount: userReputation.penaltyCount || 0
        },
        socialMetrics: {
          networkDensity: userReputation.networkDensity || 0,
          avgTrustWeight: userReputation.avgTrustWeight || 0,
          connectionQuality: userReputation.connectionQuality || 'unknown'
        }
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
   * GET /users/:id/social-graph
   * Get user's social graph analytics (NEW - Phase 5B)
   */
  router.get('/:id/social-graph', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const { depth = 2 } = req.query;
      
      // Get social graph data
      const socialGraph = await engine.getSocialGraphAnalytics(id, parseInt(depth as string));
      
      res.json({
        userId: id,
        networkSize: socialGraph.networkSize,
        density: socialGraph.density,
        clusters: socialGraph.clusters,
        influenceScore: socialGraph.influenceScore,
        pathStrengths: socialGraph.pathStrengths,
        geographicDistribution: socialGraph.geographicDistribution,
        interestClusters: socialGraph.interestClusters
      });
    } catch (error) {
      next(error);
    }
  });

  /**
   * POST /users/:id/verify
   * Submit community verification for user (NEW - Phase 5B)
   */
  router.post('/:id/verify', authenticate(), async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw ApiError.unauthorized('Authentication required for verification');
      }

      const { id } = req.params;
      const { evidence, category } = req.body;

      // Prevent self-verification
      if (id === req.user.id) {
        throw ApiError.badRequest('Users cannot verify themselves');
      }

      // Submit verification
      const result = await engine.submitCommunityVerification(req.user.id, id, {
        evidence,
        category,
        timestamp: new Date().toISOString()
      });

      res.json({
        success: true,
        verificationId: result.verificationId,
        status: result.status,
        requiredVerifications: result.requiredVerifications,
        currentVerifications: result.currentVerifications
      });
    } catch (error) {
      next(error);
    }
  });

  /**
   * GET /users/:id/verifications
   * Get user's verification status and history (NEW - Phase 5B)
   */
  router.get('/:id/verifications', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      
      const verifications = await engine.getUserVerifications(id);
      
      res.json({
        userId: id,
        verificationLevel: verifications.currentLevel,
        pendingVerifications: verifications.pending,
        completedVerifications: verifications.completed,
        verificationHistory: verifications.history,
        nextMilestone: verifications.nextMilestone
      });
    } catch (error) {
      next(error);
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
      const relationship: FollowRelationship = await engine.followUser(req.user.id, id);
      
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
      const result: UnfollowResult = await engine.unfollowUser(req.user.id, id);
      
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
      
      // Parse pagination with adapter-specific type
      const pagination: PaginationOptions = {
        offset: offset ? parseInt(offset as string, 10) : 0,
        limit: limit ? parseInt(limit as string, 10) : 20
      };
      
      // Get following
      const result: RelationshipResult = await engine.getFollowing(id, pagination);
      
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
      
      // Parse pagination with adapter-specific type
      const pagination: PaginationOptions = {
        offset: offset ? parseInt(offset as string, 10) : 0,
        limit: limit ? parseInt(limit as string, 10) : 20
      };
      
      // Get followers
      const result: RelationshipResult = await engine.getFollowers(id, pagination);
      
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
        trustScore,
        // Phase 5B additions
        pathAnalysis: {
          directConnection: trustScore > 0.75,
          shortestPath: trustScore > 0.25 ? 1 : 2,
          trustMultiplier: trustScore
        }
      });
    } catch (error) {
      next(error);
    }
  });

  /**
   * GET /users/:id/discovery-score
   * Get user's discovery incentive eligibility (NEW - Phase 5B)
   */
  router.get('/:id/discovery-score', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const { region, category } = req.query;
      
      const discoveryScore = await engine.getDiscoveryIncentiveScore(id, {
        region: region as string,
        category: category as string
      });
      
      res.json({
        userId: id,
        eligibilityScore: discoveryScore.eligibilityScore,
        activeIncentives: discoveryScore.activeIncentives,
        potentialBonus: discoveryScore.potentialBonus,
        regionCoverage: discoveryScore.regionCoverage,
        categoryExpertise: discoveryScore.categoryExpertise,
        recommendations: {
          eligible: discoveryScore.eligibleRecommendations,
          needed: discoveryScore.recommendationsNeeded
        }
      });
    } catch (error) {
      next(error);
    }
  });

  /**
   * POST /users/:id/claim-discovery-bonus
   * Claim discovery incentive bonus (NEW - Phase 5B)
   */
  router.post('/:id/claim-discovery-bonus', authenticate(), async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw ApiError.unauthorized('Authentication required to claim bonus');
      }

      const { id } = req.params;
      
      // Verify ownership
      if (id !== req.user.id) {
        throw ApiError.forbidden('You can only claim your own bonuses');
      }

      const { campaignId, recommendationIds } = req.body;

      const result = await engine.claimDiscoveryBonus(id, {
        campaignId,
        recommendationIds,
        claimedAt: new Date().toISOString()
      });

      res.json({
        success: true,
        bonusAmount: result.bonusAmount,
        campaignId: result.campaignId,
        transactionId: result.transactionId,
        claimedRecommendations: result.claimedRecommendations
      });
    } catch (error) {
      next(error);
    }
  });
  
  return router;
}

export default createUserRoutes;