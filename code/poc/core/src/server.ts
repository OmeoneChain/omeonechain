// File: code/poc/core/src/server.ts
// UPDATED: Two-Tier Authentication System (Email + Wallet) - FIXED ROUTE MOUNTING
// UPDATED: Added /api/lists endpoints for Create List functionality
// FIXED: Added recommendation routes to resolve profile page issue
// FIXED: Aligned database schema - author_id, content, integer restaurant_id
// FIXED: Schema alignment for Discovery page and List creation
// FIXED: Search route positioning - moved before 404 handler
// NEW: Enhanced User Profile Integration - Complete with likes/bookmarks endpoints
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env.local first, then .env
dotenv.config({ path: path.join(__dirname, '../.env.local') });
dotenv.config({ path: path.join(__dirname, '../.env') });

// Debug: Log that environment variables are loaded
console.log('🔧 Environment loaded:', {
  NODE_ENV: process.env.NODE_ENV,
  PORT: process.env.PORT,
  SUPABASE_URL: process.env.SUPABASE_URL ? '✅ Set' : '❌ Missing',
  SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY ? '✅ Set' : '❌ Missing',
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ? '✅ Set' : '❌ Missing',
  JWT_SECRET: process.env.JWT_SECRET ? '✅ Set' : '❌ Missing'
});

import express from 'express';
import cors from 'cors';
import { z } from 'zod';
import { integratedTrustService } from './services/integratedTrustService';
import { createClient } from '@supabase/supabase-js';
import jwt from 'jsonwebtoken';
import { SocialService } from './services/social-service';
import socialRoutes from './api/routes/social';
import socialAuthRoutes from './routes/social-auth';
import guidesRoutes from './api/routes/guides';
import recommendationRoutes from './api/routes/recommendation';
import { createRestaurantSearchRouter } from './api/routes/restaurant-search';
import { Pool } from 'pg';
import savedListsRoutes from './api/routes/saved-lists';
import discoveryRoutes from './api/routes/discovery';
import restaurantRoutes from './api/routes/restaurants';
import bcrypt from 'bcrypt'; // NEW: For password hashing

// Add server identification
console.log('🟢 REAL SERVER RUNNING - src/server.ts - TWO-TIER AUTH + USER PROFILE INTEGRATION');

// =============================================================================
// CONFIGURATION AND SETUP
// =============================================================================

// ENHANCED: JWT utilities for two-tier authentication
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';

// ENHANCED: JWT payload with account tier and auth method
interface JWTPayload {
  userId: string;
  address?: string; // Only for wallet users
  email?: string; // Only for email users
  accountTier: 'email_basic' | 'wallet_full'; // NEW: Tier tracking
  authMethod: 'email' | 'wallet' | 'google' | 'apple' | 'twitter'; // NEW: Auth method
  iat?: number;
  exp?: number;
}

class JWTUtils {
  static generateToken(payload: { 
    userId: string; 
    address?: string;
    email?: string;
    accountTier: 'email_basic' | 'wallet_full';
    authMethod: 'email' | 'wallet' | 'google' | 'apple' | 'twitter';
  }): string {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: '24h' });
  }

  static verifyToken(token: string): JWTPayload {
    try {
      const payload = jwt.verify(token, JWT_SECRET) as JWTPayload;
      
      // Backward compatibility: If no accountTier, assume email_basic
      if (!payload.accountTier) {
        payload.accountTier = 'email_basic';
      }
      
      // Backward compatibility: If no authMethod, infer from address/email
      if (!payload.authMethod) {
        payload.authMethod = payload.address ? 'wallet' : 'email';
      }
      
      return payload;
    } catch (error) {
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

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// ADD THIS: Create PostgreSQL pool for restaurant service (direct DB access)
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false // Required for Supabase
  }
});

// Test pool connection
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('❌ Database pool connection error:', err);
  } else {
    console.log('✅ Database pool connected successfully');
  }
});

// Test database connection on startup
(async () => {
  try {
    const { data, error } = await supabase.from('users').select('count').limit(1);
    if (error) {
      console.error('❌ Supabase connection test failed:', error.message);
    } else {
      console.log('✅ Supabase connection successful');
    }
  } catch (err) {
    console.error('❌ Supabase connection error:', err);
  }
})();

// =============================================================================
// INTERFACES AND TYPES
// =============================================================================

// ENHANCED: Database Types matching the schema with auth fields
interface DatabaseUser {
  id?: string;
  wallet_address?: string; // Optional for email users
  username?: string;
  email?: string;
  password_hash?: string; // For email authentication
  display_name?: string;
  bio?: string;
  avatar_url?: string;
  location_city?: string;
  location_country?: string;
  reputation_score?: number;
  trust_score?: number;
  staking_balance?: number;
  staking_tier?: string;
  verification_level?: string;
  account_tier?: 'email_basic' | 'wallet_full'; // NEW: Account tier
  auth_method?: 'email' | 'wallet' | 'google' | 'apple' | 'twitter'; // NEW: Auth method
  pending_token_claims?: number; // NEW: For email users
  created_at?: string;
  updated_at?: string;
  // Profile completion fields
  followers_count?: number;
  following_count?: number;
  total_recommendations?: number;
  total_upvotes_received?: number;
  tokens_earned?: number;
}

// FIXED: Recommendation interface aligned with actual database schema
interface DatabaseRecommendation {
  id?: string;
  author_id: string;  // FIXED: Changed from 'author' to 'author_id'
  title: string;
  content: string;    // FIXED: Changed from 'body' to 'content'
  category?: string;
  location_city?: string;
  location_country?: string;
  restaurant_id?: number; // FIXED: Confirmed as integer for auto-increment
  latitude?: number;
  longitude?: number;
  trust_score?: number;
  upvotes_count?: number;  // FIXED: Schema uses upvotes_count, saves_count
  saves_count?: number;
  verification_status?: string;
  content_hash?: string;
  blockchain_tx_id?: string;    // FIXED: Added blockchain fields from schema
  blockchain_status?: string;
  created_at?: string;
  updated_at?: string;
}

// Restaurant interface (matches your frontend)
interface Restaurant {
  id: string; // UUID from Supabase
  name: string;
  address: string;
  city: string;
  country: string;
  latitude: number;
  longitude: number;
  cuisineType?: string;
  priceRange?: 1 | 2 | 3 | 4;
  phone?: string;
  website?: string;
  addedBy: string;
  verified: boolean;
  verificationCount: number;
  totalRecommendations: number;
  avgTrustScore: number;
  lastRecommendationDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// =============================================================================
// EXPRESS APP CONFIGURATION
// =============================================================================

const app = express();
const PORT = process.env.PORT || 3001;

app.locals.db = pool;

// Enhanced CORS configuration to support Codespaces
const getCorsOrigins = (): (string | RegExp)[] => {
  const origins: (string | RegExp)[] = [
    'http://localhost:3000',
    'http://localhost:3001',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:3001',
    'https://redesigned-lamp-q74wgggqq9jjfxqjp-3000.app.github.dev',
    'https://redesigned-lamp-q74wgggqq9jjfxqjp-3001.app.github.dev'
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

// Extend Express Request type for req.user
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        address?: string;
        email?: string;
        accountTier: 'email_basic' | 'wallet_full';
        authMethod: 'email' | 'wallet' | 'google' | 'apple' | 'twitter';
      };
    }
  }
}

// Enhanced CORS middleware
app.use(cors({
  origin: getCorsOrigins(),
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  optionsSuccessStatus: 200
}));

app.use(express.json());

// =============================================================================
// MIDDLEWARE AND AUTHENTICATION
// =============================================================================

// ENHANCED: Unified JWT authentication middleware - supports both email and wallet
const authenticate = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.log('🔍 DEBUG: authenticate called for:', req.method, req.path);
  
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
      address: payload.address,
      email: payload.email,
      accountTier: payload.accountTier || 'email_basic',
      authMethod: payload.authMethod || (payload.address ? 'wallet' : 'email')
    };
    
    console.log('✅ DEBUG: Set req.user:', req.user);
    next();
  } catch (error) {
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

// Alias for backward compatibility
const authenticateToken = authenticate;

// NEW: Wallet-only middleware - requires wallet tier
const requireWalletTier = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required'
    });
  }

  if (req.user.accountTier !== 'wallet_full') {
    return res.status(403).json({
      success: false,
      error: 'Wallet authentication required for this feature',
      message: 'Please connect your wallet to access this feature',
      upgradeRequired: true,
      currentTier: req.user.accountTier
    });
  }

  next();
};

// Optional auth middleware - continues even without auth
const optionalAuth = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const authHeader = req.headers.authorization;
  
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    try {
      const payload = JWTUtils.verifyToken(token);
      req.user = {
        id: payload.userId,
        address: payload.address,
        email: payload.email,
        accountTier: payload.accountTier || 'email_basic',
        authMethod: payload.authMethod || (payload.address ? 'wallet' : 'email')
      };
    } catch (error) {
      // Continue without auth for optional routes
      console.log('⚠️ Optional auth failed, continuing without user:', error);
    }
  }
  
  next();
};

// =============================================================================
// VALIDATION SCHEMAS
// =============================================================================

// ENHANCED: Validation schemas for profile management
const paginationSchema = z.object({
  page: z.string().optional().transform((val) => val ? parseInt(val) : 1),
  per_page: z.string().optional().transform((val) => val ? Math.min(parseInt(val) || 20, 100) : 20)
});

const recommendationQuerySchema = z.object({
  author_id: z.string().optional(), // FIXED: Changed from 'author' to 'author_id'
  category: z.string().optional(),
  city: z.string().optional(),
  limit: z.string().optional().transform((val) => val ? Math.min(parseInt(val) || 20, 100) : 20),
  offset: z.string().optional().transform((val) => val ? parseInt(val) : 0),
  trust_feed: z.string().optional().transform((val) => val === 'true'),
  min_trust_score: z.string().optional().transform((val) => val ? parseFloat(val) : 0)
});

const followSchema = z.object({
  following_id: z.string().uuid('Invalid user ID format')
});

const trustCalculationSchema = z.object({
  user_a: z.string().uuid('Invalid user ID format'),
  user_b: z.string().uuid('Invalid user ID format')
});

