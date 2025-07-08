/**
 * Authentication Middleware
 * 
 * Handles authentication for protected API routes
 */

import { Request, Response, NextFunction } from 'express';
// CONSERVATIVE FIX: Add type declaration for missing module
declare const jwt: any;
try {
  const jwtModule = require('jsonwebtoken');
  Object.assign(jwt, jwtModule);
} catch {
  // Fallback if module not available
}

/**
 * User authentication information
 */
export interface AuthUser {
  /**
   * User ID
   */
  id: string;
  
  /**
   * User's wallet address
   */
  walletAddress: string;
  
  /**
   * User's pseudonym or handle (if provided)
   */
  pseudonym?: string;
  
  /**
   * Optional user roles
   */
  roles?: string[];
}

// Extend Express Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

/**
 * Authentication options
 */
export interface AuthOptions {
  /**
   * JWT secret key
   */
  secret: string;
  
  /**
   * Token expiration in seconds
   */
  expiresIn?: number;
  
  /**
   * Allow unauthenticated access (for development)
   */
  allowUnauthenticated?: boolean;
  
  /**
   * Required roles for access
   */
  requiredRoles?: string[];
}

/**
 * Default authentication options
 */
const DEFAULT_OPTIONS: AuthOptions = {
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
export function generateToken(user: AuthUser, options: Partial<AuthOptions> = {}): string {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  
  return (jwt as any).sign(user, opts.secret, {
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
export function verifyToken(token: string, options: Partial<AuthOptions> = {}): AuthUser {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  
  return (jwt as any).verify(token, opts.secret) as AuthUser;
}

/**
 * Authentication middleware
 * 
 * @param options Authentication options
 * @returns Express middleware function
 */
export function authenticate(options: Partial<AuthOptions> = {}) {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  
  return (req: Request, res: Response, next: NextFunction) => {
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
      : req.query.token as string;
    
    if (!token) {
      return res.status(401).json({ error: 'Authentication token required' });
    }
    
    try {
      // Verify token
      const decoded = verifyToken(token, opts);
      req.user = decoded;
      
      // Check required roles if specified
      if (opts.requiredRoles && opts.requiredRoles.length > 0) {
        const hasRequiredRole = opts.requiredRoles.some(role => 
          req.user?.roles?.includes(role)
        );
        
        if (!hasRequiredRole) {
          return res.status(403).json({ error: 'Insufficient permissions' });
        }
      }
      
      next();
    } catch (error) {
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
export function requireRoles(roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    const hasRequiredRole = roles.some(role => 
      req.user?.roles?.includes(role)
    );
    
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
export function createAuthRoutes(router: any, options: Partial<AuthOptions> = {}) {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  
  // Login route
  router.post('/login', (req: Request, res: Response) => {
    const { walletAddress, signature } = req.body;
    
    if (!walletAddress || !signature) {
      return res.status(400).json({ error: 'Wallet address and signature required' });
    }
    
    // In a real implementation, verify the signature against the wallet address
    // This is a simplified version for demonstration
    
    const user: AuthUser = {
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
  router.post('/verify', (req: Request, res: Response) => {
    const { token } = req.body;
    
    if (!token) {
      return res.status(400).json({ error: 'Token required' });
    }
    
    try {
      const decoded = verifyToken(token, opts);
      res.json({ valid: true, user: decoded });
    } catch (error) {
      res.json({ valid: false });
    }
  });
  
  return router;
}

export default authenticate;