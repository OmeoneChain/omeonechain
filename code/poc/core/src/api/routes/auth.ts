/**
 * Authentication Routes with Supabase Integration
 * 
 * Express routes for wallet-based authentication with database persistence
 * File: code/poc/core/src/api/routes/auth.ts
 */

import { Router, Request, Response } from 'express';
import { generateToken, verifyToken, AuthUser } from '../middleware/auth';
import { ethers } from 'ethers';
import { createClient } from '@supabase/supabase-js';

const router = Router();

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // Use service role for server-side operations

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase configuration. Please check SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables.');
  throw new Error('Supabase configuration required');
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

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

// Database Types (matching frontend schema)
interface DatabaseUser {
  id?: string;
  wallet_address: string;
  username?: string;
  email?: string;
  reputation_score?: number;
  trust_score?: number;
  staking_balance?: number;
  staking_tier?: string;
  verification_level?: string;
  created_at?: string;
  updated_at?: string;
}

/**
 * Generate a challenge for wallet signature
 * POST /api/auth/challenge
 */
router.post('/challenge', (req: Request, res: Response) => {
  try {
    const { walletAddress } = req.body;
    
    if (!walletAddress || typeof walletAddress !== 'string') {
      return res.status(400).json({ 
        error: 'Wallet address is required' 
      });
    }
    
    // Validate wallet address format
    if (!ethers.isAddress(walletAddress)) {
      return res.status(400).json({ 
        error: 'Invalid wallet address format' 
      });
    }
    
    // Generate a unique challenge message
    const timestamp = Date.now();
    const nonce = Math.random().toString(36).substring(2, 15);
    
    const challenge = `OmeoneChain Authentication
Wallet: ${walletAddress}
Timestamp: ${timestamp}
Nonce: ${nonce}

By signing this message, you authenticate with OmeoneChain.`;
    
    console.log(`🔐 Generated challenge for wallet: ${walletAddress}`);
    
    res.json({
      success: true,
      challenge: challenge,
      timestamp,
      nonce
    });
    
  } catch (error) {
    console.error('Challenge generation error:', error);
    res.status(500).json({ 
      error: 'Failed to generate challenge' 
    });
  }
});

/**
 * Verify wallet signature and issue JWT token
 * POST /api/auth/login
 */
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { walletAddress, signature, challenge, timestamp, nonce } = req.body;
    
    console.log(`🔐 Login request body: {
  walletAddress: '${walletAddress}',
  signature: '${signature}',
  challenge: '${challenge}',
  timestamp: ${timestamp},
  nonce: '${nonce}'
}`);
    
    // Validate required fields
    if (!walletAddress || !signature || !challenge) {
      return res.status(400).json({ 
        error: 'Wallet address, signature, and challenge are required' 
      });
    }
    
    // Validate wallet address
    if (!ethers.isAddress(walletAddress)) {
      return res.status(400).json({ 
        error: 'Invalid wallet address format' 
      });
    }
    
    // Validate timestamp (challenge should be recent - within 5 minutes)
    if (!timestamp || Date.now() - timestamp > 5 * 60 * 1000) {
      return res.status(400).json({ 
        error: 'Challenge has expired. Please request a new challenge.' 
      });
    }
    
    // Reconstruct the expected challenge message
    const expectedChallenge = `OmeoneChain Authentication
Wallet: ${walletAddress}
Timestamp: ${timestamp}
Nonce: ${nonce}

By signing this message, you authenticate with OmeoneChain.`;
    
    // Verify the challenge matches
    if (challenge !== expectedChallenge) {
      return res.status(400).json({ 
        error: 'Invalid challenge message' 
      });
    }
    
    try {
      console.log(`🔐 Verifying signature for wallet: ${walletAddress}`);
      
      // Verify the signature
      const recoveredAddress = ethers.verifyMessage(challenge, signature);
      
      if (recoveredAddress.toLowerCase() !== walletAddress.toLowerCase()) {
        return res.status(401).json({ 
          error: 'Signature verification failed' 
        });
      }
      
      console.log(`✅ Authentication successful for wallet: ${walletAddress}`);
      
      // Database operations - Create or update user
      const walletAddressLower = walletAddress.toLowerCase();
      
      try {
        // Check if user already exists
        console.log(`📝 Checking if user exists in database: ${walletAddressLower}`);
        const { data: existingUser, error: fetchError } = await supabase
          .from('users')
          .select('*')
          .eq('wallet_address', walletAddressLower)
          .single();
        
        let dbUser: DatabaseUser;
        
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
          console.log(`✅ User updated successfully: ${updatedUser.id}`);
          
        } else {
          // Create new user
          console.log(`📝 Creating new user in database for wallet: ${walletAddressLower}`);
          
          const newUser: DatabaseUser = {
            wallet_address: walletAddressLower,
            username: null, // Let user choose their own
            display_name: null, // Let user choose their own
            reputation_score: 0,
            trust_score: 0,
            staking_balance: 0,
            staking_tier: 'explorer',
            verification_level: 'basic'
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
          console.log(`✅ User created successfully in Supabase: ${createdUser.id}`);
        }
        
        // Create user object for JWT
        const user: AuthUser = {
          id: dbUser.id || walletAddressLower,
          walletAddress: walletAddressLower,
          roles: ['user']
        };
        
        // Generate JWT token
        const token = generateToken(user);
        
        console.log(`🎯 JWT token generated for user: ${user.id}`);
        
        res.json({
          success: true,
          token,
          user: {
            id: dbUser.id,
            walletAddress: dbUser.wallet_address,
            username: dbUser.username,
            reputationScore: dbUser.reputation_score,
            trustScore: dbUser.trust_score,
            stakingBalance: dbUser.staking_balance,
            stakingTier: dbUser.staking_tier,
            verificationLevel: dbUser.verification_level,
            createdAt: dbUser.created_at,
            roles: user.roles
          },
          expiresIn: 86400 // 24 hours
        });
        
      } catch (dbError: any) {
        console.error('❌ Database operation failed:', dbError);
        
        // Still issue token even if database fails (graceful degradation)
        const user: AuthUser = {
          id: walletAddressLower,
          walletAddress: walletAddressLower,
          roles: ['user']
        };
        
        const token = generateToken(user);
        
        res.json({
          success: true,
          token,
          user: {
            id: walletAddressLower,
            walletAddress: walletAddressLower,
            username: `user_${walletAddress.slice(2, 8).toLowerCase()}`,
            reputationScore: 0,
            trustScore: 0,
            stakingBalance: 0,
            stakingTier: 'explorer',
            verificationLevel: 'basic',
            roles: user.roles
          },
          expiresIn: 86400,
          warning: 'Authentication successful but database sync failed'
        });
      }
      
    } catch (signatureError) {
      console.error('Signature verification error:', signatureError);
      return res.status(401).json({ 
        error: 'Invalid signature' 
      });
    }
    
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ 
      error: 'Authentication failed' 
    });
  }
});