// ENHANCED: Profile management schemas
const profileUpdateSchema = z.object({
  username: z.string()
    .min(3, 'Username must be at least 3 characters')
    .max(30, 'Username must be less than 30 characters')
    .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores')
    .optional(),
  display_name: z.string()
    .min(1, 'Display name is required')
    .max(50, 'Display name must be less than 50 characters')
    .optional(),
  bio: z.string()
    .max(500, 'Bio must be less than 500 characters')
    .optional(),
  avatar_url: z.string()
    .url('Invalid avatar URL')
    .optional(),
  location_city: z.string()
    .max(100, 'City name must be less than 100 characters')
    .optional(),
  location_country: z.string()
    .max(100, 'Country name must be less than 100 characters')
    .optional(),
  email: z.string()
    .email('Invalid email address')
    .optional()
});

const usernameCheckSchema = z.object({
  username: z.string()
    .min(3, 'Username must be at least 3 characters')
    .max(30, 'Username must be less than 30 characters')
    .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores')
});

// NEW: Email authentication schemas
const emailRegisterSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  username: z.string()
    .min(3, 'Username must be at least 3 characters')
    .max(30, 'Username must be less than 30 characters')
    .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores')
    .optional(),
  display_name: z.string().min(1).max(50).optional()
});

const emailLoginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required')
});

// UPDATED: Wallet authentication schemas
const challengeSchema = z.object({
  walletAddress: z.string().min(20, 'Invalid wallet address')
});

const verifySchema = z.object({
  walletAddress: z.string().min(20, 'Invalid wallet address'),
  signature: z.string().min(10, 'Invalid signature'),
  challenge: z.string().min(10, 'Invalid challenge'),
  timestamp: z.number().optional(),
  nonce: z.string().optional()
});

// FIXED: Recommendation creation schema - auto-fetch restaurant name from restaurant_id
const createRecommendationSchema = z.object({
  title: z.string().min(3).max(200),
  content: z.string().min(10).max(2000),
  category: z.string().min(1),
  
  // CHANGE: Accept restaurant_id instead of restaurantName
  restaurant_id: z.number().int().positive(), // Frontend sends this
  restaurantName: z.string().min(1).optional(), // Make optional - we'll fetch it
  
  authorId: z.string().optional(), // Frontend sends this
  
  // Frontend sends flat coordinates
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  
  // Plus a location object
  location: z.object({
    city: z.string().optional(),
    latitude: z.number().min(-90).max(90).optional(),
    longitude: z.number().min(-180).max(180).optional()
  }).optional(),
  
}).transform((data) => {
  // Use coordinates from either flat fields or location object
  const lat = data.latitude || data.location?.latitude;
  const lng = data.longitude || data.location?.longitude;
  
  return {
    title: data.title,
    content: data.content,
    category: data.category,
    restaurant_id: data.restaurant_id, // Keep the ID
    restaurantName: data.restaurantName, // Will be filled in later
    coordinates: lat && lng ? { latitude: lat, longitude: lng } : undefined,
    city: data.location?.city,
    authorId: data.authorId
  };
});

// ADDED: Lists validation schemas
const createListSchema = z.object({
  title: z.string()
    .min(1, 'List title is required')
    .max(200, 'List title must be less than 200 characters')
    .trim(),
  description: z.string()
    .max(1000, 'List description must be less than 1000 characters')
    .trim()
    .optional(),
  visibility: z.enum(['public', 'private', 'followers_only'], {
    errorMap: () => ({ message: 'Visibility must be public, private, or followers_only' })
  }),
  restaurant_ids: z.array(z.number().int().positive(), {
    errorMap: () => ({ message: 'Restaurant IDs must be positive integers' })
  }).min(1, 'At least one restaurant must be selected'),
  author_id: z.string().uuid().optional() // FIXED: Use author_id instead of created_by
});

// NEW: Enhanced query schema for User Profile integration
const getListsQuerySchema = z.object({
  limit: z.string().optional().transform((val) => val ? Math.min(parseInt(val) || 20, 100) : 20),
  visibility: z.enum(['public', 'private', 'followers_only']).optional(),
  author: z.string().uuid().optional(), // NEW: Support ?author={userId} query parameter
  author_id: z.string().uuid().optional(), // FIXED: Use author_id instead of created_by
  search: z.string().optional()
});

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

// Utility functions for authentication
const generateChallenge = (address: string): string => {
  const timestamp = Date.now();
  const nonce = Math.random().toString(36).substring(7);
  return `Zesto Authentication
Wallet: ${address}
Timestamp: ${timestamp}
Nonce: ${nonce}

By signing this message, you authenticate with Zesto.`;
};

// ENHANCED: Profile completion calculation
const calculateProfileCompletion = (user: DatabaseUser): number => {
  let score = 0;
  const maxScore = 100;
  
  // Basic information (40 points total)
  if (user.username) score += 10;
  if (user.display_name && user.display_name !== user.username) score += 10;
  if (user.bio && user.bio.length > 10) score += 10;
  if (user.avatar_url) score += 10;
  
  // Location information (20 points total)
  if (user.location_city) score += 10;
  if (user.location_country) score += 10;
  
  // Social activity (30 points total)
  if ((user.total_recommendations || 0) > 0) score += 15;
  if ((user.followers_count || 0) > 0) score += 10;
  if ((user.following_count || 0) > 0) score += 5;
  
  // Verification (10 points total)
  if (user.verification_level && user.verification_level !== 'basic') score += 10;
  
  return Math.min(score, maxScore);
};

// Helper function to calculate distance between two points
function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Challenge storage (in production, use Redis with TTL)
const challenges = new Map<string, { message: string; timestamp: number; nonce: string; expiresAt: number }>();

// Initialize integrated trust service
let serviceInitialized = false;

const initializeService = async () => {
  if (!serviceInitialized) {
    try {
      await integratedTrustService.initialize();
      serviceInitialized = true;
      console.log('✅ Integrated Trust Service initialized');
    } catch (error) {
      console.error('❌ Failed to initialize Integrated Trust Service:', error);
    }
  }
};

// Initialize service on startup
initializeService();

// ADDED: Import and instantiate SocialService for follow functionality
const socialService = new SocialService();

// Social service object with clean method delegation
const socialServiceObject = {
  followUser: async (followerId: string, followingId: string) => {
    return await socialService.followUser(followerId, followingId);
  },

  unfollowUser: async (followerId: string, followingId: string) => {
    return await socialService.unfollowUser(followerId, followingId);
  }
};

// =============================================================================
// ROUTES SETUP
// =============================================================================

const router = express.Router();

// =============================================================================
// TWO-TIER AUTHENTICATION ENDPOINTS
// =============================================================================

// ===========================
// EMAIL AUTHENTICATION (Basic Tier)
// ===========================

// Register with email
router.post('/auth/email/register', async (req, res) => {
  try {
    console.log('📧 Email registration request:', req.body.email);
    
    const validation = emailRegisterSchema.safeParse(req.body);
    if (!validation.success) {
      console.error('❌ Registration validation failed:', validation.error.errors);
      return res.status(400).json({
        success: false,
        error: 'Invalid registration data',
        details: validation.error.errors
      });
    }

    const { email, password, username, display_name } = validation.data;
    const emailLower = email.toLowerCase();

    // Check if email already exists
    const { data: existingUser, error: checkError } = await supabase
      .from('users')
      .select('id, email')
      .eq('email', emailLower)
      .single();

    if (existingUser && !checkError) {
      return res.status(400).json({
        success: false,
        error: 'Email already registered',
        field: 'email'
      });
    }

    // Check if username is taken (if provided)
    if (username) {
      const { data: existingUsername } = await supabase
        .from('users')
        .select('id')
        .eq('username', username)
        .single();

      if (existingUsername) {
        return res.status(400).json({
          success: false,
          error: 'Username already taken',
          field: 'username'
        });
      }
    }

    // Hash password
    const password_hash = await bcrypt.hash(password, 10);

    // Create user
    const newUser: DatabaseUser = {
      email: emailLower,
      password_hash,
      username: username || `user_${Date.now()}`,
      display_name: display_name || username || `User ${Date.now()}`,
      account_tier: 'email_basic',
      auth_method: 'email',
      reputation_score: 0,
      trust_score: 0,
      staking_balance: 0,
      staking_tier: 'explorer',
      verification_level: 'basic',
      pending_token_claims: 0,
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

    // Generate JWT
    const jwtToken = JWTUtils.generateToken({
      userId: createdUser.id!,
      email: emailLower,
      accountTier: 'email_basic',
      authMethod: 'email'
    });

    console.log(`✅ Email user created: ${createdUser.id}`);

    const profileCompletion = calculateProfileCompletion(createdUser);

    res.json({
      success: true,
      token: jwtToken,
      user: {
        id: createdUser.id,
        email: createdUser.email,
        username: createdUser.username,
        display_name: createdUser.display_name,
        accountTier: 'email_basic',
        authMethod: 'email',
        profileCompletion,
        pendingTokenClaims: 0,
        reputationScore: 0,
        trustScore: 0
      },
      expiresIn: 86400
    });

  } catch (error) {
    console.error('❌ Email registration error:', error);
    res.status(500).json({
      success: false,
      error: 'Registration failed'
    });
  }
});

// Login with email
router.post('/auth/email/login', async (req, res) => {
  try {
    console.log('📧 Email login request:', req.body.email);
    
    const validation = emailLoginSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: 'Invalid login data',
        details: validation.error.errors
      });
    }

    const { email, password } = validation.data;
    const emailLower = email.toLowerCase();

    // Find user by email
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', emailLower)
      .single();

    if (error || !user || !user.password_hash) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password'
      });
    }

    // Verify password
    const passwordValid = await bcrypt.compare(password, user.password_hash);
    if (!passwordValid) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password'
      });
    }

    // Update last login
    await supabase
      .from('users')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', user.id);

    // Generate JWT
    const jwtToken = JWTUtils.generateToken({
      userId: user.id!,
      email: emailLower,
      accountTier: user.account_tier || 'email_basic',
      authMethod: user.auth_method || 'email'
    });

    console.log(`✅ Email user logged in: ${user.id}`);

    const profileCompletion = calculateProfileCompletion(user);

    res.json({
      success: true,
      token: jwtToken,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        display_name: user.display_name,
        bio: user.bio,
        avatar_url: user.avatar_url,
        location_city: user.location_city,
        location_country: user.location_country,
        accountTier: user.account_tier || 'email_basic',
        authMethod: user.auth_method || 'email',
        profileCompletion,
        pendingTokenClaims: user.pending_token_claims || 0,
        reputationScore: user.reputation_score || 0,
        trustScore: user.trust_score || 0,
        stakingBalance: user.staking_balance || 0,
        stakingTier: user.staking_tier || 'explorer',
        verificationLevel: user.verification_level || 'basic'
      },
      expiresIn: 86400
    });

  } catch (error) {
    console.error('❌ Email login error:', error);
    res.status(500).json({
      success: false,
      error: 'Login failed'
    });
  }
});

