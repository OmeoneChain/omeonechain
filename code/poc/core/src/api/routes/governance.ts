/**
 * Governance API Routes (v2 - Updated with adapter-specific types)
 * 
 * API endpoints for platform governance
 * Based on Technical Specifications A.8
 */

import express, { Request, Response, NextFunction } from 'express';
import { GovernanceEngine, ProposalStatus, ProposalType } from '../../governance/engine';
import { ApiError } from '../middleware/error-handler';
import { authenticate, requireRoles } from '../middleware/auth';
// Import adapter-specific types
import {
  ProposalFilter,
  ProposalOptions,
  Proposal,
  ProposalVote,
  PaginationOptions,
  VoteResult,
  VotesResult,
  ProposalResult
} from '../../types/governance-adapters';

/**
 * Create governance routes
 * 
 * @param engine Governance engine instance
 * @returns Express router
 */
export function createGovernanceRoutes(engine: GovernanceEngine) {
  const router = express.Router();
  
  /**
   * GET /proposals
   * List proposals with filtering
   */
  router.get('/proposals', async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Parse query parameters
      const { status, type, author, tags, offset, limit } = req.query;
      
      // Create filter with adapter-specific type
      const filter: ProposalFilter = {};
      
      if (status) filter.status = status as string;
      if (type) filter.type = type as string;
      if (author) filter.authorId = author as string;
      if (tags) filter.tags = (tags as string).split(',');
      
      // Add pagination
      const pagination: PaginationOptions = {
        offset: offset ? parseInt(offset as string, 10) : 0,
        limit: limit ? parseInt(limit as string, 10) : 20
      };
      
      // Get proposals
      const result: ProposalResult = await engine.queryProposals(filter, pagination);
      
      // Return results
      res.json({
        proposals: result.proposals,
        total: result.total,
        pagination: result.pagination
      });
    } catch (error) {
      next(error);
    }
  });
  
  /**
   * GET /proposals/:id
   * Get proposal details
   */
  router.get('/proposals/:id', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      
      // Get proposal
      const proposal: Proposal = await engine.getProposalById(id);
      
      // Return proposal
      res.json(proposal);
    } catch (error) {
      if ((error as Error).message.includes('not found')) {
        next(ApiError.notFound(`Proposal not found: ${req.params.id}`));
      } else {
        next(error);
      }
    }
  });
  
  /**
   * POST /proposals
   * Create a new proposal
   */
  router.post('/proposals', authenticate(), async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Validate user is authenticated
      if (!req.user) {
        throw ApiError.unauthorized('Authentication required to create proposals');
      }
      
      const {
        title,
        type,
        description,
        implementation,
        tags,
        parameterChanges,
        treasurySpendAmount,
        treasurySpendRecipient,
        votingPeriod,
        passThreshold
      } = req.body;
      
      // Validate required fields
      if (!title) {
        throw ApiError.badRequest('Proposal title is required');
      }
      
      if (!type) {
        throw ApiError.badRequest('Proposal type is required');
      }
      
      if (!description) {
        throw ApiError.badRequest('Proposal description is required');
      }
      
      // Validate proposal type enum
      if (!Object.values(ProposalType).includes(type)) {
        throw ApiError.badRequest(`Invalid proposal type: ${type}`);
      }
      
      // Create proposal with adapter-specific types
      const proposal: Proposal = await engine.createProposal(
        req.user.id,
        title,
        type,
        description,
        implementation,
        {
          tags,
          parameterChanges,
          treasurySpendAmount,
          treasurySpendRecipient,
          votingPeriod,
          passThreshold
        } as ProposalOptions
      );
      
      // Return created proposal
      res.status(201).json(proposal);
    } catch (error) {
      next(error);
    }
  });
  
  /**
   * PUT /proposals/:id/status
   * Update proposal status
   */
  router.put('/proposals/:id/status', authenticate(), async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Validate user is authenticated
      if (!req.user) {
        throw ApiError.unauthorized('Authentication required to update proposal status');
      }
      
      const { id } = req.params;
      const { status } = req.body;
      
      if (!status) {
        throw ApiError.badRequest('New status is required');
      }
      
      // Validate status enum
      if (!Object.values(ProposalStatus).includes(status)) {
        throw ApiError.badRequest(`Invalid proposal status: ${status}`);
      }
      
      // Update proposal status
      const proposal: Proposal = await engine.updateProposalStatus(
        id,
        status,
        req.user.id
      );
      
      // Return updated proposal
      res.json(proposal);
    } catch (error) {
      next(error);
    }
  });
  
  /**
   * POST /proposals/:id/vote
   * Vote on a proposal
   */
  router.post('/proposals/:id/vote', authenticate(), async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Validate user is authenticated
      if (!req.user) {
        throw ApiError.unauthorized('Authentication required to vote on proposals');
      }
      
      const { id } = req.params;
      const { voteFor, comment } = req.body;
      
      if (voteFor === undefined) {
        throw ApiError.badRequest('Vote direction (voteFor) is required');
      }
      
      // Vote on proposal
      const result: VoteResult = await engine.voteOnProposal(
        id,
        req.user.id,
        voteFor === true,
        comment
      );
      
      // Return vote result
      res.json({
        vote: result.vote,
        proposal: result.proposal
      });
    } catch (error) {
      next(error);
    }
  });
  
  /**
   * GET /proposals/:id/votes
   * Get votes for a proposal
   */
  router.get('/proposals/:id/votes', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const { offset, limit } = req.query;
      
      // Parse pagination with adapter-specific type
      const pagination: PaginationOptions = {
        offset: offset ? parseInt(offset as string, 10) : 0,
        limit: limit ? parseInt(limit as string, 10) : 50
      };
      
      // Get votes
      const result: VotesResult = await engine.getProposalVotes(id, pagination);
      
      // Return votes
      res.json({
        votes: result.votes,
        total: result.total,
        pagination: result.pagination
      });
    } catch (error) {
      next(error);
    }
  });
  
  /**
   * POST /proposals/:id/check-results
   * Check voting results and update status
   */
  router.post('/proposals/:id/check-results', authenticate(), async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Validate user is authenticated
      if (!req.user) {
        throw ApiError.unauthorized('Authentication required to check proposal results');
      }
      
      const { id } = req.params;
      
      // Check voting results
      const proposal: Proposal = await engine.checkProposalVotingResults(
        id,
        req.user.id
      );
      
      // Return updated proposal
      res.json({
        proposal,
        message: `Proposal status updated to ${proposal.status}`
      });
    } catch (error) {
      next(error);
    }
  });
  
  /**
   * GET /activity
   * Get recent governance activity
   */
  router.get('/activity', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { limit } = req.query;
      
      const maxResults = limit ? parseInt(limit as string, 10) : 10;
      
      // Get recent activity
      const activity = await engine.getRecentActivity(maxResults);
      
      // Return activity
      res.json(activity);
    } catch (error) {
      next(error);
    }
  });
  
  // Routes for multisig signers
  const multisigRouter = express.Router();
  
  /**
   * POST /proposals/:id/approve
   * Approve a proposal (multisig only)
   */
  multisigRouter.post('/proposals/:id/approve', authenticate(), requireRoles(['multisig']), async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      
      // Approve proposal
      const proposal: Proposal = await engine.approveProposal(
        id,
        req.user!.id
      );
      
      // Return updated proposal
      res.json({
        proposal,
        message: `Proposal approved (${proposal.currentApprovals}/${proposal.requiredApprovals})`
      });
    } catch (error) {
      next(error);
    }
  });
  
  // Add multisig routes to main router
  router.use(multisigRouter);
  
  return router;
}

export default createGovernanceRoutes;
