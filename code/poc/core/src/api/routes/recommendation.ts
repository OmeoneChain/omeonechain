/**
 * Recommendations API Routes
 * 
 * API endpoints for recommendations management
 * Based on Technical Specifications A.4.1
 */

import express, { Request, Response, NextFunction } from 'express';
import { RecommendationEngine } from '../../recommendation/engine';
import { ApiError } from '../middleware/error-handler';
import { authenticate, requireRoles } from '../middleware/auth';

/**
 * Create recommendation routes
 * 
 * @param engine Recommendation engine instance
 * @returns Express router
 */
export function createRecommendationRoutes(engine: RecommendationEngine) {
  const router = express.Router();
  
  /**
   * GET /recommendations
   * List recommendations with filtering
   */
  router.get('/', async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Parse query parameters
      const {
        author,
        category,
        serviceId,
        tags,
        minRating,
        nearLat,
        nearLng,
        nearRadius,
        offset,
        limit,
        sort,
        direction
      } = req.query;
      
      // Create filter
      const filter: any = {};
      
      if (author) filter.author = author as string;
      if (category) filter.category = category as string;
      if (serviceId) filter.serviceId = serviceId as string;
      if (tags) filter.tags = (tags as string).split(',');
      if (minRating) filter.minRating = parseInt(minRating as string, 10);
      
      // Add location filter if provided
      if (nearLat && nearLng) {
        filter.nearLocation = {
          latitude: parseFloat(nearLat as string),
          longitude: parseFloat(nearLng as string),
          radiusKm: nearRadius ? parseFloat(nearRadius as string) : 5 // Default 5km radius
        };
      }
      
      // Add pagination
      const pagination = {
        offset: offset ? parseInt(offset as string, 10) : 0,
        limit: limit ? parseInt(limit as string, 10) : 20
      };
      
      // Add sorting
      const sortOption = sort ? {
        field: sort as string,
        direction: direction === 'desc' ? 'desc' : 'asc'
      } : undefined;
      
      // Get recommendations
      const result = await engine.getRecommendations({
        ...filter,
        sort: sortOption,
        pagination
      });
      
      // Return results
      res.json({
        recommendations: result.recommendations,
        total: result.total,
        pagination: result.pagination
      });
    } catch (error) {
      next(error);
    }
  });
  
  /**
   * GET /recommendations/:id
   * Get a single recommendation
   */
  router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      
      // Get recommendation
      const recommendation = await engine.getRecommendationById(id);
      
      // Return recommendation
      res.json(recommendation);
    } catch (error) {
      if ((error as Error).message.includes('not found')) {
        next(ApiError.notFound(`Recommendation not found: ${req.params.id}`));
      } else {
        next(error);
      }
    }
  });
  
  /**
   * POST /recommendations
   * Create a new recommendation
   */
  router.post('/', authenticate(), async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Validate user is authenticated
      if (!req.user) {
        throw ApiError.unauthorized('Authentication required to create recommendations');
      }
      
      const {
        serviceId,
        category,
        location,
        rating,
        content,
        tags
      } = req.body;
      
      // Validate required fields
      if (!serviceId) {
        throw ApiError.badRequest('Service ID is required');
      }
      
      if (!category) {
        throw ApiError.badRequest('Category is required');
      }
      
      if (!location || !location.latitude || !location.longitude) {
        throw ApiError.badRequest('Location is required with latitude and longitude');
      }
      
      if (!rating || rating < 1 || rating > 5) {
        throw ApiError.badRequest('Rating is required and must be between 1-5');
      }
      
      if (!content || !content.title || !content.body) {
        throw ApiError.badRequest('Content is required with title and body');
      }
      
      // Create recommendation
      const recommendation = await engine.submitRecommendation(
        req.user.id,
        {
          serviceId,
          category,
          location,
          rating,
          content,
          tags: tags || []
        }
      );
      
      // Return created recommendation
      res.status(201).json(recommendation);
    } catch (error) {
      next(error);
    }
  });
  
  /**
   * PUT /recommendations/:id
   * Update a recommendation (author only)
   */
  router.put('/:id', authenticate(), async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Validate user is authenticated
      if (!req.user) {
        throw ApiError.unauthorized('Authentication required to update recommendations');
      }
      
      const { id } = req.params;
      const {
        serviceId,
        category,
        location,
        rating,
        content,
        tags
      } = req.body;
      
      // Get existing recommendation to check ownership
      try {
        const existing = await engine.getRecommendationById(id);
        
        // Verify ownership
        if (existing.author !== req.user.id) {
          throw ApiError.forbidden('You can only update your own recommendations');
        }
      } catch (error) {
        if ((error as Error).message.includes('not found')) {
          throw ApiError.notFound(`Recommendation not found: ${id}`);
        }
        throw error;
      }
      
      // Create updates object with only provided fields
      const updates: any = {};
      
      if (serviceId !== undefined) updates.serviceId = serviceId;
      if (category !== undefined) updates.category = category;
      if (location !== undefined) updates.location = location;
      if (rating !== undefined) updates.rating = rating;
      if (content !== undefined) updates.content = content;
      if (tags !== undefined) updates.tags = tags;
      
      // Update recommendation
      const updatedRecommendation = await engine.updateRecommendation(
        req.user.id,
        id,
        updates
      );
      
      // Return updated recommendation
      res.json(updatedRecommendation);
    } catch (error) {
      next(error);
    }
  });
  
  /**
   * DELETE /recommendations/:id
   * Mark recommendation as deleted (author only)
   */
  router.delete('/:id', authenticate(), async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Validate user is authenticated
      if (!req.user) {
        throw ApiError.unauthorized('Authentication required to delete recommendations');
      }
      
      const { id } = req.params;
      
      // Get existing recommendation to check ownership
      try {
        const existing = await engine.getRecommendationById(id);
        
        // Verify ownership
        if (existing.author !== req.user.id) {
          throw ApiError.forbidden('You can only delete your own recommendations');
        }
      } catch (error) {
        if ((error as Error).message.includes('not found')) {
          throw ApiError.notFound(`Recommendation not found: ${id}`);
        }
        throw error;
      }
      
      // Delete recommendation
      const result = await engine.deleteRecommendation(req.user.id, id);
      
      // Return result
      res.json({
        success: result.success,
        message: 'Recommendation deleted successfully'
      });
    } catch (error) {
      next(error);
    }
  });
  
  /**
   * POST /recommendations/:id/upvote
   * Upvote a recommendation
   */
  router.post('/:id/upvote', authenticate(), async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Validate user is authenticated
      if (!req.user) {
        throw ApiError.unauthorized('Authentication required to upvote recommendations');
      }
      
      const { id } = req.params;
      
      // Upvote recommendation
      const result = await engine.voteOnRecommendation(
        req.user.id,
        id,
        true // isUpvote
      );
      
      // Return result
      res.json({
        success: result.success,
        action: result.action,
        message: 'Recommendation upvoted successfully'
      });
    } catch (error) {
      next(error);
    }
  });
  
  /**
   * POST /recommendations/:id/downvote
   * Downvote a recommendation
   */
  router.post('/:id/downvote', authenticate(), async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Validate user is authenticated
      if (!req.user) {
        throw ApiError.unauthorized('Authentication required to downvote recommendations');
      }
      
      const { id } = req.params;
      
      // Downvote recommendation
      const result = await engine.voteOnRecommendation(
        req.user.id,
        id,
        false // isUpvote
      );
      
      // Return result
      res.json({
        success: result.success,
        action: result.action,
        message: 'Recommendation downvoted successfully'
      });
    } catch (error) {
      next(error);
    }
  });
  
  /**
   * GET /recommendations/search
   * Search recommendations
   */
  router.get('/search', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { query, category, minRating, offset, limit } = req.query;
      
      if (!query) {
        throw ApiError.badRequest('Search query is required');
      }
      
      // Create filter
      const filter: any = {};
      
      if (category) filter.category = category as string;
      if (minRating) filter.minRating = parseInt(minRating as string, 10);
      
      // Add pagination
      const pagination = {
        offset: offset ? parseInt(offset as string, 10) : 0,
        limit: limit ? parseInt(limit as string, 10) : 20
      };
      
      // Search recommendations
      const result = await engine.searchRecommendations(
        query as string,
        filter,
        pagination
      );
      
      // Return results
      res.json({
        recommendations: result.recommendations,
        total: result.total,
        pagination: result.pagination
      });
    } catch (error) {
      next(error);
    }
  });
  
  /**
   * GET /recommendations/service/:serviceId
   * Get recommendations for a service
   */
  router.get('/service/:serviceId', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { serviceId } = req.params;
      const { offset, limit } = req.query;
      
      // Create filter
      const filter: any = {
        serviceId
      };
      
      // Add pagination
      const pagination = {
        offset: offset ? parseInt(offset as string, 10) : 0,
        limit: limit ? parseInt(limit as string, 10) : 20
      };
      
      // Get recommendations
      const result = await engine.getRecommendations({
        ...filter,
        pagination
      });
      
      // Return results
      res.json({
        recommendations: result.recommendations,
        total: result.total,
        pagination: result.pagination
      });
    } catch (error) {
      next(error);
    }
  });
  
  return router;
}

export default createRecommendationRoutes;
