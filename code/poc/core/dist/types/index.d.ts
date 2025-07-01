export * from './chain';
export * from './recommendation';
export * from './reputation';
export * from './service';
export * from './token';
export { ChainAdapter, ChainConfig, TransactionResult, StateQuery, StateQueryResult, Event, EventFilter, Transaction, BaseChainAdapter } from '../adapters/chain-adapter';
export { IPFSStorage, IPFSStorageOptions, IpfsStorageResult, IpfsRetrievalResult } from '../storage/ipfs-storage';
export interface ReputationTransactionData {
    userId: string;
    action: 'upvote' | 'downvote' | 'save' | 'follow' | 'unfollow';
    targetId: string;
    targetType: 'recommendation' | 'user' | 'list';
    weight: number;
    timestamp: number;
    metadata?: Record<string, any>;
}
export interface TokenTransactionData {
    from: string;
    to: string;
    amount: number;
    tokenType: 'TOK' | 'REWARD';
    reason: string;
    timestamp: number;
    metadata?: Record<string, any>;
}
export interface EngineResponse<T = any> {
    success: boolean;
    data?: T;
    error?: string;
    metadata?: Record<string, any>;
}
export declare class OmeoneError extends Error {
    readonly code: string;
    readonly statusCode: number;
    readonly details?: any;
    constructor(message: string, code: string, statusCode?: number, details?: any);
}
