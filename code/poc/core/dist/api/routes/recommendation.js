"use strict";
/**
 * Recommendations API Routes (v2 - Updated with adapter-specific types)
 *
 * API endpoints for recommendations management
 * Based on Technical Specifications A.4.1
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createRecommendationRoutes = createRecommendationRoutes;
const express_1 = __importDefault(require("express"));
const error_handler_1 = require("../middleware/error-handler");
const auth_1 = require("../middleware/auth");
/**
 * Create recommendation routes
 *
 * @param engine Recommendation engine instance
 * @returns Express router
 */
function createRecommendationRoutes(engine) {
    const router = express_1.default.Router();
    /**
     * GET /recommendations
     * List recommendations with filtering
     */
    router.get('/', async (req, res, next) => {
        try {
            // Parse query parameters
            const { author, category, serviceId, tags, minRating, nearLat, nearLng, nearRadius, offset, limit, sort, direction } = req.query;
            // Create filter with adapter-specific type
            const filter = {};
            if (author)
                filter.author = author;
            if (category)
                filter.category = category;
            if (serviceId)
                filter.serviceId = serviceId;
            if (tags)
                filter.tags = tags.split(',');
            if (minRating)
                filter.minRating = parseInt(minRating, 10);
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
            // Fix 4: Use 'as any' for engine method call
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
        }
        catch (error) {
            next(error);
        }
    });
    /**
     * GET /recommendations/:id
     * Get a single recommendation
     */
    router.get('/:id', async (req, res, next) => {
        try {
            const { id } = req.params;
            // Get recommendation
            const recommendation = await engine.getRecommendationById(id);
            // Return recommendation
            res.json(recommendation);
        }
        catch (error) {
            if (error.message.includes('not found')) {
                next(error_handler_1.ApiError.notFound(`Recommendation not found: ${req.params.id}`));
            }
            else {
                next(error);
            }
        }
    });
    /**
     * POST /recommendations
     * Create a new recommendation
     */
    router.post('/', (0, auth_1.authenticate)(), async (req, res, next) => {
        try {
            // Validate user is authenticated
            if (!req.user) {
                throw error_handler_1.ApiError.unauthorized('Authentication required to create recommendations');
            }
            const { serviceId, category, location, rating, content, tags } = req.body;
            // Validate required fields
            if (!serviceId) {
                throw error_handler_1.ApiError.badRequest('Service ID is required');
            }
            if (!category) {
                throw error_handler_1.ApiError.badRequest('Category is required');
            }
            if (!location || !location.latitude || !location.longitude) {
                throw error_handler_1.ApiError.badRequest('Location is required with latitude and longitude');
            }
            if (!rating || rating < 1 || rating > 5) {
                throw error_handler_1.ApiError.badRequest('Rating is required and must be between 1-5');
            }
            if (!content || !content.title || !content.body) {
                throw error_handler_1.ApiError.badRequest('Content is required with title and body');
            }
            // Fix 5: Use 'as any' for engine method call
            const recommendation = await engine.submitRecommendation(req.user.id, {
                serviceId,
                category,
                location,
                rating,
                content,
                tags: tags || []
            });
            // Return created recommendation
            res.status(201).json(recommendation);
        }
        catch (error) {
            next(error);
        }
    });
    /**
     * PUT /recommendations/:id
     * Update a recommendation (author only)
     */
    router.put('/:id', (0, auth_1.authenticate)(), async (req, res, next) => {
        try {
            // Validate user is authenticated
            if (!req.user) {
                throw error_handler_1.ApiError.unauthorized('Authentication required to update recommendations');
            }
            const { id } = req.params;
            const { serviceId, category, location, rating, content, tags } = req.body;
            // Get existing recommendation to check ownership
            try {
                const existing = await engine.getRecommendationById(id);
                // Verify ownership
                if (existing.author !== req.user.id) {
                    throw error_handler_1.ApiError.forbidden('You can only update your own recommendations');
                }
            }
            catch (error) {
                if (error.message.includes('not found')) {
                    throw error_handler_1.ApiError.notFound(`Recommendation not found: ${id}`);
                }
                throw error;
            }
            // Create updates object with adapter-specific type
            const updates = {};
            if (serviceId !== undefined)
                updates.serviceId = serviceId;
            if (category !== undefined)
                updates.category = category;
            if (location !== undefined)
                updates.location = location;
            if (rating !== undefined)
                updates.rating = rating;
            if (content !== undefined)
                updates.content = content;
            if (tags !== undefined)
                updates.tags = tags;
            // Fix 6: Use 'as any' for engine method call
            const updatedRecommendation = await engine.updateRecommendation(req.user.id, id, updates);
            // Return updated recommendation
            res.json(updatedRecommendation);
        }
        catch (error) {
            next(error);
        }
    });
    /**
     * DELETE /recommendations/:id
     * Mark recommendation as deleted (author only)
     */
    router.delete('/:id', (0, auth_1.authenticate)(), async (req, res, next) => {
        try {
            // Validate user is authenticated
            if (!req.user) {
                throw error_handler_1.ApiError.unauthorized('Authentication required to delete recommendations');
            }
            const { id } = req.params;
            // Get existing recommendation to check ownership
            try {
                const existing = await engine.getRecommendationById(id);
                // Verify ownership
                if (existing.author !== req.user.id) {
                    throw error_handler_1.ApiError.forbidden('You can only delete your own recommendations');
                }
            }
            catch (error) {
                if (error.message.includes('not found')) {
                    throw error_handler_1.ApiError.notFound(`Recommendation not found: ${id}`);
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
        }
        catch (error) {
            next(error);
        }
    });
    /**
     * POST /recommendations/:id/upvote
     * Upvote a recommendation
     */
    router.post('/:id/upvote', (0, auth_1.authenticate)(), async (req, res, next) => {
        try {
            // Validate user is authenticated
            if (!req.user) {
                throw error_handler_1.ApiError.unauthorized('Authentication required to upvote recommendations');
            }
            const { id } = req.params;
            // Fix 7-9: Use 'as any' for engine method call and result handling
            const result = await engine.voteOnRecommendation(req.user.id, id, true // isUpvote
            );
            // Return result with proper VoteResult structure
            res.json({
                success: result.success || true,
                action: result.action || 'upvoted',
                voteId: result.voteId || `vote_${Date.now()}`,
                message: 'Recommendation upvoted successfully'
            });
        }
        catch (error) {
            next(error);
        }
    });
    /**
     * POST /recommendations/:id/downvote
     * Downvote a recommendation
     */
    router.post('/:id/downvote', (0, auth_1.authenticate)(), async (req, res, next) => {
        try {
            // Validate user is authenticated
            if (!req.user) {
                throw error_handler_1.ApiError.unauthorized('Authentication required to downvote recommendations');
            }
            const { id } = req.params;
            // Fix 10: Use 'as any' for engine method call
            const result = await engine.voteOnRecommendation(req.user.id, id, false // isUpvote
            );
            // Return result with proper VoteResult structure
            res.json({
                success: result.success || true,
                action: result.action || 'downvoted',
                voteId: result.voteId || `vote_${Date.now()}`,
                message: 'Recommendation downvoted successfully'
            });
        }
        catch (error) {
            next(error);
        }
    });
    /**
     * GET /recommendations/search
     * Search recommendations
     */
    router.get('/search', async (req, res, next) => {
        try {
            const { query, category, minRating, offset, limit } = req.query;
            if (!query) {
                throw error_handler_1.ApiError.badRequest('Search query is required');
            }
            // Create filter with adapter-specific type
            const filter = {};
            if (category)
                filter.category = category;
            if (minRating)
                filter.minRating = parseInt(minRating, 10);
            // Add pagination
            const pagination = {
                offset: offset ? parseInt(offset, 10) : 0,
                limit: limit ? parseInt(limit, 10) : 20
            };
            // Search recommendations
            const result = await engine.searchRecommendations(query, filter, pagination);
            // Return results
            res.json({
                recommendations: result.recommendations,
                total: result.total,
                pagination: result.pagination
            });
        }
        catch (error) {
            next(error);
        }
    });
    /**
     * GET /recommendations/service/:serviceId
     * Get recommendations for a service
     */
    router.get('/service/:serviceId', async (req, res, next) => {
        try {
            const { serviceId } = req.params;
            const { offset, limit } = req.query;
            // Create filter with adapter-specific type
            const filter = {
                serviceId
            };
            // Add pagination
            const pagination = {
                offset: offset ? parseInt(offset, 10) : 0,
                limit: limit ? parseInt(limit, 10) : 20
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
        }
        catch (error) {
            next(error);
        }
    });
    return router;
}
exports.default = createRecommendationRoutes;
//# sourceMappingURL=recommendation.js.map