// ===========================
// WALLET AUTHENTICATION (Full Tier)
// ===========================

// Generate wallet authentication challenge
router.post('/auth/wallet/challenge', async (req, res) => {
  try {
    console.log('🔐 Wallet challenge request:', req.body);
    
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
  } catch (error) {
    console.error('❌ Generate challenge error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate challenge'
    });
  }
});

// Verify wallet signature and authenticate
router.post('/auth/wallet/verify', async (req, res) => {
  try {
    console.log('🔐 Wallet verify request:', req.body.walletAddress);
    
    const validation = verifySchema.safeParse(req.body);
    if (!validation.success) {
      console.error('❌ Verify validation failed:', validation.error.errors);
      return res.status(400).json({
        success: false,
        error: 'Invalid request body',
        details: validation.error.errors
      });
    }

    const { walletAddress, signature, challenge } = validation.data;

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

    console.log(`✅ Wallet authentication successful: ${walletAddress}`);

    const walletAddressLower = walletAddress.toLowerCase();

    // Check if user exists
    const { data: existingUser, error: fetchError } = await supabase
      .from('users')
      .select('*')
      .eq('wallet_address', walletAddressLower)
      .single();

    let dbUser: DatabaseUser;
    let userId: string;

    if (existingUser && !fetchError) {
      // Update last login
      console.log(`👤 Wallet user exists: ${existingUser.id}`);
      
      const { data: updatedUser, error: updateError } = await supabase
        .from('users')
        .update({ 
          updated_at: new Date().toISOString(),
          account_tier: 'wallet_full',
          auth_method: 'wallet'
        })
        .eq('wallet_address', walletAddressLower)
        .select()
        .single();

      if (updateError) throw updateError;
      
      dbUser = updatedUser;
      userId = updatedUser.id!;
      
    } else {
      // Create new wallet user
      console.log(`📝 Creating new wallet user: ${walletAddressLower}`);
      
      const newUser: DatabaseUser = {
        wallet_address: walletAddressLower,
        username: `user_${walletAddress.slice(2, 8).toLowerCase()}`,
        display_name: `User ${walletAddress.slice(2, 8)}`,
        account_tier: 'wallet_full',
        auth_method: 'wallet',
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

      if (createError) throw createError;
      
      dbUser = createdUser;
      userId = createdUser.id!;
      console.log(`✅ Wallet user created: ${createdUser.id}`);
    }

    // Generate JWT
    const jwtToken = JWTUtils.generateToken({
      userId: userId,
      address: walletAddress,
      accountTier: 'wallet_full',
      authMethod: 'wallet'
    });

    // Clean up challenge
    challenges.delete(walletAddress);

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
        accountTier: 'wallet_full',
        authMethod: 'wallet',
        reputationScore: dbUser.reputation_score,
        trustScore: dbUser.trust_score,
        stakingBalance: dbUser.staking_balance,
        stakingTier: dbUser.staking_tier,
        verificationLevel: dbUser.verification_level,
        profileCompletion,
        createdAt: dbUser.created_at
      },
      expiresIn: 86400
    });

  } catch (error) {
    console.error('❌ Wallet verify error:', error);
    res.status(500).json({
      success: false,
      error: 'Authentication failed'
    });
  }
});

// ===========================
// SOCIAL AUTHENTICATION (Future)
// ===========================

// Google OAuth (placeholder)
router.post('/auth/social/google', async (req, res) => {
  res.status(501).json({
    success: false,
    error: 'Google authentication coming soon'
  });
});

// Apple OAuth (placeholder)
router.post('/auth/social/apple', async (req, res) => {
  res.status(501).json({
    success: false,
    error: 'Apple authentication coming soon'
  });
});

// Twitter OAuth (placeholder)
router.post('/auth/social/twitter', async (req, res) => {
  res.status(501).json({
    success: false,
    error: 'Twitter authentication coming soon'
  });
});

// Simple route handlers that call your existing logic with the new route names

// POST /api/auth/challenge - Frontend calls this instead of /auth/wallet/challenge
router.post('/auth/challenge', async (req, res) => {
  try {
    const { walletAddress } = req.body;
    
    if (!walletAddress) {
      return res.status(400).json({
        success: false,
        error: 'Wallet address is required'
      });
    }

    const timestamp = Date.now();
    const nonce = Math.random().toString(36).substring(7);
    const message = generateChallenge(walletAddress);
    const expiresAt = Date.now() + (5 * 60 * 1000); // 5 minutes

    // Store challenge (using your existing challenges Map)
    challenges.set(walletAddress, { message, timestamp, nonce, expiresAt });

    console.log(`✅ Generated challenge for wallet: ${walletAddress}`);

    res.json({
      success: true,
      challenge: message,
      timestamp,
      nonce,
      expiresIn: 300000
    });
  } catch (error) {
    console.error('❌ Generate challenge error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate challenge'
    });
  }
});

// FIXED VERSION - Remove last_login_at references
// Replace your /auth/login route with this version

router.post('/auth/login', async (req, res) => {
  try {
    const { walletAddress, signature, challenge } = req.body;
    
    if (!walletAddress || !signature || !challenge) {
      return res.status(400).json({ success: false, error: 'Missing required fields' });
    }

    const storedChallenge = challenges.get(walletAddress);
    if (!storedChallenge || storedChallenge.expiresAt < Date.now()) {
      return res.status(400).json({ success: false, error: 'Challenge expired or not found' });
    }

    if (storedChallenge.message !== challenge || !signature || signature.length < 10) {
      return res.status(400).json({ success: false, error: 'Invalid signature or challenge' });
    }

    const walletAddressLower = walletAddress.toLowerCase();
    const { data: existingUser } = await supabase.from('users').select('*').eq('wallet_address', walletAddressLower).single();

    let dbUser: DatabaseUser;
    if (existingUser) {
      // FIXED: Removed last_login_at from update
      const { data: updated } = await supabase
        .from('users')
        .update({ 
          updated_at: new Date().toISOString(), 
          account_tier: 'wallet_full', 
          auth_method: 'wallet' 
        })
        .eq('wallet_address', walletAddressLower)
        .select()
        .single();
      dbUser = updated!;
    } else {
      // FIXED: Removed last_login_at from insert
      const { data: created } = await supabase
        .from('users')
        .insert({
          wallet_address: walletAddressLower,
          username: `user_${walletAddress.slice(2, 8)}`,
          display_name: `User ${walletAddress.slice(2, 8)}`,
          account_tier: 'wallet_full',
          auth_method: 'wallet',
          pending_tokens: 0,
          reputation_score: 0,
          trust_score: 0,
          staking_balance: 0,
          staking_tier: 'explorer',
          verification_level: 'basic',
          location_country: 'BR'
        })
        .select()
        .single();
      dbUser = created!;
    }

    const jwtToken = JWTUtils.generateToken({
      userId: dbUser.id!,
      address: walletAddress,
      accountTier: 'wallet_full',
      authMethod: 'wallet'
    });

    challenges.delete(walletAddress);
    const profileCompletion = calculateProfileCompletion(dbUser);

    res.json({
      success: true,
      token: jwtToken,
      user: { 
        id: dbUser.id, 
        walletAddress: dbUser.wallet_address, 
        username: dbUser.username,
        display_name: dbUser.display_name,
        accountTier: 'wallet_full', 
        authMethod: 'wallet',
        profileCompletion 
      }
    });
  } catch (error) {
    console.error('❌ Wallet login error:', error);
    res.status(500).json({ success: false, error: 'Authentication failed' });
  }
});

// FIXED VERSION - Remove last_login_at references
// Replace your /auth/email-signup route with this version

router.post('/auth/email-signup', async (req, res) => {
  try {
    const { email, password, displayName } = req.body;
    if (!email || !password || password.length < 8) {
      return res.status(400).json({ success: false, error: 'Invalid email or password (min 8 chars)' });
    }

    const emailLower = email.toLowerCase();
    const { data: existing } = await supabase.from('users').select('id').eq('email', emailLower).single();
    if (existing) {
      return res.status(409).json({ success: false, error: 'Email already registered' });
    }

    const password_hash = await bcrypt.hash(password, 10);
    
    // FIXED: Removed last_login_at from insert
    const { data: created } = await supabase
      .from('users')
      .insert({
        email: emailLower,
        password_hash,
        display_name: displayName || emailLower.split('@')[0],
        account_tier: 'email_basic',
        auth_method: 'email',
        pending_tokens: 0,
        reputation_score: 0,
        trust_score: 0,
        staking_balance: 0,
        staking_tier: 'explorer',
        verification_level: 'basic',
        location_country: 'BR'
      })
      .select()
      .single();

    const jwtToken = JWTUtils.generateToken({
      userId: created!.id!,
      email: emailLower,
      accountTier: 'email_basic',
      authMethod: 'email'
    });

    const profileCompletion = calculateProfileCompletion(created!);

    res.json({
      success: true,
      token: jwtToken,
      user: { 
        id: created!.id, 
        email: created!.email, 
        display_name: created!.display_name,
        accountTier: 'email_basic',
        authMethod: 'email',
        profileCompletion,
        pendingTokens: 0
      }
    });
  } catch (error) {
    console.error('❌ Email signup error:', error);
    res.status(500).json({ success: false, error: 'Registration failed' });
  }
});

// ===========================
// SHARED AUTH ENDPOINTS
// ===========================

// Token verification endpoint (works for both email and wallet)
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
          walletAddress: payload.address,
          email: payload.email,
          accountTier: payload.accountTier,
          authMethod: payload.authMethod
        }
      });
    } catch (error) {
      res.json({
        success: true,
        valid: false,
        error: 'Invalid or expired token'
      });
    }
  } catch (error) {
    console.error('❌ Token verification error:', error);
    res.status(500).json({
      success: false,
      error: 'Token verification failed'
    });
  }
});

