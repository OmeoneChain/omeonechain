/**
 * BocaBoca Smart Contract Configuration
 * =====================================
 * 
 * IOTA Rebased Testnet Deployment - January 4-5, 2025
 * All 10 v1.0 modules deployed and verified
 * 
 * Target location: code/poc/core/src/blockchain/contracts.ts
 * 
 * @version 1.0.0
 * @network IOTA Rebased Testnet
 */

// =============================================================================
// NETWORK CONFIGURATION
// =============================================================================

export const NETWORK_CONFIG = {
  /** Current network identifier */
  network: 'iota-testnet' as const,
  
  /** IOTA Rebased Testnet RPC endpoint */
  rpcUrl: 'https://api.testnet.iota.cafe',
  
  /** WebSocket endpoint for real-time subscriptions */
  wsUrl: 'wss://api.testnet.iota.cafe',
  
  /** Block explorer base URL */
  explorerUrl: 'https://explorer.rebased.iota.org/testnet',
  
  /** Faucet URL for testnet tokens */
  faucetUrl: 'https://faucet.rebased.iota.org',
} as const;

// =============================================================================
// TOKEN CONFIGURATION
// =============================================================================

export const TOKEN_CONFIG = {
  /** Token symbol */
  symbol: 'BOCA',
  
  /** Token name */
  name: 'BocaBoca Token',
  
  /** Decimal places (1 BOCA = 1,000,000 base units) */
  decimals: 6,
  
  /** Multiplier for converting display amounts to base units */
  multiplier: 1_000_000,
  
  /** Token icon URL */
  iconUrl: 'https://bocaboca.app/images/boca-token.png',
} as const;

// =============================================================================
// PACKAGE IDs - Deployed Smart Contracts
// =============================================================================

/**
 * Package IDs for all deployed BocaBoca smart contracts
 * Deployed: January 4-5, 2025 on IOTA Rebased Testnet
 */
export const PACKAGE_IDS = {
  /** Core token contract - BOCA token with minting/burning */
  TOKEN: '0x32d94416d61d92428f25c970485313ca900dc202bb8522e931afbf3231eae408',
  
  /** User status and reputation management */
  USER_STATUS: '0xd339d8331f9df4ca0bcef4005e52a18bb02d2aead09c5409dc7a5e33540b013b',
  
  /** Payment escrow for transactions */
  ESCROW: '0x2eda7dffc30aad952a86a4e5d2e8a4a2f683f0c37642f79a9576091d39e56e8a',
  
  /** Email-based escrow for invitations */
  EMAIL_ESCROW: '0x2ae350bdc51818f22f9a198c6ab72ec38efe735ad3007c661cb1591b7ccbbbdb',
  
  /** Rewards treasury and distribution */
  REWARDS: '0x6af247ddda822ae6d6c51c5b4328db3b26a8f63403f95b03e643c40c1a234a97',
  
  /** Dish recommendations and ratings */
  RECOMMENDATION: '0x5b27473dad4cff322d5c93b1afe5a128754bd8a4f628d00116e9ae1e680eac8b',
  
  /** Weekly lottery system */
  LOTTERY: '0x4c8aec1a1d59ca0e9426f63241c1e8520eca54bf31c0a25c34d901cb90a3c267',
  
  /** Photo contest voting */
  PHOTO_CONTEST: '0xd283cf4c4246a0b6393c5fcffb55fe0f3a738eacc0de76a3784c10cf51ca0570',
  
  /** Bounty system for paid recommendations */
  BOUNTY: '0xd18ffe55c8d272aa148a4e0033f08709612a1f59c76562395c048a10dfcb2d72',
  
  /** Governance proposals and voting */
  GOVERNANCE: '0x6a66ccda39d7407059bff5fd56908a09fa73612ed0f3c69cc9858e0ddacc6303',
} as const;

// =============================================================================
// SHARED OBJECT IDs - Global State Objects
// =============================================================================

/**
 * Shared Object IDs - these are passed as arguments when calling contract functions
 * These objects are shared across all users and store global state
 */