/**
 * Verify JWT token
 * POST /api/auth/verify
 */
router.post('/verify', (req: Request, res: Response) => {
  try {
    const { token } = req.body;
    
    if (!token) {
      return res.status(400).json({ 
        error: 'Token is required' 
      });
    }
    
    try {
      const decoded = verifyToken(token);
      res.json({
        success: true,
        valid: true,
        user: decoded
      });
    } catch (verifyError) {
      res.json({
        success: true,
        valid: false,
        error: 'Invalid or expired token'
      });
    }
    
  } catch (error) {
    console.error('Token verification error:', error);
    res.status(500).json({ 
      error: 'Token verification failed' 
    });
  }
});

/**
 * Get current user info from database (protected route)
 * GET /api/auth/me
 */
router.get('/me', async (req: Request, res: Response) => {
  // This route will be protected by authenticate middleware
  if (!req.user) {
    return res.status(401).json({ 
      error: 'Authentication required' 
    });
  }
  
  try {
    // Fetch fresh user data from database
    const { data: dbUser, error } = await supabase
      .from('users')
      .select('*')
      .eq('wallet_address', req.user.walletAddress)
      .single();
    
    if (error || !dbUser) {
      console.error('User not found in database:', error);
      return res.status(404).json({
        error: 'User not found'
      });
    }
    
    res.json({
      success: true,
      user: {
        id: dbUser.id,
        walletAddress: dbUser.wallet_address,
        username: dbUser.username,
        email: dbUser.email,
        reputationScore: dbUser.reputation_score,
        trustScore: dbUser.trust_score,
        stakingBalance: dbUser.staking_balance,
        stakingTier: dbUser.staking_tier,
        verificationLevel: dbUser.verification_level,
        createdAt: dbUser.created_at,
        updatedAt: dbUser.updated_at
      }
    });
    
  } catch (error) {
    console.error('Get user info error:', error);
    res.status(500).json({ 
      error: 'Failed to get user info' 
    });
  }
});

/**
 * Logout (invalidate token on client side)
 * POST /api/auth/logout
 */
router.post('/logout', (req: Request, res: Response) => {
  // Since we're using stateless JWTs, logout is handled client-side
  // In production, you might want to maintain a blacklist of revoked tokens
  res.json({
    success: true,
    message: 'Logout successful. Please remove the token from client storage.'
  });
});

export default router;