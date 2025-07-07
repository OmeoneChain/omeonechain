/**
 * User Reputation Model
 * 
 * Represents a user's reputation and contribution metrics in the OmeoneChain system
 * Based on Technical Specifications A.2.2
 */

export enum VerificationLevel {
  BASIC = 'basic',
  VERIFIED = 'verified',
  EXPERT = 'expert'
}

export interface LedgerReference {
  /**
   * Object ID on the ledger
   */
  objectID: string;
  
  /**
   * Commit number
   */
  commitNumber: number;
}

/**
 * Main UserReputation interface defining the structure of user reputation data
 */
export interface UserReputation {
  /**
   * Chain ID (e.g., "Rebased-testnet-001")
   */
  chainID: string;
  
  /**
   * Public key or identifier of the user
   */
  userId: string;
  
  /**
   * Total number of recommendations made by the user
   */
  totalRecommendations: number;
  
  /**
   * Total number of upvotes received across all recommendations
   */
  upvotesReceived: number;
  
  /**
   * Total number of downvotes received across all recommendations
   */
  downvotesReceived: number;
  
  /**
   * Calculated reputation score
   */
  reputationScore: number;
  
  /**
   * User's verification level
   */
  verificationLevel: VerificationLevel;
  
  /**
   * Categories in which the user has expertise
   */
  specializations: string[];
  
  /**
   * ISO8601 timestamp when the user joined
   */
  activeSince: string;
  
  /**
   * Total token rewards earned
   */
  tokenRewardsEarned: number;
  
  /**
   * Number of users following this user
   */
  followers: number;
  
  /**
   * Number of users this user is following
   */
  following: number;
  
  /**
   * Reference to on-chain storage
   */
  ledger: LedgerReference;
}

/**
 * Trust Score calculation parameters
 */
export interface TrustScoreParams {
  /**
   * Base weight for direct follower (default: 0.75)
   */
  directFollowerWeight: number;
  
  /**
   * Base weight for follower of follower (default: 0.25)
   */
  secondaryFollowerWeight: number;
  
  /**
   * Maximum trust multiplier (default: 3)
   */
  maxTrustMultiplier: number;
  
  /**
   * Minimum trust score to qualify for rewards (default: 0.25)
   */
  minTrustThreshold: number;
}

/**
 * Social graph relationship between users
 */
export interface UserRelationship {
  /**
   * User who is following
   */
  followerId: string;
  
  /**
   * User being followed
   */
  followedId: string;
  
  /**
   * When the follow relationship was established
   */
  timestamp: string;
  
  /**
   * Social distance (1 = direct follow, 2 = follow of follow)
   */
  distance: number;
  
  /**
   * Trust weight based on the relationship (calculated)
   */
  trustWeight: number;
}

/**
 * Filter parameters for retrieving reputation data
 */
export interface ReputationFilter {
  /**
   * Optional user ID to filter by
   */
  userId?: string;
  
  /**
   * Optional minimum reputation threshold
   */
  minReputationScore?: number;
  
  /**
   * Optional verification level
   */
  verificationLevel?: VerificationLevel;
  
  /**
   * Optional specialization category
   */
  specialization?: string;
  
  /**
   * Pagination parameters
   */
  pagination?: {
    offset: number;
    limit: number;
  };
  
  /**
   * Sorting parameters
   */
  sort?: {
    field: string;
    direction: 'asc' | 'desc';
  };
}