export const SHARED_OBJECTS = {
  /** Token registry - manages token metadata and supply tracking */
  TOKEN_REGISTRY: '0x47543ecca89f826a67f486b97766b27b6fa975641553f2f1c4c06f04ba08035c',
  
  /** 
   * User status uses per-user objects, not a global registry
   * User status objects are created per-user and owned by each user
   */
  // USER_STATUS_REGISTRY: null,
  
  /** Global escrow registry - tracks all active escrows */
  ESCROW_REGISTRY: '0x049ae516a670b258dac6d920786b50a804be091010e244fed3e04e82a19fe842',
  
  /** Global email escrow registry - tracks pending email invitations */
  EMAIL_ESCROW_REGISTRY: '0x90828df0913f69743c1a2e0f6c1c9a10a6cb4573dfbf56fe13692d99cbd8bd14',
  
  /** Rewards treasury - holds tokens for distribution */
  REWARDS_TREASURY: '0xf40ea5c6215a150d284fb65319d5aa621f0c053dfbbf4a0d45447ce977107c0f',
  
  /** Recommendation registry - stores all dish recommendations */
  RECOMMENDATION_REGISTRY: '0x9fedf93d14de76684f70ad171091a8d7361436cfb93b6cac7e4ef91b20f21c24',
  
  /** Engagement tracking for recommendations */
  ENGAGEMENT_RECORD: '0x7ae55f067cf3d8d640646f05a66982bf6ef4cecde56de95c7afed7b510249361',
  
  /** Lottery state - current week's lottery data */
  LOTTERY_STATE: '0x02b364e6254d5f64de16db9c59a4ab1aac70692f1c01bca3067dcceca7c4adb3',
  
  /** Photo contest state - active contests and votes */
  PHOTO_CONTEST_STATE: '0x65516e15e50834c69dc96a4c00448fd55d59d2bc2f1dc2765530fa2dd0bf02dd',
  
  /** Global bounty registry - tracks all bounties */
  BOUNTY_REGISTRY: '0x6b9e56bc65fdaa508ba241cf355892efa0e819c9f68a285702dc2ed0e699beac',
  
  /** Governance parameters - voting thresholds, quorum, etc. */
  GOVERNANCE_PARAMETERS: '0x180fe36ab74598e5b07143088d5f9778756c1111f3b2d3a1548cb7d9de7062b3',
  
  /** Governance registry - stores proposals and votes */
  GOVERNANCE_REGISTRY: '0x205f7f57d14830bdab4e7de710a0e7c043856759e9788e52fb14c77838a3fd66',
} as const;

// =============================================================================
// ADMIN CAPABILITIES - Required for Privileged Operations
// =============================================================================

/**
 * Admin Capability Object IDs
 * 
 * ⚠️  SECURITY WARNING: These should be stored in environment variables,
 *     NOT hardcoded in source code. The Object IDs here are placeholders
 *     that must be configured in your deployment environment.
 * 
 * These capabilities are owned objects held by the deployer wallet:
 * 0x90b72f753db1f385c74b0e1a54841748665bd8616d66aff378700fe8e96b9364
 */
export const ADMIN_CAPS = {
  /** 
   * TreasuryCap - Required for minting BOCA tokens
   * Set via: BOCABOCA_TREASURY_CAP environment variable
   */
  TREASURY_CAP: process.env.BOCABOCA_TREASURY_CAP || '',
  
  /**
   * LotteryAdminCap - Required for drawing lottery winners
   * Set via: BOCABOCA_LOTTERY_ADMIN_CAP environment variable
   */
  LOTTERY_ADMIN_CAP: process.env.BOCABOCA_LOTTERY_ADMIN_CAP || '',
  
  /**
   * PhotoContestAdminCap - Required for managing contests
   * Set via: BOCABOCA_PHOTO_CONTEST_ADMIN_CAP environment variable
   */
  PHOTO_CONTEST_ADMIN_CAP: process.env.BOCABOCA_PHOTO_CONTEST_ADMIN_CAP || '',
  
  /**
   * RewardsAdminCap - Required for treasury management (if exists)
   * Set via: BOCABOCA_REWARDS_ADMIN_CAP environment variable
   */
  REWARDS_ADMIN_CAP: process.env.BOCABOCA_REWARDS_ADMIN_CAP || '',
} as const;

/**
 * Deployer/Admin wallet address
 * This wallet holds all admin capabilities
 */
