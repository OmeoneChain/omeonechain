"use strict";
/**
 * Authentication Middleware
 *
 * Handles authentication for protected API routes
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateToken = generateToken;
exports.verifyToken = verifyToken;
exports.authenticate = authenticate;
exports.requireRoles = requireRoles;
exports.createAuthRoutes = createAuthRoutes;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
/**
 * Default authentication options
 */
const DEFAULT_OPTIONS = {
    secret: process.env.JWT_SECRET || 'omeonechain-dev-secret',
    expiresIn: 86400, // 24 hours
    allowUnauthenticated: process.env.NODE_ENV === 'development'
};
/**
 * Generate a JWT token for a user
 *
 * @param user User authentication information
 * @param options Authentication options
 * @returns JWT token
 */
function generateToken(user, options = {}) {
    const opts = { ...DEFAULT_OPTIONS, ...options };
    return jsonwebtoken_1.default.sign(user, opts.secret, {
        expiresIn: opts.expiresIn
    });
}
/**
 * Verify a JWT token
 *
 * @param token JWT token
 * @param options Authentication options
 * @returns Decoded user information
 */
function verifyToken(token, options = {}) {
    const opts = { ...DEFAULT_OPTIONS, ...options };
    return jsonwebtoken_1.default.verify(token, opts.secret);
}
/**
 * Authentication middleware
 *
 * @param options Authentication options
 * @returns Express middleware function
 */
function authenticate(options = {}) {
    const opts = { ...DEFAULT_OPTIONS, ...options };
    return (req, res, next) => {
        // Allow unauthenticated access in development mode
        if (opts.allowUnauthenticated && process.env.NODE_ENV === 'development') {
            // Set a default development user
            req.user = {
                id: 'dev-user',
                walletAddress: '0xDevelopmentUser',
                roles: ['user', 'admin']
            };
            return next();
        }
        // Get token from header or query parameter
        const authHeader = req.headers.authorization;
        const token = authHeader?.startsWith('Bearer ')
            ? authHeader.substring(7)
            : req.query.token;
        if (!token) {
            return res.status(401).json({ error: 'Authentication token required' });
        }
        try {
            // Verify token
            const decoded = verifyToken(token, opts);
            req.user = decoded;
            // Check required roles if specified
            if (opts.requiredRoles && opts.requiredRoles.length > 0) {
                const hasRequiredRole = opts.requiredRoles.some(role => req.user?.roles?.includes(role));
                if (!hasRequiredRole) {
                    return res.status(403).json({ error: 'Insufficient permissions' });
                }
            }
            next();
        }
        catch (error) {
            return res.status(401).json({ error: 'Invalid or expired token' });
        }
    };
}
/**
 * Require specific roles for route access
 *
 * @param roles Required roles
 * @returns Express middleware function
 */
function requireRoles(roles) {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ error: 'Authentication required' });
        }
        const hasRequiredRole = roles.some(role => req.user?.roles?.includes(role));
        if (!hasRequiredRole) {
            return res.status(403).json({ error: 'Insufficient permissions' });
        }
        next();
    };
}
/**
 * Create authentication routes for Express
 *
 * @param router Express router
 * @param options Authentication options
 */
function createAuthRoutes(router, options = {}) {
    const opts = { ...DEFAULT_OPTIONS, ...options };
    // Login route
    router.post('/login', (req, res) => {
        const { walletAddress, signature } = req.body;
        if (!walletAddress || !signature) {
            return res.status(400).json({ error: 'Wallet address and signature required' });
        }
        // In a real implementation, verify the signature against the wallet address
        // This is a simplified version for demonstration
        const user = {
            id: walletAddress, // Use wallet address as user ID
            walletAddress,
            roles: ['user']
        };
        // Generate token
        const token = generateToken(user, opts);
        res.json({
            token,
            user
        });
    });
    // Verify token route
    router.post('/verify', (req, res) => {
        const { token } = req.body;
        if (!token) {
            return res.status(400).json({ error: 'Token required' });
        }
        try {
            const decoded = verifyToken(token, opts);
            res.json({ valid: true, user: decoded });
        }
        catch (error) {
            res.json({ valid: false });
        }
    });
    return router;
}
exports.default = authenticate;
//# sourceMappingURL=auth.js.map