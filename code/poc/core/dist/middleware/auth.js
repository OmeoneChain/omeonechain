"use strict";
// File: code/poc/core/src/middleware/auth.ts
// Real backend authentication middleware
Object.defineProperty(exports, "__esModule", { value: true });
exports.createAuthRoutes = exports.optionalAuth = exports.authenticateToken = void 0;
const jwt_1 = require("../utils/jwt");
// Authentication middleware
const authenticateToken = (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        const token = jwt_1.JWTUtils.extractTokenFromHeader(authHeader);
        if (!token) {
            res.status(401).json({
                success: false,
                message: 'Access token required',
            });
            return;
        }
        // Verify token
        const payload = jwt_1.JWTUtils.verifyToken(token);
        // Get user data
        const user = jwt_1.UserManager.findById(payload.userId);
        if (!user) {
            res.status(401).json({
                success: false,
                message: 'User not found',
            });
            return;
        }
        // Add user to request
        req.user = {
            id: user.id,
            address: user.address,
            username: user.username,
            display_name: user.display_name,
            verification_status: user.verification_status,
        };
        next();
    }
    catch (error) {
        console.error('Authentication error:', error);
        if (error.message === 'Token expired') {
            res.status(401).json({
                success: false,
                message: 'Token expired',
                code: 'TOKEN_EXPIRED',
            });
        }
        else if (error.message === 'Invalid token') {
            res.status(401).json({
                success: false,
                message: 'Invalid token',
                code: 'INVALID_TOKEN',
            });
        }
        else {
            res.status(401).json({
                success: false,
                message: 'Authentication failed',
            });
        }
    }
};
exports.authenticateToken = authenticateToken;
// Optional authentication middleware (doesn't fail if no token)
const optionalAuth = (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        const token = jwt_1.JWTUtils.extractTokenFromHeader(authHeader);
        if (!token) {
            next();
            return;
        }
        // Try to verify token
        const payload = jwt_1.JWTUtils.verifyToken(token);
        const user = jwt_1.UserManager.findById(payload.userId);
        if (user) {
            req.user = {
                id: user.id,
                address: user.address,
                username: user.username,
                display_name: user.display_name,
                verification_status: user.verification_status,
            };
        }
        next();
    }
    catch (error) {
        // Ignore authentication errors for optional auth
        next();
    }
};
exports.optionalAuth = optionalAuth;
// Authentication routes
const createAuthRoutes = () => {
    const router = require('express').Router();
    // Get authentication challenge
    router.post('/challenge', (req, res) => {
        try {
            const { address } = req.body;
            if (!address) {
                res.status(400).json({
                    success: false,
                    message: 'Wallet address is required',
                });
                return;
            }
            // Validate Ethereum address format
            if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
                res.status(400).json({
                    success: false,
                    message: 'Invalid Ethereum address format',
                });
                return;
            }
            const { challenge, expires_at } = jwt_1.JWTUtils.generateChallenge(address);
            res.json({
                success: true,
                challenge,
                expires_at: expires_at.toISOString(),
                message: jwt_1.JWTUtils.createAuthMessage(challenge, address),
            });
        }
        catch (error) {
            console.error('Challenge generation error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to generate challenge',
            });
        }
    });
    // Verify signature and authenticate
    router.post('/verify', async (req, res) => {
        try {
            const { address, signature, challenge } = req.body;
            if (!address || !signature || !challenge) {
                res.status(400).json({
                    success: false,
                    message: 'Address, signature, and challenge are required',
                });
                return;
            }
            // Verify challenge
            if (!jwt_1.JWTUtils.verifyChallenge(challenge, address)) {
                res.status(400).json({
                    success: false,
                    message: 'Invalid or expired challenge',
                });
                return;
            }
            // Create message and verify signature
            const message = jwt_1.JWTUtils.createAuthMessage(challenge, address);
            const isValidSignature = await jwt_1.SignatureUtils.verifyWeb3Signature(message, signature, address);
            if (!isValidSignature) {
                res.status(400).json({
                    success: false,
                    message: 'Invalid signature',
                });
                return;
            }
            // Find or create user
            let user = jwt_1.UserManager.findByAddress(address);
            if (!user) {
                user = jwt_1.UserManager.createUser(address);
            }
            // Generate JWT token
            const token = jwt_1.JWTUtils.generateToken({
                userId: user.id,
                address: user.address,
            });
            // Get user stats
            const stats = jwt_1.UserManager.getUserStats(user.id);
            res.json({
                success: true,
                token,
                user: {
                    id: user.id,
                    address: user.address,
                    username: user.username,
                    display_name: user.display_name,
                    avatar_url: user.avatar_url,
                    verification_status: user.verification_status,
                    created_at: user.created_at,
                    ...stats,
                },
            });
        }
        catch (error) {
            console.error('Signature verification error:', error);
            res.status(500).json({
                success: false,
                message: 'Authentication failed',
            });
        }
    });
    // Get current user
    router.get('/me', exports.authenticateToken, (req, res) => {
        try {
            if (!req.user) {
                res.status(401).json({
                    success: false,
                    message: 'User not found',
                });
                return;
            }
            const user = jwt_1.UserManager.findById(req.user.id);
            if (!user) {
                res.status(404).json({
                    success: false,
                    message: 'User not found',
                });
                return;
            }
            const stats = jwt_1.UserManager.getUserStats(user.id);
            res.json({
                success: true,
                user: {
                    id: user.id,
                    address: user.address,
                    username: user.username,
                    display_name: user.display_name,
                    avatar_url: user.avatar_url,
                    verification_status: user.verification_status,
                    created_at: user.created_at,
                    ...stats,
                },
            });
        }
        catch (error) {
            console.error('Get user error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to get user information',
            });
        }
    });
    // Refresh token
    router.post('/refresh', exports.authenticateToken, (req, res) => {
        try {
            if (!req.user) {
                res.status(401).json({
                    success: false,
                    message: 'User not found',
                });
                return;
            }
            const user = jwt_1.UserManager.findById(req.user.id);
            if (!user) {
                res.status(404).json({
                    success: false,
                    message: 'User not found',
                });
                return;
            }
            // Generate new token
            const newToken = jwt_1.JWTUtils.generateToken({
                userId: user.id,
                address: user.address,
            });
            const stats = jwt_1.UserManager.getUserStats(user.id);
            res.json({
                success: true,
                token: newToken,
                user: {
                    id: user.id,
                    address: user.address,
                    username: user.username,
                    display_name: user.display_name,
                    avatar_url: user.avatar_url,
                    verification_status: user.verification_status,
                    created_at: user.created_at,
                    ...stats,
                },
            });
        }
        catch (error) {
            console.error('Token refresh error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to refresh token',
            });
        }
    });
    // Update user profile
    router.put('/profile', exports.authenticateToken, (req, res) => {
        try {
            if (!req.user) {
                res.status(401).json({
                    success: false,
                    message: 'User not found',
                });
                return;
            }
            const { username, display_name, avatar_url } = req.body;
            const updates = {};
            if (username)
                updates.username = username;
            if (display_name)
                updates.display_name = display_name;
            if (avatar_url)
                updates.avatar_url = avatar_url;
            const updatedUser = jwt_1.UserManager.updateUser(req.user.id, updates);
            if (!updatedUser) {
                res.status(404).json({
                    success: false,
                    message: 'User not found',
                });
                return;
            }
            const stats = jwt_1.UserManager.getUserStats(updatedUser.id);
            res.json({
                success: true,
                user: {
                    id: updatedUser.id,
                    address: updatedUser.address,
                    username: updatedUser.username,
                    display_name: updatedUser.display_name,
                    avatar_url: updatedUser.avatar_url,
                    verification_status: updatedUser.verification_status,
                    created_at: updatedUser.created_at,
                    updated_at: updatedUser.updated_at,
                    ...stats,
                },
            });
        }
        catch (error) {
            console.error('Profile update error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to update profile',
            });
        }
    });
    return router;
};
exports.createAuthRoutes = createAuthRoutes;
//# sourceMappingURL=auth.js.map