export const ADMIN_ADDRESS = '0x90b72f753db1f385c74b0e1a54841748665bd8616d66aff378700fe8e96b9364';

// =============================================================================
// REWARD AMOUNTS - White Paper v1.0 Values
// =============================================================================

/**
 * Reward amounts in BASE UNITS (multiply display amounts by 1,000,000)
 * These values are from White Paper v1.0
 */
export const REWARDS = {
  // Core engagement rewards
  RECOMMENDATION: 5_000_000,      // 5.0 BOCA - Creating a dish recommendation
  UPVOTE_GIVEN: 500_000,          // 0.5 BOCA - Giving an upvote
  UPVOTE_RECEIVED: 1_000_000,     // 1.0 BOCA - Receiving an upvote
  FIRST_UPVOTE_BONUS: 2_000_000,  // 2.0 BOCA - First upvote on a recommendation
  COMMENT: 500_000,               // 0.5 BOCA - Adding a comment
  SHARE: 1_000_000,               // 1.0 BOCA - Sharing content
  BOOST: 1_000_000,               // 1.0 BOCA - Boosting content
  
  // Daily/streak rewards
  DAILY_LOGIN: 1_000_000,         // 1.0 BOCA - Daily check-in
  STREAK_BONUS_7_DAY: 5_000_000,  // 5.0 BOCA - 7-day login streak
  
  // One-time rewards
  REFERRAL: 10_000_000,           // 10.0 BOCA - Successful referral
  PROFILE_COMPLETE: 5_000_000,    // 5.0 BOCA - Completing profile
  
  // Content creation rewards
  NEW_RESTAURANT: 3_000_000,      // 3.0 BOCA - Adding a new restaurant
  PHOTO_UPLOAD: 2_000_000,        // 2.0 BOCA - Uploading a photo
} as const;

/**
 * Reward amounts in DISPLAY UNITS (human-readable)
 * For UI display purposes
 */
export const REWARDS_DISPLAY = {
  RECOMMENDATION: 5.0,
  UPVOTE_GIVEN: 0.5,
  UPVOTE_RECEIVED: 1.0,
  FIRST_UPVOTE_BONUS: 2.0,
  COMMENT: 0.5,
  SHARE: 1.0,
  BOOST: 1.0,
  DAILY_LOGIN: 1.0,
  STREAK_BONUS_7_DAY: 5.0,
  REFERRAL: 10.0,
  PROFILE_COMPLETE: 5.0,
  NEW_RESTAURANT: 3.0,
  PHOTO_UPLOAD: 2.0,
} as const;

// =============================================================================
// USER TIERS - Trust Level Configuration
// =============================================================================

/**
 * User tier configuration
 * Tiers affect reward multipliers and platform privileges
 */
export const USER_TIERS = {
  NEW: {
    index: 1,
    name: 'New',
    weight: 0.5,
    weightBasisPoints: 5000,      // 0.5x in basis points
    minRecommendations: 0,
    minUpvotes: 0,
  },
  ESTABLISHED: {
    index: 2,
    name: 'Established',
    weight: 1.0,
    weightBasisPoints: 10000,    // 1.0x in basis points
    minRecommendations: 10,
    minUpvotes: 50,
  },
  TRUSTED: {
    index: 3,
    name: 'Trusted',
    weight: 1.5,
    weightBasisPoints: 15000,    // 1.5x in basis points
    minRecommendations: 50,
    minUpvotes: 200,
  },
} as const;

// =============================================================================
// MOVE CALL TARGETS - Pre-constructed Function References
// =============================================================================

/**
 * Move call targets for all contract functions
 * Format: `{packageId}::{module}::{function}`
 */
