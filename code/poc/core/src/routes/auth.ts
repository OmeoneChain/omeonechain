// File: code/poc/core/src/routes/auth.ts
// Authentication routes for progressive Web3 integration

import express from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { z } from 'zod';

const router = express.Router();

// In-memory challenge storage (in production, use Redis or database)
const authChallenges = new Map<string, { challenge: string, timestamp: number }>();

// Validation schemas
const challengeSchema = z.object({
  address: z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid Ethereum address')
});

const emailSignupSchema = z.object({
  email: z.string().email('Invalid email address'),
  name: z.string().optional()
});

const verifySignatureSchema = z.object({
  address: z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid Ethereum address'),
  signature: z.string(),
  challenge: z.string()
});

// POST /api/auth/challenge - Generate authentication challenge
router.post('/challenge', async (req, res) => {
  try {
    const { address } = challengeSchema.parse(req.body);
    
    // Generate random challenge
    const challenge = crypto.randomBytes(32).toString('hex');
    const timestamp = Date.now();
    
    // Store challenge (expires in 5 minutes)
    authChallenges.set(address.toLowerCase(), { challenge, timestamp });
    
    // Clean up expired challenges
    const fiveMinutesAgo = Date.now() - (5 * 60 * 1000);
    for (const [addr, data] of authChallenges.entries()) {
      if (data.timestamp < fiveMinutesAgo) {
        authChallenges.delete(addr);
      }
    }
    
    res.json({
      success: true,
      challenge,
      message: 'Sign this message to authenticate with OmeoneChain',
      expiresIn: 300 // 5 minutes
    });
    
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: 'Invalid request',
      error: error.message
    });
  }
});

// POST /api/auth/verify - Verify wallet signature and issue JWT
router.post('/verify', async (req, res) => {
  try {
    const { address, signature, challenge } = verifySignatureSchema.parse(req.body);
    const lowerAddress = address.toLowerCase();
    
    // Check if challenge exists and is valid
    const storedChallenge = authChallenges.get(lowerAddress);
    if (!storedChallenge || storedChallenge.challenge !== challenge) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired challenge'
      });
    }
    
    // Check challenge expiry (5 minutes)
    const fiveMinutesAgo = Date.now() - (5 * 60 * 1000);
    if (storedChallenge.timestamp < fiveMinutesAgo) {
      authChallenges.delete(lowerAddress);
      return res.status(400).json({
        success: false,
        message: 'Challenge expired'
      });
    }
    
    // In production, verify the signature here using ethers or similar
    // For now, we'll assume signature is valid
    console.log(`🔐 Signature verification for ${address}: ${signature}`);
    
    // Create or get user (simplified for testing)
    const user = {
      id: `user_${lowerAddress}`,
      address: address,
      username: `user_${address.slice(2, 8)}`,
      display_name: `User ${address.slice(2, 8)}`,
      verification_status: 'basic' as const,
      auth_mode: 'wallet' as const,
      tokens_earned: 0,
      trust_score: 0,
      created_at: new Date().toISOString()
    };
    
    // Generate JWT token
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      throw new Error('JWT_SECRET not configured');
    }
    
    const token = jwt.sign(
      { 
        userId: user.id, 
        address: user.address,
        authMode: user.auth_mode
      },
      jwtSecret,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );
    
    // Clean up used challenge
    authChallenges.delete(lowerAddress);
    
    res.json({
      success: true,
      token,
      user,
      message: 'Authentication successful'
    });
    
  } catch (error: any) {
    console.error('Auth verification error:', error);
    res.status(400).json({
      success: false,
      message: 'Authentication failed',
      error: error.message
    });
  }
});

// POST /api/auth/email-signup - Progressive Web3 email signup
router.post('/email-signup', async (req, res) => {
  try {
    const { email, name } = emailSignupSchema.parse(req.body);
    
    // Create email user (no wallet address yet)
    const user = {
      id: `email_${Date.now()}`,
      email,
      username: email.split('@')[0],
      display_name: name || email.split('@')[0],
      verification_status: 'basic' as const,
      auth_mode: 'email' as const,
      tokens_earned: 0,
      trust_score: 0,
      pending_tokens: 0,
      created_at: new Date().toISOString()
    };
    
    // In production, save to database
    console.log('📧 Created email user:', user);
    
    res.json({
      success: true,
      user,
      message: 'Email account created successfully. Connect a wallet to start earning tokens!'
    });
    
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: 'Email signup failed',
      error: error.message
    });
  }
});

// POST /api/auth/upgrade-to-wallet - Upgrade email user to wallet user
router.post('/upgrade-to-wallet', async (req, res) => {
  try {
    const { userId, address, signature, challenge } = req.body;
    
    // Verify signature (simplified)
    console.log(`🔄 Upgrading user ${userId} to wallet ${address}`);
    
    // Simulate upgraded user
    const upgradedUser = {
      id: userId,
      address,
      email: 'user@example.com', // Keep existing email
      username: `user_${address.slice(2, 8)}`,
      display_name: 'Upgraded User',
      verification_status: 'basic' as const,
      auth_mode: 'wallet' as const,
      tokens_earned: 5.25, // Convert pending tokens
      trust_score: 1.0,
      pending_tokens: 0,
      created_at: new Date().toISOString()
    };
    
    // Generate JWT token
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      throw new Error('JWT_SECRET not configured');
    }
    
    const token = jwt.sign(
      { 
        userId: upgradedUser.id, 
        address: upgradedUser.address,
        authMode: upgradedUser.auth_mode
      },
      jwtSecret,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );
    
    res.json({
      success: true,
      token,
      user: upgradedUser,
      message: 'Successfully upgraded to wallet account!'
    });
    
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: 'Account upgrade failed',
      error: error.message
    });
  }
});

export default router;