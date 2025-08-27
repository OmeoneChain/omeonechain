"use strict";
// File: code/poc/core/src/routes/users.ts
// User management routes with progressive Web3 support
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const router = express_1.default.Router();
// Mock user data (in production, use database)
const mockUsers = [
    {
        id: 'user_123abc',
        address: '0x1234567890123456789012345678901234567890',
        email: 'alice@example.com',
        username: 'alice_crypto',
        display_name: 'Alice',
        avatar_url: null,
        verification_status: 'verified',
        auth_mode: 'wallet',
        tokens_earned: 45.75,
        trust_score: 8.2,
        pending_tokens: 0,
        created_at: '2024-01-15T10:30:00Z'
    },
    {
        id: 'email_456def',
        email: 'bob@example.com',
        username: 'bob_newbie',
        display_name: 'Bob',
        avatar_url: null,
        verification_status: 'basic',
        auth_mode: 'email',
        tokens_earned: 0,
        trust_score: 0,
        pending_tokens: 12.5,
        created_at: '2024-02-20T14:15:00Z'
    }
];
// GET /api/users - Get users list with progressive Web3 fields
router.get('/', async (req, res) => {
    try {
        const limit = Math.min(parseInt(req.query.limit) || 10, 50);
        const offset = parseInt(req.query.offset) || 0;
        const users = mockUsers.slice(offset, offset + limit);
        res.json({
            success: true,
            users,
            pagination: {
                limit,
                offset,
                total: mockUsers.length,
                hasMore: offset + limit < mockUsers.length
            }
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to fetch users',
            error: error.message
        });
    }
});
// GET /api/users/:id - Get specific user
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const user = mockUsers.find(u => u.id === id);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }
        res.json({
            success: true,
            user
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to fetch user',
            error: error.message
        });
    }
});
// GET /api/users/:id/stats - Get user statistics
router.get('/:id/stats', async (req, res) => {
    try {
        const { id } = req.params;
        const user = mockUsers.find(u => u.id === id);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }
        // Mock stats
        const stats = {
            recommendations_count: 23,
            upvotes_received: 156,
            trust_score: user.trust_score,
            tokens_earned: user.tokens_earned,
            pending_tokens: user.pending_tokens || 0,
            auth_mode: user.auth_mode,
            verification_status: user.verification_status,
            followers: 45,
            following: 23,
            social_connections: [
                { user_id: 'user_789', relationship: 'following', trust_weight: 0.75 },
                { user_id: 'user_456', relationship: 'follower', trust_weight: 0.6 }
            ]
        };
        res.json({
            success: true,
            stats
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to fetch user stats',
            error: error.message
        });
    }
});
// POST /api/users/:id/follow - Follow a user
router.post('/:id/follow', async (req, res) => {
    try {
        const { id } = req.params;
        const followerId = req.body.follower_id || 'current_user'; // Would come from JWT in production
        console.log(`📤 User ${followerId} following ${id}`);
        res.json({
            success: true,
            message: 'Successfully followed user',
            relationship: {
                follower_id: followerId,
                following_id: id,
                created_at: new Date().toISOString(),
                trust_weight: 0.75
            }
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to follow user',
            error: error.message
        });
    }
});
// DELETE /api/users/:id/follow - Unfollow a user
router.delete('/:id/follow', async (req, res) => {
    try {
        const { id } = req.params;
        const followerId = req.body.follower_id || 'current_user';
        console.log(`📤 User ${followerId} unfollowing ${id}`);
        res.json({
            success: true,
            message: 'Successfully unfollowed user'
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to unfollow user',
            error: error.message
        });
    }
});
// POST /api/users/:id/pending-tokens - Add pending tokens (for email users)
router.post('/:id/pending-tokens', async (req, res) => {
    try {
        const { id } = req.params;
        const { amount } = req.body;
        if (!amount || amount <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Invalid token amount'
            });
        }
        const user = mockUsers.find(u => u.id === id);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }
        if (user.auth_mode !== 'email') {
            return res.status(400).json({
                success: false,
                message: 'Only email users can have pending tokens'
            });
        }
        // Update pending tokens
        user.pending_tokens = (user.pending_tokens || 0) + amount;
        console.log(`🪙 Added ${amount} pending tokens to user ${id}`);
        res.json({
            success: true,
            message: `Added ${amount} tokens to pending balance`,
            user: {
                id: user.id,
                pending_tokens: user.pending_tokens,
                auth_mode: user.auth_mode
            }
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to add pending tokens',
            error: error.message
        });
    }
});
exports.default = router;
//# sourceMappingURL=users.js.map