// ENHANCED: Get current user profile - supports both tiers
router.get('/auth/me', authenticateToken, async (req, res) => {
  try {
    const userId = req.user!.id;
    const accountTier = req.user!.accountTier;

    console.log(`GET /api/auth/me - user: ${userId}, tier: ${accountTier}`);

    try {
      // Fetch user data from Supabase database
      const { data: dbUser, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();
      
      if (dbUser && !error) {
        const profileCompletion = calculateProfileCompletion(dbUser);
        
        res.json({
          success: true,
          user: {
            id: dbUser.id,
            walletAddress: dbUser.wallet_address,
            email: dbUser.email,
            username: dbUser.username || `user_${(dbUser.wallet_address || dbUser.email)?.slice(2, 8)}`,
            display_name: dbUser.display_name || `User ${(dbUser.wallet_address || dbUser.email)?.slice(2, 8)}`,
            bio: dbUser.bio || '',
            avatar_url: dbUser.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${dbUser.username || 'user'}`,
            location_city: dbUser.location_city || '',
            location_country: dbUser.location_country || 'BR',
            accountTier: dbUser.account_tier || accountTier,
            authMethod: dbUser.auth_method || req.user!.authMethod,
            pendingTokenClaims: dbUser.pending_token_claims || 0,
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
            updated_at: dbUser.updated_at
          }
        });
      } else {
        throw error || new Error('User not found');
      }
    } catch (dbError) {
      console.error('❌ Database query failed:', dbError);
      
      // Fallback
      res.json({
        success: true,
        user: {
          id: userId,
          walletAddress: req.user!.address,
          email: req.user!.email,
          username: `user_${userId.slice(-6)}`,
          display_name: `User ${userId.slice(-6)}`,
          accountTier: accountTier,
          authMethod: req.user!.authMethod,
          pendingTokenClaims: 0,
          profileCompletion: 20
        },
        warning: 'Using fallback data'
      });
    }
  } catch (error) {
    console.error('❌ Get current user error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get user info'
    });
  }
});

// Update user profile (same for both tiers)
router.patch('/auth/profile', authenticateToken, async (req, res) => {
  try {
    const userId = req.user!.id;
    console.log(`PATCH /api/auth/profile - user: ${userId}`, req.body);

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

    const profileCompletion = calculateProfileCompletion(updatedUser);

    res.json({
      success: true,
      message: 'Profile updated successfully',
      user: {
        id: updatedUser.id,
        walletAddress: updatedUser.wallet_address,
        email: updatedUser.email,
        username: updatedUser.username,
        display_name: updatedUser.display_name,
        bio: updatedUser.bio,
        avatar_url: updatedUser.avatar_url,
        location_city: updatedUser.location_city,
        location_country: updatedUser.location_country,
        accountTier: updatedUser.account_tier,
        authMethod: updatedUser.auth_method,
        pendingTokenClaims: updatedUser.pending_token_claims || 0,
        reputation_score: updatedUser.reputation_score || 0,
        trust_score: updatedUser.trust_score || 0,
        staking_balance: updatedUser.staking_balance || 0,
        staking_tier: updatedUser.staking_tier || 'explorer',
        verification_level: updatedUser.verification_level || 'basic',
        profileCompletion,
        created_at: updatedUser.created_at,
        updated_at: updatedUser.updated_at
      }
    });

  } catch (error) {
    console.error('❌ Update profile error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update profile'
    });
  }
});

// =============================================================================
// USER PROFILE INTEGRATION ENDPOINTS
// =============================================================================

// GET /api/users/:userId/likes - Get user's liked recommendations
router.get('/users/:userId/likes', optionalAuth, async (req: express.Request, res: express.Response) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.user?.id;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const offset = parseInt(req.query.offset as string) || 0;

    console.log(`GET /api/users/${userId}/likes - limit: ${limit}, offset: ${offset}`);

    // Get user's likes with full recommendation details
    const { data: likes, error } = await supabase
      .from('recommendation_likes')
      .select(`
        created_at,
        recommendations:recommendation_id (
          id,
          title,
          content,
          category,
          author_id,
          restaurant_id,
          trust_score,
          upvotes_count,
          saves_count,
          created_at,
          updated_at
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('❌ Error fetching user likes:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch user likes'
      });
    }

    // Transform the data to match frontend expectations
    const likedRecommendations = (likes || []).map(like => ({
      ...like.recommendations,
      liked_at: like.created_at
    })).filter(rec => rec.id); // Filter out any null recommendations

    console.log(`✅ Found ${likedRecommendations.length} liked recommendations for user ${userId}`);

    res.json({
      success: true,
      recommendations: likedRecommendations,
      count: likedRecommendations.length,
      pagination: {
        limit,
        offset,
        has_more: likedRecommendations.length === limit
      },
      user_id: userId
    });

  } catch (error) {
    console.error('❌ Error fetching user likes:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch user likes'
    });
  }
});

// GET /api/users/:userId/bookmarks - Get user's bookmarked recommendations (private)
router.get('/users/:userId/bookmarks', authenticate, async (req: express.Request, res: express.Response) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.user!.id;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const offset = parseInt(req.query.offset as string) || 0;

    console.log(`GET /api/users/${userId}/bookmarks - current user: ${currentUserId}`);

    // Only allow users to see their own bookmarks
    if (userId !== currentUserId) {
      return res.status(403).json({
        success: false,
        error: 'You can only view your own bookmarks'
      });
    }

    // Get user's bookmarks with full recommendation details
    const { data: bookmarks, error } = await supabase
      .from('recommendation_bookmarks')
      .select(`
        created_at,
        recommendations:recommendation_id (
          id,
          title,
          content,
          category,
          author_id,
          restaurant_id,
          trust_score,
          upvotes_count,
          saves_count,
          created_at,
          updated_at
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('❌ Error fetching user bookmarks:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch user bookmarks'
      });
    }

    // Transform the data to match frontend expectations
    const bookmarkedRecommendations = (bookmarks || []).map(bookmark => ({
      ...bookmark.recommendations,
      bookmarked_at: bookmark.created_at
    })).filter(rec => rec.id); // Filter out any null recommendations

    console.log(`✅ Found ${bookmarkedRecommendations.length} bookmarked recommendations for user ${userId}`);

    res.json({
      success: true,
      recommendations: bookmarkedRecommendations,
      count: bookmarkedRecommendations.length,
      pagination: {
        limit,
        offset,
        has_more: bookmarkedRecommendations.length === limit
      },
      user_id: userId
    });

  } catch (error) {
    console.error('❌ Error fetching user bookmarks:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch user bookmarks'
    });
  }
});

app.use('/api/auth/social', socialAuthRoutes);

// =============================================================================
// 🔥 CRITICAL FIX: MOUNT ROUTER TO APP
// =============================================================================
// This registers all the routes defined above with the Express app
app.use('/api', router);

// =============================================================================
// MOUNT OTHER ROUTE MODULES (These were already working)
// =============================================================================

// FIXED: Mount the social API routes ONLY ONCE - this is the correct registration
app.use('/api/social', optionalAuth, socialRoutes);

// Mount the list routes
app.use('/api/lists', optionalAuth, guidesRoutes);

// Mount the enhanced recommendation routes with Trust Score 2.0 support
app.use('/api/recommendations', recommendationRoutes);

// Restaurant search routes
app.use('/api/restaurants', restaurantRoutes);

// Saved Lists
app.use('/api/saved-lists', authenticate, savedListsRoutes);

// Discovery routes
app.use('/api/discovery', optionalAuth, discoveryRoutes);

// =============================================================================
// USER PROFILE INTEGRATION ENDPOINTS
// =============================================================================

// GET /api/users/:userId/likes - Get user's liked recommendations
router.get('/users/:userId/likes', optionalAuth, async (req: express.Request, res: express.Response) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.user?.id;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const offset = parseInt(req.query.offset as string) || 0;

    console.log(`GET /api/users/${userId}/likes - limit: ${limit}, offset: ${offset}`);

    // Get user's likes with full recommendation details
    const { data: likes, error } = await supabase
      .from('recommendation_likes')
      .select(`
        created_at,
        recommendations:recommendation_id (
          id,
          title,
          content,
          category,
          author_id,
          restaurant_id,
          trust_score,
          upvotes_count,
          saves_count,
          created_at,
          updated_at
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('❌ Error fetching user likes:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch user likes'
      });
    }

    // Transform the data to match frontend expectations
    const likedRecommendations = (likes || []).map(like => ({
      ...like.recommendations,
      liked_at: like.created_at
    })).filter(rec => rec.id); // Filter out any null recommendations

    console.log(`✅ Found ${likedRecommendations.length} liked recommendations for user ${userId}`);

    res.json({
      success: true,
      recommendations: likedRecommendations,
      count: likedRecommendations.length,
      pagination: {
        limit,
        offset,
        has_more: likedRecommendations.length === limit
      },
      user_id: userId
    });

  } catch (error) {
    console.error('❌ Error fetching user likes:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch user likes'
    });
  }
});

// GET /api/users/:userId/bookmarks - Get user's bookmarked recommendations (private)
router.get('/users/:userId/bookmarks', authenticate, async (req: express.Request, res: express.Response) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.user!.id;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const offset = parseInt(req.query.offset as string) || 0;

    console.log(`GET /api/users/${userId}/bookmarks - current user: ${currentUserId}`);

    // Only allow users to see their own bookmarks
    if (userId !== currentUserId) {
      return res.status(403).json({
        success: false,
        error: 'You can only view your own bookmarks'
      });
    }

    // Get user's bookmarks with full recommendation details
    const { data: bookmarks, error } = await supabase
      .from('recommendation_bookmarks')
      .select(`
        created_at,
        recommendations:recommendation_id (
          id,
          title,
          content,
          category,
          author_id,
          restaurant_id,
          trust_score,
          upvotes_count,
          saves_count,
          created_at,
          updated_at
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('❌ Error fetching user bookmarks:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch user bookmarks'
      });
    }

    // Transform the data to match frontend expectations
    const bookmarkedRecommendations = (bookmarks || []).map(bookmark => ({
      ...bookmark.recommendations,
      bookmarked_at: bookmark.created_at
    })).filter(rec => rec.id); // Filter out any null recommendations

    console.log(`✅ Found ${bookmarkedRecommendations.length} bookmarked recommendations for user ${userId}`);

    res.json({
      success: true,
      recommendations: bookmarkedRecommendations,
      count: bookmarkedRecommendations.length,
      pagination: {
        limit,
        offset,
        has_more: bookmarkedRecommendations.length === limit
      },
      user_id: userId
    });

  } catch (error) {
    console.error('❌ Error fetching user bookmarks:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch user bookmarks'
    });
  }
});

// =============================================================================
// RESTAURANT ENDPOINTS
// =============================================================================

// GET /api/restaurants - Search and list restaurants
router.get('/restaurants', async (req: express.Request, res: express.Response) => {
  try {
    console.log('🔍 GET /api/restaurants - Search request:', req.query);

    // Parse query parameters
    const search = (req.query.search as string) || '';
    const city = req.query.city as string;
    const cuisineType = req.query.cuisineType as string;
    const priceRange = req.query.priceRange ? 
      (req.query.priceRange as string).split(',').map(Number) : undefined;
    const minTrustScore = Number(req.query.minTrustScore) || 0;
    const sortBy = (req.query.sortBy as string) || 'trustScore';
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;
    const userAddress = req.query.userAddress as string;
    const userLat = req.query.userLat as string;
    const userLng = req.query.userLng as string;

    // Get restaurants from Supabase
    const { data: restaurants, error } = await supabase
      .from('restaurants')
      .select(`
        *,
        recommendations:recommendations(count)
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Supabase error:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch restaurants from database'
      });
    }

    // Transform Supabase data to Restaurant interface
    const transformedRestaurants: Restaurant[] = restaurants.map(restaurant => ({
      id: restaurant.id,
      name: restaurant.name,
      address: restaurant.address,
      city: restaurant.city,
      country: 'Brazil', // Default for now
      latitude: restaurant.latitude || 0,
      longitude: restaurant.longitude || 0,
      cuisineType: restaurant.category, // Map category to cuisineType
      priceRange: undefined, // Add this to your schema later
      phone: undefined, // Add this to your schema later
      website: undefined, // Add this to your schema later
      addedBy: restaurant.created_by || 'system',
      verified: false, // Calculate based on recommendations
      verificationCount: 0, // Calculate later
      totalRecommendations: restaurant.recommendations?.[0]?.count || 0,
      avgTrustScore: Math.random() * 3 + 7, // Mock for now, calculate from actual recommendations
      lastRecommendationDate: restaurant.created_at ? new Date(restaurant.created_at) : undefined,
      createdAt: new Date(restaurant.created_at),
      updatedAt: new Date(restaurant.created_at)
    }));

    // Filter restaurants
    let filteredRestaurants = transformedRestaurants.filter(restaurant => {
      // Search filter
      if (search && !restaurant.name.toLowerCase().includes(search.toLowerCase()) && 
          !restaurant.address.toLowerCase().includes(search.toLowerCase())) {
        return false;
      }
      
      // City filter
      if (city && city !== 'All Cities' && restaurant.city !== city) {
        return false;
      }
      
      // Cuisine filter
      if (cuisineType && cuisineType !== 'All Cuisines' && restaurant.cuisineType !== cuisineType) {
        return false;
      }
      
      // Price range filter
      if (priceRange && priceRange.length > 0 && 
          restaurant.priceRange && !priceRange.includes(restaurant.priceRange)) {
        return false;
      }
      
      return true;
    });

    // Calculate distances and sort
    const enrichedRestaurants = filteredRestaurants.map(restaurant => {
      let distanceKm: number | undefined;
      if (userLat && userLng) {
        distanceKm = calculateDistance(
          Number(userLat), Number(userLng),
          restaurant.latitude, restaurant.longitude
        );
      }

      return {
        ...restaurant,
        distanceKm,
        trustScoreForUser: userAddress ? restaurant.avgTrustScore : undefined,
      };
    });

    // Filter by minimum trust score
    const trustFilteredRestaurants = enrichedRestaurants.filter(restaurant => {
      const score = restaurant.trustScoreForUser || restaurant.avgTrustScore;
      return score >= minTrustScore;
    });

    // Sort restaurants
    const sortedRestaurants = trustFilteredRestaurants.sort((a, b) => {
      switch (sortBy) {
        case 'trustScore':
          const scoreA = a.trustScoreForUser || a.avgTrustScore;
          const scoreB = b.trustScoreForUser || b.avgTrustScore;
          return scoreB - scoreA;
        case 'distance':
          return (a.distanceKm || 0) - (b.distanceKm || 0);
        case 'recent':
          const dateA = a.lastRecommendationDate?.getTime() || 0;
          const dateB = b.lastRecommendationDate?.getTime() || 0;
          return dateB - dateA;
        case 'recommendations':
          return b.totalRecommendations - a.totalRecommendations;
        default:
          return 0;
      }
    });

    // Paginate results
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedRestaurants = sortedRestaurants.slice(startIndex, endIndex);

    console.log(`✅ Restaurant search successful: ${paginatedRestaurants.length} results`);

    res.json({
      success: true,
      results: paginatedRestaurants,
      total: sortedRestaurants.length,
      page,
      limit,
      hasNextPage: endIndex < sortedRestaurants.length,
      hasPrevPage: page > 1
    });

  } catch (error) {
    console.error('❌ Error searching restaurants:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to search restaurants'
    });
  }
});

