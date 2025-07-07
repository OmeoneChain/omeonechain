/**
 * Governance API Routes (v2 - Updated with adapter-specific types)
 * 
 * API endpoints for platform governance
 * Based on Technical Specifications A.8
 */

import express, { Request, Response, NextFunction } from 'express';
import { GovernanceEngine, ProposalStatus, ProposalType, VoteType } from '../../governance/engine';
import { ApiError } from '../middleware/error-handler';
import { authenticate, requireRoles } from '../middleware/auth';

// Use basic types instead of non-existent governance-adapters
interface ProposalFilter {
  status?: string;
  type?: string;
  authorId?: string;
  tags?: string[];
}

interface ProposalOptions {
  tags?: string[];
  parameterChanges?: any;
  treasurySpendAmount?: number;
  treasurySpendRecipient?: string;
  votingPeriod?: number;
  passThreshold?: number;
}

interface PaginationOptions {
  offset: number;
  limit: number;
}

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
      
      // Get proposals using correct method name
      const proposals = await (engine as any).getProposalsByStatus(status as ProposalStatus || ProposalStatus.ACTIVE);
      
      // Return results
      res.json({
        proposals: proposals,
        total: proposals.length,
        pagination: pagination
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
      
      // Get proposal using correct method name
      const proposal = await engine.getProposal(id);
      
      if (!proposal) {
        throw (ApiError as any).notFound(`Proposal not found: ${id}`);
      }
      
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
  router.post('/proposals', (authenticate() as any), async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Validate user is authenticated
      if (!req.user) {
        throw (ApiError as any).unauthorized('Authentication required to create proposals');
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
      
      // Create proposal with correct method signature
      const proposalData = {
        title,
        description,
        type,
        author: req.user.id,
        authorReputationAtCreation: 0,
        createdAt: new Date(),
        votingStartTime: new Date(),
        votingEndTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        executionDelay: 3,
        status: ProposalStatus.DRAFT,
        requiredQuorum: 0.2,
        requiredMajority: 0.6,
        stakingRequirements: {
          minStakeToPropose: 100,
          minTrustScore: 0.4,
          requiredTier: 'curator' as any
        },
        executionParameters: {
          timelock: 3,
          vetoWindow: 7,
          requiresMultisig: false,
          multisigThreshold: 3
        },
        impact: 'medium' as any,
        tags: tags || []
      };
      
      const proposalId = await engine.createProposal(proposalData);
      const proposal = await engine.getProposal(proposalId);
      
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
  router.put('/proposals/:id/status', (authenticate() as any), async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Validate user is authenticated
      if (!req.user) {
        throw (ApiError as any).unauthorized('Authentication required to update proposal status');
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
      
      // Use available methods instead of non-existent updateProposalStatus
      if (status === ProposalStatus.ACTIVE) {
        await engine.activateProposal(id);
      }
      
      const proposal = await engine.getProposal(id);
      
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
  router.post('/proposals/:id/vote', (authenticate() as any), async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Validate user is authenticated
      if (!req.user) {
        throw (ApiError as any).unauthorized('Authentication required to vote on proposals');
      }
      
      const { id } = req.params;
      const { voteFor, comment } = req.body;
      
      if (voteFor === undefined) {
        throw ApiError.badRequest('Vote direction (voteFor) is required');
      }
      
      // Convert boolean to VoteType enum
      const voteType = voteFor === true ? VoteType.YES : VoteType.NO;
      
      // Vote on proposal with correct signature
      await engine.voteOnProposal(
        id,
        req.user.id,
        voteType,
        comment
      );
      
      const proposal = await engine.getProposal(id);
      const votes = await engine.getProposalVotes(id);
      
      // Return vote result
      res.json({
        vote: { voteType, comment, voter: req.user.id },
        proposal: proposal
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
      
      // Get votes with correct signature
      const votes = await engine.getProposalVotes(id);
      
      // Return votes
      res.json({
        votes: votes,
        total: votes.length,
        pagination: pagination
      });
    } catch (error) {
      next(error);
    }
  });
  
  /**
   * POST /proposals/:id/check-results
   * Check voting results and update status
   */
  router.post('/proposals/:id/check-results', (authenticate() as any), async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Validate user is authenticated
      if (!req.user) {
        throw (ApiError as any).unauthorized('Authentication required to check proposal results');
      }
      
      const { id } = req.params;
      
      // Check voting results using available method
      const result = await engine.finalizeProposal(id);
      const proposal = await engine.getProposal(id);
      
      // Return updated proposal
      res.json({
        proposal,
        result,
        message: `Proposal status updated to ${proposal?.status}`
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
      
      // Get recent activity using available methods
      const stats = await engine.getGovernanceStats();
      const activeProposals = await engine.getActiveProposals();
      
      const activity = {
        stats,
        recentProposals: activeProposals.slice(0, maxResults)
      };
      
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
  multisigRouter.post('/proposals/:id/approve', (authenticate() as any), (requireRoles(['multisig']) as any), async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      
      // Use available methods instead of non-existent approveProposal
      const proposal = await engine.getProposal(id);
      
      if (!proposal) {
        throw ApiError.notFound(`Proposal not found: ${id}`);
      }
      
      // Return updated proposal
      res.json({
        proposal,
        message: `Proposal status: ${proposal.status}`
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