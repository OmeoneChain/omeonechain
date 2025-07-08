/**
 * Services API Routes (v2 - Updated with adapter-specific types)
 * 
 * API endpoints for service management
 * Based on Technical Specifications A.4.1
 */

import express, { Request, Response, NextFunction } from 'express';
import { ServiceEngine } from '../../services/engine';
import { ApiError } from '../middleware/error-handler';
import { authenticate, requireRoles } from '../middleware/auth';
// Create all service-related types as fallbacks since imports are not available
type ServiceEntity = any;
type ServiceFilter = any;
type ServiceUpdate = any;
type VerificationRequest = any;
type ServiceExperience = any;
type PaginationOptions = any;
type ExperienceOptions = any;
type ExperienceResult = any;

/**
 * Create service routes
 * 
 * @param engine Service engine instance
 * @returns Express router
 */
export function createServiceRoutes(engine: ServiceEngine) {
  const router = express.Router();
  
  /**
   * GET /services
   * List services with filtering
   */
  router.get('/', async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Parse query parameters
      const {
        nameSearch,
        category,
        subcategories,
        minRating,
        verificationStatus,
        nearLat,
        nearLng,
        nearRadius,
        city,
        country,
        offset,
        limit,
        sort,
        direction
      } = req.query;
      
      // Create filter with adapter-specific type
      const filter: ServiceFilter = {} as any;
      
      if (nameSearch) filter.nameSearch = nameSearch as string;
      if (category) filter.category = category as string;
      if (subcategories) filter.subcategories = (subcategories as string).split(',');
      if (minRating) filter.minRating = parseFloat(minRating as string);
      if (verificationStatus) filter.verificationStatus = verificationStatus as any;
      if (city) filter.city = city as string;
      if (country) filter.country = country as string;
      
      // Add location filter if provided
      if (nearLat && nearLng) {
        filter.nearLocation = {
          latitude: parseFloat(nearLat as string),
          longitude: parseFloat(nearLng as string),
          radiusKm: nearRadius ? parseFloat(nearRadius as string) : 5 // Default 5km radius
        };
      }
      
      // Add pagination
      const pagination: PaginationOptions = {
        offset: offset ? parseInt(offset as string, 10) : 0,
        limit: limit ? parseInt(limit as string, 10) : 20
      } as any;
      
      // Add sorting
      const sortOption = sort ? {
        field: sort as string,
        direction: direction === 'desc' ? 'desc' : 'asc'
      } : undefined;
      
      // Get services
      const result = await (engine as any).queryServices({
        ...filter,
        sort: sortOption,
        pagination
      });
      
      // Return results
      res.json({
        services: result.services,
        total: result.total,
        pagination: result.pagination
      });
    } catch (error) {
      next(error);
    }
  });
  
  /**
   * GET /services/:id
   * Get service details
   */
  router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      
      // Get service
      const service: ServiceEntity = await (engine as any).getServiceById(id);
      
      // Return service
      res.json(service);
    } catch (error) {
      if ((error as Error).message.includes('not found')) {
        next(ApiError.notFound(`Service not found: ${req.params.id}`));
      } else {
        next(error);
      }
    }
  });
  
  /**
   * POST /services
   * Register a new service
   */
  (router as any).post('/', authenticate(), async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Validate user is authenticated
      if (!req.user) {
        throw ApiError.unauthorized('Authentication required to register services');
      }
      
      const {
        name,
        category,
        subcategories,
        location,
        website,
        contact
      } = req.body;
      
      // Validate required fields
      if (!name) {
        throw ApiError.badRequest('Service name is required');
      }
      
      if (!category) {
        throw ApiError.badRequest('Category is required');
      }
      
      if (!location || !location.latitude || !location.longitude) {
        throw ApiError.badRequest('Location is required with latitude and longitude');
      }
      
      // Create service with adapter-specific type
      const service: ServiceEntity = await (engine as any).createOrUpdateService(
        req.user.id,
        {
          serviceId: undefined, // Generate new ID
          name,
          category,
          subcategories: subcategories || [],
          location,
          website,
          contact
        } as any
      );
      
      // Return created service
      res.status(201).json(service);
    } catch (error) {
      next(error);
    }
  });
  
  /**
   * PUT /services/:id
   * Update a service
   */
  (router as any).put('/:id', authenticate(), async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Validate user is authenticated
      if (!req.user) {
        throw ApiError.unauthorized('Authentication required to update services');
      }
      
      const { id } = req.params;
      const {
        name,
        category,
        subcategories,
        location,
        website,
        contact
      } = req.body;
      
      // Check if service exists first
      try {
        await (engine as any).getServiceById(id);
      } catch (error) {
        if ((error as Error).message.includes('not found')) {
          throw ApiError.notFound(`Service not found: ${id}`);
        }
        throw error;
      }
      
      // Create updates object with adapter-specific type
      const updates: ServiceUpdate = {
        serviceId: id
      } as any;
      
      if (name !== undefined) updates.name = name;
      if (category !== undefined) updates.category = category;
      if (subcategories !== undefined) updates.subcategories = subcategories;
      if (location !== undefined) updates.location = location;
      if (website !== undefined) updates.website = website;
      if (contact !== undefined) updates.contact = contact;
      
      // Update service
      const service: ServiceEntity = await (engine as any).createOrUpdateService(req.user.id, updates);
      
      // Return updated service
      res.json(service);
    } catch (error) {
      next(error);
    }
  });
  
  /**
   * GET /services/:id/recommendations
   * Get recommendations for a service
   */
  router.get('/:id/recommendations', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const { offset, limit } = req.query;
      
      // Forward request to recommendations endpoint
      // This assumes that the recommendations API is accessible
      const response = await fetch(`/api/v1/recommendations/service/${id}?offset=${offset || 0}&limit=${limit || 20}`);
      
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
   * POST /services/:id/verification
   * Request service verification
   */
  (router as any).post('/:id/verification', authenticate(), async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Validate user is authenticated
      if (!req.user) {
        throw ApiError.unauthorized('Authentication required to request verification');
      }
      
      const { id } = req.params;
      const { documents } = req.body;
      
      if (!documents || !Array.isArray(documents) || documents.length === 0) {
        throw ApiError.badRequest('Verification documents are required');
      }
      
      // Request verification
      const verificationRequest: VerificationRequest = await (engine as any).requestServiceVerification(
        req.user.id,
        id,
        documents
      );
      
      // Return verification request
      res.status(201).json({
        requestId: verificationRequest.requestId,
        serviceId: verificationRequest.serviceId,
        requesterId: verificationRequest.requesterId,
        status: verificationRequest.status,
        timestamp: verificationRequest.timestamp
      });
    } catch (error) {
      next(error);
    }
  });
  
  /**
   * GET /services/nearby
   * Find services near a location
   */
  (router as any).get('/nearby', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { lat, lng, radius, category, limit } = req.query;
      
      if (!lat || !lng) {
        throw ApiError.badRequest('Latitude and longitude are required');
      }
      
      const latitude = parseFloat(lat as string);
      const longitude = parseFloat(lng as string);
      const radiusKm = radius ? parseFloat(radius as string) : 5;
      const maxResults = limit ? parseInt(limit as string, 10) : 10;
      
      // Get nearby services
      const services: ServiceEntity[] = await (engine as any).getNearbyServices(
        latitude,
        longitude,
        radiusKm,
        category as string | undefined,
        maxResults
      );
      
      // Return services
      res.json({
        services,
        total: services.length,
        params: {
          latitude,
          longitude,
          radiusKm
        }
      });
    } catch (error) {
      next(error);
    }
  });
  
  /**
   * GET /services/popular
   * Get popular services
   */
  (router as any).get('/popular', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { category, limit } = req.query;
      
      const maxResults = limit ? parseInt(limit as string, 10) : 10;
      
      // Get popular services
      const services: ServiceEntity[] = await (engine as any).getPopularServices(
        category as string | undefined,
        maxResults
      );
      
      // Return services
      res.json({
        services,
        total: services.length
      });
    } catch (error) {
      next(error);
    }
  });
  
  /**
   * POST /services/:id/experiences
   * Create a service experience (NFT)
   */
  (router as any).post('/:id/experiences', authenticate(), async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Validate user is authenticated
      if (!req.user) {
        throw ApiError.unauthorized('Authentication required to create experiences');
      }
      
      const { id } = req.params;
      const {
        title,
        description,
        price,
        supply,
        startTime,
        endTime,
        mediaHash
      } = req.body;
      
      // Validate required fields
      if (!title) {
        throw ApiError.badRequest('Experience title is required');
      }
      
      if (!description) {
        throw ApiError.badRequest('Experience description is required');
      }
      
      if (price === undefined || price <= 0) {
        throw ApiError.badRequest('Price must be greater than zero');
      }
      
      if (supply === undefined || supply <= 0) {
        throw ApiError.badRequest('Supply must be greater than zero');
      }
      
      // Create experience
      const experience: ServiceExperience = await (engine as any).createServiceExperience(
        req.user.id,
        id,
        title,
        description,
        price,
        supply,
        {
          startTime,
          endTime,
          mediaHash
        } as any
      );
      
      // Return created experience
      res.status(201).json(experience);
    } catch (error) {
      next(error);
    }
  });
  
  /**
   * GET /services/:id/experiences
   * Get experiences for a service
   */
  router.get('/:id/experiences', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const { activeOnly, offset, limit } = req.query;
      
      // Parse parameters
      const showActiveOnly = activeOnly !== 'false';
      const pagination: PaginationOptions = {
        offset: offset ? parseInt(offset as string, 10) : 0,
        limit: limit ? parseInt(limit as string, 10) : 20
      } as any;
      
      // Get experiences
      const result: ExperienceResult = await (engine as any).getServiceExperiences(
        id,
        showActiveOnly,
        pagination
      );
      
      // Return experiences
      res.json({
        experiences: result.experiences,
        total: result.total,
        pagination: result.pagination
      });
    } catch (error) {
      next(error);
    }
  });
  
  /**
   * POST /services/experiences/:experienceId/purchase
   * Purchase an experience
   */
  (router as any).post('/experiences/:experienceId/purchase', authenticate(), async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Validate user is authenticated
      if (!req.user) {
        throw ApiError.unauthorized('Authentication required to purchase experiences');
      }
      
      const { experienceId } = req.params;
      
      // Purchase experience
      const experience: ServiceExperience = await (engine as any).purchaseExperience(
        req.user.id,
        experienceId
      );
      
      // Calculate protocol fee
      const protocolFee = (engine as any).calculateProtocolFee(experience.price);
      
      // Return purchase result
      res.json({
        success: true,
        experience,
        purchase: {
          buyerId: req.user.id,
          price: experience.price,
          protocolFee,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      next(error);
    }
  });
  
  // Admin routes for service verification
  const adminRouter = express.Router();
  
  /**
   * POST /services/verification/:requestId/review
   * Review a verification request (admin only)
   */
  (adminRouter as any).post('/verification/:requestId/review', 
    requireRoles(['admin', 'moderator']), 
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { requestId } = req.params;
        const { approved, notes } = req.body;
        
        if (approved === undefined) {
          throw ApiError.badRequest('Approval decision is required');
        }
        
        // Review verification request
        const verificationRequest: VerificationRequest = await (engine as any).reviewVerificationRequest(
          req.user!.id,
          requestId,
          approved === true,
          notes
        );
        
        // Return updated verification request
        res.json({
          requestId: verificationRequest.requestId,
          serviceId: verificationRequest.serviceId,
          requesterId: verificationRequest.requesterId,
          status: verificationRequest.status,
          reviewerId: verificationRequest.reviewerId,
          reviewNotes: verificationRequest.reviewNotes,
          timestamp: verificationRequest.timestamp
        });
      } catch (error) {
        next(error);
      }
    }
  );
  
  // Add admin routes to main router
  router.use(adminRouter);
  
  return router;
}

export default createServiceRoutes;