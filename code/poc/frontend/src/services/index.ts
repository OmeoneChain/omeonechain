// File path: /code/poc/frontend/src/services/types/index.ts

// Core blockchain and network types
export interface NetworkConfig {
  rpcUrl: string;
  networkId: string;
  chainId?: string;
  explorerUrl?: string;
}

export interface TransactionResult {
  transactionId: string;
  blockHeight?: number;
  gasUsed?: number;
  status: 'pending' | 'confirmed' | 'failed';
  timestamp: string;
}

// Trust score and social graph types
export interface TrustWeight {
  userId: string;
  weight: number; // 0.75 for direct friends, 0.25 for friend-of-friends
  socialDistance: number; // 1 = direct, 2 = friend-of-friend
  trustScore: number;
  relationship: 'direct' | 'friend-of-friend' | 'none';
}

export interface TrustScoreBreakdown {
  totalScore: number;
  baseScore: number;
  socialMultiplier: number;
  endorsements: {
    directFriends: number;
    friendsOfFriends: number;
    total: number;
  };
  provenance: string;
  weights: TrustWeight[];
  calculatedAt: string;
  recommendationId: string;
}

// User and reputation types
export interface UserReputation {
  userId: string;
  walletAddress: string;
  trustScore: number;
  reputationScore: number;
  totalRecommendations: number;
  upvotesReceived: number;
  followers: number;
  following: number;
  stakingTier: 'Explorer' | 'Curator' | 'Passport' | 'Validator';
  stakedAmount: number;
  tokenBalance: number;
  votingPower: number;
  governanceParticipation: number;
  verificationLevel: 'basic' | 'verified' | 'expert';
  joinedAt: string;
  lastActiveAt: string;
}

export interface SocialConnection {
  fromUserId: string;
  toUserId: string;
  connectionType: 'follow' | 'trust' | 'block';
  weight: number;
  establishedAt: string;
  isReciprocal: boolean;
}

export interface SocialGraph {
  userId: string;
  connections: {
    direct: string[]; // 1-hop connections
    indirect: string[]; // 2-hop connections
  };
  trustNetwork: SocialConnection[];
  networkSize: number;
  lastUpdated: string;
}

// Recommendation and content types
export interface Location {
  latitude: number;
  longitude: number;
  address: string;
  city: string;
  country?: string;
  postalCode?: string;
}

export interface Recommendation {
  id: string;
  objectId?: string; // IOTA Rebased object ID
  title: string;
  body: string;
  author: string;
  authorName?: string;
  category: string;
  location: Location;
  tags: string[];
  
  // Trust and verification
  trustScore: number;
  verificationStatus: 'verified' | 'unverified' | 'flagged';
  contentHash: string; // IPFS or content hash
  ipfsCid?: string;
  
  // Engagement metrics
  upvotes: number;
  downvotes: number;
  saves: number;
  shares: number;
  endorsements: number;
  
  // Social context
  socialProof: string;
  endorsers: string[];
  
  // Token economics
  rewards: number;
  rewardsPaid: number;
  
  // Metadata
  createdAt: string;
  updatedAt: string;
  chainId?: string;
  commitNumber?: number;
}

export interface CreateRecommendationRequest {
  title: string;
  body: string;
  category: string;
  location: Location;
  tags: string[];
  mediaFiles?: File[];
}

// Endorsement and interaction types
export interface Endorsement {
  id: string;
  recommendationId: string;
  userId: string;
  endorsementType: 'save' | 'upvote' | 'share' | 'bookmark';
  weight: number;
  socialDistance: number;
  timestamp: string;
  transactionId?: string;
}

export interface UserInteraction {
  userId: string;
  targetId: string;
  targetType: 'recommendation' | 'user' | 'list';
  interactionType: 'view' | 'save' | 'upvote' | 'share' | 'follow' | 'tip';
  metadata?: Record<string, any>;
  timestamp: string;
}

// Token and reward types
export interface TokenReward {
  id: string;
  recommendationId: string;
  recipientId: string;
  amount: number;
  rewardType: 'creation' | 'endorsement' | 'curation' | 'governance';
  trigger: string;
  triggerUser?: string;
  socialMultiplier: number;
  calculatedAt: string;
  paidAt?: string;
  transactionId?: string;
}

export interface TokenBalance {
  userId: string;
  availableBalance: number;
  stakedBalance: number;
  lockedBalance: number;
  totalEarned: number;
  totalSpent: number;
  lastUpdated: string;
}

export interface StakingInfo {
  userId: string;
  tier: 'Explorer' | 'Curator' | 'Passport' | 'Validator';
  stakedAmount: number;
  stakingPeriod: number; // months
  stakedAt: string;
  unlocksAt: string;
  votingWeight: number;
  penalties: number;
  rewards: number;
}

