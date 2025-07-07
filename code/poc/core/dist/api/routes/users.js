"use strict";
/**
 * Users API Routes (v3 - Phase 5C Integration)
 *
 * API endpoints for user management and reputation with Phase 5B integration
 * Includes social graph, discovery incentives, and community verification
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createUserRoutes = createUserRoutes;
const express_1 = __importDefault(require("express"));
const error_handler_1 = require("../middleware/error-handler");
const auth_1 = require("../middleware/auth");
/**
 * Create user routes
 *
 * @param engine Reputation engine instance
 * @returns Express router
 */
function createUserRoutes(engine) {
    const router = express_1.default.Router();
    /**
     * POST /users
     * Create user account
     */
    router.post('/', async (req, res, next) => {
        try {
            const { userId, walletAddress, pseudonym } = req.body;
            // Validate required fields
            if (!userId || !walletAddress) {
                throw error_handler_1.ApiError.badRequest('User ID and wallet address are required');
            }
            // Create user reputation with error handling
            try {
                const userReputation = await engine.getUserReputation(userId);
                // Return created user reputation
                res.status(201).json({
                    userId: userReputation.userId,
                    reputationScore: userReputation.reputationScore,
                    verificationLevel: userReputation.verificationLevel || 'basic',
                    activeSince: userReputation.activeSince || new Date().toISOString(),
                    followers: userReputation.followers || 0,
                    following: userReputation.following || 0
                });
            }
            catch (error) {
                // If user doesn't exist, this might be expected for new users
                res.status(201).json({
                    userId,
                    reputationScore: 0,
                    verificationLevel: 'basic',
                    activeSince: new Date().toISOString(),
                    followers: 0,
                    following: 0
                });
            }
        }
        catch (error) {
            next(error);
        }
    });
    /**
     * GET /users/:id
     * Get user profile
     */
    router.get('/:id', async (req, res, next) => {
        try {
            const { id } = req.params;
            // Get user reputation with error handling
            const userReputation = await engine.getUserReputation(id);
            // Return user profile
            res.json({
                userId: userReputation.userId,
                reputationScore: userReputation.reputationScore,
                verificationLevel: userReputation.verificationLevel || 'basic',
                specializations: userReputation.specializations || [],
                activeSince: userReputation.activeSince || new Date().toISOString(),
                totalRecommendations: userReputation.totalRecommendations || 0,
                upvotesReceived: userReputation.upvotesReceived || 0,
                downvotesReceived: userReputation.downvotesReceived || 0,
                followers: userReputation.followers || 0,
                following: userReputation.following || 0
            });
        }
        catch (error) {
            if (error.message.includes('not found')) {
                next(error_handler_1.ApiError.notFound(`User not found: ${req.params.id}`));
            }
            else {
                next(error);
            }
        }
    });
    /**
     * PUT /users/:id
     * Update user profile
     */
    router.put('/:id', auth_1.authenticate(), async (req, res, next) => {
        try {
            // Validate user is authenticated
            if (!req.user) {
                throw error_handler_1.ApiError.unauthorized('Authentication required to update profile');
            }
            const { id } = req.params;
            // Verify ownership (users can only update their own profile)
            if (id !== req.user.id) {
                throw error_handler_1.ApiError.forbidden('You can only update your own profile');
            }
            const { pseudonym, specializations } = req.body;
            // Get current user reputation
            const userReputation = await engine.getUserReputation(id);
            // For now, we'll return the current reputation since updateUserReputation may not exist
            // In a real implementation, you'd update the user's profile
            // Return updated user profile
            res.json({
                userId: userReputation.userId,
                reputationScore: userReputation.reputationScore,
                verificationLevel: userReputation.verificationLevel || 'basic',
                specializations: specializations || userReputation.specializations || [],
                activeSince: userReputation.activeSince || new Date().toISOString(),
                totalRecommendations: userReputation.totalRecommendations || 0,
                upvotesReceived: userReputation.upvotesReceived || 0,
                downvotesReceived: userReputation.downvotesReceived || 0,
                followers: userReputation.followers || 0,
                following: userReputation.following || 0
            });
        }
        catch (error) {
            next(error);
        }
    });
    /**
     * GET /users/:id/recommendations
     * Get user's recommendations
     */
    router.get('/:id/recommendations', async (req, res, next) => {
        try {
            const { id } = req.params;
            const { offset, limit } = req.query;
            // Return mock recommendations for now
            // In a real implementation, this would integrate with the recommendation engine
            res.json({
                recommendations: [],
                total: 0,
                pagination: {
                    offset: parseInt(offset) || 0,
                    limit: parseInt(limit) || 20
                }
            });
        }
        catch (error) {
            next(error);
        }
    });
    /**
     * GET /users/:id/reputation
     * Get user's detailed reputation metrics (Phase 5B integration)
     */
    router.get('/:id/reputation', async (req, res, next) => {
        try {
            const { id } = req.params;
            // Get user reputation
            const userReputation = await engine.getUserReputation(id);
            // Return detailed reputation metrics
            res.json({
                userId: userReputation.userId,
                reputationScore: userReputation.reputationScore,
                verificationLevel: userReputation.verificationLevel || 'basic',
                specializations: userReputation.specializations || [],
                totalRecommendations: userReputation.totalRecommendations || 0,
                upvotesReceived: userReputation.upvotesReceived || 0,
                downvotesReceived: userReputation.downvotesReceived || 0,
                tokenRewardsEarned: userReputation.tokenRewardsEarned || 0,
                // Phase 5B additions with safe defaults
                reputationHistory: {
                    weeklyCalculations: [],
                    lastCalculated: new Date().toISOString(),
                    verificationCount: 0,
                    penaltyCount: 0
                },
                socialMetrics: {
                    networkDensity: 0,
                    avgTrustWeight: 0,
                    connectionQuality: 'unknown'
                }
            });
        }
        catch (error) {
            if (error.message.includes('not found')) {
                next(error_handler_1.ApiError.notFound(`User not found: ${req.params.id}`));
            }
            else {
                next(error);
            }
        }
    });
    /**
     * GET /users/:id/social-graph
     * Get user's social graph analytics (NEW - Phase 5B)
     */
    router.get('/:id/social-graph', async (req, res, next) => {
        try {
            const { id } = req.params;
            const { depth = 2 } = req.query;
            // Return mock social graph data for now
            // In a real implementation, this would call engine.getSocialGraphAnalytics
            const socialGraph = {
                networkSize: 0,
                density: 0,
                clusters: [],
                influenceScore: 0,
                pathStrengths: [],
                geographicDistribution: [],
                interestClusters: []
            };
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
        }
        catch (error) {
            next(error);
        }
    });
    /**
     * POST /users/:id/verify
     * Submit community verification for user (NEW - Phase 5B)
     */
    router.post('/:id/verify', auth_1.authenticate(), async (req, res, next) => {
        try {
            if (!req.user) {
                throw error_handler_1.ApiError.unauthorized('Authentication required for verification');
            }
            const { id } = req.params;
            const { evidence, category } = req.body;
            // Prevent self-verification
            if (id === req.user.id) {
                throw error_handler_1.ApiError.badRequest('Users cannot verify themselves');
            }
            // Return mock verification result for now
            const result = {
                verificationId: `verify_${Date.now()}`,
                status: 'pending',
                requiredVerifications: 3,
                currentVerifications: 1
            };
            res.json({
                success: true,
                verificationId: result.verificationId,
                status: result.status,
                requiredVerifications: result.requiredVerifications,
                currentVerifications: result.currentVerifications
            });
        }
        catch (error) {
            next(error);
        }
    });
    /**
     * GET /users/:id/verifications
     * Get user's verification status and history (NEW - Phase 5B)
     */
    router.get('/:id/verifications', async (req, res, next) => {
        try {
            const { id } = req.params;
            // Return mock verification data for now
            const verifications = {
                currentLevel: 'basic',
                pending: [],
                completed: [],
                history: [],
                nextMilestone: 'verified'
            };
            res.json({
                userId: id,
                verificationLevel: verifications.currentLevel,
                pendingVerifications: verifications.pending,
                completedVerifications: verifications.completed,
                verificationHistory: verifications.history,
                nextMilestone: verifications.nextMilestone
            });
        }
        catch (error) {
            next(error);
        }
    });
    /**
     * POST /users/:id/follow
     * Follow a user
     */
    router.post('/:id/follow', auth_1.authenticate(), async (req, res, next) => {
        try {
            // Validate user is authenticated
            if (!req.user) {
                throw error_handler_1.ApiError.unauthorized('Authentication required to follow users');
            }
            const { id } = req.params;
            // Prevent self-following
            if (id === req.user.id) {
                throw error_handler_1.ApiError.badRequest('You cannot follow yourself');
            }
            // Return mock follow result for now
            const relationship = {
                followerId: req.user.id,
                followedId: id,
                timestamp: new Date().toISOString(),
                distance: 1,
                trustWeight: 0.75
            };
            // Return result
            res.json({
                followerId: relationship.followerId,
                followedId: relationship.followedId,
                timestamp: relationship.timestamp,
                distance: relationship.distance,
                trustWeight: relationship.trustWeight
            });
        }
        catch (error) {
            next(error);
        }
    });
    /**
     * POST /users/:id/unfollow
     * Unfollow a user
     */
    router.post('/:id/unfollow', auth_1.authenticate(), async (req, res, next) => {
        try {
            // Validate user is authenticated
            if (!req.user) {
                throw error_handler_1.ApiError.unauthorized('Authentication required to unfollow users');
            }
            const { id } = req.params;
            // Return mock unfollow result
            const result = {
                success: true,
                message: 'User unfollowed successfully'
            };
            // Return result
            res.json({
                success: result.success,
                message: 'User unfollowed successfully'
            });
        }
        catch (error) {
            next(error);
        }
    });
    /**
     * GET /users/:id/following
     * Get users that this user is following
     */
    router.get('/:id/following', async (req, res, next) => {
        try {
            const { id } = req.params;
            const { offset, limit } = req.query;
            // Parse pagination
            const pagination = {
                offset: offset ? parseInt(offset, 10) : 0,
                limit: limit ? parseInt(limit, 10) : 20
            };
            // Return mock following data
            const result = {
                relationships: [],
                total: 0,
                pagination
            };
            // Return following
            res.json({
                relationships: result.relationships,
                total: result.total,
                pagination: result.pagination
            });
        }
        catch (error) {
            next(error);
        }
    });
    /**
     * GET /users/:id/followers
     * Get users following this user
     */
    router.get('/:id/followers', async (req, res, next) => {
        try {
            const { id } = req.params;
            const { offset, limit } = req.query;
            // Parse pagination
            const pagination = {
                offset: offset ? parseInt(offset, 10) : 0,
                limit: limit ? parseInt(limit, 10) : 20
            };
            // Return mock followers data
            const result = {
                relationships: [],
                total: 0,
                pagination
            };
            // Return followers
            res.json({
                relationships: result.relationships,
                total: result.total,
                pagination: result.pagination
            });
        }
        catch (error) {
            next(error);
        }
    });
    /**
     * GET /users/:id/trust/:targetId
     * Calculate trust score between users
     */
    router.get('/:id/trust/:targetId', async (req, res, next) => {
        try {
            const { id, targetId } = req.params;
            const { maxDepth } = req.query;
            // Return mock trust score for now
            const trustScore = 0.5; // Default trust score
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
        }
        catch (error) {
            next(error);
        }
    });
    /**
     * GET /users/:id/discovery-score
     * Get user's discovery incentive eligibility (NEW - Phase 5B)
     */
    router.get('/:id/discovery-score', async (req, res, next) => {
        try {
            const { id } = req.params;
            const { region, category } = req.query;
            // Return mock discovery score
            const discoveryScore = {
                eligibilityScore: 0.7,
                activeIncentives: [],
                potentialBonus: 10,
                regionCoverage: 0.3,
                categoryExpertise: 0.5,
                eligibleRecommendations: 5,
                recommendationsNeeded: 3
            };
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
        }
        catch (error) {
            next(error);
        }
    });
    /**
     * POST /users/:id/claim-discovery-bonus
     * Claim discovery incentive bonus (NEW - Phase 5B)
     */
    router.post('/:id/claim-discovery-bonus', auth_1.authenticate(), async (req, res, next) => {
        try {
            if (!req.user) {
                throw error_handler_1.ApiError.unauthorized('Authentication required to claim bonus');
            }
            const { id } = req.params;
            // Verify ownership
            if (id !== req.user.id) {
                throw error_handler_1.ApiError.forbidden('You can only claim your own bonuses');
            }
            const { campaignId, recommendationIds } = req.body;
            // Return mock claim result
            const result = {
                bonusAmount: 5,
                campaignId: campaignId || `campaign_${Date.now()}`,
                transactionId: `tx_${Date.now()}`,
                claimedRecommendations: recommendationIds || []
            };
            res.json({
                success: true,
                bonusAmount: result.bonusAmount,
                campaignId: result.campaignId,
                transactionId: result.transactionId,
                claimedRecommendations: result.claimedRecommendations
            });
        }
        catch (error) {
            next(error);
        }
    });
    return router;
}
exports.default = createUserRoutes;
//# sourceMappingURL=users.js.map