/**
 * Authentication Middleware - Two-Tier System
 * File: code/poc/core/src/middleware/auth.ts
 * 
 * UPDATED: Simplified for phone + wallet two-tier model
 * Replaces the old three-tier (email_basic, phone_verified, wallet_full) system
 */

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        walletAddress?: string;
        phone?: string;
        email?: string;
        username?: string;
        displayName?: string;
        accountTier: 'verified' | 'wallet';
        authMethod: 'phone' | 'email' | 'wallet' | 'google' | 'apple' | 'twitter';
      };
    }
  }
}

interface JWTPayload {
  userId: string;
  walletAddress?: string;
  phoneNumber?: string;
  email?: string;
  accountTier?: 'verified' | 'wallet';
  authMethod?: string;
  iat?: number;
  exp?: number;
}

/**
 * Main authentication middleware
 * Validates JWT token and attaches user to request
 */
export const authenticateToken = (req: Request, res: Response, next: NextFunction): void => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      res.status(401).json({
        success: false,
        error: 'Access token required',
        code: 'NO_AUTH_HEADER'
      });
      return;
    }
    
    // Extract token from "Bearer <token>"
    const token = authHeader.startsWith('Bearer ') 
      ? authHeader.slice(7) 
      : authHeader;
    
    if (!token) {
      res.status(401).json({
        success: false,
        error: 'Access token required',
        code: 'NO_TOKEN'
      });
      return;
    }
    
    // Verify JWT
    let payload: JWTPayload;
    
    try {
      payload = jwt.verify(token, JWT_SECRET) as JWTPayload;
    } catch (jwtError: any) {
      if (jwtError.name === 'TokenExpiredError') {
        res.status(401).json({
          success: false,
          error: 'Token expired',
          code: 'TOKEN_EXPIRED'
        });
        return;
      }
      
      res.status(401).json({
        success: false,
        error: 'Invalid token',
        code: 'INVALID_TOKEN'
      });
      return;
    }
    
    if (!payload.userId) {
      res.status(401).json({
        success: false,
        error: 'Invalid token payload',
        code: 'INVALID_PAYLOAD'
      });
      return;
    }
    
    // Map old tier names to new (backwards compatibility)
    let accountTier: 'verified' | 'wallet' = 'verified';
    if (payload.accountTier === 'wallet' || payload.accountTier === 'wallet_full' as any) {
      accountTier = 'wallet';
    } else if (payload.walletAddress) {
      accountTier = 'wallet';
    }
    
    // Determine auth method
    let authMethod = payload.authMethod || 'email';
    if (payload.phoneNumber && !payload.authMethod) {
      authMethod = 'phone';
    } else if (payload.walletAddress && !payload.authMethod) {
      authMethod = 'wallet';
    }
    
    // Attach user to request
    req.user = {
      id: payload.userId,
      walletAddress: payload.walletAddress,
      phone: payload.phoneNumber,
      email: payload.email,
      accountTier: accountTier,
      authMethod: authMethod as any
    };
    
    next();
    
  } catch (error: any) {
    console.error('❌ Auth middleware error:', error);
    res.status(401).json({
      success: false,
      error: 'Authentication failed',
      code: 'AUTH_ERROR'
    });
  }
};

/**
 * Optional authentication - doesn't fail if no token
 */
export const optionalAuth = (req: Request, res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader) {
    next();
    return;
  }
  
  const token = authHeader.startsWith('Bearer ') 
    ? authHeader.slice(7) 
    : authHeader;
  
  if (!token) {
    next();
    return;
  }
  
  try {
    const payload = jwt.verify(token, JWT_SECRET) as JWTPayload;
    
    if (payload.userId) {
      let accountTier: 'verified' | 'wallet' = 'verified';
      if (payload.accountTier === 'wallet' || payload.walletAddress) {
        accountTier = 'wallet';
      }
      
      req.user = {
        id: payload.userId,
        walletAddress: payload.walletAddress,
        phone: payload.phoneNumber,
        email: payload.email,
        accountTier: accountTier,
        authMethod: (payload.authMethod || 'email') as any
      };
    }
  } catch (error) {
    // Silently continue without user
  }
  
  next();
};

/**
 * Generate JWT token
 */
export function generateToken(payload: {
  userId: string;
  walletAddress?: string;
  phoneNumber?: string;
  email?: string;
  accountTier: 'verified' | 'wallet';
  authMethod: string;
}): string {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d'
  });
}

/**
 * Verify JWT token
 */
export function verifyToken(token: string): JWTPayload {
  return jwt.verify(token, JWT_SECRET) as JWTPayload;
}

// Re-export for backwards compatibility
export { authenticateToken as authenticate };
export { authenticateToken as authMiddleware };

export default {
  authenticateToken,
  optionalAuth,
  generateToken,
  verifyToken
};