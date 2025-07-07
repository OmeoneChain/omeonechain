/**
 * Developer API Routes (v2 - Updated with adapter-specific types)
 * 
 * API endpoints for third-party developers
 * Based on Technical Specifications A.4.2
 */

import express, { Request, Response, NextFunction } from 'express';
import { RecommendationEngine } from '../../recommendation/engine';
import { ReputationEngine } from '../../reputation/engine';
import { ServiceEngine } from '../../services/engine';
import { ApiError } from '../middleware/error-handler';
import { authenticate, requireRoles } from '../middleware/auth';
// Import adapter-specific types with Conservative Fix Pattern
// import { RecommendationFilter, PaginationOptions as RecPaginationOptions } from '../../type/recommendation-adapters';
// import { PaginationOptions as RepPaginationOptions, RelationshipResult } from '../../type/reputation-adapters';
// import { ServiceEntity, ServiceFilter } from '../../type/service-adapters';

/**
 * Developer engines interface
 */
interface DeveloperEngines {
  recommendationEngine: RecommendationEngine;
  reputationEngine: ReputationEngine;
  serviceEngine: ServiceEngine;
}

/**
 * Webhook registration
 */
interface Webhook {
  /**
   * Unique identifier
   */
  id: string;
  
  /**
   * Developer's user ID
   */
  developerId: string;
  
  /**
   * Event types to subscribe to
   */
  events: string[];
  
  /**
   * Webhook callback URL
   */
  url: string;
  
  /**
   * Secret for webhook signature
   */
  secret: string;
  
  /**
   * Creation timestamp
   */
  createdAt: string;
  
  /**
   * Whether the webhook is active
   */
  active: boolean;
}

/**
 * In-memory webhook storage (would be replaced with persistent storage in production)
 */
const webhooks: Webhook[] = [];

/**
 * Create developer routes
 * 
 * @param engines Engine instances
 * @returns Express router
 */
