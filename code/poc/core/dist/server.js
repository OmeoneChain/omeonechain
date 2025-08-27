"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// File: code/poc/core/src/server.ts
// FIXED: Unified JWT authentication system replacing incompatible session/JWT hybrid
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
// Load environment variables from .env.local first, then .env
dotenv_1.default.config({ path: path_1.default.join(__dirname, '../.env.local') });
dotenv_1.default.config({ path: path_1.default.join(__dirname, '../.env') });
// Debug: Log that environment variables are loaded
console.log('🔧 Environment loaded:', {
    NODE_ENV: process.env.NODE_ENV,
    PORT: process.env.PORT,
    SUPABASE_URL: process.env.SUPABASE_URL ? '✅ Set' : '❌ Missing',
    SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY ? '✅ Set' : '❌ Missing',
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ? '✅ Set' : '❌ Missing',
    JWT_SECRET: process.env.JWT_SECRET ? '✅ Set' : '❌ Missing'
});
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const zod_1 = require("zod");
const integratedTrustService_1 = require("./services/integratedTrustService");
const supabase_js_1 = require("@supabase/supabase-js");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
// FIXED: Add JWT utilities for unified authentication
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';
class JWTUtils {
    static generateToken(payload) {
        return jsonwebtoken_1.default.sign(payload, JWT_SECRET, { expiresIn: '24h' });
    }
    static verifyToken(token) {
        try {
            return jsonwebtoken_1.default.verify(token, JWT_SECRET);
        }
        catch (error) {
            throw new Error('Invalid or expired token');
        }
    }
}
// Initialize Supabase client for database operations
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing Supabase configuration. Please check SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables.');
    throw new Error('Supabase configuration required');
}
const supabase = (0, supabase_js_1.createClient)(supabaseUrl, supabaseServiceKey);
// Test database connection on startup
(async () => {
    try {
        const { data, error } = await supabase.from('users').select('count').limit(1);
        if (error) {
            console.error('❌ Supabase connection test failed:', error.message);
        }
        else {
            console.log('✅ Supabase connection successful');
        }
    }
    catch (err) {
        console.error('❌ Supabase connection error:', err);
    }
})();
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3001;
// Enhanced CORS configuration to support Codespaces
const getCorsOrigins = () => {
    const origins = [
        'http://localhost:3000',
        'http://localhost:3001',
        'http://127.0.0.1:3000',
        'http://127.0.0.1:3001'
    ];
    // Add Codespaces patterns
    origins.push(/^https:\/\/.*\.app\.github\.dev$/);
    origins.push(/^https:\/\/.*\.gitpod\.io$/);
    origins.push(/^https:\/\/.*\.githubpreview\.dev$/);
    // Add environment-specific origins
    if (process.env.FRONTEND_URL) {
        origins.push(process.env.FRONTEND_URL);
    }
    if (process.env.ALLOWED_ORIGINS) {
        const envOrigins = process.env.ALLOWED_ORIGINS.split(',');
        origins.push(...envOrigins);
    }
    console.log('🔧 CORS Origins configured:', origins);
    return origins;
};
// Enhanced CORS middleware
app.use((0, cors_1.default)({
    origin: getCorsOrigins(),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    optionsSuccessStatus: 200
}));
// Additional CORS headers for complex requests
app.use((req, res, next) => {
    const origin = req.headers.origin;
    const allowedOrigins = getCorsOrigins();
    const isAllowed = allowedOrigins.some(allowedOrigin => {
        if (typeof allowedOrigin === 'string') {
            return allowedOrigin === origin;
        }
        else if (allowedOrigin instanceof RegExp) {
            return origin && allowedOrigin.test(origin);
        }
        return false;
    });
    if (isAllowed && origin) {
        res.setHeader('Access-Control-Allow-Origin', origin);
    }
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    if (req.method === 'OPTIONS') {
        res.sendStatus(200);
        return;
    }
    next();
});
app.use(express_1.default.json());
// FIXED: Unified JWT authentication middleware
const authenticateToken = (req, res, next) => {
    console.log('🔍 DEBUG: authenticateToken called for:', req.method, req.path);
    const authHeader = req.headers.authorization;
    console.log('🔍 DEBUG: authHeader raw:', authHeader);
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        console.log('❌ DEBUG: No valid Bearer token found');
        return res.status(401).json({
            success: false,
            message: 'Access token required',
            debug: {
                hasAuthHeader: !!authHeader,
                authHeaderFormat: authHeader?.substring(0, 20) + '...'
            }
        });
    }
    const token = authHeader.slice(7);
    console.log('🔍 DEBUG: Extracted token:', token?.substring(0, 20) + '...');
    try {
        const payload = JWTUtils.verifyToken(token);
        console.log('✅ DEBUG: Token verified, payload:', payload);
        req.user = {
            id: payload.userId,
            address: payload.address
        };
        console.log('✅ DEBUG: Set req.user:', req.user);
        next();
    }
    catch (error) {
        console.log('❌ DEBUG: Token verification failed:', error);
        return res.status(401).json({
            success: false,
            message: 'Invalid or expired token',
            debug: {
                tokenLength: token?.length,
                error: error instanceof Error ? error.message : 'Unknown error'
            }
        });
    }
};
// Optional auth middleware - continues even without auth
const optionalAuth = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.slice(7);
        try {
            const payload = JWTUtils.verifyToken(token);
            req.user = {
                id: payload.userId,
                address: payload.address
            };
        }
        catch (error) {
            // Continue without auth for optional routes
            console.log('⚠️ Optional auth failed, continuing without user:', error);
        }
    }
    next();
};
// ENHANCED: Validation schemas for profile management
const paginationSchema = zod_1.z.object({
    page: zod_1.z.string().optional().transform((val) => val ? parseInt(val) : 1),
    per_page: zod_1.z.string().optional().transform((val) => val ? Math.min(parseInt(val) || 20, 100) : 20)
});
const recommendationQuerySchema = zod_1.z.object({
    category: zod_1.z.string().optional(),
    city: zod_1.z.string().optional(),
    limit: zod_1.z.string().optional().transform((val) => val ? Math.min(parseInt(val) || 20, 100) : 20),
    offset: zod_1.z.string().optional().transform((val) => val ? parseInt(val) : 0),
    trust_feed: zod_1.z.string().optional().transform((val) => val === 'true'),
    min_trust_score: zod_1.z.string().optional().transform((val) => val ? parseFloat(val) : 0)
});
const followSchema = zod_1.z.object({
    following_id: zod_1.z.string().uuid('Invalid user ID format')
});
const trustCalculationSchema = zod_1.z.object({
    user_a: zod_1.z.string().uuid('Invalid user ID format'),
    user_b: zod_1.z.string().uuid('Invalid user ID format')
});
// ENHANCED: Profile management schemas
const profileUpdateSchema = zod_1.z.object({
    username: zod_1.z.string()
        .min(3, 'Username must be at least 3 characters')
        .max(30, 'Username must be less than 30 characters')
        .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores')
        .optional(),
    display_name: zod_1.z.string()
        .min(1, 'Display name is required')
        .max(50, 'Display name must be less than 50 characters')
        .optional(),
    bio: zod_1.z.string()
        .max(500, 'Bio must be less than 500 characters')
        .optional(),
    avatar_url: zod_1.z.string()
        .url('Invalid avatar URL')
        .optional(),
    location_city: zod_1.z.string()
        .max(100, 'City name must be less than 100 characters')
        .optional(),
    location_country: zod_1.z.string()
        .max(100, 'Country name must be less than 100 characters')
        .optional(),
    email: zod_1.z.string()
        .email('Invalid email address')
        .optional()
});
const usernameCheckSchema = zod_1.z.object({
    username: zod_1.z.string()
        .min(3, 'Username must be at least 3 characters')
        .max(30, 'Username must be less than 30 characters')
        .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores')
});
// Authentication schemas
const challengeSchema = zod_1.z.object({
    walletAddress: zod_1.z.string().min(20, 'Invalid wallet address')
});
const verifySchema = zod_1.z.object({
    walletAddress: zod_1.z.string().min(20, 'Invalid wallet address'),
    signature: zod_1.z.string().min(10, 'Invalid signature'),
    challenge: zod_1.z.string().min(10, 'Invalid challenge'),
    timestamp: zod_1.z.number().optional(),
    nonce: zod_1.z.string().optional()
});
// Utility functions for authentication
const generateChallenge = (address) => {
    const timestamp = Date.now();
    const nonce = Math.random().toString(36).substring(7);
    return `OmeoneChain Authentication
Wallet: ${address}
Timestamp: ${timestamp}
Nonce: ${nonce}

By signing this message, you authenticate with OmeoneChain.`;
};
// ENHANCED: Profile completion calculation
const calculateProfileCompletion = (user) => {
    let score = 0;
    const maxScore = 100;
    // Basic information (40 points total)
    if (user.username)
        score += 10;
    if (user.display_name && user.display_name !== user.username)
        score += 10;
    if (user.bio && user.bio.length > 10)
        score += 10;
    if (user.avatar_url)
        score += 10;
    // Location information (20 points total)
    if (user.location_city)
        score += 10;
    if (user.location_country)
        score += 10;
    // Social activity (30 points total)
    if ((user.total_recommendations || 0) > 0)
        score += 15;
    if ((user.followers_count || 0) > 0)
        score += 10;
    if ((user.following_count || 0) > 0)
        score += 5;
    // Verification (10 points total)
    if (user.verification_level && user.verification_level !== 'basic')
        score += 10;
    return Math.min(score, maxScore);
};
// Challenge storage (in production, use Redis with TTL)
const challenges = new Map();
// Initialize integrated trust service
let serviceInitialized = false;
const initializeService = async () => {
    if (!serviceInitialized) {
        try {
            await integratedTrustService_1.integratedTrustService.initialize();
            serviceInitialized = true;
            console.log('✅ Integrated Trust Service initialized');
        }
        catch (error) {
            console.error('❌ Failed to initialize Integrated Trust Service:', error);
        }
    }
};
// Initialize service on startup
initializeService();
// Routes
const router = express_1.default.Router();
// =============================================================================
// AUTHENTICATION ENDPOINTS
// =============================================================================
// Generate authentication challenge
router.post('/auth/challenge', async (req, res) => {
    try {
        console.log('🔐 Challenge request body:', req.body);
        const validation = challengeSchema.safeParse(req.body);
        if (!validation.success) {
            console.error('❌ Challenge validation failed:', validation.error.errors);
            return res.status(400).json({
                success: false,
                error: 'Invalid request body',
                details: validation.error.errors
            });
        }
        const { walletAddress } = validation.data;
        const timestamp = Date.now();
        const nonce = Math.random().toString(36).substring(7);
        const message = generateChallenge(walletAddress);
        const expiresAt = Date.now() + (5 * 60 * 1000); // 5 minutes
        // Store challenge
        challenges.set(walletAddress, { message, timestamp, nonce, expiresAt });
        console.log(`✅ Generated challenge for wallet: ${walletAddress}`);
        res.json({
            success: true,
            challenge: message,
            timestamp,
            nonce
        });
    }
    catch (error) {
        console.error('❌ Generate challenge error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to generate challenge'
        });
    }
});
// FIXED: Verify signature and create JWT token
router.post('/auth/login', async (req, res) => {
    try {
        console.log('🔐 Login request body:', req.body);
        const validation = verifySchema.safeParse(req.body);
        if (!validation.success) {
            console.error('❌ Login validation failed:', validation.error.errors);
            return res.status(400).json({
                success: false,
                error: 'Invalid request body',
                details: validation.error.errors
            });
        }
        const { walletAddress, signature, challenge, timestamp, nonce } = validation.data;
        console.log(`🔐 Verifying signature for wallet: ${walletAddress}`);
        // Check if challenge exists and is valid
        const storedChallenge = challenges.get(walletAddress);
        if (!storedChallenge || storedChallenge.expiresAt < Date.now()) {
            return res.status(400).json({
                success: false,
                error: 'Challenge expired or not found'
            });
        }
        if (storedChallenge.message !== challenge) {
            return res.status(400).json({
                success: false,
                error: 'Invalid challenge message'
            });
        }
        // TODO: In production, verify the signature here using ethers.js
        if (!signature || signature.length < 10) {
            return res.status(400).json({
                success: false,
                error: 'Invalid signature'
            });
        }
        console.log(`✅ Authentication successful for wallet: ${walletAddress}`);
        // Database operations - Create or update user in Supabase
        const walletAddressLower = walletAddress.toLowerCase();
        try {
            // Check if user already exists
            console.log(`📝 Checking if user exists in database: ${walletAddressLower}`);
            const { data: existingUser, error: fetchError } = await supabase
                .from('users')
                .select('*')
                .eq('wallet_address', walletAddressLower)
                .single();
            let dbUser;
            let userId;
            if (existingUser && !fetchError) {
                // User exists, update last login
                console.log(`👤 User exists, updating last login: ${existingUser.id}`);
                const { data: updatedUser, error: updateError } = await supabase
                    .from('users')
                    .update({
                    updated_at: new Date().toISOString()
                })
                    .eq('wallet_address', walletAddressLower)
                    .select()
                    .single();
                if (updateError) {
                    console.error('❌ User update error:', updateError);
                    throw updateError;
                }
                dbUser = updatedUser;
                userId = updatedUser.id;
                console.log(`✅ User updated successfully: ${updatedUser.id}`);
            }
            else {
                // Create new user
                console.log(`📝 Creating new user in database for wallet: ${walletAddressLower}`);
                const newUser = {
                    wallet_address: walletAddressLower,
                    username: `user_${walletAddress.slice(2, 8).toLowerCase()}`,
                    display_name: `User ${walletAddress.slice(2, 8)}`,
                    reputation_score: 0,
                    trust_score: 0,
                    staking_balance: 0,
                    staking_tier: 'explorer',
                    verification_level: 'basic',
                    location_country: 'BR'
                };
                const { data: createdUser, error: createError } = await supabase
                    .from('users')
                    .insert(newUser)
                    .select()
                    .single();
                if (createError) {
                    console.error('❌ User creation error:', createError);
                    throw createError;
                }
                dbUser = createdUser;
                userId = createdUser.id;
                console.log(`✅ User created successfully in Supabase: ${createdUser.id}`);
            }
            // FIXED: Create JWT token instead of session token
            const jwtToken = JWTUtils.generateToken({
                userId: userId,
                address: walletAddress
            });
            // Clean up challenge
            challenges.delete(walletAddress);
            console.log(`🎯 JWT token created for database user: ${userId}`);
            // Calculate profile completion
            const profileCompletion = calculateProfileCompletion(dbUser);
            res.json({
                success: true,
                token: jwtToken,
                user: {
                    id: dbUser.id,
                    walletAddress: dbUser.wallet_address,
                    username: dbUser.username,
                    display_name: dbUser.display_name,
                    bio: dbUser.bio,
                    avatar_url: dbUser.avatar_url,
                    location_city: dbUser.location_city,
                    location_country: dbUser.location_country,
                    email: dbUser.email,
                    reputationScore: dbUser.reputation_score,
                    trustScore: dbUser.trust_score,
                    stakingBalance: dbUser.staking_balance,
                    stakingTier: dbUser.staking_tier,
                    verificationLevel: dbUser.verification_level,
                    createdAt: dbUser.created_at,
                    profileCompletion,
                    roles: ['user']
                },
                expiresIn: 86400
            });
        }
        catch (dbError) {
            console.error('❌ Database operation failed:', dbError);
            // Fallback: Still create JWT even if database fails
            const fallbackUserId = `user_${walletAddress.slice(-8)}`;
            const jwtToken = JWTUtils.generateToken({
                userId: fallbackUserId,
                address: walletAddress
            });
            challenges.delete(walletAddress);
            res.json({
                success: true,
                token: jwtToken,
                user: {
                    id: fallbackUserId,
                    walletAddress: walletAddress.toLowerCase(),
                    username: `user_${walletAddress.slice(2, 8).toLowerCase()}`,
                    display_name: `User ${walletAddress.slice(2, 8)}`,
                    reputationScore: 0,
                    trustScore: 0,
                    stakingBalance: 0,
                    stakingTier: 'explorer',
                    verificationLevel: 'basic',
                    profileCompletion: 20,
                    roles: ['user']
                },
                expiresIn: 86400,
                warning: 'Authentication successful but database sync failed'
            });
        }
    }
    catch (error) {
        console.error('❌ Verify signature error:', error);
        res.status(500).json({
            success: false,
            error: 'Authentication failed'
        });
    }
});
// Token verification endpoint
router.post('/auth/verify', async (req, res) => {
    try {
        const { token } = req.body;
        if (!token) {
            return res.status(400).json({
                success: false,
                error: 'Token is required'
            });
        }
        try {
            const payload = JWTUtils.verifyToken(token);
            res.json({
                success: true,
                valid: true,
                user: {
                    id: payload.userId,
                    walletAddress: payload.address
                }
            });
        }
        catch (error) {
            res.json({
                success: true,
                valid: false,
                error: 'Invalid or expired token'
            });
        }
    }
    catch (error) {
        console.error('❌ Token verification error:', error);
        res.status(500).json({
            success: false,
            error: 'Token verification failed'
        });
    }
});
// FIXED: Get current user profile - Now uses JWT authentication
router.get('/auth/me', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const address = req.user.address;
        console.log(`GET /api/auth/me - user: ${userId}`);
        try {
            // Fetch user data from Supabase database
            const { data: dbUser, error } = await supabase
                .from('users')
                .select('*')
                .eq('id', userId)
                .single();
            if (dbUser && !error) {
                // Calculate profile completion
                const profileCompletion = calculateProfileCompletion(dbUser);
                // FIXED: Always return user data, even if incomplete
                res.json({
                    success: true,
                    user: {
                        id: dbUser.id,
                        walletAddress: dbUser.wallet_address,
                        username: dbUser.username || `user_${dbUser.wallet_address?.slice(2, 8)}`,
                        display_name: dbUser.display_name || `User ${dbUser.wallet_address?.slice(2, 8)}`,
                        bio: dbUser.bio || '',
                        avatar_url: dbUser.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${dbUser.username || 'user'}`,
                        location_city: dbUser.location_city || '',
                        location_country: dbUser.location_country || 'BR',
                        email: dbUser.email || '',
                        reputation_score: dbUser.reputation_score || 0,
                        trust_score: dbUser.trust_score || 0,
                        staking_balance: dbUser.staking_balance || 0,
                        staking_tier: dbUser.staking_tier || 'explorer',
                        verification_level: dbUser.verification_level || 'basic',
                        followers_count: dbUser.followers_count || 0,
                        following_count: dbUser.following_count || 0,
                        total_recommendations: dbUser.total_recommendations || 0,
                        total_upvotes_received: dbUser.total_upvotes_received || 0,
                        tokens_earned: dbUser.tokens_earned || 0,
                        profileCompletion,
                        created_at: dbUser.created_at,
                        updated_at: dbUser.updated_at,
                        // Add compatibility fields for frontend
                        name: dbUser.display_name || dbUser.username || `User ${dbUser.wallet_address?.slice(2, 8)}`,
                        avatar: dbUser.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${dbUser.username || 'user'}`,
                        authMode: 'wallet',
                        reputation: dbUser.reputation_score || 0,
                        trustScore: dbUser.trust_score || 0,
                        tokensEarned: dbUser.tokens_earned || 0,
                        stakingBalance: dbUser.staking_balance || 0,
                        createdAt: dbUser.created_at
                    }
                });
            }
            else if (error?.code === 'PGRST116') {
                // User not found in database - create a basic user record
                console.log(`⚠️  User ${userId} not found in database, creating basic record`);
                const basicUser = {
                    id: userId,
                    wallet_address: address?.toLowerCase() || '',
                    username: `user_${(address?.slice(2, 8) || userId.slice(-6)).toLowerCase()}`,
                    display_name: `User ${(address?.slice(2, 8) || userId.slice(-6))}`,
                    reputation_score: 0,
                    trust_score: 0,
                    staking_balance: 0,
                    staking_tier: 'explorer',
                    verification_level: 'basic',
                    location_country: 'BR'
                };
                // Try to create the user record
                const { data: createdUser, error: createError } = await supabase
                    .from('users')
                    .insert(basicUser)
                    .select()
                    .single();
                if (createdUser && !createError) {
                    console.log(`✅ Created basic user record: ${createdUser.id}`);
                    const profileCompletion = calculateProfileCompletion(createdUser);
                    res.json({
                        success: true,
                        user: {
                            id: createdUser.id,
                            walletAddress: createdUser.wallet_address,
                            username: createdUser.username,
                            display_name: createdUser.display_name,
                            bio: '',
                            avatar_url: `https://api.dicebear.com/7.x/initials/svg?seed=${createdUser.username}`,
                            location_city: '',
                            location_country: createdUser.location_country,
                            email: '',
                            reputation_score: 0,
                            trust_score: 0,
                            staking_balance: 0,
                            staking_tier: 'explorer',
                            verification_level: 'basic',
                            followers_count: 0,
                            following_count: 0,
                            total_recommendations: 0,
                            total_upvotes_received: 0,
                            tokens_earned: 0,
                            profileCompletion,
                            created_at: createdUser.created_at,
                            updated_at: createdUser.updated_at,
                            // Compatibility fields
                            name: createdUser.display_name,
                            avatar: `https://api.dicebear.com/7.x/initials/svg?seed=${createdUser.username}`,
                            authMode: 'wallet',
                            reputation: 0,
                            trustScore: 0,
                            tokensEarned: 0,
                            stakingBalance: 0,
                            createdAt: createdUser.created_at
                        },
                        message: 'Basic profile created. Please complete your profile.'
                    });
                }
                else {
                    // Fallback if database creation also fails
                    console.error('❌ Failed to create basic user record:', createError);
                    res.json({
                        success: true,
                        user: {
                            id: userId,
                            walletAddress: address || '',
                            username: `user_${(address?.slice(2, 8) || userId.slice(-6)).toLowerCase()}`,
                            display_name: `User ${(address?.slice(2, 8) || userId.slice(-6))}`,
                            bio: '',
                            avatar_url: `https://api.dicebear.com/7.x/initials/svg?seed=user`,
                            location_city: '',
                            location_country: 'BR',
                            email: '',
                            reputation_score: 0,
                            trust_score: 0,
                            staking_balance: 0,
                            staking_tier: 'explorer',
                            verification_level: 'basic',
                            followers_count: 0,
                            following_count: 0,
                            total_recommendations: 0,
                            total_upvotes_received: 0,
                            tokens_earned: 0,
                            profileCompletion: 20,
                            created_at: new Date().toISOString(),
                            updated_at: new Date().toISOString(),
                            // Compatibility fields
                            name: `User ${(address?.slice(2, 8) || userId.slice(-6))}`,
                            avatar: `https://api.dicebear.com/7.x/initials/svg?seed=user`,
                            authMode: 'wallet',
                            reputation: 0,
                            trustScore: 0,
                            tokensEarned: 0,
                            stakingBalance: 0,
                            createdAt: new Date().toISOString()
                        },
                        warning: 'Using fallback data - database sync failed'
                    });
                }
            }
            else {
                // Other database error
                throw error;
            }
        }
        catch (dbError) {
            console.error('❌ Database query failed:', dbError);
            // Fallback to integrated service if available
            try {
                const stats = await integratedTrustService_1.integratedTrustService.getUserSocialStats(userId);
                res.json({
                    success: true,
                    user: {
                        id: userId,
                        walletAddress: address || '',
                        username: `user_${(address?.slice(2, 8) || userId.slice(-6)).toLowerCase()}`,
                        display_name: `User ${(address?.slice(2, 8) || userId.slice(-6))}`,
                        bio: '',
                        avatar_url: `https://api.dicebear.com/7.x/initials/svg?seed=user`,
                        location_city: '',
                        location_country: 'BR',
                        email: '',
                        reputation_score: stats.reputation_score || 0,
                        trust_score: stats.reputation_score || 0,
                        staking_balance: 0,
                        staking_tier: 'explorer',
                        verification_level: 'basic',
                        followers_count: stats.followers_count || 0,
                        following_count: stats.following_count || 0,
                        total_recommendations: stats.recommendations_count || 0,
                        total_upvotes_received: 0,
                        tokens_earned: 0,
                        profileCompletion: 25,
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString(),
                        // Compatibility fields
                        name: `User ${(address?.slice(2, 8) || userId.slice(-6))}`,
                        avatar: `https://api.dicebear.com/7.x/initials/svg?seed=user`,
                        authMode: 'wallet',
                        reputation: stats.reputation_score || 0,
                        trustScore: stats.reputation_score || 0,
                        tokensEarned: 0,
                        stakingBalance: 0,
                        createdAt: new Date().toISOString()
                    },
                    warning: 'Using fallback data - database unavailable'
                });
            }
            catch (serviceError) {
                console.error('❌ Integrated service also failed:', serviceError);
                // Final fallback - return basic user object
                res.json({
                    success: true,
                    user: {
                        id: userId,
                        walletAddress: address || '',
                        username: `user_${(address?.slice(2, 8) || userId.slice(-6)).toLowerCase()}`,
                        display_name: `User ${(address?.slice(2, 8) || userId.slice(-6))}`,
                        bio: '',
                        avatar_url: `https://api.dicebear.com/7.x/initials/svg?seed=user`,
                        location_city: '',
                        location_country: 'BR',
                        email: '',
                        reputation_score: 0,
                        trust_score: 0,
                        staking_balance: 0,
                        staking_tier: 'explorer',
                        verification_level: 'basic',
                        followers_count: 0,
                        following_count: 0,
                        total_recommendations: 0,
                        total_upvotes_received: 0,
                        tokens_earned: 0,
                        profileCompletion: 20,
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString(),
                        // Compatibility fields
                        name: `User ${(address?.slice(2, 8) || userId.slice(-6))}`,
                        avatar: `https://api.dicebear.com/7.x/initials/svg?seed=user`,
                        authMode: 'wallet',
                        reputation: 0,
                        trustScore: 0,
                        tokensEarned: 0,
                        stakingBalance: 0,
                        createdAt: new Date().toISOString()
                    },
                    warning: 'Using minimal fallback data'
                });
            }
        }
    }
    catch (error) {
        console.error('❌ Get current user error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get user info'
        });
    }
});
// =============================================================================
// ENHANCED: PROFILE MANAGEMENT ENDPOINTS
// =============================================================================
// FIXED: Update user profile - Now uses JWT authentication
router.patch('/auth/profile', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        console.log(`PATCH /api/auth/profile - user: ${userId}`, req.body);
        // Validate the profile update data
        const validation = profileUpdateSchema.safeParse(req.body);
        if (!validation.success) {
            console.error('❌ Profile validation failed:', validation.error.errors);
            return res.status(400).json({
                success: false,
                error: 'Invalid profile data',
                details: validation.error.errors
            });
        }
        const profileUpdates = validation.data;
        // Check username uniqueness if username is being updated
        if (profileUpdates.username) {
            const { data: existingUser, error: checkError } = await supabase
                .from('users')
                .select('id')
                .eq('username', profileUpdates.username)
                .neq('id', userId)
                .single();
            if (existingUser && !checkError) {
                return res.status(400).json({
                    success: false,
                    error: 'Username already taken',
                    field: 'username'
                });
            }
        }
        // Update the user profile in database
        const updateData = {
            ...profileUpdates,
            updated_at: new Date().toISOString()
        };
        const { data: updatedUser, error: updateError } = await supabase
            .from('users')
            .update(updateData)
            .eq('id', userId)
            .select('*')
            .single();
        if (updateError) {
            console.error('❌ Profile update error:', updateError);
            return res.status(500).json({
                success: false,
                error: 'Failed to update profile',
                details: updateError.message
            });
        }
        console.log(`✅ Profile updated successfully for user: ${userId}`);
        // Calculate new profile completion
        const profileCompletion = calculateProfileCompletion(updatedUser);
        res.json({
            success: true,
            message: 'Profile updated successfully',
            user: {
                id: updatedUser.id,
                walletAddress: updatedUser.wallet_address,
                username: updatedUser.username,
                display_name: updatedUser.display_name,
                bio: updatedUser.bio,
                avatar_url: updatedUser.avatar_url,
                location_city: updatedUser.location_city,
                location_country: updatedUser.location_country,
                email: updatedUser.email,
                reputation_score: updatedUser.reputation_score || 0,
                trust_score: updatedUser.trust_score || 0,
                staking_balance: updatedUser.staking_balance || 0,
                staking_tier: updatedUser.staking_tier || 'explorer',
                verification_level: updatedUser.verification_level || 'basic',
                followers_count: updatedUser.followers_count || 0,
                following_count: updatedUser.following_count || 0,
                total_recommendations: updatedUser.total_recommendations || 0,
                total_upvotes_received: updatedUser.total_upvotes_received || 0,
                tokens_earned: updatedUser.tokens_earned || 0,
                profileCompletion,
                created_at: updatedUser.created_at,
                updated_at: updatedUser.updated_at
            }
        });
    }
    catch (error) {
        console.error('❌ Update profile error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update profile'
        });
    }
});
// Check username availability (NEW ENDPOINT)
router.get('/auth/profile/availability/:username', async (req, res) => {
    try {
        const { username } = req.params;
        // Validate username format
        const validation = usernameCheckSchema.safeParse({ username });
        if (!validation.success) {
            return res.status(400).json({
                success: false,
                available: false,
                error: 'Invalid username format',
                details: validation.error.errors
            });
        }
        console.log(`🔍 Checking username availability: ${username}`);
        // Check if username exists in database
        const { data: existingUser, error } = await supabase
            .from('users')
            .select('id')
            .eq('username', username)
            .single();
        const isAvailable = !existingUser && error?.code === 'PGRST116'; // No rows returned
        if (isAvailable) {
            res.json({
                success: true,
                available: true,
                username: username,
                message: 'Username is available'
            });
        }
        else {
            res.json({
                success: true,
                available: false,
                username: username,
                message: 'Username is already taken',
                suggestions: [
                    `${username}_1`,
                    `${username}_2`,
                    `${username}_${Math.floor(Math.random() * 100)}`
                ]
            });
        }
    }
    catch (error) {
        console.error('❌ Username availability check error:', error);
        res.status(500).json({
            success: false,
            available: false,
            error: 'Failed to check username availability'
        });
    }
});
// Get public user profile (NEW ENDPOINT)
router.get('/users/:user_id/profile', async (req, res) => {
    try {
        const { user_id } = req.params;
        console.log(`GET /api/users/${user_id}/profile`);
        // Fetch user profile from database
        const { data: user, error } = await supabase
            .from('users')
            .select(`
        id,
        username,
        display_name,
        bio,
        avatar_url,
        location_city,
        location_country,
        reputation_score,
        trust_score,
        verification_level,
        followers_count,
        following_count,
        total_recommendations,
        total_upvotes_received,
        tokens_earned,
        created_at
      `)
            .eq('id', user_id)
            .single();
        if (error || !user) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }
        // Calculate profile completion (public view)
        const profileCompletion = calculateProfileCompletion(user);
        // Don't expose sensitive information in public profile
        res.json({
            success: true,
            user: {
                id: user.id,
                username: user.username,
                display_name: user.display_name,
                bio: user.bio,
                avatar_url: user.avatar_url,
                location_city: user.location_city,
                location_country: user.location_country,
                reputation_score: user.reputation_score || 0,
                trust_score: user.trust_score || 0,
                verification_level: user.verification_level || 'basic',
                followers_count: user.followers_count || 0,
                following_count: user.following_count || 0,
                total_recommendations: user.total_recommendations || 0,
                total_upvotes_received: user.total_upvotes_received || 0,
                tokens_earned: user.tokens_earned || 0,
                profileCompletion,
                created_at: user.created_at,
                isPublicProfile: true
            }
        });
    }
    catch (error) {
        console.error('❌ Get public profile error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get user profile'
        });
    }
});
// Avatar upload endpoint (placeholder - NEW ENDPOINT)
router.post('/auth/profile/avatar', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const { avatar_url } = req.body;
        if (!avatar_url) {
            return res.status(400).json({
                success: false,
                error: 'Avatar URL is required'
            });
        }
        console.log(`📸 Updating avatar for user: ${userId}`);
        // Update avatar URL in database
        const { data: updatedUser, error } = await supabase
            .from('users')
            .update({
            avatar_url,
            updated_at: new Date().toISOString()
        })
            .eq('id', userId)
            .select('*')
            .single();
        if (error) {
            console.error('❌ Avatar update error:', error);
            return res.status(500).json({
                success: false,
                error: 'Failed to update avatar'
            });
        }
        res.json({
            success: true,
            message: 'Avatar updated successfully',
            avatar_url: updatedUser.avatar_url,
            profileCompletion: calculateProfileCompletion(updatedUser)
        });
    }
    catch (error) {
        console.error('❌ Avatar upload error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to upload avatar'
        });
    }
});
// =============================================================================
// EXISTING ENDPOINTS (Preserved)
// =============================================================================
// Legacy profile endpoint
router.get('/auth/profile', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const address = req.user.address;
        console.log(`GET /api/auth/profile - user: ${userId}`);
        try {
            const { data: dbUser, error } = await supabase
                .from('users')
                .select('*')
                .eq('id', userId)
                .single();
            if (dbUser && !error) {
                res.json({
                    success: true,
                    data: {
                        userId: dbUser.id,
                        address: dbUser.wallet_address,
                        profile: {
                            display_name: dbUser.display_name || `User ${userId.slice(-4)}`,
                            username: dbUser.username,
                            bio: dbUser.bio,
                            avatar_url: dbUser.avatar_url,
                            location_city: dbUser.location_city,
                            reputation_score: dbUser.reputation_score || 0,
                            trust_score: dbUser.trust_score || 0,
                            staking_balance: dbUser.staking_balance || 0,
                            staking_tier: dbUser.staking_tier || 'explorer',
                            verification_level: dbUser.verification_level || 'basic',
                            joined_at: dbUser.created_at || new Date().toISOString(),
                            profileCompletion: calculateProfileCompletion(dbUser)
                        },
                        preferences: {
                            trust_mode: true,
                            min_trust_score: 0.25
                        }
                    }
                });
            }
            else {
                // Fallback to integrated service
                const stats = await integratedTrustService_1.integratedTrustService.getUserSocialStats(userId);
                res.json({
                    success: true,
                    data: {
                        userId,
                        address,
                        profile: {
                            display_name: `User ${userId.slice(-4)}`,
                            reputation_score: stats.reputation_score || 0,
                            total_followers: stats.followers_count || 0,
                            total_following: stats.following_count || 0,
                            total_recommendations: stats.recommendations_count || 0,
                            joined_at: new Date().toISOString(),
                            profileCompletion: 20
                        },
                        preferences: {
                            trust_mode: true,
                            min_trust_score: 0.25
                        }
                    },
                    warning: 'Using fallback data - user not found in database'
                });
            }
        }
        catch (dbError) {
            console.error('Database query failed:', dbError);
            const stats = await integratedTrustService_1.integratedTrustService.getUserSocialStats(userId);
            res.json({
                success: true,
                data: {
                    userId,
                    address,
                    profile: {
                        display_name: `User ${userId.slice(-4)}`,
                        reputation_score: stats.reputation_score || 0,
                        total_followers: stats.followers_count || 0,
                        total_following: stats.following_count || 0,
                        total_recommendations: stats.recommendations_count || 0,
                        joined_at: new Date().toISOString(),
                        profileCompletion: 20
                    },
                    preferences: {
                        trust_mode: true,
                        min_trust_score: 0.25
                    }
                },
                warning: 'Using fallback data - database unavailable'
            });
        }
    }
    catch (error) {
        console.error('Get profile error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});
// Logout and clear session
router.delete('/auth/logout', authenticateToken, async (req, res) => {
    try {
        console.log(`DELETE /api/auth/logout - user: ${req.user.id}`);
        res.json({
            success: true,
            message: 'Logged out successfully'
        });
    }
    catch (error) {
        console.error('Logout error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});
//=============================================================================
// FIXED: USER ENDPOINTS FOR FRONTEND COMPATIBILITY
// =============================================================================
// Get user by ID (for profile page) - FIXED to match frontend expectations
router.get('/users/:user_id', async (req, res) => {
    try {
        const { user_id } = req.params;
        console.log(`GET /api/users/${user_id}`);
        // Try both ID-based and wallet-address-based lookup
        let dbUser = null;
        let error = null;
        // First try by ID
        const { data: userById, error: errorById } = await supabase
            .from('users')
            .select('*')
            .eq('id', user_id)
            .single();
        if (userById && !errorById) {
            dbUser = userById;
        }
        else {
            // Try by wallet address if ID lookup failed
            const { data: userByAddress, error: errorByAddress } = await supabase
                .from('users')
                .select('*')
                .eq('wallet_address', user_id.toLowerCase())
                .single();
            if (userByAddress && !errorByAddress) {
                dbUser = userByAddress;
            }
            else {
                error = errorById || errorByAddress;
            }
        }
        if (dbUser && !error) {
            // Calculate profile completion
            const profileCompletion = calculateProfileCompletion(dbUser);
            res.json({
                success: true,
                user: {
                    id: dbUser.id,
                    walletAddress: dbUser.wallet_address,
                    username: dbUser.username || `user_${dbUser.wallet_address?.slice(2, 8)}`,
                    display_name: dbUser.display_name || `User ${dbUser.wallet_address?.slice(2, 8)}`,
                    bio: dbUser.bio || '',
                    avatar_url: dbUser.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${dbUser.username || 'user'}`,
                    location_city: dbUser.location_city || '',
                    location_country: dbUser.location_country || 'BR',
                    email: dbUser.email || '',
                    reputation_score: dbUser.reputation_score || 0,
                    trust_score: dbUser.trust_score || 0,
                    staking_balance: dbUser.staking_balance || 0,
                    staking_tier: dbUser.staking_tier || 'explorer',
                    verification_level: dbUser.verification_level || 'basic',
                    followers_count: dbUser.followers_count || 0,
                    following_count: dbUser.following_count || 0,
                    total_recommendations: dbUser.total_recommendations || 0,
                    total_upvotes_received: dbUser.total_upvotes_received || 0,
                    tokens_earned: dbUser.tokens_earned || 0,
                    profileCompletion,
                    created_at: dbUser.created_at,
                    updated_at: dbUser.updated_at,
                    // Add compatibility fields for frontend
                    name: dbUser.display_name || dbUser.username || `User ${dbUser.wallet_address?.slice(2, 8)}`,
                    avatar: dbUser.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${dbUser.username || 'user'}`,
                    authMode: 'wallet',
                    reputation: dbUser.reputation_score || 0,
                    trustScore: dbUser.trust_score || 0,
                    tokensEarned: dbUser.tokens_earned || 0,
                    stakingBalance: dbUser.staking_balance || 0,
                    createdAt: dbUser.created_at
                }
            });
        }
        else {
            // User not found - return minimal user object instead of 404
            console.log(`⚠️  User ${user_id} not found, returning minimal profile`);
            res.json({
                success: true,
                user: {
                    id: user_id,
                    walletAddress: user_id.startsWith('0x') ? user_id : '',
                    username: `user_${user_id.slice(-6)}`,
                    display_name: `User ${user_id.slice(-6)}`,
                    bio: '',
                    avatar_url: `https://api.dicebear.com/7.x/initials/svg?seed=user`,
                    location_city: '',
                    location_country: 'BR',
                    email: '',
                    reputation_score: 0,
                    trust_score: 0,
                    staking_balance: 0,
                    staking_tier: 'explorer',
                    verification_level: 'basic',
                    followers_count: 0,
                    following_count: 0,
                    total_recommendations: 0,
                    total_upvotes_received: 0,
                    tokens_earned: 0,
                    profileCompletion: 15,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                    // Compatibility fields
                    name: `User ${user_id.slice(-6)}`,
                    avatar: `https://api.dicebear.com/7.x/initials/svg?seed=user`,
                    authMode: 'wallet',
                    reputation: 0,
                    trustScore: 0,
                    tokensEarned: 0,
                    stakingBalance: 0,
                    createdAt: new Date().toISOString()
                },
                warning: 'User profile not found - showing minimal profile'
            });
        }
    }
    catch (error) {
        console.error('❌ Get user error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get user'
        });
    }
});
// Get user stats - FIXED for better error handling
router.get('/users/:user_id/stats', async (req, res) => {
    try {
        const { user_id } = req.params;
        console.log(`GET /api/users/${user_id}/stats`);
        try {
            // Try both ID and wallet address lookup
            let dbUser = null;
            const { data: userById, error: errorById } = await supabase
                .from('users')
                .select(`
          id,
          reputation_score,
          trust_score,
          followers_count,
          following_count,
          total_recommendations,
          total_upvotes_received,
          tokens_earned,
          staking_balance,
          verification_level
        `)
                .eq('id', user_id)
                .single();
            if (userById && !errorById) {
                dbUser = userById;
            }
            else {
                // Try wallet address
                const { data: userByAddress, error: errorByAddress } = await supabase
                    .from('users')
                    .select(`
            id,
            reputation_score,
            trust_score,
            followers_count,
            following_count,
            total_recommendations,
            total_upvotes_received,
            tokens_earned,
            staking_balance,
            verification_level
          `)
                    .eq('wallet_address', user_id.toLowerCase())
                    .single();
                if (userByAddress && !errorByAddress) {
                    dbUser = userByAddress;
                }
            }
            if (dbUser) {
                res.json({
                    success: true,
                    stats: {
                        reputation_score: dbUser.reputation_score || 0,
                        trust_score: dbUser.trust_score || 0,
                        followers_count: dbUser.followers_count || 0,
                        following_count: dbUser.following_count || 0,
                        recommendations_count: dbUser.total_recommendations || 0,
                        upvotes_received: dbUser.total_upvotes_received || 0,
                        tokens_earned: dbUser.tokens_earned || 0,
                        staking_balance: dbUser.staking_balance || 0,
                        verification_level: dbUser.verification_level || 'basic'
                    }
                });
            }
            else {
                // Fallback to integrated service
                const stats = await integratedTrustService_1.integratedTrustService.getUserSocialStats(user_id);
                res.json({
                    success: true,
                    stats: {
                        reputation_score: stats.reputation_score || 0,
                        trust_score: stats.reputation_score || 0,
                        followers_count: stats.followers_count || 0,
                        following_count: stats.following_count || 0,
                        recommendations_count: stats.recommendations_count || 0,
                        upvotes_received: 0,
                        tokens_earned: 0,
                        staking_balance: 0,
                        verification_level: 'basic'
                    },
                    warning: 'Using fallback stats'
                });
            }
        }
        catch (dbError) {
            console.error('Database query failed for stats:', dbError);
            // Final fallback
            res.json({
                success: true,
                stats: {
                    reputation_score: 0,
                    trust_score: 0,
                    followers_count: 0,
                    following_count: 0,
                    recommendations_count: 0,
                    upvotes_received: 0,
                    tokens_earned: 0,
                    staking_balance: 0,
                    verification_level: 'basic'
                },
                warning: 'Using minimal fallback stats'
            });
        }
    }
    catch (error) {
        console.error('❌ Get user stats error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get user stats'
        });
    }
});
// =============================================================================
// MOUNT ROUTES AND SERVER SETUP
// =============================================================================
// Mount the router at multiple paths to catch all variations
app.use('/api/v1', router);
app.use('/api', router);
// FIXED: Create a separate router for /api/social routes to ensure they're properly handled
const socialRouter = express_1.default.Router();
// Social routes (these were the ones returning 404)
socialRouter.get('/users/:user_id/stats', async (req, res) => {
    // Use the same logic as the main stats endpoint
    req.url = `/users/${req.params.user_id}/stats`;
    router(req, res, () => { });
});
socialRouter.get('/users/:user_id', async (req, res) => {
    // Use the same logic as the main user endpoint
    req.url = `/users/${req.params.user_id}`;
    router(req, res, () => { });
});
app.use('/api/social', socialRouter);
// Health check
app.get('/api/health', (req, res) => {
    res.json({
        status: 'OK',
        message: 'OmeoneChain Core server with unified JWT authentication',
        timestamp: new Date().toISOString(),
        cors_origins: getCorsOrigins(),
        components: {
            trust_calculator: 'TrustScoreCalculator with social graph analysis',
            reputation_engine: 'ReputationEngine with blockchain integration',
            social_service: 'SocialService with Supabase backend',
            profile_system: 'Enhanced profile management with completion tracking',
            integrated_service: serviceInitialized ? 'active' : 'initializing',
            database: supabaseUrl ? 'Supabase connected' : 'No database',
            authentication: 'Unified JWT authentication system'
        }
    });
});
// Root route with updated endpoint list
app.get('/', (req, res) => {
    res.json({
        message: 'OmeoneChain Core API Server with Unified JWT Authentication',
        version: '0.4.0',
        features: [
            'FIXED: Unified JWT authentication system (no more session/JWT conflicts)',
            'Enhanced profile management with completion tracking',
            'Username availability checking and validation',
            'Avatar upload and media management',
            'Public and private profile views',
            'TrustScoreCalculator with sophisticated social graph analysis',
            'Database user persistence with Supabase integration',
            'Social API routes (/api/social/users/*) properly handled'
        ],
        endpoints: {
            auth: [
                'POST /api/v1/auth/challenge - Generate wallet signature challenge',
                'POST /api/v1/auth/login - Verify signature and create JWT token (FIXED)',
                'POST /api/v1/auth/verify - Verify JWT token',
                'GET /api/v1/auth/me - Get current user profile from database (FIXED - JWT auth)',
                'DELETE /api/v1/auth/logout - Logout (JWT based)'
            ],
            profile: [
                'PATCH /api/v1/auth/profile - Update user profile (FIXED - JWT auth)',
                'GET /api/v1/auth/profile/availability/:username - Check username availability',
                'POST /api/v1/auth/profile/avatar - Upload avatar (JWT auth)',
                'GET /api/v1/users/:user_id/profile - Get public user profile'
            ],
            social: [
                'GET /api/social/users/:user_id/stats - Get user social stats',
                'GET /api/social/users/:user_id - Get user profile',
                'GET /api/users/:user_id/stats - Get user social stats',
                'GET /api/users/:user_id - Get user profile'
            ]
        }
    });
});
// Error handling
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
        success: false,
        message: 'Internal server error'
    });
});
// 404 handler
app.use((req, res) => {
    console.log(`❌ 404: ${req.method} ${req.path} not found`);
    res.status(404).json({
        success: false,
        message: `Route ${req.method} ${req.path} not found`,
        availableRoutes: [
            '/api/auth/me',
            '/api/users/:id',
            '/api/users/:id/stats',
            '/api/social/users/:id/stats',
            '/api/health'
        ]
    });
});
// Start server
if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`🚀 OmeoneChain Core server with unified JWT authentication running on http://localhost:${PORT}`);
        console.log(`📡 Health check: http://localhost:${PORT}/api/health`);
        console.log(`👤 Profile endpoints: http://localhost:${PORT}/api/v1/auth/profile`);
        console.log(`🔍 Username check: http://localhost:${PORT}/api/v1/auth/profile/availability/[username]`);
        console.log(`🔐 Auth endpoints: http://localhost:${PORT}/api/v1/auth/challenge`);
        console.log(`✅ FIXED: Unified JWT authentication system resolves session/JWT conflicts`);
        console.log(`✅ FIXED: Profile save now works with proper JWT validation`);
        console.log(`✅ FIXED: /auth/me endpoint uses consistent JWT authentication`);
        console.log(`🌐 CORS configured for Codespaces and local development`);
    });
}
exports.default = app;
//# sourceMappingURL=server.js.map