export const MOVE_TARGETS = {
  // Token operations
  token: {
    mint: `${PACKAGE_IDS.TOKEN}::token::mint`,
    burn: `${PACKAGE_IDS.TOKEN}::token::burn`,
    transfer: `${PACKAGE_IDS.TOKEN}::token::transfer`,
    getBalance: `${PACKAGE_IDS.TOKEN}::token::get_balance`,
  },
  
  // User status operations
  userStatus: {
    createProfile: `${PACKAGE_IDS.USER_STATUS}::user_status::create_profile`,
    updateTier: `${PACKAGE_IDS.USER_STATUS}::user_status::update_tier`,
    getStatus: `${PACKAGE_IDS.USER_STATUS}::user_status::get_status`,
    incrementRecommendations: `${PACKAGE_IDS.USER_STATUS}::user_status::increment_recommendations`,
  },
  
  // Escrow operations
  escrow: {
    create: `${PACKAGE_IDS.ESCROW}::escrow::create`,
    release: `${PACKAGE_IDS.ESCROW}::escrow::release`,
    refund: `${PACKAGE_IDS.ESCROW}::escrow::refund`,
    getEscrow: `${PACKAGE_IDS.ESCROW}::escrow::get_escrow`,
  },
  
  // Email escrow operations
  emailEscrow: {
    create: `${PACKAGE_IDS.EMAIL_ESCROW}::email_escrow::create`,
    claim: `${PACKAGE_IDS.EMAIL_ESCROW}::email_escrow::claim`,
    refund: `${PACKAGE_IDS.EMAIL_ESCROW}::email_escrow::refund`,
    getEscrow: `${PACKAGE_IDS.EMAIL_ESCROW}::email_escrow::get_escrow`,
  },
  
  // Rewards operations
  rewards: {
    payRecommendationReward: `${PACKAGE_IDS.REWARDS}::rewards::pay_recommendation_reward`,
    payUpvoteGivenReward: `${PACKAGE_IDS.REWARDS}::rewards::pay_upvote_given_reward`,
    payUpvoteReceivedReward: `${PACKAGE_IDS.REWARDS}::rewards::pay_upvote_received_reward`,
    payFirstUpvoteBonus: `${PACKAGE_IDS.REWARDS}::rewards::pay_first_upvote_bonus`,
    payCommentReward: `${PACKAGE_IDS.REWARDS}::rewards::pay_comment_reward`,
    payShareReward: `${PACKAGE_IDS.REWARDS}::rewards::pay_share_reward`,
    payBoostReward: `${PACKAGE_IDS.REWARDS}::rewards::pay_boost_reward`,
    payDailyLoginReward: `${PACKAGE_IDS.REWARDS}::rewards::pay_daily_login_reward`,
    payStreakBonus: `${PACKAGE_IDS.REWARDS}::rewards::pay_streak_bonus`,
    payReferralReward: `${PACKAGE_IDS.REWARDS}::rewards::pay_referral_reward`,
    payProfileCompleteReward: `${PACKAGE_IDS.REWARDS}::rewards::pay_profile_complete_reward`,
    payNewRestaurantReward: `${PACKAGE_IDS.REWARDS}::rewards::pay_new_restaurant_reward`,
    payPhotoUploadReward: `${PACKAGE_IDS.REWARDS}::rewards::pay_photo_upload_reward`,
    getTreasuryBalance: `${PACKAGE_IDS.REWARDS}::rewards::get_treasury_balance`,
  },
  
  // Recommendation operations
  recommendation: {
    create: `${PACKAGE_IDS.RECOMMENDATION}::recommendation::create`,
    upvote: `${PACKAGE_IDS.RECOMMENDATION}::recommendation::upvote`,
    removeUpvote: `${PACKAGE_IDS.RECOMMENDATION}::recommendation::remove_upvote`,
    comment: `${PACKAGE_IDS.RECOMMENDATION}::recommendation::add_comment`,
    share: `${PACKAGE_IDS.RECOMMENDATION}::recommendation::share`,
    getRecommendation: `${PACKAGE_IDS.RECOMMENDATION}::recommendation::get_recommendation`,
    getEngagement: `${PACKAGE_IDS.RECOMMENDATION}::recommendation::get_engagement`,
  },
  
  // Lottery operations
  lottery: {
    buyTicket: `${PACKAGE_IDS.LOTTERY}::lottery::buy_ticket`,
    earnTicket: `${PACKAGE_IDS.LOTTERY}::lottery::earn_ticket`,
    drawWinner: `${PACKAGE_IDS.LOTTERY}::lottery::draw_winner`,
    claimPrize: `${PACKAGE_IDS.LOTTERY}::lottery::claim_prize`,
    getCurrentWeek: `${PACKAGE_IDS.LOTTERY}::lottery::get_current_week`,
    getTicketCount: `${PACKAGE_IDS.LOTTERY}::lottery::get_ticket_count`,
  },
  
  // Photo contest operations
  photoContest: {
    submitPhoto: `${PACKAGE_IDS.PHOTO_CONTEST}::photo_contest::submit_photo`,
    vote: `${PACKAGE_IDS.PHOTO_CONTEST}::photo_contest::vote`,
    endContest: `${PACKAGE_IDS.PHOTO_CONTEST}::photo_contest::end_contest`,
    claimPrize: `${PACKAGE_IDS.PHOTO_CONTEST}::photo_contest::claim_prize`,
    getContest: `${PACKAGE_IDS.PHOTO_CONTEST}::photo_contest::get_contest`,
  },
  
  // Bounty operations
  bounty: {
    create: `${PACKAGE_IDS.BOUNTY}::bounty::create`,
    submit: `${PACKAGE_IDS.BOUNTY}::bounty::submit`,
    accept: `${PACKAGE_IDS.BOUNTY}::bounty::accept`,
    reject: `${PACKAGE_IDS.BOUNTY}::bounty::reject`,
    cancel: `${PACKAGE_IDS.BOUNTY}::bounty::cancel`,
    getBounty: `${PACKAGE_IDS.BOUNTY}::bounty::get_bounty`,
  },
  
  // Governance operations
  governance: {
    createProposal: `${PACKAGE_IDS.GOVERNANCE}::governance::create_proposal`,
    vote: `${PACKAGE_IDS.GOVERNANCE}::governance::vote`,
    executeProposal: `${PACKAGE_IDS.GOVERNANCE}::governance::execute_proposal`,
    cancelProposal: `${PACKAGE_IDS.GOVERNANCE}::governance::cancel_proposal`,
    getProposal: `${PACKAGE_IDS.GOVERNANCE}::governance::get_proposal`,
    getVotingPower: `${PACKAGE_IDS.GOVERNANCE}::governance::get_voting_power`,
  },
} as const;

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Convert display amount to base units
 * @param amount - Amount in display units (e.g., 5.0 BOCA)
 * @returns Amount in base units (e.g., 5000000)
 */