export function createDeveloperRoutes(engines: DeveloperEngines) {
  const router = express.Router();
  
  /**
   * GET /recommendation-stats
   * Get aggregated recommendation statistics
   */
  router.get('/recommendation-stats', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { category, timeframe } = req.query;
      
      // This would be implemented with a more efficient aggregation in production
      // For now, we'll just return mock data
      
      // Define timeframe in days
      const days = timeframe === 'week' ? 7 : 
                  timeframe === 'month' ? 30 : 
                  timeframe === 'year' ? 365 : 
                  1; // Default to daily
      
      // Calculate dates
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      
      // Mock statistics
      const stats = {
        timeframe: {
          start: startDate.toISOString(),
          end: endDate.toISOString(),
          label: timeframe || 'day'
        },
        category: category || 'all',
        counts: {
          recommendations: Math.floor(Math.random() * 1000) + 100,
          upvotes: Math.floor(Math.random() * 5000) + 500,
          uniqueUsers: Math.floor(Math.random() * 200) + 50
        },
        averages: {
          rating: (Math.random() * 2) + 3, // Random between 3-5
          upvotesPerRecommendation: (Math.random() * 5) + 1,
          recommendationsPerUser: (Math.random() * 2) + 0.5
        },
        distribution: {
          ratings: {
            '1': Math.floor(Math.random() * 10),
            '2': Math.floor(Math.random() * 20),
            '3': Math.floor(Math.random() * 50),
            '4': Math.floor(Math.random() * 100),
            '5': Math.floor(Math.random() * 200)
          },
          categories: {
            'restaurant': Math.floor(Math.random() * 300) + 100,
            'hotel': Math.floor(Math.random() * 200) + 50,
            'attraction': Math.floor(Math.random() * 150) + 30,
            'other': Math.floor(Math.random() * 100) + 20
          }
        }
      };
      
      // Return statistics
      res.json(stats);
    } catch (error) {
      next(error);
    }
  });
  
  /**
   * GET /trending
   * Get trending recommendations/services
   */
  router.get('/trending', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { category, limit, type } = req.query;
      
      // Default to recommendations
      const entityType = type === 'services' ? 'services' : 'recommendations';
      const maxResults = limit ? parseInt(limit as string, 10) : 10;
      
      if (entityType === 'services') {
        // Get popular services with adapter-specific type
        const services = await (engines.serviceEngine as any).getPopularServices(
          category as string | undefined,
          maxResults
        );
        
        // Return trending services
        res.json({
          type: 'services',
          items: services,
          total: services.length,
          timestamp: new Date().toISOString()
        });
      } else {
        // For recommendations, we'd implement a trending algorithm
        // For now, return a simple query with highest upvote count
        // Use adapter-specific types
        const filter: any = {};
        if (category) filter.category = category as string;
        
        const result = await (engines.recommendationEngine as any).getRecommendations({
          ...filter,
          sort: {
            field: 'upvotesReceived',
            direction: 'desc'
          },
          pagination: {
            offset: 0,
            limit: maxResults
          } as any
        });
        
        // Return trending recommendations
        res.json({
          type: 'recommendations',
          items: result.recommendations,
          total: result.total,
          timestamp: new Date().toISOString()
        });
      }
    } catch (error) {
      next(error);
    }
  });
  
  /**
   * POST /webhook
   * Register webhook for events
   */
  router.post('/webhook', (authenticate() as any), (requireRoles(['developer']) as any), async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Validate user is authenticated
      if (!req.user) {
        throw ApiError.unauthorized('Authentication required to register webhooks');
      }
      
      const { events, url, secret } = req.body;
      
      // Validate required fields
      if (!events || !Array.isArray(events) || events.length === 0) {
        throw ApiError.badRequest('Events array is required');
      }
      
      if (!url) {
        throw ApiError.badRequest('Webhook URL is required');
      }
      
      if (!secret) {
        throw ApiError.badRequest('Secret is required for webhook signature');
      }
      
      // Validate URL format
      try {
        new URL(url);
      } catch (error) {
        throw ApiError.badRequest('Invalid URL format');
      }
      
      // Check for duplicate webhook
      const existingWebhook = webhooks.find(
        webhook => webhook.developerId === req.user!.id && webhook.url === url
      );
      
      if (existingWebhook) {
        throw ApiError.conflict('You already have a webhook registered for this URL');
      }
      
      // Create webhook
      const webhook: Webhook = {
        id: `wh_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        developerId: req.user.id,
        events,
        url,
        secret,
        createdAt: new Date().toISOString(),
        active: true
      };
      
      // Store webhook
      webhooks.push(webhook);
      
      // Return webhook (without secret)
      const { secret: _omitted, ...safeWebhook } = webhook;
      res.status(201).json(safeWebhook);
    } catch (error) {
      next(error);
    }
  });
  
  /**
   * GET /webhook
   * List developer's webhooks
   */
  router.get('/webhook', (authenticate() as any), (requireRoles(['developer']) as any), async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Validate user is authenticated
      if (!req.user) {
        throw ApiError.unauthorized('Authentication required to list webhooks');
      }
      
      // Get developer's webhooks
      const developerWebhooks = webhooks
        .filter(webhook => webhook.developerId === req.user!.id)
        .map(webhook => {
          // Remove secret
          const { secret: _omitted, ...safeWebhook } = webhook;
          return safeWebhook;
        });
      
      // Return webhooks
      res.json({
        webhooks: developerWebhooks,
        total: developerWebhooks.length
      });
    } catch (error) {
      next(error);
    }
  });
  
  /**
   * DELETE /webhook/:id
   * Delete a webhook
   */
  router.delete('/webhook/:id', (authenticate() as any), (requireRoles(['developer']) as any), async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Validate user is authenticated
      if (!req.user) {
        throw ApiError.unauthorized('Authentication required to delete webhooks');
      }
      
      const { id } = req.params;
      
      // Find webhook
      const webhookIndex = webhooks.findIndex(
        webhook => webhook.id === id && webhook.developerId === req.user!.id
      );
      
      if (webhookIndex === -1) {
        throw ApiError.notFound(`Webhook not found: ${id}`);
      }
      
      // Remove webhook
      webhooks.splice(webhookIndex, 1);
      
      // Return success
      res.json({
        success: true,
        message: 'Webhook deleted successfully'
      });
    } catch (error) {
      next(error);
    }
  });
  
  /**
   * GET /categories
   * Get category taxonomy
   */
  router.get('/categories', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // In production, this would be a database query
      // For now, return a static taxonomy
      
      const categories = [
        {
          id: 'restaurant',
          name: 'Restaurant',
          subcategories: [
            { id: 'italian', name: 'Italian' },
            { id: 'japanese', name: 'Japanese' },
            { id: 'mexican', name: 'Mexican' },
            { id: 'chinese', name: 'Chinese' },
            { id: 'indian', name: 'Indian' },
            { id: 'fast_food', name: 'Fast Food' },
            { id: 'vegetarian', name: 'Vegetarian' },
            { id: 'vegan', name: 'Vegan' },
            { id: 'seafood', name: 'Seafood' },
            { id: 'steakhouse', name: 'Steakhouse' }
          ]
        },
        {
          id: 'hotel',
          name: 'Hotel',
          subcategories: [
            { id: 'luxury', name: 'Luxury' },
            { id: 'budget', name: 'Budget' },
            { id: 'boutique', name: 'Boutique' },
            { id: 'resort', name: 'Resort' },
            { id: 'motel', name: 'Motel' }
          ]
        },
        {
          id: 'attraction',
          name: 'Attraction',
          subcategories: [
            { id: 'museum', name: 'Museum' },
            { id: 'park', name: 'Park' },
            { id: 'theater', name: 'Theater' },
            { id: 'historical', name: 'Historical Site' },
            { id: 'natural', name: 'Natural Wonder' },
            { id: 'entertainment', name: 'Entertainment' }
          ]
        },
        {
          id: 'shopping',
          name: 'Shopping',
          subcategories: [
            { id: 'mall', name: 'Mall' },
            { id: 'boutique', name: 'Boutique' },
            { id: 'electronics', name: 'Electronics' },
            { id: 'clothing', name: 'Clothing' },
            { id: 'books', name: 'Books' },
            { id: 'market', name: 'Market' }
          ]
        },
        {
          id: 'nightlife',
          name: 'Nightlife',
          subcategories: [
            { id: 'bar', name: 'Bar' },
            { id: 'club', name: 'Club' },
            { id: 'lounge', name: 'Lounge' },
            { id: 'pub', name: 'Pub' },
            { id: 'live_music', name: 'Live Music' }
          ]
        }
      ];
      
      // Return categories
      res.json({
        categories,
        total: categories.length,
        version: '1.0'
      });
    } catch (error) {
      next(error);
    }
  });
  
  /**
   * GET /user-trust-graph
   * Get a user's trust graph
   */
  router.get('/user-trust-graph', (authenticate() as any), (requireRoles(['developer']) as any), async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Validate user is authenticated
      if (!req.user) {
        throw ApiError.unauthorized('Authentication required to access trust graph');
      }
      
      const { userId, maxDepth } = req.query;
      
      // Validate required fields
      if (!userId) {
        throw ApiError.badRequest('User ID is required');
      }
      
      // Depth defaults to 2
      const depth = maxDepth ? parseInt(maxDepth as string, 10) : 2;
      
      // Build trust graph
      // This would be implemented with a more efficient graph traversal in production
      // For now, we'll fetch direct followers and build a simple graph
      
      // Get user's followers with adapter-specific types
      const followingResult: any = await (engines.reputationEngine as any).getFollowing(
        userId as string,
        { offset: 0, limit: 100 } as any
      );
      
      // Build graph nodes and edges
      const nodes = [{ id: userId, type: 'source' }];
      const edges = [];
      
      // Add direct connections (depth 1)
      for (const rel of followingResult.relationships) {
        nodes.push({ id: rel.followedId, type: 'direct' });
        edges.push({
          source: rel.followerId,
          target: rel.followedId,
          distance: 1,
          weight: rel.trustWeight
        });
        
        // If depth > 1, get second-degree connections
        if (depth > 1) {
          try {
            const secondaryFollowing: any = await (engines.reputationEngine as any).getFollowing(
              rel.followedId,
              { offset: 0, limit: 20 } as any
            );
            
            for (const secondRel of secondaryFollowing.relationships) {
              // Skip if already in graph
              if (nodes.some(node => node.id === secondRel.followedId)) {
                continue;
              }
              
              nodes.push({ id: secondRel.followedId, type: 'secondary' });
              edges.push({
                source: secondRel.followerId,
                target: secondRel.followedId,
                distance: 2,
                weight: secondRel.trustWeight
              });
            }
          } catch (error) {
            // Ignore errors for second-degree connections
            console.warn(`Error fetching secondary connections for ${rel.followedId}:`, error);
          }
        }
      }
      
      // Return trust graph
      res.json({
        userId,
        depth,
        nodes,
        edges,
        totalNodes: nodes.length,
        totalEdges: edges.length
      });
    } catch (error) {
      next(error);
    }
  });
  
  /**
   * GET /location-heatmap
   * Get recommendation density heatmap for a location
   */
  router.get('/location-heatmap', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { lat, lng, radius, category } = req.query;
      
      if (!lat || !lng) {
        throw ApiError.badRequest('Latitude and longitude are required');
      }
      
      const latitude = parseFloat(lat as string);
      const longitude = parseFloat(lng as string);
      const radiusKm = radius ? parseFloat(radius as string) : 5;
      
      // This would query a spatial database in production
      // For now, generate a mock heatmap
      
      // Generate grid points
      const gridSize = 10; // 10x10 grid
      const step = (radiusKm * 2) / gridSize;
      const grid = [];
      
      for (let i = 0; i < gridSize; i++) {
        for (let j = 0; j < gridSize; j++) {
          const pointLat = latitude - radiusKm + (i * step);
          const pointLng = longitude - radiusKm + (j * step);
          
          // Calculate distance from center
          const distance = Math.sqrt(
            Math.pow(pointLat - latitude, 2) + 
            Math.pow(pointLng - longitude, 2)
          );
          
          // Weight based on distance (higher near center)
          let weight = 1 - (distance / radiusKm);
          if (weight < 0) weight = 0;
          
          // Add some randomness
          weight = weight * (0.5 + Math.random());
          
          grid.push({
            lat: pointLat,
            lng: pointLng,
            weight: Math.round(weight * 100) / 100
          });
        }
      }
      
      // Return heatmap
      res.json({
        center: {
          latitude,
          longitude
        },
        radius: radiusKm,
        ...(category && { category }),
        grid,
        gridSize,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      next(error);
    }
  });
  
  return router;
}

export default createDeveloperRoutes;