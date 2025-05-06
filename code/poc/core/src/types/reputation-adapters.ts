/**
 * Adapter-specific reputation types for OmeoneChain
 * 
 * This file provides adapter-specific types and utilities for working with
 * reputation data across different blockchain implementations.
 */

// Import your existing reputation types here
// import { ... } from '../../types/reputation';

/**
 * Reputation data format for chain transactions
 * Used when submitting reputation updates to blockchain adapters
 */
export interface ReputationTransactionData {
  /**
   * User's public key or identifier
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
   * Verification level of the user
   */
  verificationLevel: 'basic' | 'verified' | 'expert';
  
  /**
   * Categories in which the user has demonstrated expertise
   */
  specializations?: string[];
  
  /**
   * Chain ID indicating the originating chain
   */
  chainID?: string;
  
  /**
   * On-chain reference data
   */
  ledger?: {
    objectID?: string;
    commitNumber?: number;
  };
}

/**
 * Helper function to format reputation data for chain submission
 * @param reputationData Original reputation data
 * @returns Formatted reputation data for chain transaction
 */
export function formatReputationForChain(reputationData: any): ReputationTransactionData {
  // Implementation would depend on your existing reputation data structure
  // This is a placeholder that would be filled with actual mapping logic
  return {
    userId: reputationData.userId,
    totalRecommendations: reputationData.totalRecommendations || 0,
    upvotesReceived: reputationData.upvotesReceived || 0,
    downvotesReceived: reputationData.downvotesReceived || 0,
    reputationScore: reputationData.reputationScore || 0,
    verificationLevel: reputationData.verificationLevel || 'basic',
    specializations: reputationData.specializations || [],
    chainID: reputationData.chainID
  };
}