// Governance types
export interface GovernanceProposal {
  id: string;
  title: string;
  description: string;
  proposer: string;
  proposalType: 'parameter' | 'upgrade' | 'treasury' | 'emergency';
  status: 'draft' | 'active' | 'executed' | 'rejected' | 'expired';
  votesFor: number;
  votesAgainst: number;
  votesAbstain: number;
  quorumRequired: number;
  quorumReached: boolean;
  requiredStake: string;
  votingPeriod: number;
  createdAt: string;
  votingEndsAt: string;
  executedAt?: string;
  parameters?: Record<string, any>;
}

export interface Vote {
  proposalId: string;
  userId: string;
  voteType: 'for' | 'against' | 'abstain';
  votingWeight: number;
  reason?: string;
  timestamp: string;
  transactionId?: string;
}

// API and service types
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: string;
  timestamp: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
  };
}

export interface QueryOptions {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  filter?: Record<string, any>;
  search?: string;
}

export interface RecommendationFilters extends QueryOptions {
  category?: string;
  location?: string;
  minTrustScore?: number;
  maxTrustScore?: number;
  author?: string;
  tags?: string[];
  dateRange?: {
    from: string;
    to: string;
  };
}

// Error and loading types
export interface ServiceError {
  code: string;
  message: string;
  details?: Record<string, any>;
  timestamp: string;
  retryable: boolean;
}

export interface LoadingState {
  [key: string]: boolean;
}

export interface ErrorState {
  [key: string]: string | null;
}

// IOTA Rebased specific types
export interface IOTATransaction {
  digest: string;
  transaction: {
    data: {
      messageVersion: string;
      transaction: {
        kind: string;
        inputs: any[];
        commands: any[];
      };
      sender: string;
      gasData: {
        payment: any[];
        owner: string;
        price: string;
        budget: string;
      };
    };
    txSignatures: string[];
  };
  effects: {
    messageVersion: string;
    status: { status: string };
    executedEpoch: string;
    gasUsed: {
      computationCost: string;
      storageCost: string;
      storageRebate: string;
      nonRefundableStorageFee: string;
    };
    modifiedAtVersions: any[];
    transactionDigest: string;
    created: any[];
    mutated: any[];
    gasObject: {
      owner: { AddressOwner: string };
      reference: {
        objectId: string;
        version: string;
        digest: string;
      };
    };
    dependencies: string[];
  };
  events: any[];
  objectChanges: any[];
  balanceChanges: any[];
  timestampMs: string;
  checkpoint: string;
}

export interface IOTAObject {
  data: {
    objectId: string;
    version: string;
    digest: string;
    type: string;
    owner: {
      AddressOwner?: string;
      ObjectOwner?: string;
      Shared?: { initial_shared_version: string };
    };
    storageRebate: string;
    content?: {
      dataType: string;
      type: string;
      hasPublicTransfer: boolean;
      fields: Record<string, any>;
    };
  };
}

// Constants and configuration
export const TRUST_WEIGHTS = {
  DIRECT_FRIEND: 0.75,
  FRIEND_OF_FRIEND: 0.25,
  NO_CONNECTION: 0.0,
} as const;

export const STAKING_TIERS = {
  EXPLORER: { minStake: 25, duration: 1, features: ['Submit comments', 'Trust cap +0.1'] },
  CURATOR: { minStake: 100, duration: 3, features: ['Create proposals', '25% list royalty', 'Trust cap +0.3'] },
  PASSPORT: { minStake: 500, duration: 6, features: ['50% AI discount', 'Premium features'] },
  VALIDATOR: { minStake: 1000, duration: 12, features: ['Run indexer node', '1.5x vote weight'] },
} as const;

export const REWARD_THRESHOLDS = {
  MIN_TRUST_SCORE: 0.25, // Minimum trust score to earn rewards (on 0-1 scale)
  MAX_SOCIAL_MULTIPLIER: 3.0, // Maximum social multiplier cap
  BASE_REWARD: 1.0, // Base reward in TOK
} as const;

// Export all types
export type {
  NetworkConfig,
  TransactionResult,
  TrustWeight,
  TrustScoreBreakdown,
  UserReputation,
  SocialConnection,
  SocialGraph,
  Location,
  Recommendation,
  CreateRecommendationRequest,
  Endorsement,
  UserInteraction,
  TokenReward,
  TokenBalance,
  StakingInfo,
  GovernanceProposal,
  Vote,
  ApiResponse,
  QueryOptions,
  RecommendationFilters,
  ServiceError,
  LoadingState,
  ErrorState,
  IOTATransaction,
  IOTAObject,
};