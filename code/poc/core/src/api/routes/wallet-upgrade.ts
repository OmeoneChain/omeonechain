/**
 * Wallet Upgrade Routes
 * File: code/poc/core/src/api/routes/wallet-upgrade.ts
 * 
 * Handles upgrading phone-verified accounts to wallet tier.
 * Allows users to link a wallet to their existing phone-verified account.
 */

import { Router, Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';
import { ethers } from 'ethers';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

const router = Router();

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase configuration for wallet upgrade');
}

const supabase = createClient(supabaseUrl!, supabaseServiceKey!);

// JWT configuration
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

// Store pending challenges (in production, use Redis or similar)
const pendingChallenges = new Map<string, { challenge: string; timestamp: number; nonce: string; expiresAt: number }>();

/**
 * Generate JWT token for authenticated user
 */
function generateToken(user: any): string {
  return jwt.sign(
    {
      userId: user.id,
      walletAddress: user.wallet_address,
      phoneNumber: user.phone,
      accountTier: user.account_tier,
      authMethod: user.auth_method
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

/**
 * Generate a unique challenge for wallet signature
 */
function generateChallenge(walletAddress: string): { challenge: string; timestamp: number; nonce: string } {
  const timestamp = Date.now();
  const nonce = crypto.randomBytes(16).toString('hex');
  
  const challenge = `BocaBoca Wallet Verification

Wallet: ${walletAddress.toLowerCase()}
Timestamp: ${timestamp}
Nonce: ${nonce}

Sign this message to link your wallet to your BocaBoca account.
This request will expire in 5 minutes.`;

  return { challenge, timestamp, nonce };
}

/**
 * Verify Ethereum signature
 */
function verifySignature(message: string, signature: string, expectedAddress: string): boolean {
  try {
    const recoveredAddress = ethers.verifyMessage(message, signature);
    return recoveredAddress.toLowerCase() === expectedAddress.toLowerCase();
  } catch (error) {
    console.error('❌ Signature verification error:', error);
    return false;
  }
}

/**
 * POST /api/auth/wallet/challenge
 * Get a challenge message for wallet signature
 * User must be authenticated (phone-verified)
 */
router.post('/challenge', async (req: Request, res: Response) => {
  try {
    const { walletAddress } = req.body;
    const userId = req.user?.id;

    console.log(`🔐 Wallet challenge request for user ${userId}, wallet ${walletAddress}`);

    // Validate wallet address
    if (!walletAddress || !ethers.isAddress(walletAddress)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid wallet address'
      });
    }

    // User must be authenticated
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    // Check if wallet is already linked to another account
    const { data: existingWallet } = await supabase
      .from('users')
      .select('id, phone')
      .eq('wallet_address', walletAddress.toLowerCase())
      .single();

    if (existingWallet && existingWallet.id !== userId) {
      return res.status(409).json({
        success: false,
        error: 'This wallet is already linked to another account'
      });
    }

    // Generate challenge
    const { challenge, timestamp, nonce } = generateChallenge(walletAddress);
    
    // Store challenge for verification (expires in 5 minutes)
    const key = `${userId}:${walletAddress.toLowerCase()}`;
    pendingChallenges.set(key, {
      challenge,
      timestamp,
      nonce,
      expiresAt: Date.now() + 5 * 60 * 1000
    });

    // Clean up old challenges
    for (const [k, v] of pendingChallenges.entries()) {
      if (v.expiresAt < Date.now()) {
        pendingChallenges.delete(k);
      }
    }

    res.json({
      success: true,
      challenge,
      timestamp,
      nonce,
      expiresIn: 300 // 5 minutes
    });

  } catch (error: any) {
    console.error('❌ Wallet challenge error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate challenge'
    });
  }
});

/**
 * POST /api/auth/upgrade-to-wallet
 * Link wallet to existing phone-verified account
 */
