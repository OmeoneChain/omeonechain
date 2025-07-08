import { ChainTransaction } from '../../type/chain';
export interface TokenTransactionData {
    userId: string;
    amount: number;
    tokenType: 'TOK' | 'reward' | 'stake';
    action: TokenActionType;
    metadata?: Record<string, any>;
}
export type TokenActionType = 'mint_reward' | 'transfer' | 'stake' | 'unstake' | 'burn' | 'governance_vote';
export declare const tokenActionMap: Record<TokenActionType, string>;
export declare function formatTokenForChain(data: TokenTransactionData): ChainTransaction;
type ChainTransactionReputation = any;
export interface ReputationTransactionData {
    userId: string;
    reputationChange: number;
    reason: string;
    sourceId?: string;
    metadata?: Record<string, any>;
}
export declare function formatReputationForChain(data: ReputationTransactionData): ChainTransactionReputation;
type ChainTransactionRecommendation = any;
export interface RecommendationTransactionData {
    id: string;
    author: string;
    serviceId: string;
    contentHash: string;
    rating: number;
    metadata?: Record<string, any>;
}
export declare function formatRecommendationForChain(data: RecommendationTransactionData): ChainTransactionRecommendation;
export {};
