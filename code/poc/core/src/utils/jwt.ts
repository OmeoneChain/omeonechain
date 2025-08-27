// File: code/poc/core/src/utils/jwt.ts
// JWT utilities for session management

import jwt from 'jsonwebtoken';
import crypto from 'crypto';

// JWT payload interface
export interface JWTPayload {
  userId: string;
  address: string;
  iat?: number;
  exp?: number;
}

// Configuration
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';
const REFRESH_TOKEN_EXPIRES_IN = '30d';

// Challenge storage (in production, use Redis or database)
interface Challenge {
  challenge: string;
  address: string;
  expires_at: Date;
  used: boolean;
}

// In-memory challenge storage (replace with Redis/database in production)
const challengeStore = new Map<string, Challenge>();

// Clean up expired challenges every 5 minutes
setInterval(() => {
  const now = new Date();
  for (const [key, challenge] of challengeStore.entries()) {
    if (challenge.expires_at < now) {
      challengeStore.delete(key);
    }
  }
}, 5 * 60 * 1000);

export class JWTUtils {
  // Generate JWT token
  static generateToken(payload: JWTPayload): string {
    return jwt.sign(payload, JWT_SECRET, {
      expiresIn: JWT_EXPIRES_IN,
    });
  }

  // Generate refresh token
  static generateRefreshToken(payload: JWTPayload): string {
    return jwt.sign(payload, JWT_SECRET, {
      expiresIn: REFRESH_TOKEN_EXPIRES_IN,
    });
  }

  // Verify JWT token
  static verifyToken(token: string): JWTPayload {
    try {
      return jwt.verify(token, JWT_SECRET) as JWTPayload;
    } catch (error: any) {
      if (error.name === 'TokenExpiredError') {
        throw new Error('Token expired');
      } else if (error.name === 'JsonWebTokenError') {
        throw new Error('Invalid token');
      } else {
        throw new Error('Token verification failed');
      }
    }
  }

  // Extract token from Authorization header
  static extractTokenFromHeader(authHeader: string | undefined): string | null {
    if (!authHeader) return null;
    
    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      return null;
    }
    
    return parts[1];
  }

  // Generate authentication challenge
  static generateChallenge(address: string): { challenge: string; expires_at: Date } {
    const challenge = crypto.randomBytes(32).toString('hex');
    const expires_at = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Store challenge
    challengeStore.set(challenge, {
      challenge,
      address: address.toLowerCase(),
      expires_at,
      used: false,
    });

    return { challenge, expires_at };
  }

  // Verify challenge
  static verifyChallenge(challenge: string, address: string): boolean {
    const storedChallenge = challengeStore.get(challenge);
    
    if (!storedChallenge) {
      return false;
    }

    // Check if challenge is expired
    if (storedChallenge.expires_at < new Date()) {
      challengeStore.delete(challenge);
      return false;
    }

    // Check if challenge is already used
    if (storedChallenge.used) {
      return false;
    }

    // Check if address matches
    if (storedChallenge.address !== address.toLowerCase()) {
      return false;
    }

    // Mark challenge as used
    storedChallenge.used = true;

    return true;
  }

  // Create authentication message for signing
  static createAuthMessage(challenge: string, address: string): string {
    return `Welcome to OmeoneChain!\n\nPlease sign this message to authenticate your wallet.\n\nChallenge: ${challenge}\nWallet: ${address}\n\nThis request will not trigger any blockchain transaction or cost any gas fees.`;
  }
}

// Signature verification utility
export class SignatureUtils {
  // Verify Ethereum signature
  static verifyEthereumSignature(message: string, signature: string, address: string): boolean {
    try {
      const ethUtil = require('ethereumjs-util');
      const msgHash = ethUtil.hashPersonalMessage(Buffer.from(message));
      const msgParams = ethUtil.fromRpcSig(signature);
      const publicKey = ethUtil.ecrecover(msgHash, msgParams.v, msgParams.r, msgParams.s);
      const recoveredAddress = ethUtil.publicToAddress(publicKey).toString('hex');
      
      return recoveredAddress.toLowerCase() === address.toLowerCase().replace('0x', '');
    } catch (error) {
      console.error('Signature verification error:', error);
      return false;
    }
  }

  // Alternative signature verification using web3
  static async verifyWeb3Signature(message: string, signature: string, address: string): Promise<boolean> {
    try {
      const { Web3 } = require('web3');
      const web3 = new Web3();
      
      const recoveredAddress = web3.eth.accounts.recover(message, signature);
      return recoveredAddress.toLowerCase() === address.toLowerCase();
    } catch (error) {
      console.error('Web3 signature verification error:', error);
      return false;
    }
  }
}

// User management utility
export interface UserRecord {
  id: string;
  address: string;
  username?: string;
  display_name?: string;
  avatar_url?: string;
  verification_status: 'basic' | 'verified' | 'expert';
  created_at: Date;
  updated_at: Date;
}

// In-memory user storage (replace with database in production)
const userStore = new Map<string, UserRecord>();

export class UserManager {
  // Find user by address
  static findByAddress(address: string): UserRecord | null {
    const normalizedAddress = address.toLowerCase();
    for (const user of userStore.values()) {
      if (user.address === normalizedAddress) {
        return user;
      }
    }
    return null;
  }

  // Find user by ID
  static findById(id: string): UserRecord | null {
    return userStore.get(id) || null;
  }

  // Create new user
  static createUser(address: string): UserRecord {
    const id = crypto.randomUUID();
    const now = new Date();
    
    const user: UserRecord = {
      id,
      address: address.toLowerCase(),
      username: `user_${id.slice(0, 8)}`,
      display_name: `User ${id.slice(0, 8)}`,
      avatar_url: null,
      verification_status: 'basic',
      created_at: now,
      updated_at: now,
    };

    userStore.set(id, user);
    return user;
  }

  // Update user
  static updateUser(id: string, updates: Partial<UserRecord>): UserRecord | null {
    const user = userStore.get(id);
    if (!user) return null;

    const updatedUser = {
      ...user,
      ...updates,
      id: user.id, // Prevent ID changes
      address: user.address, // Prevent address changes
      created_at: user.created_at, // Prevent creation date changes
      updated_at: new Date(),
    };

    userStore.set(id, updatedUser);
    return updatedUser;
  }

  // Get user stats (mock data)
  static getUserStats(userId: string) {
    return {
      followers_count: Math.floor(Math.random() * 500) + 10,
      following_count: Math.floor(Math.random() * 300) + 5,
      recommendations_count: Math.floor(Math.random() * 100) + 1,
      avg_trust_score: Math.random() * 0.5 + 0.5, // 0.5 to 1.0
    };
  }
}