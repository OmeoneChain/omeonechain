// File: code/poc/core/src/adapters/types/token-adapters.ts
import { ChainTransaction } from '../../types/chain';

export interface TokenTransactionData {
  userId: string;
  amount: number;
  tokenType: 'TOK' | 'reward' | 'stake';
  action: TokenActionType;
  metadata?: Record<string, any>;
}

export type TokenActionType = 
  | 'mint_reward'
  | 'transfer'
  | 'stake'
  | 'unstake'
  | 'burn'
  | 'governance_vote';

export const tokenActionMap: Record<TokenActionType, string> = {
  'mint_reward': 'mint_reward',
  'transfer': 'transfer_tokens',
  'stake': 'stake_tokens',
  'unstake': 'unstake_tokens',
  'burn': 'burn_tokens',
  'governance_vote': 'governance_vote'
};

export function formatTokenForChain(data: TokenTransactionData): ChainTransaction {
  return {
    type: tokenActionMap[data.action],
    data: {
      user_id: data.userId,
      amount: data.amount.toString(),
      token_type: data.tokenType,
      action: data.action,
      metadata: data.metadata || {}
    },
    timestamp: new Date().toISOString()
  };
}

// ===================================================================

// File: code/poc/core/src/adapters/types/reputation-adapters.ts
import { ChainTransaction } from '../../types/chain';

export interface ReputationTransactionData {
  userId: string;
  reputationChange: number;
  reason: string;
  sourceId?: string;
  metadata?: Record<string, any>;
}

export function formatReputationForChain(data: ReputationTransactionData): ChainTransaction {
  return {
    type: 'update_reputation',
    data: {
      user_id: data.userId,
      reputation_change: data.reputationChange.toString(),
      reason: data.reason,
      source_id: data.sourceId,
      metadata: data.metadata || {}
    },
    timestamp: new Date().toISOString()
  };
}

// ===================================================================

// File: code/poc/core/src/adapters/types/recommendation-adapters.ts
import { ChainTransaction } from '../../types/chain';

export interface RecommendationTransactionData {
  id: string;
  author: string;
  serviceId: string;
  contentHash: string;
  rating: number;
  metadata?: Record<string, any>;
}

export function formatRecommendationForChain(data: RecommendationTransactionData): ChainTransaction {
  return {
    type: 'create_recommendation',
    data: {
      id: data.id,
      author: data.author,
      service_id: data.serviceId,
      content_hash: data.contentHash,
      rating: data.rating.toString(),
      metadata: data.metadata || {}
    },
    timestamp: new Date().toISOString()
  };
}