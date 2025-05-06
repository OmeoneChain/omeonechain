/**
 * Token API Routes
 * 
 * API endpoints for token operations and wallet management
 * Based on Technical Specifications A.4.1
 */

import express, { Request, Response, NextFunction } from 'express';
import { TokenEngine } from '../../token/engine';
import { ApiError } from '../middleware/error-handler';
import { authenticate, requireRoles } from '../middleware/auth';

/**
 * Create token routes
 * 
 * @param engine Token engine instance
 * @returns Express router
 */
export function createTokenRoutes(engine: TokenEngine) {
  const router = express.Router();
  
  /**
   * GET /wallet
   * Get wallet balance
   */
  router.get('/', authenticate(), async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Validate user is authenticated
      if (!req.user) {
        throw ApiError.unauthorized('Authentication required to view wallet');
      }
      
      // Get token balance
      const balance = await engine.getTokenBalance(req.user.id);
      
      // Return balance
      res.json({
        userId: balance.userId,
        available: balance.available,
        staked: balance.staked,
        pendingRewards: balance.pendingRewards,
        total: balance.available + balance.staked + balance.pendingRewards
      });
    } catch (error) {
      next(error);
    }
  });
  
  /**
   * GET /wallet/transactions
   * List transactions
   */
  router.get('/transactions', authenticate(), async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Validate user is authenticated
      if (!req.user) {
        throw ApiError.unauthorized('Authentication required to view transactions');
      }
      
      // Parse query parameters
      const { type, offset, limit } = req.query;
      
      // Get transactions
      const result = await engine.getUserTransactions(
        req.user.id,
        type as any,
        {
          offset: offset ? parseInt(offset as string, 10) : 0,
          limit: limit ? parseInt(limit as string, 10) : 20
        }
      );
      
      // Return transactions
      res.json({
        transactions: result.transactions,
        total: result.total,
        pagination: result.pagination
      });
    } catch (error) {
      next(error);
    }
  });
  
  /**
   * POST /wallet/transfer
   * Transfer tokens
   */
  router.post('/transfer', authenticate(), async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Validate user is authenticated
      if (!req.user) {
        throw ApiError.unauthorized('Authentication required to transfer tokens');
      }
      
      const { recipient, amount, reference } = req.body;
      
      // Validate required fields
      if (!recipient) {
        throw ApiError.badRequest('Recipient is required');
      }
      
      if (!amount || amount <= 0) {
        throw ApiError.badRequest('Amount must be greater than zero');
      }
      
      // Transfer tokens
      const transaction = await engine.transferTokens(
        req.user.id,
        recipient,
        amount,
        reference
      );
      
      // Return transaction
      res.json({
        transactionId: transaction.transactionId,
        sender: transaction.sender,
        recipient: transaction.recipient,
        amount: transaction.amount,
        timestamp: transaction.timestamp,
        type: transaction.type,
        actionReference: transaction.actionReference
      });
    } catch (error) {
      next(error);
    }
  });
  
  /**
   * POST /wallet/stake
   * Stake tokens
   */
  router.post('/stake', authenticate(), async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Validate user is authenticated
      if (!req.user) {
        throw ApiError.unauthorized('Authentication required to stake tokens');
      }
      
      const { amount, duration } = req.body;
      
      // Validate required fields
      if (!amount || amount <= 0) {
        throw ApiError.badRequest('Amount must be greater than zero');
      }
      
      if (!duration || duration <= 0) {
        throw ApiError.badRequest('Duration must be greater than zero');
      }
      
      // Stake tokens
      const transaction = await engine.stakeTokens(
        req.user.id,
        amount,
        duration
      );
      
      // Get updated balance
      const balance = await engine.getTokenBalance(req.user.id);
      
      // Return result
      res.json({
        transaction: {
          transactionId: transaction.transactionId,
          amount: transaction.amount,
          timestamp: transaction.timestamp,
          type: transaction.type,
          actionReference: transaction.actionReference
        },
        balance: {
          available: balance.available,
          staked: balance.staked,
          pendingRewards: balance.pendingRewards,
          total: balance.available + balance.staked + balance.pendingRewards
        }
      });
    } catch (error) {
      next(error);
    }
  });
  
  /**
   * POST /wallet/unstake
   * Unstake tokens
   */
  router.post('/unstake', authenticate(), async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Validate user is authenticated
      if (!req.user) {
        throw ApiError.unauthorized('Authentication required to unstake tokens');
      }
      
      const { amount, stakingId } = req.body;
      
      // Validate required fields
      if (!amount || amount <= 0) {
        throw ApiError.badRequest('Amount must be greater than zero');
      }
      
      if (!stakingId) {
        throw ApiError.badRequest('Staking transaction ID is required');
      }
      
      // Unstake tokens
      const transaction = await engine.unstakeTokens(
        req.user.id,
        amount,
        stakingId
      );
      
      // Get updated balance
      const balance = await engine.getTokenBalance(req.user.id);
      
      // Return result
      res.json({
        transaction: {
          transactionId: transaction.transactionId,
          amount: transaction.amount,
          timestamp: transaction.timestamp,
          type: transaction.type,
          actionReference: transaction.actionReference
        },
        balance: {
          available: balance.available,
          staked: balance.staked,
          pendingRewards: balance.pendingRewards,
          total: balance.available + balance.staked + balance.pendingRewards
        }
      });
    } catch (error) {
      next(error);
    }
  });
  
  /**
   * GET /rewards
   * Get reward statistics
   */
  router.get('/rewards', authenticate(), async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Validate user is authenticated
      if (!req.user) {
        throw ApiError.unauthorized('Authentication required to view rewards');
      }
      
      // Get transactions of type REWARD
      const result = await engine.getUserTransactions(
        req.user.id,
        'reward',
        {
          offset: 0,
          limit: 100
        }
      );
      
      // Calculate total rewards
      const totalRewards = result.transactions.reduce((sum, tx) => {
        // Include only transactions where user is recipient
        if (tx.recipient === req.user!.id) {
          return sum + tx.amount;
        }
        return sum;
      }, 0);
      
      // Get latest rewards (last 5)
      const latestRewards = result.transactions
        .filter(tx => tx.recipient === req.user!.id)
        .slice(0, 5);
      
      // Return reward statistics
      res.json({
        totalRewards,
        rewardCount: result.transactions.length,
        latestRewards
      });
    } catch (error) {
      next(error);
    }
  });
  
  /**
   * GET /transaction/:id
   * Get transaction details
   */
  router.get('/transaction/:id', authenticate(), async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Validate user is authenticated
      if (!req.user) {
        throw ApiError.unauthorized('Authentication required to view transactions');
      }
      
      const { id } = req.params;
      
      // Get transaction
      const transaction = await engine.getTransaction(id);
      
      if (!transaction) {
        throw ApiError.notFound(`Transaction not found: ${id}`);
      }
      
      // Verify user is involved in transaction
      if (transaction.sender !== req.user.id && transaction.recipient !== req.user.id) {
        throw ApiError.forbidden('You can only view your own transactions');
      }
      
      // Return transaction
      res.json(transaction);
    } catch (error) {
      next(error);
    }
  });
  
  // Service fee routes (for vendors)
  const vendorRouter = express.Router();
  
  /**
   * POST /service-fee
   * Process a service fee (for vendors)
   */
  vendorRouter.post('/service-fee', authenticate(), requireRoles(['vendor']), async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { amount, reference } = req.body;
      
      // Validate required fields
      if (!amount || amount <= 0) {
        throw ApiError.badRequest('Amount must be greater than zero');
      }
      
      if (!reference) {
        throw ApiError.badRequest('Reference is required');
      }
      
      // Process service fee
      const result = await engine.processServiceFee(amount, reference);
      
      // Return result
      res.json({
        burn: {
          transactionId: result.burnTx.transactionId,
          amount: result.burnTx.amount
        },
        treasury: {
          transactionId: result.treasuryTx.transactionId,
          amount: result.treasuryTx.amount
        },
        totalFee: amount
      });
    } catch (error) {
      next(error);
    }
  });
  
  // Add vendor routes to main router
  router.use(vendorRouter);
  
  return router;
}

export default createTokenRoutes;
