// src/adapters/types/recommendation-adapters.ts

import { ChainTransaction } from '../../types/chain';

export interface RecommendationTransactionData {
  id: string;
  author: string;
  serviceId: string;
  contentHash: string;
  trustScore?: number;
  timestamp: Date;
}

export interface VoteTransactionData {
  recommendationId: string;
  voter: string;
  voteType: 'up' | 'down';
  trustWeight: number;
  timestamp: Date;
}

export interface ReputationUpdateData {
  userId: string;
  oldScore: number;
  newScore: number;
  reason: string;
  timestamp: Date;
}

// Convert recommendation data to chain transaction format
export function toTransactionData(
  type: 'recommendation' | 'vote' | 'reputation_update',
  data: RecommendationTransactionData | VoteTransactionData | ReputationUpdateData
): ChainTransaction {
  return {
    id: `${type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    type,
    data,
    timestamp: new Date(),
    status: 'pending'
  };
}

// Get human-readable action details
export function getActionDetail(transaction: ChainTransaction): string {
  switch (transaction.type) {
    case 'recommendation':
      const recData = transaction.data as RecommendationTransactionData;
      return `New recommendation by ${recData.author} for service ${recData.serviceId}`;
    
    case 'vote':
      const voteData = transaction.data as VoteTransactionData;
      return `${voteData.voteType === 'up' ? 'Upvote' : 'Downvote'} by ${voteData.voter}`;
    
    case 'reputation_update':
      const repData = transaction.data as ReputationUpdateData;
      return `Reputation updated for ${repData.userId}: ${repData.oldScore} → ${repData.newScore}`;
    
    default:
      return `Unknown action: ${transaction.type}`;
  }
}

// Export all types for easy import
export type {
  RecommendationTransactionData,
  VoteTransactionData, 
  ReputationUpdateData
};