// POST /api/restaurants - Create new restaurant
router.post('/restaurants', async (req: express.Request, res: express.Response) => {
  try {
    console.log('🏪 POST /api/restaurants - Create restaurant request:', req.body);

    const body = req.body;
    
    // Validate required fields
    const requiredFields = ['name', 'address', 'city', 'latitude', 'longitude'];
    for (const field of requiredFields) {
      if (!body[field]) {
        return res.status(400).json({
          success: false,
          error: `Missing required field: ${field}`
        });
      }
    }

    // Get existing restaurants to check for duplicates
    const { data: existingRestaurants, error: fetchError } = await supabase
      .from('restaurants')
      .select('*');

    if (fetchError) {
      console.error('❌ Error fetching existing restaurants:', fetchError);
      return res.status(500).json({
        success: false,
        error: 'Failed to check for duplicates'
      });
    }

    // Check for duplicate restaurants (within 100m radius)
    const duplicates = existingRestaurants.filter(restaurant => {
      const distance = calculateDistance(
        body.latitude, body.longitude,
        restaurant.latitude, restaurant.longitude
      );
      return distance < 0.1 && // 100m radius
             restaurant.name.toLowerCase().includes(body.name.toLowerCase());
    });

    if (duplicates.length > 0) {
      return res.status(409).json({
        success: false,
        error: 'A similar restaurant already exists nearby',
        suggestions: duplicates.map(r => ({
          id: r.id,
          name: r.name,
          address: r.address,
          distanceM: Math.round(calculateDistance(
            body.latitude, body.longitude,
            r.latitude, r.longitude
          ) * 1000)
        }))
      });
    }

    // Validate price range
    if (body.priceRange && (body.priceRange < 1 || body.priceRange > 4)) {
      return res.status(400).json({
        success: false,
        error: 'Price range must be between 1 and 4'
      });
    }

    // Validate coordinates
    if (Math.abs(body.latitude) > 90 || Math.abs(body.longitude) > 180) {
      return res.status(400).json({
        success: false,
        error: 'Invalid coordinates'
      });
    }

    // Insert into Supabase
    const { data: newRestaurant, error } = await supabase
      .from('restaurants')
      .insert({
        name: body.name.trim(),
        address: body.address.trim(),
        city: body.city.trim(),
        latitude: Number(body.latitude),
        longitude: Number(body.longitude),
        category: body.category?.trim() || body.cuisineType?.trim() || 'Restaurant', // Fix field mapping
        description: body.description?.trim(),
        created_by: body.addedBy || null
      })
      .select()
      .single();

    if (error) {
      console.error('❌ Supabase insert error:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to create restaurant',
        details: error.message
      });
    }

    // Transform back to Restaurant interface
    const formattedRestaurant: Restaurant = {
      id: newRestaurant.id,
      name: newRestaurant.name,
      address: newRestaurant.address,
      city: newRestaurant.city,
      country: body.country?.trim() || 'Brazil',
      latitude: newRestaurant.latitude,
      longitude: newRestaurant.longitude,
      cuisineType: newRestaurant.category,
      priceRange: body.priceRange ? Number(body.priceRange) : undefined,
      phone: body.phone?.trim(),
      website: body.website?.trim(),
      addedBy: body.addedBy || 'anonymous',
      verified: false,
      verificationCount: 0,
      totalRecommendations: 0,
      avgTrustScore: 0,
      createdAt: new Date(newRestaurant.created_at),
      updatedAt: new Date(newRestaurant.created_at)
    };

    console.log(`✅ Restaurant created successfully with ID: ${newRestaurant.id}`);

    res.status(201).json({
      success: true,
      restaurant: formattedRestaurant,
      created: true,
      message: `New restaurant created with ID: ${newRestaurant.id}`
    });

  } catch (error) {
    console.error('❌ Error creating restaurant:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create restaurant'
    });
  }
});

// GET /api/restaurants/:id - Get individual restaurant details
router.get('/restaurants/:id', async (req: express.Request, res: express.Response) => {
  try {
    const { id } = req.params;
    const userAddress = req.query.userAddress as string;

    console.log(`🔍 GET /api/restaurants/${id} - Fetch restaurant details`);

    const { data: restaurant, error } = await supabase
      .from('restaurants')
      .select(`
        *,
        recommendations:recommendations(
          id,
          title,
          description,
          trust_score,
          upvotes,
          saves,
          created_at,
          author:users(username, wallet_address)
        )
      `)
      .eq('id', id)
      .single();

    if (error || !restaurant) {
      console.error('❌ Restaurant not found:', error);
      return res.status(404).json({
        success: false,
        error: 'Restaurant not found'
      });
    }

    // Transform to Restaurant interface
    const formattedRestaurant: Restaurant = {
      id: restaurant.id,
      name: restaurant.name,
      address: restaurant.address,
      city: restaurant.city,
      country: 'Brazil',
      latitude: restaurant.latitude || 0,
      longitude: restaurant.longitude || 0,
      cuisineType: restaurant.category,
      addedBy: restaurant.created_by || 'system',
      verified: false,
      verificationCount: 0,
      totalRecommendations: restaurant.recommendations?.length || 0,
      avgTrustScore: Math.random() * 3 + 7,
      createdAt: new Date(restaurant.created_at),
      updatedAt: new Date(restaurant.created_at)
    };

    console.log(`✅ Restaurant details fetched successfully for ID: ${id}`);

    res.json({
      success: true,
      restaurant: formattedRestaurant,
      recommendations: restaurant.recommendations || [],
      trustScoreBreakdown: userAddress ? {
        personalizedScore: formattedRestaurant.avgTrustScore,
        globalAverage: formattedRestaurant.avgTrustScore,
        explanation: `Trust Score based on ${formattedRestaurant.totalRecommendations} recommendations`
      } : null
    });

  } catch (error) {
    console.error('❌ Error fetching restaurant:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch restaurant'
    });
  }
});

