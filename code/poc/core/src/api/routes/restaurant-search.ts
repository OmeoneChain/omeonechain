// File: code/poc/core/src/api/routes/restaurant-search.ts

import { Router, Request, Response } from 'express';
import { createRestaurantService } from '../../services/restaurant-service';
import { Pool } from 'pg';

export function createRestaurantSearchRouter(db: Pool): Router {
  const router = Router();
  const restaurantService = createRestaurantService(db);

  /**
   * GET /api/restaurants/search
   * Search for restaurants using external provider (Google Places)
   * 
   * Query params:
   *   - q: search query (e.g., "Italian restaurant")
   *   - lat: latitude
   *   - lng: longitude
   *   - radius: search radius in meters (optional, default 5000)
   */
  router.get('/search', async (req: Request, res: Response) => {
    try {
      const { q, lat, lng, radius } = req.query;

      if (!q || !lat || !lng) {
        return res.status(400).json({
          error: 'Missing required parameters: q (query), lat, lng'
        });
      }

      const latitude = parseFloat(lat as string);
      const longitude = parseFloat(lng as string);
      const searchRadius = radius ? parseFloat(radius as string) : undefined;

      if (isNaN(latitude) || isNaN(longitude)) {
        return res.status(400).json({
          error: 'Invalid coordinates'
        });
      }

      const results = await restaurantService.searchRestaurants(
        q as string,
        latitude,
        longitude,
        searchRadius
      );

      // Check which restaurants already exist in our DB
      const resultsWithStatus = await Promise.all(
        results.map(async (result) => {
          const existing = await restaurantService.findByExternalId(
            result.id
          );
          
          return {
            external_id: result.id,
            name: result.name,
            address: result.address,
            latitude: result.latitude,
            longitude: result.longitude,
            categories: result.categories,
            price_level: result.priceLevel,
            phone: result.phone,
            website: result.website,
            exists_in_db: !!existing,
            restaurant_id: existing?.id || null,
          };
        })
      );

      res.json({
        results: resultsWithStatus,
        count: resultsWithStatus.length
      });
    } catch (error) {
      console.error('Restaurant search error:', error);
      res.status(500).json({
        error: 'Failed to search restaurants'
      });
    }
  });

  /**
   * GET /api/restaurants/autocomplete
   * Autocomplete restaurant names as user types
   * 
   * Query params:
   *   - input: partial restaurant name
   *   - lat: latitude
   *   - lng: longitude
   */
  router.get('/autocomplete', async (req: Request, res: Response) => {
    try {
      const { input, lat, lng } = req.query;

      if (!input || !lat || !lng) {
        return res.status(400).json({
          error: 'Missing required parameters: input, lat, lng'
        });
      }

      const latitude = parseFloat(lat as string);
      const longitude = parseFloat(lng as string);

      if (isNaN(latitude) || isNaN(longitude)) {
        return res.status(400).json({
          error: 'Invalid coordinates'
        });
      }

      const suggestions = await restaurantService.autocompleteRestaurants(
        input as string,
        latitude,
        longitude
      );

      res.json({
        suggestions,
        count: suggestions.length
      });
    } catch (error) {
      console.error('Autocomplete error:', error);
      res.status(500).json({
        error: 'Failed to get autocomplete suggestions'
      });
    }
  });

  /**
   * POST /api/restaurants/from-foursquare
   * Create restaurant in our DB from external provider ID (Google Place ID)
   * Called when user selects a restaurant from search/autocomplete
   * 
   * Note: Endpoint name kept as "from-foursquare" for backward compatibility
   * but it now works with Google Places IDs
   * 
   * Body:
   *   - foursquare_id: External place ID (Google Place ID)
   *   - city: optional city name
   */
  router.post('/from-foursquare', async (req: Request, res: Response) => {
    try {
      const { foursquare_id, city } = req.body;

      if (!foursquare_id) {
        return res.status(400).json({
          error: 'Missing required parameter: foursquare_id'
        });
      }

      const restaurant = await restaurantService.findOrCreateFromExternalProvider(
        foursquare_id,
        city
      );

      res.json({
        restaurant,
        message: 'Restaurant created/retrieved successfully'
      });
    } catch (error) {
      console.error('Create from external provider error:', error);
      res.status(500).json({
        error: 'Failed to create restaurant from external data'
      });
    }
  });

  /**
   * GET /api/restaurants/in-bounds
   * Get restaurants within map bounds (for map view)
   * 
   * Query params:
   *   - north, south, east, west: map bounds
   */
  router.get('/in-bounds', async (req: Request, res: Response) => {
    try {
      const { north, south, east, west } = req.query;

      if (!north || !south || !east || !west) {
        return res.status(400).json({
          error: 'Missing required parameters: north, south, east, west'
        });
      }

      const bounds = {
        north: parseFloat(north as string),
        south: parseFloat(south as string),
        east: parseFloat(east as string),
        west: parseFloat(west as string),
      };

      if (Object.values(bounds).some(isNaN)) {
        return res.status(400).json({
          error: 'Invalid bounds coordinates'
        });
      }

      const restaurants = await restaurantService.getRestaurantsInBounds(bounds);

      res.json({
        restaurants,
        count: restaurants.length
      });
    } catch (error) {
      console.error('Get restaurants in bounds error:', error);
      res.status(500).json({
        error: 'Failed to get restaurants in bounds'
      });
    }
  });

  /**
   * GET /api/restaurants/:id
   * Get restaurant by ID (existing endpoint - ensure it works with new schema)
   */
  router.get('/:id', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id, 10);

      if (isNaN(id)) {
        return res.status(400).json({
          error: 'Invalid restaurant ID'
        });
      }

      const restaurant = await restaurantService.getRestaurantById(id);

      if (!restaurant) {
        return res.status(404).json({
          error: 'Restaurant not found'
        });
      }

      res.json({ restaurant });
    } catch (error) {
      console.error('Get restaurant error:', error);
      res.status(500).json({
        error: 'Failed to get restaurant'
      });
    }
  });

  return router;
}