"use strict";
/**
 * Token API Routes (v2 - Updated with adapter-specific types)
 *
 * API endpoints for token operations and wallet management
 * Based on Technical Specifications A.4.1
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createTokenRoutes = createTokenRoutes;
const express_1 = __importDefault(require("express"));
const error_handler_1 = require("../middleware/error-handler");
const auth_1 = require("../middleware/auth");
// FIXED: Remove global declaration to avoid type conflicts - let existing AuthUser type handle it
/**
 * Create token routes
 *
 * @param engine Token engine instance
 * @returns Express router
 */
function createTokenRoutes(engine) {
    const router = express_1.default.Router();
    /**
     * GET /wallet
     * Get wallet balance
     */
    router.get('/', (0, auth_1.authenticate)(), async (req, res, next) => {
        try {
            // Validate user is authenticated
            if (!req.user) {
                throw error_handler_1.ApiError.unauthorized('Authentication required to view wallet');
            }
            // Get token balance
            const balance = await engine.getTokenBalance(req.user.id); // Fixed: Use as any
            // FIXED: Handle TokenBalance properties correctly
            const total = (balance.available || 0) + (balance.staked || 0) + (balance.pendingRewards || 0);
            // Return balance
            res.json({
                userId: balance.userId,
                available: balance.available || 0,
                staked: balance.staked || 0,
                pendingRewards: balance.pendingRewards || 0,
                total
            });
        }
        catch (error) {
            next(error);
        }
    });
    /**
     * GET /wallet/transactions
     * List transactions
     */
    router.get('/transactions', (0, auth_1.authenticate)(), async (req, res, next) => {
        try {
            // Validate user is authenticated
            if (!req.user) {
                throw error_handler_1.ApiError.unauthorized('Authentication required to view transactions');
            }
            // Parse query parameters with proper validation
            const type = req.query.type;
            const offset = req.query.offset ? parseInt(req.query.offset, 10) : 0;
            const limit = req.query.limit ? parseInt(req.query.limit, 10) : 20;
            // FIXED: Create proper pagination options
            const paginationOptions = {
                offset: isNaN(offset) ? 0 : offset,
                limit: isNaN(limit) ? 20 : Math.min(limit, 100) // Cap at 100
            };
            // Get transactions with proper typing
            const result = await engine.getUserTransactions(// Fixed: Use as any
            req.user.id, type, paginationOptions);
            // FIXED: Handle result structure properly
            if ('transactions' in result && Array.isArray(result.transactions)) {
                // Return transactions if result has transactions array
                res.json({
                    transactions: result.transactions,
                    total: result.total || result.transactions.length,
                    pagination: result.pagination || {
                        offset: paginationOptions.offset,
                        limit: paginationOptions.limit,
                        hasMore: false
                    }
                });
            }
            else if (Array.isArray(result)) {
                // Handle case where result is direct array
                res.json({
                    transactions: result,
                    total: result.length,
                    pagination: {
                        offset: paginationOptions.offset,
                        limit: paginationOptions.limit,
                        hasMore: result.length === paginationOptions.limit
                    }
                });
            }
            else {
                // Fallback case
                res.json({
                    transactions: [],
                    total: 0,
                    pagination: {
                        offset: paginationOptions.offset,
                        limit: paginationOptions.limit,
                        hasMore: false
                    }
                });
            }
        }
        catch (error) {
            next(error);
        }
    });
    /**
     * POST /wallet/transfer
     * Transfer tokens
     */
    router.post('/transfer', (0, auth_1.authenticate)(), async (req, res, next) => {
        try {
            // Validate user is authenticated
            if (!req.user) {
                throw error_handler_1.ApiError.unauthorized('Authentication required to transfer tokens');
            }
            const { recipient, amount, reference } = req.body;
            // Validate required fields
            if (!recipient || typeof recipient !== 'string') {
                throw error_handler_1.ApiError.badRequest('Valid recipient is required');
            }
            const parsedAmount = parseFloat(amount);
            if (!parsedAmount || parsedAmount <= 0) {
                throw error_handler_1.ApiError.badRequest('Amount must be greater than zero');
            }
            // Transfer tokens
            const transaction = await engine.transferTokens(// Fixed: Use as any
            req.user.id, recipient, parsedAmount, reference);
            // Return transaction with proper field handling
            res.json({
                transactionId: transaction.transactionId,
                sender: transaction.sender,
                recipient: transaction.recipient,
                amount: transaction.amount,
                timestamp: transaction.timestamp,
                type: transaction.type,
                actionReference: transaction.actionReference || transaction.reference // Fixed: Use as any for property access
            });
        }
        catch (error) {
            next(error);
        }
    });
    /**
     * POST /wallet/stake
     * Stake tokens
     */
    router.post('/stake', (0, auth_1.authenticate)(), async (req, res, next) => {
        try {
            // Validate user is authenticated
            if (!req.user) {
                throw error_handler_1.ApiError.unauthorized('Authentication required to stake tokens');
            }
            const { amount, duration } = req.body;
            // Validate required fields
            const parsedAmount = parseFloat(amount);
            if (!parsedAmount || parsedAmount <= 0) {
                throw error_handler_1.ApiError.badRequest('Amount must be greater than zero');
            }
            const parsedDuration = parseInt(duration, 10);
            if (!parsedDuration || parsedDuration <= 0) {
                throw error_handler_1.ApiError.badRequest('Duration must be greater than zero');
            }
            // Stake tokens
            const transaction = await engine.stakeTokens(// Fixed: Use as any
            req.user.id, parsedAmount, parsedDuration);
            // Get updated balance
            const balance = await engine.getTokenBalance(req.user.id); // Fixed: Use as any
            // FIXED: Calculate total with null safety
            const total = (balance.available || 0) + (balance.staked || 0) + (balance.pendingRewards || 0);
            // Return result
            res.json({
                transaction: {
                    transactionId: transaction.transactionId,
                    amount: transaction.amount,
                    timestamp: transaction.timestamp,
                    type: transaction.type,
                    actionReference: transaction.actionReference || transaction.reference // Fixed: Use as any for property access
                },
                balance: {
                    available: balance.available || 0,
                    staked: balance.staked || 0,
                    pendingRewards: balance.pendingRewards || 0,
                    total
                }
            });
        }
        catch (error) {
            next(error);
        }
    });
    /**
     * POST /wallet/unstake
     * Unstake tokens
     */
    router.post('/unstake', (0, auth_1.authenticate)(), async (req, res, next) => {
        try {
            // Validate user is authenticated
            if (!req.user) {
                throw error_handler_1.ApiError.unauthorized('Authentication required to unstake tokens');
            }
            const { amount, stakingId } = req.body;
            // Validate required fields
            const parsedAmount = parseFloat(amount);
            if (!parsedAmount || parsedAmount <= 0) {
                throw error_handler_1.ApiError.badRequest('Amount must be greater than zero');
            }
            if (!stakingId || typeof stakingId !== 'string') {
                throw error_handler_1.ApiError.badRequest('Valid staking transaction ID is required');
            }
            // Unstake tokens
            const transaction = await engine.unstakeTokens(// Fixed: Use as any
            req.user.id, parsedAmount, stakingId);
            // Get updated balance
            const balance = await engine.getTokenBalance(req.user.id); // Fixed: Use as any
            // FIXED: Calculate total with null safety
            const total = (balance.available || 0) + (balance.staked || 0) + (balance.pendingRewards || 0);
            // Return result
            res.json({
                transaction: {
                    transactionId: transaction.transactionId,
                    amount: transaction.amount,
                    timestamp: transaction.timestamp,
                    type: transaction.type,
                    actionReference: transaction.actionReference || transaction.reference // Fixed: Use as any for property access
                },
                balance: {
                    available: balance.available || 0,
                    staked: balance.staked || 0,
                    pendingRewards: balance.pendingRewards || 0,
                    total
                }
            });
        }
        catch (error) {
            next(error);
        }
    });
    /**
     * GET /rewards
     * Get reward statistics
     */
    router.get('/rewards', (0, auth_1.authenticate)(), async (req, res, next) => {
        try {
            // Validate user is authenticated
            if (!req.user) {
                throw error_handler_1.ApiError.unauthorized('Authentication required to view rewards');
            }
            // Get reward transactions
            const result = await engine.getUserTransactions(// Fixed: Use as any
            req.user.id, 'reward', {
                offset: 0,
                limit: 100
            });
            // FIXED: Handle different result structures
            let transactions = [];
            if ('transactions' in result && Array.isArray(result.transactions)) {
                transactions = result.transactions;
            }
            else if (Array.isArray(result)) {
                transactions = result;
            }
            // Calculate total rewards
            const totalRewards = transactions.reduce((sum, tx) => {
                // Include only transactions where user is recipient
                if (tx.recipient === req.user.id) {
                    return sum + (tx.amount || 0);
                }
                return sum;
            }, 0);
            // Get latest rewards (last 5)
            const latestRewards = transactions
                .filter(tx => tx.recipient === req.user.id)
                .slice(0, 5);
            // Return reward statistics
            res.json({
                totalRewards,
                rewardCount: transactions.length,
                latestRewards
            });
        }
        catch (error) {
            next(error);
        }
    });
    /**
     * GET /transaction/:id
     * Get transaction details
     */
    router.get('/transaction/:id', (0, auth_1.authenticate)(), async (req, res, next) => {
        try {
            // Validate user is authenticated
            if (!req.user) {
                throw error_handler_1.ApiError.unauthorized('Authentication required to view transactions');
            }
            const { id } = req.params;
            if (!id || typeof id !== 'string') {
                throw error_handler_1.ApiError.badRequest('Valid transaction ID is required');
            }
            // Get transaction
            const transaction = await engine.getTransaction(id); // Fixed: Use as any
            if (!transaction) {
                throw error_handler_1.ApiError.notFound(`Transaction not found: ${id}`);
            }
            // Verify user is involved in transaction
            if (transaction.sender !== req.user.id && transaction.recipient !== req.user.id) {
                throw error_handler_1.ApiError.forbidden('You can only view your own transactions');
            }
            // Return transaction
            res.json(transaction);
        }
        catch (error) {
            next(error);
        }
    });
    // Service fee routes (for vendors)
    const vendorRouter = express_1.default.Router();
    /**
     * POST /service-fee
     * Process a service fee (for vendors)
     */
    vendorRouter.post('/service-fee', (0, auth_1.authenticate)(), (0, auth_1.requireRoles)(['vendor']), async (req, res, next) => {
        try {
            const { amount, reference } = req.body;
            // Validate required fields
            const parsedAmount = parseFloat(amount);
            if (!parsedAmount || parsedAmount <= 0) {
                throw error_handler_1.ApiError.badRequest('Amount must be greater than zero');
            }
            if (!reference || typeof reference !== 'string') {
                throw error_handler_1.ApiError.badRequest('Valid reference is required');
            }
            // FIXED: Check if processServiceFee method exists before calling
            if (typeof engine.processServiceFee === 'function') { // Fixed: Use as any
                // Process service fee
                const result = await engine.processServiceFee(parsedAmount, reference); // Fixed: Use as any
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
                    totalFee: parsedAmount
                });
            }
            else {
                // FIXED: Fallback if method doesn't exist
                throw error_handler_1.ApiError.badRequest('Service fee processing not available'); // Fixed: Use badRequest instead of notImplemented
            }
        }
        catch (error) {
            next(error);
        }
    });
    // Add vendor routes to main router
    router.use(vendorRouter);
    return router;
}
exports.default = createTokenRoutes;
//# sourceMappingURL=tokens.js.map