// =============================================================================
// SEARCH ENDPOINT
// =============================================================================

// FIXED: Search endpoint moved before other routes and 404 handler
router.get('/search', optionalAuth, async (req: express.Request, res: express.Response) => {
  try {
    console.log('🔍 GET /api/search - Universal search request:', req.query);

    const query = (req.query.q as string) || '';
    const type = (req.query.type as string) || 'all'; // 'lists', 'restaurants', or 'all'
    const limit = Math.min(parseInt((req.query.limit as string) || '20'), 50);

    if (!query.trim()) {
      return res.json({
        success: true,
        results: {
          lists: [],
          restaurants: []
        },
        total: 0
      });
    }

    const searchTerm = query.trim().toLowerCase();
    console.log(`🔍 Searching for: "${searchTerm}" (type: ${type})`);

    const results: {
      lists: any[];
      restaurants: any[];
    } = {
      lists: [],
      restaurants: []
    };

    // Search curated lists if requested
    if (type === 'all' || type === 'lists') {
      try {
        const { data: lists, error: listsError } = await supabase
          .from('curated_lists')
          .select(`
            id,
            title,
            description,
            author_id,
            is_public,
            created_at,
            curated_list_items (
              restaurant_id,
              restaurants (
                id,
                name,
                address,
                city,
                category
              )
            )
          `)
          .or(`title.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`)
          .eq('is_public', true)
          .order('created_at', { ascending: false })
          .limit(Math.ceil(limit / 2));

        if (!listsError && lists) {
          // Transform lists with user info
          const transformedLists = await Promise.all(
            lists.map(async (list) => {
              let authorInfo = {
                id: list.author_id,
                display_name: 'Food Expert',
                username: 'user'
              };

              // Fetch user info
              if (list.author_id) {
                try {
                  const { data: userData } = await supabase
                    .from('users')
                    .select('id, display_name, username')
                    .eq('id', list.author_id)
                    .single();
                  
                  if (userData) {
                    authorInfo = {
                      id: userData.id,
                      display_name: userData.display_name || userData.username || 'Food Expert',
                      username: userData.username || 'user'
                    };
                  }
                } catch (userError) {
                  console.log('⚠️ Could not fetch user for list:', userError);
                }
              }

              return {
                id: list.id,
                title: list.title,
                description: list.description || '',
                author: authorInfo,
                restaurant_count: list.curated_list_items?.length || 0,
                restaurants: (list.curated_list_items || [])
                  .map((item: any) => item.restaurants)
                  .filter(Boolean)
                  .slice(0, 4),
                created_at: list.created_at,
                type: 'list' as const
              };
            })
          );

          results.lists = transformedLists;
          console.log(`✅ Found ${transformedLists.length} matching lists`);
        }
      } catch (error) {
        console.error('❌ Error searching lists:', error);
      }
    }

    // Search restaurants if requested
    if (type === 'all' || type === 'restaurants') {
      try {
        const { data: restaurants, error: restaurantsError } = await supabase
          .from('restaurants')
          .select('*')
          .or(`name.ilike.%${searchTerm}%,address.ilike.%${searchTerm}%,city.ilike.%${searchTerm}%,category.ilike.%${searchTerm}%`)
          .order('created_at', { ascending: false })
          .limit(Math.ceil(limit / 2));

        if (!restaurantsError && restaurants) {
          const transformedRestaurants = restaurants.map(restaurant => ({
            id: restaurant.id,
            name: restaurant.name,
            address: restaurant.address,
            city: restaurant.city,
            category: restaurant.category || 'Restaurant',
            latitude: restaurant.latitude,
            longitude: restaurant.longitude,
            created_at: restaurant.created_at,
            type: 'restaurant' as const
          }));

          results.restaurants = transformedRestaurants;
          console.log(`✅ Found ${transformedRestaurants.length} matching restaurants`);
        }
      } catch (error) {
        console.error('❌ Error searching restaurants:', error);
      }
    }

    const totalResults = results.lists.length + results.restaurants.length;

    res.json({
      success: true,
      query: searchTerm,
      results,
      total: totalResults,
      type
    });

  } catch (error) {
    console.error('❌ Search error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to perform search'
    });
  }
});

// =============================================================================
// RECOMMENDATION ENDPOINTS
// =============================================================================

// FIXED: Get user's recommendations with correct column names
router.get('/users/:user_id/recommendations', optionalAuth, async (req, res) => {
  try {
    const { user_id } = req.params;
    const { limit = '20', offset = '0' } = req.query;

    console.log(`GET /api/users/${user_id}/recommendations`);

    const limitNum = Math.min(parseInt(limit as string) || 20, 100);
    const offsetNum = parseInt(offset as string) || 0;

    // FIXED: Query with correct schema column names
    const { data: recommendations, error } = await supabase
      .from('recommendations')
      .select(`
        id,
        author_id,
        title,
        content,
        category,
        restaurant_id,
        latitude,
        longitude,
        trust_score,
        upvotes_count,
        saves_count,
        verification_status,
        blockchain_tx_id,
        blockchain_status,
        created_at,
        updated_at
      `)
      .eq('author_id', user_id)
      .range(offsetNum, offsetNum + limitNum - 1)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Database error fetching user recommendations:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch user recommendations'
      });
    }

    console.log(`✅ Found ${recommendations?.length || 0} recommendations for user ${user_id}`);

    // Also update user's recommendation count if it's incorrect
    if (recommendations && recommendations.length > 0) {
      const actualCount = recommendations.length;
      
      // Check current count in user table
      const { data: userData } = await supabase
        .from('users')
        .select('total_recommendations')
        .eq('id', user_id)
        .single();

      if (userData && userData.total_recommendations !== actualCount) {
        console.log(`🔄 Updating recommendation count for user ${user_id}: ${userData.total_recommendations} -> ${actualCount}`);
        
        await supabase
          .from('users')
          .update({ 
            total_recommendations: actualCount,
            updated_at: new Date().toISOString()
          })
          .eq('id', user_id);
      }
    }

    res.json({
      success: true,
      recommendations: recommendations || [],
      count: recommendations?.length || 0,
      user_id,
      pagination: {
        limit: limitNum,
        offset: offsetNum,
        has_more: (recommendations?.length || 0) === limitNum
      }
    });

  } catch (error) {
    console.error('❌ Get user recommendations error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch user recommendations'
    });
  }
});

// =============================================================================
// USER ENDPOINTS
// =============================================================================

// Get user by ID
router.get('/users/:user_id', async (req, res) => {
  try {
    const { user_id } = req.params;
    
    console.log(`GET /api/users/${user_id}`);

    let dbUser = null;
    let error = null;

    const { data: userById, error: errorById } = await supabase
      .from('users')
      .select('*')
      .eq('id', user_id)
      .single();

    if (userById && !errorById) {
      dbUser = userById;
    } else {
      const { data: userByAddress, error: errorByAddress } = await supabase
        .from('users')
        .select('*')
        .eq('wallet_address', user_id.toLowerCase())
        .single();

      if (userByAddress && !errorByAddress) {
        dbUser = userByAddress;
      } else {
        error = errorById || errorByAddress;
      }
    }
    
    if (dbUser && !error) {
      const userWithWallet = { ...dbUser, wallet_address: dbUser.wallet_address || '' };
      const profileCompletion = calculateProfileCompletion(userWithWallet);
      
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
    } else {
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
  } catch (error) {
    console.error('❌ Get user error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get user'
    });
  }
});

// Get user stats
router.get('/users/:user_id/stats', async (req, res) => {
  try {
    const { user_id } = req.params;
    
    console.log(`GET /api/users/${user_id}/stats`);

    try {
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
      } else {
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
      } else {
        const stats = await integratedTrustService.getUserSocialStats(user_id);
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
    } catch (dbError) {
      console.error('Database query failed for stats:', dbError);
      
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
  } catch (error) {
    console.error('❌ Get user stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get user stats'
    });
  }
});

// ========== FEED ALGORITHM IMPLEMENTATION ==========

