/**
 * Token Transaction Model
 * 
 * Represents token transfers and rewards in the OmeoneChain system
 * Based on Technical Specifications A.2.3
 */

export enum TransactionType {
  REWARD = 'reward',
  TRANSFER = 'transfer',
  FEE = 'fee',
  STAKE = 'stake',
  UNSTAKE = 'unstake',
  SERVICE_PAYMENT = 'service_payment',
  NFT_PURCHASE = 'nft_purchase',
  BURN = 'burn'
}

// Additional enum for compatibility with existing code that expects TokenActionType
export enum TokenActionType {
  MINT = 'mint',
  BURN = 'burn',
  TRANSFER = 'transfer',
  STAKE = 'stake',
  UNSTAKE = 'unstake',
  REWARD = 'reward',
  TIP = 'tip',
  GOVERNANCE = 'governance',
  // Map to existing TransactionType values
  FEE = 'fee',
  SERVICE_PAYMENT = 'service_payment',
  NFT_PURCHASE = 'nft_purchase'
}

export interface TangleReference {
  /**
   * Rebased object ID
   */
  objectId: string;
  
  /**
   * Reference commit number
   */
  commitNumber: number;
}

/**
 * Main TokenTransaction interface defining the structure of token transaction data
 * Enhanced to satisfy TypeScript requirements while maintaining existing functionality
 */
export interface TokenTransaction {
  /**
   * Unique identifier for the transaction
   */
  transactionId: string;
  
  /**
   * Public key or "SYSTEM" for rewards
   */
  sender: string;
  
  /**
   * Public key of the recipient
   */
  recipient: string;
  
  /**
   * Amount of tokens in the transaction
   */
  amount: number;
  
  /**
   * ISO8601 timestamp of the transaction (string format as per existing design)
   */
  timestamp: string;
  
  /**
   * Type of transaction
   */
  type: TransactionType;
  
  /**
   * Related recommendation/action ID
   */
  actionReference?: string;
  
  /**
   * Reference to on-chain storage
   */
  tangle: TangleReference;
  
  // Additional fields for TypeScript compatibility with existing code
  /**
   * User ID (for compatibility with existing code patterns)
   */
  userId?: string;
  
  /**
   * Token type classification
   */
  tokenType?: "reward" | "stake" | "TOK";
  
  /**
   * Action type (for compatibility with TokenActionType usage)
   */
  action?: TokenActionType;
  
  /**
   * Additional metadata
   */
  metadata?: Record<string, any>;
  
  /**
   * Transaction status
   */
  status?: 'pending' | 'confirmed' | 'failed';
  
  /**
   * Blockchain specific fields (for compatibility)
   */
  objectId?: any;
  commitNumber?: any;
  chainId?: string;
  blockHeight?: number;
  gasUsed?: number;
}

/**
 * Structure for token reward calculation
 */
export interface RewardCalculation {
  /**
   * ID of the recommendation being rewarded
   */
  recommendationId: string;
  
  /**
   * Author of the recommendation
   */
  authorId: string;
  
  /**
   * Base reward amount
   */
  baseReward: number;
  
  /**
   * Trust-based quality multiplier
   */
  qualityMultiplier: number;
  
  /**
   * Multiplier based on author's reputation
   */
  reputationFactor: number;
  
  /**
   * Base fee in µIOTA
   */
  baseFeeInMicroIOTA: number;
  
  /**
   * Total calculated reward
   */
  totalReward: number;
}

/**
 * Parameters for the token reward system
 */
export interface RewardSystemParams {
  /**
   * Base reward for a recommendation that reaches minimum trust
   */
  baseRecommendationReward: number;
  
  /**
   * Reward per N trusted upvotes
   */
  upvoteReward: {
    count: number;
    amount: number;
  };
  
  /**
   * Maximum upvote rewards per recommendation
   */
  maxUpvoteReward: number;
  
  /**
   * Reward for curating a list that gains sufficient trust
   */
  curationReward: number;
  
  /**
   * Percentage of downstream rewards for curators
   */
  curatorRewardShare: number;
  
  /**
   * Reward for confirmed abuse reports
   */
  abuseReportReward: number;
  
  /**
   * Percentage of slashed rewards given to reporters
   */
  reporterSlashShare: number;
  
  /**
   * Current reward halving epoch
   */
  currentHalvingEpoch: number;
  