router.post('/upgrade-to-wallet', async (req: Request, res: Response) => {
  try {
    const { walletAddress, signature, challenge, timestamp, nonce } = req.body;
    const userId = req.user?.id;

    console.log(`🔐 Wallet upgrade request for user ${userId}`);

    // Validate inputs
    if (!walletAddress || !signature || !challenge || !timestamp || !nonce) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields'
      });
    }

    if (!ethers.isAddress(walletAddress)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid wallet address'
      });
    }

    // User must be authenticated
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    // Verify challenge exists and hasn't expired
    const key = `${userId}:${walletAddress.toLowerCase()}`;
    const pendingChallenge = pendingChallenges.get(key);

    if (!pendingChallenge) {
      return res.status(400).json({
        success: false,
        error: 'No pending challenge found. Please request a new one.'
      });
    }

    if (pendingChallenge.expiresAt < Date.now()) {
      pendingChallenges.delete(key);
      return res.status(400).json({
        success: false,
        error: 'Challenge expired. Please request a new one.'
      });
    }

    if (pendingChallenge.challenge !== challenge ||
        pendingChallenge.timestamp !== timestamp ||
        pendingChallenge.nonce !== nonce) {
      return res.status(400).json({
        success: false,
        error: 'Invalid challenge data'
      });
    }

    // Verify signature
    const isValidSignature = verifySignature(challenge, signature, walletAddress);
    
    if (!isValidSignature) {
      return res.status(401).json({
        success: false,
        error: 'Invalid signature'
      });
    }

    // Remove used challenge
    pendingChallenges.delete(key);

    // Check if wallet is already linked to another account
    const { data: existingWallet } = await supabase
      .from('users')
      .select('id')
      .eq('wallet_address', walletAddress.toLowerCase())
      .neq('id', userId)
      .single();

    if (existingWallet) {
      return res.status(409).json({
        success: false,
        error: 'This wallet is already linked to another account'
      });
    }

    // Get current user data
    const { data: currentUser, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (userError || !currentUser) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Check if user has pending tokens to claim
    const { data: pendingTokens } = await supabase
      .from('pending_token_claims')
      .select('tokens_earned')
      .eq('user_id', userId)
      .eq('claimed', false)
      .eq('expired', false);

    const totalPendingTokens = pendingTokens?.reduce((sum, pt) => sum + (pt.tokens_earned || 0), 0) || 0;

    // Update user account with wallet
    const { data: updatedUser, error: updateError } = await supabase
      .from('users')
      .update({
        wallet_address: walletAddress.toLowerCase(),
        account_tier: 'wallet_full',
        auth_method: 'phone_wallet', // Both phone and wallet verified
        upgraded_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)
      .select()
      .single();

    if (updateError) {
      console.error('❌ Failed to upgrade user:', updateError);
      throw updateError;
    }

    // If there are pending tokens, mark them as claimable
    if (totalPendingTokens > 0) {
      // Mark pending tokens as ready to claim (actual minting happens on claim endpoint)
      await supabase
        .from('pending_token_claims')
        .update({ 
          wallet_linked_at: new Date().toISOString(),
          can_claim: true
        })
        .eq('user_id', userId)
        .eq('claimed', false)
        .eq('expired', false);

      console.log(`✅ ${totalPendingTokens} BOCA tokens ready to claim for user ${userId}`);
    }

    // Generate new JWT with upgraded tier
    const token = generateToken(updatedUser);

    console.log(`✅ Account upgraded to wallet tier: ${userId}`);

    res.json({
      success: true,
      message: 'Wallet linked successfully',
      token,
      tokensClaimed: totalPendingTokens,
      user: {
        id: updatedUser.id,
        phone: updatedUser.phone,
        walletAddress: updatedUser.wallet_address,
        username: updatedUser.username,
        displayName: updatedUser.display_name,
        accountTier: updatedUser.account_tier,
        authMethod: updatedUser.auth_method,
        tokenBalance: updatedUser.token_balance,
        tokensEarned: updatedUser.tokens_earned,
        pendingTokens: totalPendingTokens,
        reputationScore: updatedUser.reputation_score,
        trustScore: updatedUser.trust_score,
        createdAt: updatedUser.created_at,
        upgradedAt: updatedUser.upgraded_at
      },
      expiresIn: 604800 // 7 days
    });

  } catch (error: any) {
    console.error('❌ Wallet upgrade error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to upgrade account'
    });
  }
});

/**
 * GET /api/auth/upgrade-status
 * Check if current user can upgrade to wallet tier
 */
router.get('/upgrade-status', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    const { data: user, error } = await supabase
      .from('users')
      .select('account_tier, wallet_address, phone, pending_tokens')
      .eq('id', userId)
      .single();

    if (error || !user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Get pending token count
    const { data: pendingTokens } = await supabase
      .from('pending_token_claims')
      .select('tokens_earned')
      .eq('user_id', userId)
      .eq('claimed', false)
      .eq('expired', false);

    const totalPendingTokens = pendingTokens?.reduce((sum, pt) => sum + (pt.tokens_earned || 0), 0) || 0;

    res.json({
      success: true,
      canUpgrade: !user.wallet_address && user.phone,
      currentTier: user.account_tier,
      hasWallet: !!user.wallet_address,
      hasPhone: !!user.phone,
      pendingTokens: totalPendingTokens
    });

  } catch (error: any) {
    console.error('❌ Upgrade status error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check upgrade status'
    });
  }
});

export default router;