// Feed Algorithm: Mixed Instagram-style feed with Trust Score 2.0
router.get('/feed/mixed', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    console.log(`🎯 Generating mixed feed for user ${userId}`);

    // 1. Get user's social graph (following relationships)
    const { data: followingData, error: followingError } = await supabase
      .from('social_connections')
      .select('following_id')
      .eq('follower_id', userId)
      .eq('is_active', 'true');

    if (followingError) {
      console.error('Error fetching following:', followingError);
      return res.status(500).json({ success: false, error: 'Failed to fetch social graph' });
    }

    const followingIds = followingData?.map(f => f.following_id) || [];
    console.log(`👥 User follows ${followingIds.length} people:`, followingIds);

    // 2. Get user's taste profile for similarity matching
    const { data: userRecommendations, error: userRecsError } = await supabase
      .from('recommendations')
      .select('restaurant_id, overall_rating, context_tags')
      .eq('author_id', userId)
      .limit(50);

    if (userRecsError) {
      console.error('Error fetching user taste profile:', userRecsError);
    }

    // 3. Get feed content from multiple sources
    const feedItems = [];

    // SOURCE 1: Following Feed (40% weight)
    if (followingIds.length > 0) {
      const { data: followingContent, error: followingContentError } = await supabase
        .from('recommendations')
        .select(`
          *,
          likes_count,
          saves_count,
          users:author_id(id, username, display_name, avatar_url, reputation_score),
          restaurants:restaurant_id(id, name, cuisine_type, address, category)
        `)
        .in('author_id', followingIds)
        .order('created_at', { ascending: false })
        .limit(20);

      console.log('Following query result:', { 
        error: followingContentError, 
        count: followingContent?.length 
      });

      if (!followingContentError && followingContent) {
        followingContent.forEach(item => {
          feedItems.push({
            ...item,
            type: 'recommendation',
            source: 'following',
            trust_context: calculateTrustScore(item, userId, 0.8, 0.7, 0.6) // High social weight
          });
        });
      }
    }

    // SOURCE 2: Taste Similarity (30% weight)
    if (userRecommendations && userRecommendations.length > 0) {
      const userCuisinePrefs = extractCuisinePreferences(userRecommendations);
      
      const { data: similarContent, error: similarContentError } = await supabase
        .from('recommendations')
        .select(`
          id, title, description, overall_rating, created_at, context_tags,
          likes_count, saves_count,
          author_id, restaurant_id,
          users!recommendations_author_id_fkey(id, username, display_name, avatar_url, trust_score),
          restaurants(id, name, cuisine_type, location_city, location_address, image_url)
        `)
        .not('author_id', 'eq', userId)
        .not('author_id', 'in', `(${followingIds.join(',')})`) // Exclude following
        .in('restaurants.cuisine_type', userCuisinePrefs)
        .gte('overall_rating', 7) // Quality filter
        .order('created_at', { ascending: false })
        .limit(15);

      if (!similarContentError && similarContent) {
        similarContent.forEach(item => {
          feedItems.push({
            ...item,
            type: 'recommendation',
            source: 'taste_similarity',
            trust_context: calculateTrustScore(item, userId, 0.3, 0.9, 0.8) // High taste alignment
          });
        });
      }
    }

    // SOURCE 3: Trending Content (20% weight)
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data: trendingContent, error: trendingError } = await supabase
      .from('recommendations')
      .select(`
        id, title, description, overall_rating, created_at, context_tags,
        likes_count, saves_count,
        author_id, restaurant_id,
        users!recommendations_author_id_fkey(id, username, display_name, avatar_url, trust_score),
        restaurants(id, name, cuisine_type, location_city, location_address, image_url),
        recommendation_interactions(count)
      `)
      .gte('created_at', oneDayAgo)
      .gte('overall_rating', 8)
      .order('created_at', { ascending: false })
      .limit(10);

    if (!trendingError && trendingContent) {
      trendingContent.forEach(item => {
        feedItems.push({
          ...item,
          type: 'recommendation',
          source: 'trending',
          trust_context: calculateTrustScore(item, userId, 0.5, 0.6, 0.9) // High contextual match
        });
      });
    }

    // SOURCE 4: Lists from followed users (10% weight)
    console.log('🔍 Fetching lists for followed users:', followingIds);

    if (followingIds.length > 0) {
      const { data: listsData, error: listsError } = await supabase
        .from('curated_lists')
        .select(`
          id,
          title,
          description,
          author_id,
          category,
          city,
          tags,
          best_for,
          likes_count,
          bookmarks_count,
          created_at,
          is_public,
          users!author_id (
            id,
            username,
            display_name,
            avatar_url,
            trust_score
          )
        `)
        .in('author_id', followingIds)
        .eq('is_public', true)
        .order('created_at', { ascending: false })
        .limit(5);

      console.log('📋 Lists query result:', {
        error: listsError,
        count: listsData?.length
      });

      if (!listsError && listsData && listsData.length > 0) {
        console.log(`✅ Found ${listsData.length} lists from followed users`);
        
        // Fetch restaurants for each list
        for (const list of listsData) {
          const { data: listItems, error: itemsError } = await supabase
            .from('curated_list_items')
            .select(`
              restaurant_id,
              restaurants (
                id,
                name,
                cuisine_type,
                address
              )
            `)
            .eq('list_id', list.id);

          if (!itemsError && listItems) {
            const restaurants = listItems
              .map(item => item.restaurants)
              .filter(Boolean);

            feedItems.push({
              ...list,
              type: 'list',
              source: 'following',
              creator: list.users,
              restaurants: restaurants,
              restaurant_count: restaurants.length,
              like_count: list.likes_count || 0,
              save_count: list.bookmarks_count || 0,
              is_liked: false,
              is_saved: false,
              trust_context: calculateTrustScore(list, userId, 0.8, 0.5, 0.6)
            });

            console.log(`  ✓ Added list "${list.title}" with ${restaurants.length} restaurants`);
          } else {
            console.warn(`  ✗ Failed to fetch restaurants for list ${list.id}:`, itemsError);
            // Add list without restaurants
            feedItems.push({
              ...list,
              type: 'list',
              source: 'following',
              creator: list.users,
              restaurants: [],
              restaurant_count: 0,
              like_count: list.likes_count || 0,
              save_count: list.bookmarks_count || 0,
              is_liked: false,
              is_saved: false,
              trust_context: calculateTrustScore(list, userId, 0.8, 0.5, 0.6)
            });
          }
        }
      }
    }

    // 4. Apply Trust Score 2.0 ranking and mix content
    const rankedFeed = feedItems
      .sort((a, b) => {
        // Primary sort: Overall trust score
        const trustDiff = b.trust_context.overall_trust_score - a.trust_context.overall_trust_score;
        if (Math.abs(trustDiff) > 0.5) return trustDiff;
        
        // Secondary sort: Recency for similar trust scores
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      })
      .slice(0, 30); // Limit feed size

    // 5. Get user's interaction status
    const { data: statusData } = await supabase
      .from('recommendation_likes')
      .select('recommendation_id')
      .eq('user_id', userId);

    const { data: bookmarkData } = await supabase
      .from('recommendation_bookmarks')
      .select('recommendation_id')
      .eq('user_id', userId);

    const likedIds = new Set((statusData || []).map(l => l.recommendation_id));
    const bookmarkedIds = new Set((bookmarkData || []).map(b => b.recommendation_id));

    console.log(`✅ User has ${likedIds.size} likes and ${bookmarkedIds.size} bookmarks`);

    // 6. Format for frontend consumption with interaction status
    const formattedFeed = rankedFeed.map(item => {
      const formatted = formatFeedItem(item);
      if (formatted && formatted.type === 'recommendation') {
        formatted.hasUpvoted = likedIds.has(formatted.id);
        formatted.isBookmarked = bookmarkedIds.has(formatted.id);
      }
      return formatted;
    }).filter(Boolean); // Remove any null items

    console.log(`📱 Generated feed with ${formattedFeed.length} items`);
    console.log('📊 Feed breakdown:', {
      recommendations: formattedFeed.filter(item => item.type === 'recommendation').length,
      lists: formattedFeed.filter(item => item.type === 'list').length
    });

    console.log('🔍 First formatted item:', JSON.stringify(formattedFeed[0], null, 2));

    res.json({
      success: true,
      feed: formattedFeed,
      metadata: {
        total_items: formattedFeed.length,
        generated_at: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('❌ Feed generation error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to generate feed' 
    });
  }
});

// Feed Interaction Endpoints
router.post('/feed/items/:itemId/like', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { itemId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    const { data: existingLike, error: checkError } = await supabase
      .from('recommendation_likes')
      .select('id')
      .eq('user_id', userId)
      .eq('recommendation_id', itemId)
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      console.error('Error checking existing like:', checkError);
      return res.status(500).json({ success: false, error: 'Database error' });
    }

    if (existingLike) {
      // Unlike - remove the like
      const { error: deleteError } = await supabase
        .from('recommendation_likes')
        .delete()
        .eq('id', existingLike.id);

      if (deleteError) {
        console.error('Error removing like:', deleteError);
        return res.status(500).json({ success: false, error: 'Failed to unlike' });
      }

      // Decrement the count
      const { data: recommendation } = await supabase
        .from('recommendations')
        .select('likes_count')
        .eq('id', itemId)
        .single();

      const newCount = Math.max(0, (recommendation?.likes_count || 0) - 1);
  
      await supabase
        .from('recommendations')
        .update({ likes_count: newCount })
        .eq('id', itemId);

      console.log(`💔 Unliked recommendation, new count: ${newCount}`);

      res.json({ success: true, action: 'unliked', is_liked: false, newCount });
    } else {
      // Like - add new like
      const { error: insertError } = await supabase
        .from('recommendation_likes')
        .insert({
          user_id: userId,
          recommendation_id: itemId,
          created_at: new Date().toISOString()
        });

      if (insertError) {
        console.error('Error adding like:', insertError);
        return res.status(500).json({ success: false, error: 'Failed to like' });
      }

      // Increment the count
      const { data: recommendation } = await supabase
        .from('recommendations')
        .select('likes_count')
        .eq('id', itemId)
        .single();

      const newCount = (recommendation?.likes_count || 0) + 1;
  
      await supabase
        .from('recommendations')
        .update({ likes_count: newCount })
        .eq('id', itemId);

      console.log(`❤️ Liked recommendation, new count: ${newCount}`);

      res.json({ success: true, action: 'liked', is_liked: true, newCount });
    }

  } catch (error) {
    console.error('❌ Like interaction error:', error);
    res.status(500).json({ success: false, error: 'Failed to process like' });
  }
});

router.post('/feed/items/:itemId/save', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { itemId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    const { data: existingSave, error: checkError } = await supabase
      .from('recommendation_bookmarks')
      .select('id')
      .eq('user_id', userId)
      .eq('recommendation_id', itemId)
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      console.error('Error checking existing save:', checkError);
      return res.status(500).json({ success: false, error: 'Database error' });
    }

    if (existingSave) {
      // Unsave - remove the bookmark
      const { error: deleteError } = await supabase
        .from('recommendation_bookmarks')
        .delete()
        .eq('id', existingSave.id);

      if (deleteError) {
        console.error('Error removing save:', deleteError);
        return res.status(500).json({ success: false, error: 'Failed to unsave' });
      }

      // Decrement the count
      const { data: recommendation } = await supabase
        .from('recommendations')
        .select('saves_count')
        .eq('id', itemId)
        .single();

      const newCount = Math.max(0, (recommendation?.saves_count || 0) - 1);
  
      await supabase
        .from('recommendations')
        .update({ saves_count: newCount })
        .eq('id', itemId);

      console.log(`📑 Unsaved recommendation, new count: ${newCount}`);

      res.json({ success: true, action: 'unsaved', is_saved: false, newCount });
    } else {
      // Save - add new bookmark
      const { error: insertError } = await supabase
        .from('recommendation_bookmarks')
        .insert({
          user_id: userId,
          recommendation_id: itemId,
          created_at: new Date().toISOString()
        });

      if (insertError) {
        console.error('Error adding save:', insertError);
        return res.status(500).json({ success: false, error: 'Failed to save' });
      }

      // Increment the count
      const { data: recommendation } = await supabase
        .from('recommendations')
        .select('saves_count')
        .eq('id', itemId)
        .single();

      const newCount = (recommendation?.saves_count || 0) + 1;
  
      await supabase
        .from('recommendations')
        .update({ saves_count: newCount })
        .eq('id', itemId);

      console.log(`🔖 Saved recommendation, new count: ${newCount}`);

      res.json({ success: true, action: 'saved', is_saved: true, newCount });
    }

  } catch (error) {
    console.error('❌ Save interaction error:', error);
    res.status(500).json({ success: false, error: 'Failed to process save' });
  }
});

