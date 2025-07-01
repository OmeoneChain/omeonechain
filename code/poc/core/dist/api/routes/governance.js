"use strict";
/**
 * Governance API Routes (v2 - Updated with adapter-specific types)
 *
 * API endpoints for platform governance
 * Based on Technical Specifications A.8
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createGovernanceRoutes = createGovernanceRoutes;
const express_1 = __importDefault(require("express"));
const engine_1 = require("../../governance/engine");
const error_handler_1 = require("../middleware/error-handler");
const auth_1 = require("../middleware/auth");
/**
 * Create governance routes
 *
 * @param engine Governance engine instance
 * @returns Express router
 */
function createGovernanceRoutes(engine) {
    const router = express_1.default.Router();
    /**
     * GET /proposals
     * List proposals with filtering
     */
    router.get('/proposals', async (req, res, next) => {
        try {
            // Parse query parameters
            const { status, type, author, tags, offset, limit } = req.query;
            // Create filter with adapter-specific type
            const filter = {};
            if (status)
                filter.status = status;
            if (type)
                filter.type = type;
            if (author)
                filter.authorId = author;
            if (tags)
                filter.tags = tags.split(',');
            // Add pagination
            const pagination = {
                offset: offset ? parseInt(offset, 10) : 0,
                limit: limit ? parseInt(limit, 10) : 20
            };
            // Get proposals
            const result = await engine.queryProposals(filter, pagination);
            // Return results
            res.json({
                proposals: result.proposals,
                total: result.total,
                pagination: result.pagination
            });
        }
        catch (error) {
            next(error);
        }
    });
    /**
     * GET /proposals/:id
     * Get proposal details
     */
    router.get('/proposals/:id', async (req, res, next) => {
        try {
            const { id } = req.params;
            // Get proposal
            const proposal = await engine.getProposalById(id);
            // Return proposal
            res.json(proposal);
        }
        catch (error) {
            if (error.message.includes('not found')) {
                next(error_handler_1.ApiError.notFound(`Proposal not found: ${req.params.id}`));
            }
            else {
                next(error);
            }
        }
    });
    /**
     * POST /proposals
     * Create a new proposal
     */
    router.post('/proposals', (0, auth_1.authenticate)(), async (req, res, next) => {
        try {
            // Validate user is authenticated
            if (!req.user) {
                throw error_handler_1.ApiError.unauthorized('Authentication required to create proposals');
            }
            const { title, type, description, implementation, tags, parameterChanges, treasurySpendAmount, treasurySpendRecipient, votingPeriod, passThreshold } = req.body;
            // Validate required fields
            if (!title) {
                throw error_handler_1.ApiError.badRequest('Proposal title is required');
            }
            if (!type) {
                throw error_handler_1.ApiError.badRequest('Proposal type is required');
            }
            if (!description) {
                throw error_handler_1.ApiError.badRequest('Proposal description is required');
            }
            // Validate proposal type enum
            if (!Object.values(engine_1.ProposalType).includes(type)) {
                throw error_handler_1.ApiError.badRequest(`Invalid proposal type: ${type}`);
            }
            // Create proposal with adapter-specific types
            const proposal = await engine.createProposal(req.user.id, title, type, description, implementation, {
                tags,
                parameterChanges,
                treasurySpendAmount,
                treasurySpendRecipient,
                votingPeriod,
                passThreshold
            });
            // Return created proposal
            res.status(201).json(proposal);
        }
        catch (error) {
            next(error);
        }
    });
    /**
     * PUT /proposals/:id/status
     * Update proposal status
     */
    router.put('/proposals/:id/status', (0, auth_1.authenticate)(), async (req, res, next) => {
        try {
            // Validate user is authenticated
            if (!req.user) {
                throw error_handler_1.ApiError.unauthorized('Authentication required to update proposal status');
            }
            const { id } = req.params;
            const { status } = req.body;
            if (!status) {
                throw error_handler_1.ApiError.badRequest('New status is required');
            }
            // Validate status enum
            if (!Object.values(engine_1.ProposalStatus).includes(status)) {
                throw error_handler_1.ApiError.badRequest(`Invalid proposal status: ${status}`);
            }
            // Update proposal status
            const proposal = await engine.updateProposalStatus(id, status, req.user.id);
            // Return updated proposal
            res.json(proposal);
        }
        catch (error) {
            next(error);
        }
    });
    /**
     * POST /proposals/:id/vote
     * Vote on a proposal
     */
    router.post('/proposals/:id/vote', (0, auth_1.authenticate)(), async (req, res, next) => {
        try {
            // Validate user is authenticated
            if (!req.user) {
                throw error_handler_1.ApiError.unauthorized('Authentication required to vote on proposals');
            }
            const { id } = req.params;
            const { voteFor, comment } = req.body;
            if (voteFor === undefined) {
                throw error_handler_1.ApiError.badRequest('Vote direction (voteFor) is required');
            }
            // Vote on proposal
            const result = await engine.voteOnProposal(id, req.user.id, voteFor === true, comment);
            // Return vote result
            res.json({
                vote: result.vote,
                proposal: result.proposal
            });
        }
        catch (error) {
            next(error);
        }
    });
    /**
     * GET /proposals/:id/votes
     * Get votes for a proposal
     */
    router.get('/proposals/:id/votes', async (req, res, next) => {
        try {
            const { id } = req.params;
            const { offset, limit } = req.query;
            // Parse pagination with adapter-specific type
            const pagination = {
                offset: offset ? parseInt(offset, 10) : 0,
                limit: limit ? parseInt(limit, 10) : 50
            };
            // Get votes
            const result = await engine.getProposalVotes(id, pagination);
            // Return votes
            res.json({
                votes: result.votes,
                total: result.total,
                pagination: result.pagination
            });
        }
        catch (error) {
            next(error);
        }
    });
    /**
     * POST /proposals/:id/check-results
     * Check voting results and update status
     */
    router.post('/proposals/:id/check-results', (0, auth_1.authenticate)(), async (req, res, next) => {
        try {
            // Validate user is authenticated
            if (!req.user) {
                throw error_handler_1.ApiError.unauthorized('Authentication required to check proposal results');
            }
            const { id } = req.params;
            // Check voting results
            const proposal = await engine.checkProposalVotingResults(id, req.user.id);
            // Return updated proposal
            res.json({
                proposal,
                message: `Proposal status updated to ${proposal.status}`
            });
        }
        catch (error) {
            next(error);
        }
    });
    /**
     * GET /activity
     * Get recent governance activity
     */
    router.get('/activity', async (req, res, next) => {
        try {
            const { limit } = req.query;
            const maxResults = limit ? parseInt(limit, 10) : 10;
            // Get recent activity
            const activity = await engine.getRecentActivity(maxResults);
            // Return activity
            res.json(activity);
        }
        catch (error) {
            next(error);
        }
    });
    // Routes for multisig signers
    const multisigRouter = express_1.default.Router();
    /**
     * POST /proposals/:id/approve
     * Approve a proposal (multisig only)
     */
    multisigRouter.post('/proposals/:id/approve', (0, auth_1.authenticate)(), (0, auth_1.requireRoles)(['multisig']), async (req, res, next) => {
        try {
            const { id } = req.params;
            // Approve proposal
            const proposal = await engine.approveProposal(id, req.user.id);
            // Return updated proposal
            res.json({
                proposal,
                message: `Proposal approved (${proposal.currentApprovals}/${proposal.requiredApprovals})`
            });
        }
        catch (error) {
            next(error);
        }
    });
    // Add multisig routes to main router
    router.use(multisigRouter);
    return router;
}
exports.default = createGovernanceRoutes;
//# sourceMappingURL=governance.js.map