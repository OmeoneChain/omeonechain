"use strict";
/**
 * Services API Routes (v2 - Updated with adapter-specific types)
 *
 * API endpoints for service management
 * Based on Technical Specifications A.4.1
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createServiceRoutes = createServiceRoutes;
const express_1 = __importDefault(require("express"));
const error_handler_1 = require("../middleware/error-handler");
const auth_1 = require("../middleware/auth");
/**
 * Create service routes
 *
 * @param engine Service engine instance
 * @returns Express router
 */
function createServiceRoutes(engine) {
    const router = express_1.default.Router();
    /**
     * GET /services
     * List services with filtering
     */
    router.get('/', async (req, res, next) => {
        try {
            // Parse query parameters
            const { nameSearch, category, subcategories, minRating, verificationStatus, nearLat, nearLng, nearRadius, city, country, offset, limit, sort, direction } = req.query;
            // Create filter with adapter-specific type
            const filter = {};
            if (nameSearch)
                filter.nameSearch = nameSearch;
            if (category)
                filter.category = category;
            if (subcategories)
                filter.subcategories = subcategories.split(',');
            if (minRating)
                filter.minRating = parseFloat(minRating);
            if (verificationStatus)
                filter.verificationStatus = verificationStatus;
            if (city)
                filter.city = city;
            if (country)
                filter.country = country;
            // Add location filter if provided
            if (nearLat && nearLng) {
                filter.nearLocation = {
                    latitude: parseFloat(nearLat),
                    longitude: parseFloat(nearLng),
                    radiusKm: nearRadius ? parseFloat(nearRadius) : 5 // Default 5km radius
                };
            }
            // Add pagination
            const pagination = {
                offset: offset ? parseInt(offset, 10) : 0,
                limit: limit ? parseInt(limit, 10) : 20
            };
            // Add sorting
            const sortOption = sort ? {
                field: sort,
                direction: direction === 'desc' ? 'desc' : 'asc'
            } : undefined;
            // Get services
            const result = await engine.queryServices({
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
        }
        catch (error) {
            next(error);
        }
    });
    /**
     * GET /services/:id
     * Get service details
     */
    router.get('/:id', async (req, res, next) => {
        try {
            const { id } = req.params;
            // Get service
            const service = await engine.getServiceById(id);
            // Return service
            res.json(service);
        }
        catch (error) {
            if (error.message.includes('not found')) {
                next(error_handler_1.ApiError.notFound(`Service not found: ${req.params.id}`));
            }
            else {
                next(error);
            }
        }
    });
    /**
     * POST /services
     * Register a new service
     */
    router.post('/', (0, auth_1.authenticate)(), async (req, res, next) => {
        try {
            // Validate user is authenticated
            if (!req.user) {
                throw error_handler_1.ApiError.unauthorized('Authentication required to register services');
            }
            const { name, category, subcategories, location, website, contact } = req.body;
            // Validate required fields
            if (!name) {
                throw error_handler_1.ApiError.badRequest('Service name is required');
            }
            if (!category) {
                throw error_handler_1.ApiError.badRequest('Category is required');
            }
            if (!location || !location.latitude || !location.longitude) {
                throw error_handler_1.ApiError.badRequest('Location is required with latitude and longitude');
            }
            // Create service with adapter-specific type
            const service = await engine.createOrUpdateService(req.user.id, {
                serviceId: undefined, // Generate new ID
                name,
                category,
                subcategories: subcategories || [],
                location,
                website,
                contact
            });
            // Return created service
            res.status(201).json(service);
        }
        catch (error) {
            next(error);
        }
    });
    /**
     * PUT /services/:id
     * Update a service
     */
    router.put('/:id', (0, auth_1.authenticate)(), async (req, res, next) => {
        try {
            // Validate user is authenticated
            if (!req.user) {
                throw error_handler_1.ApiError.unauthorized('Authentication required to update services');
            }
            const { id } = req.params;
            const { name, category, subcategories, location, website, contact } = req.body;
            // Check if service exists first
            try {
                await engine.getServiceById(id);
            }
            catch (error) {
                if (error.message.includes('not found')) {
                    throw error_handler_1.ApiError.notFound(`Service not found: ${id}`);
                }
                throw error;
            }
            // Create updates object with adapter-specific type
            const updates = {
                serviceId: id
            };
            if (name !== undefined)
                updates.name = name;
            if (category !== undefined)
                updates.category = category;
            if (subcategories !== undefined)
                updates.subcategories = subcategories;
            if (location !== undefined)
                updates.location = location;
            if (website !== undefined)
                updates.website = website;
            if (contact !== undefined)
                updates.contact = contact;
            // Update service
            const service = await engine.createOrUpdateService(req.user.id, updates);
            // Return updated service
            res.json(service);
        }
        catch (error) {
            next(error);
        }
    });
    /**
     * GET /services/:id/recommendations
     * Get recommendations for a service
     */
    router.get('/:id/recommendations', async (req, res, next) => {
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
        }
        catch (error) {
            next(error);
        }
    });
    /**
     * POST /services/:id/verification
     * Request service verification
     */
    router.post('/:id/verification', (0, auth_1.authenticate)(), async (req, res, next) => {
        try {
            // Validate user is authenticated
            if (!req.user) {
                throw error_handler_1.ApiError.unauthorized('Authentication required to request verification');
            }
            const { id } = req.params;
            const { documents } = req.body;
            if (!documents || !Array.isArray(documents) || documents.length === 0) {
                throw error_handler_1.ApiError.badRequest('Verification documents are required');
            }
            // Request verification
            const verificationRequest = await engine.requestServiceVerification(req.user.id, id, documents);
            // Return verification request
            res.status(201).json({
                requestId: verificationRequest.requestId,
                serviceId: verificationRequest.serviceId,
                requesterId: verificationRequest.requesterId,
                status: verificationRequest.status,
                timestamp: verificationRequest.timestamp
            });
        }
        catch (error) {
            next(error);
        }
    });
    /**
     * GET /services/nearby
     * Find services near a location
     */
    router.get('/nearby', async (req, res, next) => {
        try {
            const { lat, lng, radius, category, limit } = req.query;
            if (!lat || !lng) {
                throw error_handler_1.ApiError.badRequest('Latitude and longitude are required');
            }
            const latitude = parseFloat(lat);
            const longitude = parseFloat(lng);
            const radiusKm = radius ? parseFloat(radius) : 5;
            const maxResults = limit ? parseInt(limit, 10) : 10;
            // Get nearby services
            const services = await engine.getNearbyServices(latitude, longitude, radiusKm, category, maxResults);
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
        }
        catch (error) {
            next(error);
        }
    });
    /**
     * GET /services/popular
     * Get popular services
     */
    router.get('/popular', async (req, res, next) => {
        try {
            const { category, limit } = req.query;
            const maxResults = limit ? parseInt(limit, 10) : 10;
            // Get popular services
            const services = await engine.getPopularServices(category, maxResults);
            // Return services
            res.json({
                services,
                total: services.length
            });
        }
        catch (error) {
            next(error);
        }
    });
    /**
     * POST /services/:id/experiences
     * Create a service experience (NFT)
     */
    router.post('/:id/experiences', (0, auth_1.authenticate)(), async (req, res, next) => {
        try {
            // Validate user is authenticated
            if (!req.user) {
                throw error_handler_1.ApiError.unauthorized('Authentication required to create experiences');
            }
            const { id } = req.params;
            const { title, description, price, supply, startTime, endTime, mediaHash } = req.body;
            // Validate required fields
            if (!title) {
                throw error_handler_1.ApiError.badRequest('Experience title is required');
            }
            if (!description) {
                throw error_handler_1.ApiError.badRequest('Experience description is required');
            }
            if (price === undefined || price <= 0) {
                throw error_handler_1.ApiError.badRequest('Price must be greater than zero');
            }
            if (supply === undefined || supply <= 0) {
                throw error_handler_1.ApiError.badRequest('Supply must be greater than zero');
            }
            // Create experience
            const experience = await engine.createServiceExperience(req.user.id, id, title, description, price, supply, {
                startTime,
                endTime,
                mediaHash
            });
            // Return created experience
            res.status(201).json(experience);
        }
        catch (error) {
            next(error);
        }
    });
    /**
     * GET /services/:id/experiences
     * Get experiences for a service
     */
    router.get('/:id/experiences', async (req, res, next) => {
        try {
            const { id } = req.params;
            const { activeOnly, offset, limit } = req.query;
            // Parse parameters
            const showActiveOnly = activeOnly !== 'false';
            const pagination = {
                offset: offset ? parseInt(offset, 10) : 0,
                limit: limit ? parseInt(limit, 10) : 20
            };
            // Get experiences
            const result = await engine.getServiceExperiences(id, showActiveOnly, pagination);
            // Return experiences
            res.json({
                experiences: result.experiences,
                total: result.total,
                pagination: result.pagination
            });
        }
        catch (error) {
            next(error);
        }
    });
    /**
     * POST /services/experiences/:experienceId/purchase
     * Purchase an experience
     */
    router.post('/experiences/:experienceId/purchase', (0, auth_1.authenticate)(), async (req, res, next) => {
        try {
            // Validate user is authenticated
            if (!req.user) {
                throw error_handler_1.ApiError.unauthorized('Authentication required to purchase experiences');
            }
            const { experienceId } = req.params;
            // Purchase experience
            const experience = await engine.purchaseExperience(req.user.id, experienceId);
            // Calculate protocol fee
            const protocolFee = engine.calculateProtocolFee(experience.price);
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
        }
        catch (error) {
            next(error);
        }
    });
    // Admin routes for service verification
    const adminRouter = express_1.default.Router();
    /**
     * POST /services/verification/:requestId/review
     * Review a verification request (admin only)
     */
    adminRouter.post('/verification/:requestId/review', (0, auth_1.requireRoles)(['admin', 'moderator']), async (req, res, next) => {
        try {
            const { requestId } = req.params;
            const { approved, notes } = req.body;
            if (approved === undefined) {
                throw error_handler_1.ApiError.badRequest('Approval decision is required');
            }
            // Review verification request
            const verificationRequest = await engine.reviewVerificationRequest(req.user.id, requestId, approved === true, notes);
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
        }
        catch (error) {
            next(error);
        }
    });
    // Add admin routes to main router
    router.use(adminRouter);
    return router;
}
exports.default = createServiceRoutes;
//# sourceMappingURL=services.js.map