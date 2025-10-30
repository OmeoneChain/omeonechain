// File: code/poc/core/src/middleware/feature-gates.ts
// Middleware to enforce feature access based on account tier

import { Request, Response, NextFunction } from 'express';

// Extend Express Request type to include user with account tier
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email?: string;
        walletAddress?: string;
        accountTier?: 'email_basic' | 'wallet_full';
        authMethod?: string;
        username?: string;
        display_name?: string;
        verification_status?: 'basic' | 'verified' | 'expert';
      };
    }
  }
}

/**
 * Middleware to require wallet tier for token/NFT features
 * Blocks email_basic users from accessing crypto-native features
 */
export const requireWalletTier = (req: Request, res: Response, next: NextFunction): void => {
  try {
    console.log('🔒 WALLET TIER CHECK:', {
      userId: req.user?.id,
      accountTier: req.user?.accountTier,
      path: req.path
    });

    // Check if user is authenticated
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Authentication required',
        code: 'AUTH_REQUIRED'
      });
      return;
    }

    // Check if user has wallet tier
    if (req.user.accountTier !== 'wallet_full') {
      res.status(403).json({
        success: false,
        error: 'Wallet connection required for this feature',
        code: 'WALLET_REQUIRED',
        message: 'Connect your wallet to access token rewards, NFT loyalty cards, and on-chain features',
        accountTier: req.user.accountTier,
        upgradeUrl: '/auth/upgrade-to-wallet'
      });
      return;
    }

    console.log('✅ WALLET TIER CHECK: User has wallet access');
    next();

  } catch (error: any) {
    console.error('❌ WALLET TIER CHECK ERROR:', error);
    res.status(500).json({
      success: false,
      error: 'Feature gate check failed',
      code: 'GATE_ERROR'
    });
  }
};

/**
 * Middleware to allow both tiers but add tier info to response
 * Useful for endpoints that work differently based on tier
 */
export const tierAware = (req: Request, res: Response, next: NextFunction): void => {
  try {
    if (req.user) {
      console.log('ℹ️ TIER AWARE:', {
        userId: req.user.id,
        accountTier: req.user.accountTier,
        path: req.path
      });
    }
    next();
  } catch (error: any) {
    console.error('❌ TIER AWARE ERROR:', error);
    next(); // Don't block on error, just log
  }
};

/**
 * Middleware to check if user can claim tokens immediately
 */
export const canClaimTokens = (req: Request, res: Response, next: NextFunction): void => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Authentication required',
        code: 'AUTH_REQUIRED'
      });
      return;
    }

    // Only wallet users can claim tokens immediately
    if (req.user.accountTier !== 'wallet_full') {
      // Email users get pending tokens instead
      (req as any).pendingReward = true; // Flag for route handler
      console.log('ℹ️ TOKEN CLAIM: Email user - tokens will be pending');
    } else {
      (req as any).pendingReward = false;
      console.log('✅ TOKEN CLAIM: Wallet user - tokens will be claimed immediately');
    }

    next();

  } catch (error: any) {
    console.error('❌ TOKEN CLAIM CHECK ERROR:', error);
    res.status(500).json({
      success: false,
      error: 'Token claim check failed'
    });
  }
};

/**
 * Helper function to check if a feature requires wallet tier
 */
export const isWalletOnlyFeature = (feature: string): boolean => {
  const walletOnlyFeatures = [
    'token_claim',
    'nft_mint',
    'nft_loyalty',
    'token_transfer',
    'on_chain_reputation',
    'governance_vote',
    'staking',
    'wallet_connect'
  ];
  
  return walletOnlyFeatures.includes(feature);
};

/**
 * Get feature access info for user
 */
export const getFeatureAccess = (accountTier?: string) => {
  const isWalletUser = accountTier === 'wallet_full';
  
  return {
    // Core features (both tiers)
    createRecommendations: true,
    followUsers: true,
    viewContent: true,
    searchRestaurants: true,
    createLists: true,
    
    // Loyalty features
    loyaltyCheckIn: true,
    viewLoyaltyCards: true,
    loyaltyPoints: true,
    loyaltyTiers: true,
    
    // Wallet-only features
    claimTokens: isWalletUser,
    mintNFT: isWalletUser,
    nftLoyaltyCards: isWalletUser,
    transferTokens: isWalletUser,
    onChainReputation: isWalletUser,
    governanceVoting: isWalletUser,
    tokenStaking: isWalletUser,
    
    // Pending features (email users accumulate, wallet users claim)
    earnPendingTokens: !isWalletUser,
    viewPendingTokens: !isWalletUser,
    
    // User tier
    accountTier: accountTier || 'email_basic',
    isWalletUser: isWalletUser
  };
};

/**
 * Middleware factory to create feature-specific gates
 */
export const requireFeature = (featureName: string) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (isWalletOnlyFeature(featureName)) {
      requireWalletTier(req, res, next);
    } else {
      next();
    }
  };
};

// Export feature list for API documentation
export const WALLET_ONLY_FEATURES = [
  'Claim tokens immediately',
  'Mint NFT loyalty cards',
  'Add cards to Apple/Google Wallet',
  'Transfer tokens',
  'On-chain reputation',
  'Governance voting',
  'Token staking',
  'Exclusive wallet benefits'
] as const;

export const EMAIL_TIER_FEATURES = [
  'Create recommendations',
  'Follow users',
  'Database loyalty cards',
  'Check-in at restaurants',
  'Earn loyalty points',
  'Track tier progression',
  'Accumulate pending tokens (6-month claim window)',
  'View all content',
  'Search and discover'
] as const;