export function toBaseUnits(amount: number): bigint {
  return BigInt(Math.round(amount * TOKEN_CONFIG.multiplier));
}

/**
 * Convert base units to display amount
 * @param baseUnits - Amount in base units (e.g., 5000000)
 * @returns Amount in display units (e.g., 5.0)
 */
export function toDisplayAmount(baseUnits: bigint | number): number {
  const units = typeof baseUnits === 'bigint' ? Number(baseUnits) : baseUnits;
  return units / TOKEN_CONFIG.multiplier;
}

/**
 * Format BOCA amount for display
 * @param baseUnits - Amount in base units
 * @param decimals - Number of decimal places to show (default: 2)
 * @returns Formatted string (e.g., "5.00 BOCA")
 */
export function formatBoca(baseUnits: bigint | number, decimals: number = 2): string {
  const display = toDisplayAmount(baseUnits);
  return `${display.toFixed(decimals)} ${TOKEN_CONFIG.symbol}`;
}

/**
 * Get explorer URL for a transaction
 * @param txDigest - Transaction digest hash
 * @returns Full explorer URL
 */
export function getExplorerTxUrl(txDigest: string): string {
  return `${NETWORK_CONFIG.explorerUrl}/tx/${txDigest}`;
}

/**
 * Get explorer URL for an object
 * @param objectId - Object ID
 * @returns Full explorer URL
 */
export function getExplorerObjectUrl(objectId: string): string {
  return `${NETWORK_CONFIG.explorerUrl}/object/${objectId}`;
}

/**
 * Get explorer URL for an address
 * @param address - Wallet address
 * @returns Full explorer URL
 */
export function getExplorerAddressUrl(address: string): string {
  return `${NETWORK_CONFIG.explorerUrl}/address/${address}`;
}

/**
 * Calculate reward with tier multiplier
 * @param baseReward - Base reward amount in base units
 * @param tierIndex - User tier index (1=New, 2=Established, 3=Trusted)
 * @returns Adjusted reward amount in base units
 */
