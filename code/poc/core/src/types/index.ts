// src/types/index.ts
// Comprehensive type exports to fix import issues

// Chain types
export * from './chain';
export * from './recommendation';
export * from './reputation';
export * from './service';
export * from './token';

// CRITICAL FIX: Explicit type exports from common types to resolve TS1205 errors
export type { ApiError, ChainError, Result } from './common';

// Token adapter types - explicit export to fix import issues
export * from './token-adapters';

// Adapter types
export { 
  ChainAdapter, 
  ChainConfig, 
  TransactionResult, 
  StateQuery, 
  StateQueryResult,
  Event, 
  EventFilter,
  Transaction,
  BaseChainAdapter 
} from '../adapters/chain-adapter';

// Storage types
export { 
  IPFSStorage, 
  IPFSStorageOptions, 
  IpfsStorageResult, 
  IpfsRetrievalResult 
} from '../storage/ipfs-storage';

// Add missing reputation adapter types
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

// Engine types
export interface EngineResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  metadata?: Record<string, any>;
}

// Error types
export class OmeoneError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly details?: any;

  constructor(message: string, code: string, statusCode: number = 500, details?: any) {
    super(message);
    this.name = 'OmeoneError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
  }
}