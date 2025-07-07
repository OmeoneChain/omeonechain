/**
 * Adapter-specific token types for OmeoneChain
 * 
 * This file provides adapter-specific types and utilities for working with
 * token transactions across different blockchain implementations.
 */

// Re-export types from chain.ts for consistency
export type { TokenBalance } from './chain';

/**
 * Token balance information (expanded from chain.ts)
 */
export interface TokenBalanceDetailed {
  /**
   * Available balance (confirmed)
   */
  confirmed: number;
  
  /**
   * Pending balance (unconfirmed transactions)
   */
  pending: number;
  
  /**
   * Staked tokens (locked for governance)
   */
  staked: number;
  
  /**
   * Rewards pending claim
   */
  pendingRewards: number;
  
  /**
   * Total balance (confirmed + pending)
   */
  total: number;
  
  /**
   * Token decimals for display
   */
  decimals: number;
  
  /**
   * Token symbol
   */
  symbol: string;
}

/**
 * Token transaction information (what modules expect to import)
 */
export interface TokenTransaction {
  /**
   * Transaction ID
   */
  id: string;
  
  /**
   * Transaction hash on blockchain
   */
  hash: string;
  
  /**
   * Sender address
   */
  from: string;
  
  /**
   * Recipient address
   */
  to: string;
  
  /**
   * Amount transferred
   */
  amount: number;
  
  /**
   * Transaction timestamp
   */
  timestamp: number;
  
  /**
   * Transaction status
   */
  status: 'pending' | 'confirmed' | 'failed';
  
  /**
   * Transaction type
   */
  type: 'reward' | 'transfer' | 'fee' | 'stake' | 'unstake' | 'burn';
  
  /**
   * Block/commit number
   */
  blockNumber?: number;
  
  /**
   * Gas used (for EVM chains)
   */
  gasUsed?: number;
  
  /**
   * Transaction fee
   */
  fee?: number;
}

/**
 * Token transaction data structure for adapter operations
 */
export interface TokenTransactionData {
  /**
   * Unique identifier for the transaction
   */
  transactionId?: string;
  
  /**
   * Sender's public key or identifier (or "SYSTEM" for rewards)
   */
  sender: string;
  
  /**
   * Recipient's public key or identifier
   */
  recipient: string;
  
  /**
   * Amount of tokens being transferred
   */
  amount: number;
  
  /**
   * Timestamp of the transaction
   */
  timestamp?: string;
  
  /**
   * Type of transaction (reward, transfer, fee, etc.)
   */
  type: 'reward' | 'transfer' | 'fee' | 'stake' | 'unstake' | 'burn';
  
  /**
   * Reference to related action (recommendation ID, governance proposal, etc.)
   */
  actionReference?: string;
  
  /**
   * On-chain reference data
   */
  tangle?: {
    objectId?: string;
    commitNumber?: number;
  };
}

/**
 * Token transfer request
 */
export interface TokenTransferRequest {
  /**
   * Recipient address
   */
  to: string;
  
  /**
   * Amount to transfer
   */
  amount: number;
  
  /**
   * Optional memo/note
   */
  memo?: string;
  
  /**
   * Transaction type
   */
  type?: 'transfer' | 'tip' | 'payment';
}

/**
 * Token reward claim
 */
export interface TokenRewardClaim {
  /**
   * User address claiming rewards
   */
  user: string;
  
  /**
   * Amount being claimed
   */
  amount: number;
  
  /**
   * Source of rewards (recommendation ID, etc.)
   */
  source: string;
  
  /**
   * Reward type
   */
  rewardType: 'content' | 'curation' | 'governance' | 'referral';
}

/**
 * Staking information
 */
export interface StakingInfo {
  /**
   * Amount staked
   */
  amount: number;
  
  /**
   * Staking tier
   */
  tier: 'explorer' | 'curator' | 'passport' | 'validator';
  
  /**
   * Stake start timestamp
   */
  stakedAt: number;
  
  /**
   * Stake duration (in seconds)
   */
  duration: number;
  
  /**
   * Stake end timestamp
   */
  unlocksAt: number;
  
  /**
   * Can unstake early (with penalty)
   */
  canUnstakeEarly: boolean;
  
  /**
   * Early unstake penalty (5%)
   */
  unstakePenalty: number;
}

/**
 * Token action types
 */
export enum TokenActionType {
  TRANSFER = 'transfer',
  CLAIM_REWARD = 'claim_reward',
  STAKE = 'stake',
  UNSTAKE = 'unstake',
  BURN = 'burn',
  TIP = 'tip',
  PAYMENT = 'payment'
}

/**
 * Map of token actions to adapter-specific actions
 */
export const tokenActionMap = {
  [TokenActionType.TRANSFER]: 'transfer',
  [TokenActionType.CLAIM_REWARD]: 'claim_reward',
  [TokenActionType.STAKE]: 'stake',
  [TokenActionType.UNSTAKE]: 'unstake',
  [TokenActionType.BURN]: 'burn',
  [TokenActionType.TIP]: 'tip',
  [TokenActionType.PAYMENT]: 'payment'
};

/**
 * Token transaction fees
 */
export interface TokenFees {
  /**
   * Network fee (gas fee for EVM, processing fee for IOTA)
   */
  networkFee: number;
  
  /**
   * Platform fee (protocol fee)
   */
  platformFee: number;
  
  /**
   * Total fee
   */
  totalFee: number;
  
  /**
   * Fee currency
   */
  feeCurrency: string;
}

/**
 * Format token amount for chain submission
 * @param amount Original amount (human-readable)
 * @param decimals Token decimals (default: 18)
 * @returns Formatted amount for chain
 */
export function formatTokenAmount(amount: number, decimals: number = 18): string {
  // Convert human-readable amount to chain representation
  // This is a simplified implementation for example purposes
  return (amount * (10 ** decimals)).toString();
}

/**
 * Parse token amount from chain representation
 * @param amountOnChain Amount in chain representation
 * @param decimals Token decimals (default: 18)
 * @returns Human-readable amount
 */
export function parseTokenAmount(amountOnChain: string, decimals: number = 18): number {
  // Convert chain representation to human-readable amount
  return parseFloat(amountOnChain) / (10 ** decimals);
}

/**
 * Calculate transaction fees
 * @param amount Transaction amount
 * @param transactionType Type of transaction
 * @returns Fee information
 */
export function calculateTransactionFees(
  amount: number, 
  transactionType: TokenActionType
): TokenFees {
  // Basic fee calculation - can be made more sophisticated
  const platformFeeRate = transactionType === TokenActionType.TIP ? 0.025 : 0.01; // 2.5% for tips, 1% for others
  const networkFee = 0; // IOTA Rebased is feeless
  const platformFee = amount * platformFeeRate;
  
  return {
    networkFee,
    platformFee,
    totalFee: networkFee + platformFee,
    feeCurrency: 'TOK'
  };
}

/**
 * Validate token transfer request
 * @param request Transfer request to validate
 * @returns Validation result
 */
export function validateTokenTransfer(request: TokenTransferRequest): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  
  if (!request.to || request.to.length === 0) {
    errors.push('Recipient address is required');
  }
  
  if (!request.amount || request.amount <= 0) {
    errors.push('Amount must be greater than 0');
  }
  
  if (request.amount && request.amount > 1000000) {
    errors.push('Amount exceeds maximum transfer limit');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

// Re-export utility types that other modules might need
export type { TokenBalance as ChainTokenBalance } from './chain';