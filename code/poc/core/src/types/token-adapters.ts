/**
 * Adapter-specific token types for OmeoneChain
 * 
 * This file provides adapter-specific types and utilities for working with
 * token transactions across different blockchain implementations.
 */

// Import your existing token types here
// import { ... } from '../../types/token';

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
 * Token action types
 */
export enum TokenActionType {
  TRANSFER = 'transfer',
  CLAIM_REWARD = 'claim_reward',
  STAKE = 'stake',
  UNSTAKE = 'unstake',
  BURN = 'burn'
}

/**
 * Map of token actions to adapter-specific actions
 */
export const tokenActionMap = {
  [TokenActionType.TRANSFER]: 'transfer',
  [TokenActionType.CLAIM_REWARD]: 'claim_reward',
  [TokenActionType.STAKE]: 'stake',
  [TokenActionType.UNSTAKE]: 'unstake',
  [TokenActionType.BURN]: 'burn'
};

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
