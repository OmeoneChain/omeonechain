import { ChainTransaction } from '../../type/chain';
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
export declare function toTransactionData(type: 'recommendation' | 'vote' | 'reputation_update', data: RecommendationTransactionData | VoteTransactionData | ReputationUpdateData): ChainTransaction;
export declare function getActionDetail(transaction: ChainTransaction): string;
export type { RecommendationTransactionData, VoteTransactionData, ReputationUpdateData };