  /**
   * Halving factor (typically 0.5)
   */
  halvingFactor: number;
}

/**
 * Token balance and staking information
 */
export interface TokenBalance {
  /**
   * User ID
   */
  userId: string;
  
  /**
   * Available token balance
   */
  available: number;
  
  /**
   * Staked token amount
   */
  staked: number;
  
  /**
   * Pending rewards not yet claimed
   */
  pendingRewards: number;
  
  /**
   * When staking period ends (if applicable)
   */
  stakingEndTime?: string;
  
  /**
   * Staking tier
   */
  stakingTier?: string;
}

/**
 * Filter parameters for retrieving token transactions
 */
export interface TransactionFilter {
  /**
   * Optional sender to filter by
   */
  sender?: string;
  
  /**
   * Optional recipient to filter by
   */
  recipient?: string;
  
  /**
   * Optional transaction type
   */
  type?: TransactionType;
  
  /**
   * Optional recommendation ID reference
   */
  actionReference?: string;
  
  /**
   * Date range for transactions
   */
  dateRange?: {
    from: string;
    to: string;
  };
  
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

/**
 * Helper function to create TokenTransaction with proper defaults
 * Ensures all required fields are present for TypeScript compliance
 */
export function createTokenTransaction(
  partial: Partial<TokenTransaction> & {
    sender: string;
    recipient: string;
    amount: number;
    type: TransactionType;
    tangle: TangleReference;
  }
): TokenTransaction {
  const now = new Date().toISOString();
  const txId = partial.transactionId || `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  return {
    transactionId: txId,
    timestamp: partial.timestamp || now,
    status: partial.status || 'pending',
    userId: partial.userId || partial.sender,
    tokenType: partial.tokenType || 'TOK',
    // Map TransactionType to TokenActionType for compatibility
    action: mapTransactionTypeToAction(partial.type),
    ...partial
  };
}

/**
 * Helper function to map TransactionType to TokenActionType
 */
function mapTransactionTypeToAction(type: TransactionType): TokenActionType {
  switch (type) {
    case TransactionType.REWARD:
      return TokenActionType.REWARD;
    case TransactionType.TRANSFER:
      return TokenActionType.TRANSFER;
    case TransactionType.STAKE:
      return TokenActionType.STAKE;
    case TransactionType.UNSTAKE:
      return TokenActionType.UNSTAKE;
    case TransactionType.BURN:
      return TokenActionType.BURN;
    case TransactionType.FEE:
      return TokenActionType.FEE;
    case TransactionType.SERVICE_PAYMENT:
      return TokenActionType.SERVICE_PAYMENT;
    case TransactionType.NFT_PURCHASE:
      return TokenActionType.NFT_PURCHASE;
    default:
      return TokenActionType.TRANSFER;
  }
}

/**
 * Helper function for creating reward transactions
 */
export function createRewardTransaction(
  recipient: string,
  amount: number,
  recommendationId: string,
  tangle: TangleReference
): TokenTransaction {
  return createTokenTransaction({
    sender: 'SYSTEM',
    recipient,
    amount,
    type: TransactionType.REWARD,
    actionReference: recommendationId,
    tokenType: 'reward',
    tangle
  });
}

/**
 * Helper function for creating transfer transactions
 */
export function createTransferTransaction(
  sender: string,
  recipient: string,
  amount: number,
  tangle: TangleReference,
  actionReference?: string
): TokenTransaction {
  return createTokenTransaction({
    sender,
    recipient,
    amount,
    type: TransactionType.TRANSFER,
    actionReference,
    tokenType: 'TOK',
    tangle
  });
}

/**
 * Validate TokenTransaction structure
 * Ensures all required fields are present and valid
 */
export function validateTokenTransaction(tx: any): tx is TokenTransaction {
  return (
    typeof tx === 'object' &&
    typeof tx.transactionId === 'string' &&
    typeof tx.sender === 'string' &&
    typeof tx.recipient === 'string' &&
    typeof tx.amount === 'number' &&
    typeof tx.timestamp === 'string' &&
    Object.values(TransactionType).includes(tx.type) &&
    typeof tx.tangle === 'object' &&
    typeof tx.tangle.objectId === 'string' &&
    typeof tx.tangle.commitNumber === 'number'
  );
}