export function calculateTieredReward(baseReward: number, tierIndex: 1 | 2 | 3): bigint {
  const tierWeights: Record<number, number> = {
    1: USER_TIERS.NEW.weight,
    2: USER_TIERS.ESTABLISHED.weight,
    3: USER_TIERS.TRUSTED.weight,
  };
  const weight = tierWeights[tierIndex] || 1.0;
  return BigInt(Math.round(baseReward * weight));
}

/**
 * Validate that all required admin caps are configured
 * @throws Error if any required admin cap is missing
 */
export function validateAdminCaps(): void {
  const missing: string[] = [];
  
  if (!ADMIN_CAPS.TREASURY_CAP) {
    missing.push('BOCABOCA_TREASURY_CAP');
  }
  if (!ADMIN_CAPS.LOTTERY_ADMIN_CAP) {
    missing.push('BOCABOCA_LOTTERY_ADMIN_CAP');
  }
  
  if (missing.length > 0) {
    throw new Error(
      `Missing required admin capability environment variables: ${missing.join(', ')}`
    );
  }
}

/**
 * Validate contract configuration integrity
 * @returns true if all Package IDs and Shared Objects are properly formatted
 */
export function validateContractConfig(): boolean {
  const isValidAddress = (addr: string): boolean => {
    return /^0x[a-fA-F0-9]{64}$/.test(addr);
  };
  
  // Validate all Package IDs
  for (const [name, id] of Object.entries(PACKAGE_IDS)) {
    if (!isValidAddress(id)) {
      console.error(`Invalid Package ID for ${name}: ${id}`);
      return false;
    }
  }
  
  // Validate all Shared Object IDs
  for (const [name, id] of Object.entries(SHARED_OBJECTS)) {
    if (!isValidAddress(id)) {
      console.error(`Invalid Shared Object ID for ${name}: ${id}`);
      return false;
    }
  }
  
  return true;
}

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

export type PackageId = typeof PACKAGE_IDS[keyof typeof PACKAGE_IDS];
export type SharedObjectId = typeof SHARED_OBJECTS[keyof typeof SHARED_OBJECTS];
export type RewardType = keyof typeof REWARDS;
export type UserTierName = keyof typeof USER_TIERS;
export type UserTierIndex = 1 | 2 | 3;

export interface UserTier {
  index: UserTierIndex;
  name: string;
  weight: number;
  weightBasisPoints: number;
  minRecommendations: number;
  minUpvotes: number;
}

export interface ContractCallParams {
  packageId: PackageId;
  module: string;
  function: string;
  typeArguments?: string[];
  arguments: (string | number | bigint)[];
}

// =============================================================================
// DEPLOYMENT METADATA
// =============================================================================

export const DEPLOYMENT_INFO = {
  /** Deployment date */
  deployedAt: '2025-01-04T00:00:00Z',
  
  /** Last updated (governance added) */
  updatedAt: '2025-01-05T00:00:00Z',
  
  /** Version tag */
  version: 'v1.0.0',
  
  /** Network */
  network: 'iota-testnet',
  
  /** Total modules deployed */
  moduleCount: 10,
  
  /** Deployer address */
  deployer: ADMIN_ADDRESS,
  
  /** Module list */
  modules: [
    'token',
    'user_status', 
    'escrow',
    'email_escrow',
    'rewards',
    'recommendation',
    'lottery',
    'photo_contest',
    'bounty',
    'governance',
  ],
} as const;

// =============================================================================
// DEFAULT EXPORT
// =============================================================================

export default {
  NETWORK_CONFIG,
  TOKEN_CONFIG,
  PACKAGE_IDS,
  SHARED_OBJECTS,
  ADMIN_CAPS,
  ADMIN_ADDRESS,
  REWARDS,
  REWARDS_DISPLAY,
  USER_TIERS,
  MOVE_TARGETS,
  DEPLOYMENT_INFO,
  // Helper functions
  toBaseUnits,
  toDisplayAmount,
  formatBoca,
  getExplorerTxUrl,
  getExplorerObjectUrl,
  getExplorerAddressUrl,
  calculateTieredReward,
  validateAdminCaps,
  validateContractConfig,
};