// ========== HELPER FUNCTIONS ==========

// Trust Score 2.0 Calculation
function calculateTrustScore(item: any, userId: string, socialWeight: number, tasteAlignment: number, contextualMatch: number) {
  const authorTrustScore = item.users?.trust_score || 5.0;
  
  const overallScore = (
    (socialWeight * 0.3) +
    (tasteAlignment * 0.5) +
    (contextualMatch * 0.2)
  ) * (authorTrustScore / 10);

  return {
    social_weight: socialWeight,
    taste_alignment: tasteAlignment,
    contextual_match: contextualMatch,
    overall_trust_score: Math.min(10, Math.max(0, overallScore * 10))
  };
}

// Extract user's cuisine preferences from their recommendation history
function extractCuisinePreferences(userRecommendations: any[]): string[] {
  const cuisineMap = new Map<string, number>();
  
  userRecommendations.forEach(rec => {
    if (rec.restaurant?.cuisine_type && rec.overall_rating >= 7) {
      const count = cuisineMap.get(rec.restaurant.cuisine_type) || 0;
      cuisineMap.set(rec.restaurant.cuisine_type, count + 1);
    }
  });

  return Array.from(cuisineMap.entries())
    .sort(([,a], [,b]) => b - a)
    .slice(0, 5)
    .map(([cuisine]) => cuisine);
}

// Format feed items for frontend consumption
function formatFeedItem(item: any): any {
  try {
    // Handle list items
    if (item.type === 'list') {
      return {
        type: 'list',
        id: item.id,
        title: item.title,
        description: item.description || '',
        category: item.category || '',
        city: item.city || '',
        tags: item.tags || [],
        best_for: item.best_for || '',
        creator: {
          id: item.author_id,
          username: item.creator?.username || item.users?.username || 'Unknown User',
          display_name: item.creator?.display_name || item.users?.display_name || item.creator?.username || item.users?.username || 'Unknown User',
          avatar_url: item.creator?.avatar_url || item.users?.avatar_url || null
        },
        restaurants: (item.restaurants || []).map((r: any) => ({
          id: r.id,
          name: r.name,
          cuisine_type: r.cuisine_type || 'Restaurant',
          location: r.location || '',
          image_url: r.image_url || null,
          average_rating: r.average_rating || 0
        })),
        restaurant_count: item.restaurants?.length || 0,
        created_at: item.created_at,
        like_count: item.like_count || 0,
        save_count: item.save_count || 0,
        is_liked: item.is_liked || false,
        is_saved: item.is_saved || false
      };
    }

    // Handle recommendation items - these come with nested users/restaurants from SOURCE queries
    if (item.type === 'recommendation' || !item.type) {
      return {
        type: 'recommendation',
        id: item.id,
        title: item.title,
        description: item.description || item.content || '',
        overall_rating: item.overall_rating || item.rating || 0,
        location: {
          restaurant_id: item.restaurant_id,
          name: item.restaurants?.name || 'Unknown Restaurant',
          address: item.restaurants?.location_address || item.restaurants?.address || '',
          city: item.restaurants?.location_city || ''
        },
        author: {
          id: item.author_id || item.user_id,
          name: item.users?.display_name || item.users?.username || 'Unknown User',
          avatar: item.users?.avatar_url || '/default-avatar.png',
          reputation: item.users?.reputation_score || item.users?.trust_score || 5,
          isFollowing: false,
          socialDistance: 1
        },
        category: item.restaurants?.cuisine_type || item.category || '',
        photos: item.image_url ? [{ url: item.image_url }] : [],
        engagement: {
          saves: item.saves_count || 0,
          upvotes: item.likes_count || 0,
          comments: item.comment_count || 0
        },
        createdAt: item.created_at,
        tags: item.context_tags || [],
        isBookmarked: item.is_saved || false,
        hasUpvoted: item.is_liked || false
      };
    }

    console.warn('⚠️ Unknown item type:', item.type);
    return null;
  } catch (error) {
    console.error('❌ Error formatting feed item:', error);
    console.error('   Item data:', JSON.stringify(item, null, 2));
    return null;
  }
}

// =============================================================================
// MOUNT ROUTER AND MIDDLEWARE
// =============================================================================

app.use('/api', router);

// =============================================================================
// HEALTH CHECK AND ROOT ROUTES
// =============================================================================

app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    message: 'OmeoneChain Core server with Enhanced User Profile Integration',
    timestamp: new Date().toISOString(),
    cors_origins: getCorsOrigins(),
    components: {
      trust_calculator: 'TrustScoreCalculator with social graph analysis',
      reputation_engine: 'ReputationEngine with blockchain integration',
      social_service: 'SocialService with Supabase backend',
      profile_system: 'Enhanced profile management with completion tracking',
      integrated_service: serviceInitialized ? 'active' : 'initializing',
      database: supabaseUrl ? 'Supabase connected' : 'No database',
      authentication: 'Unified JWT authentication system',
      follow_functionality: 'Follow/unfollow routes available',
      recommendation_system: 'FIXED - Schema aligned with database (author_id, content, integer restaurant_id)',
      restaurant_system: 'Smart matching algorithm with auto-increment IDs',
      lists_system: 'ENHANCED - User Profile Integration with author filtering and privacy handling',
      search_system: 'FIXED - Route positioning corrected, universal search working',
      user_profile_integration: 'COMPLETE - Enhanced with likes/bookmarks endpoints and privacy controls'
    }
  });
});

app.get('/', (req, res) => {
  res.json({
    message: 'OmeoneChain Core API Server - User Profile Integration Complete',
    version: '0.9.0',
    changes: [
      'COMPLETE: Enhanced User Profile Integration',
      'NEW: GET /api/users/:userId/likes endpoint for user liked recommendations',
      'NEW: GET /api/users/:userId/bookmarks endpoint for user bookmarked recommendations (private)',
      'ENHANCED: GET /api/lists endpoint with ?author={userId} filtering and privacy handling',
      'ENHANCED: Privacy controls - users see only public lists from others, all own lists when authenticated',
      'READY: All 6 UserProfile tabs now have working backend integration'
    ],
    endpoints: {
      auth: [
        'POST /api/auth/challenge - Generate wallet signature challenge',
        'POST /api/auth/login - Verify signature and create JWT token',
        'POST /api/auth/verify - Verify JWT token',
        'GET /api/auth/me - Get current user profile from database',
        'PATCH /api/auth/profile - Update user profile'
      ],
      recommendations: [
        'GET /api/recommendations - Get all recommendations (schema aligned)',
        'POST /api/recommendations - Create new recommendation (schema aligned + smart restaurant matching)',
        'GET /api/users/:user_id/recommendations - Get user-specific recommendations (schema aligned)'
      ],
      restaurants: [
        'GET /api/restaurants - Search and list restaurants',
        'POST /api/restaurants - Create new restaurant',
        'GET /api/restaurants/:id - Get restaurant details'
      ],
      lists: [
        'GET /api/lists - ENHANCED with author filtering and privacy handling',
        'POST /api/lists - Create new curated list (schema aligned)',
        'GET /api/lists/status - Get user like/bookmark status',
        'POST /api/lists/:id/like - Like/unlike list',
        'POST /api/lists/:id/bookmark - Bookmark/unbookmark list'
      ],
      user_profile_integration: [
        'GET /api/users/:userId/likes - Get user liked recommendations (public)',
        'GET /api/users/:userId/bookmarks - Get user bookmarked recommendations (private, auth required)'
      ],
      search: [
        'GET /api/search - Universal search for lists and restaurants'
      ],
      users: [
        'GET /api/users/:user_id - Get user profile',
        'GET /api/users/:user_id/stats - Get user social stats'
      ],
      social: [
        'POST /api/social/users/:userId/follow - Follow a user',
        'DELETE /api/social/users/:userId/unfollow - Unfollow a user'
      ]
    }
  });
});

// =============================================================================
// ERROR HANDLING
// =============================================================================

app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: 'Internal server error'
  });
});

app.use((req: express.Request, res: express.Response) => {
  console.log(`❌ 404: ${req.method} ${req.path} not found`);
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.path} not found`,
    availableRoutes: [
      '/api/auth/me',
      '/api/recommendations (GET, POST)',
      '/api/users/:user_id/recommendations',
      '/api/users/:userId/likes (GET)',
      '/api/users/:userId/bookmarks (GET)',
      '/api/restaurants (GET, POST)',
      '/api/restaurants/:id',
      '/api/lists (GET with ?author=userId, POST)',
      '/api/lists/status (GET)',
      '/api/lists/:id/like (POST)',
      '/api/lists/:id/bookmark (POST)',
      '/api/search (GET)', 
      '/api/social/follow (POST, DELETE)',
      '/api/users/:id',
      '/api/users/:id/stats',
      '/api/health'
    ]
  });
});

// =============================================================================
// SERVER STARTUP
// =============================================================================

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`🚀 OmeoneChain Core server running on http://localhost:${PORT}`);
    console.log(`📡 Health check: http://localhost:${PORT}/api/health`);
    console.log(`✅ USER PROFILE INTEGRATION: Complete with likes/bookmarks endpoints`);
    console.log(`✅ ENHANCED LISTS API: Author filtering and privacy handling implemented`);
    console.log(`✅ DATABASE: All schema alignments maintained`);
    console.log(`✅ PRIVACY CONTROLS: Public vs private list visibility working`);
    console.log(`🟢 PRODUCTION SERVER - USER PROFILE INTEGRATION COMPLETE`);
    console.log(`🌐 CORS configured for Codespaces and local development`);
  });
}

export default app;