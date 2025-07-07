// src/types/index.ts
// Comprehensive type exports to fix import issues

// ============================================================================
// CORE DOMAIN TYPES - PRIMARY EXPORTS
// ============================================================================

// Chain types - Core blockchain interface types
export type { 
  ChainAdapter, 
  ChainTransaction, 
  ChainState, 
  ChainEvent, 
  Transaction, 
  TransactionResult, 
  StateQuery, 
  QueryResult, 
  EventFilter, 
  Event, 
  NetworkInfo, 
  TokenBalance, 
  ObjectQuery 
} from './chain';

// Recommendation types - Core recommendation domain types
export type { 
  Recommendation, 
  Location, 
  Content, 
  MediaItem, 
  RecommendationActionType 
} from './recommendation';

// Reputation types - User reputation and scoring types  
export type { 
  ReputationEngine, 
  UserProfile 
} from './reputation';

// Service types - Business service types
export type { 
  Service, 
  ServiceEngine 
} from './service';

// Token types - Token and reward types
export type { 
  Token,
  TokenReward 
} from './token';

// ============================================================================
// ADAPTER TYPES - SPECIALIZED EXPORTS
// ============================================================================

// Token adapter types - specific exports to avoid conflicts
export type { 
  TokenTransactionData as AdapterTokenTransactionData,
  TokenBalanceDetailed,
  TokenTransferRequest,
  TokenRewardClaim,
  StakingInfo,
  TokenActionType as AdapterTokenActionType
} from './token-adapters';

// Reputation adapter types - specific exports to avoid conflicts
export type { 
  ReputationScore,
  UserReputation as AdapterUserReputation,
  UserVerification,
  UserActivity,
  SocialMetrics,
  ReputationAdapter,
  TrustRelationship
} from './reputation-adapters';

// Recommendation adapter types - specific exports to avoid conflicts
export type { 
  RecommendationAdapter,
  RecommendationQuery,
  RecommendationQueryResult,
  RecommendationResult,
  VoteResult,
  RecommendationTransactionData as AdapterRecommendationTransactionData,
  CreateRecommendationRequest,
  UpdateRecommendationRequest
} from './recommendation-adapters';

// ============================================================================
// STORAGE PROVIDER TYPES
// ============================================================================

// Storage provider interface
export type { StorageProvider, StorageOptions, StorageResult, RetrievalResult } from '../storage/storage-provider';

// ============================================================================
// CONFLICT RESOLUTION - EXPLICIT ALIASED EXPORTS
// ============================================================================

// Remove conflicting TangleReference exports - these don't exist in chain.ts
// Use proper aliasing from the modules that actually export them

// Resolve TransactionType conflicts
export type { 
  TransactionType as ChainTransactionType 
} from './chain';

// Token action types are handled in adapter section above with aliasing

// ============================================================================
// ADAPTER INTERFACE EXPORTS - SELECTED EXPORTS TO AVOID CONFLICTS
// ============================================================================

// Chain adapter - Use specific exports to avoid conflicts with imports above
export type { 
  AdapterType,
  AdapterConfig,
  RebasedConfig,
  EVMConfig
} from './chain';

// ============================================================================
// ENGINE AND API TYPES - STANDARDIZED INTERFACES
// ============================================================================

/**
 * Standard engine response wrapper
 */
export interface EngineResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  metadata?: Record<string, any>;
  timestamp?: number;
}

/**
 * Standard API result wrapper
 */
export interface ApiResult<T = any> {
  success: boolean;
  result?: T;
  error?: ApiError;
  pagination?: PaginationInfo;
}

/**
 * Pagination information
 */
export interface PaginationInfo {
  offset: number;
  limit: number;
  total: number;
  hasMore: boolean;
}

/**
 * API error structure
 */
export interface ApiError {
  code: string;
  message: string;
  details?: any;
  statusCode?: number;
}

/**
 * Chain error structure  
 */
export interface ChainError {
  type: 'connection' | 'transaction' | 'validation' | 'timeout';
  message: string;
  details?: any;
  retryable?: boolean;
}

/**
 * Generic result type with error handling
 */
export type Result<T, E = Error> = {
  success: true;
  data: T;
} | {
  success: false;
  error: E;
};

// ============================================================================
// SPECIALIZED ENGINE INTERFACES
// ============================================================================

/**
 * Recommendation engine interface
 */
export interface RecommendationEngineInterface {
  createRecommendation(data: any): Promise<EngineResponse>;
  updateRecommendation(id: string, data: any): Promise<EngineResponse>;
  deleteRecommendation(id: string): Promise<EngineResponse>;
  getRecommendation(id: string): Promise<EngineResponse>;
  queryRecommendations(filters: any): Promise<EngineResponse>;
}

/**
 * Token engine interface
 */
export interface TokenEngineInterface {
  transfer(from: string, to: string, amount: number): Promise<EngineResponse>;
  getBalance(address: string): Promise<EngineResponse>;
  claimRewards(userId: string): Promise<EngineResponse>;
  stakeTokens(userId: string, amount: number): Promise<EngineResponse>;
  unstakeTokens(userId: string, amount: number): Promise<EngineResponse>;
}

/**
 * Reputation engine interface
 */
export interface ReputationEngineInterface {
  updateReputation(userId: string, action: string, metadata?: any): Promise<EngineResponse>;
  getReputation(userId: string): Promise<EngineResponse>;
  calculateTrustScore(userId: string, targetId: string): Promise<EngineResponse>;
}

/**
 * Service engine interface
 */
export interface ServiceEngineInterface {
  registerService(data: any): Promise<EngineResponse>;
  updateService(id: string, data: any): Promise<EngineResponse>;
  getService(id: string): Promise<EngineResponse>;
  queryServices(filters: any): Promise<EngineResponse>;
}

/**
 * Governance engine interface
 */
export interface GovernanceEngineInterface {
  createProposal(data: any): Promise<EngineResponse>;
  vote(proposalId: string, userId: string, vote: 'yes' | 'no'): Promise<EngineResponse>;
  executeProposal(proposalId: string): Promise<EngineResponse>;
  getProposal(id: string): Promise<EngineResponse>;
}

// ============================================================================
// CUSTOM ERROR CLASSES
// ============================================================================

/**
 * Base OmeoneChain error class
 */
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
    
    // Maintain proper stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, OmeoneError);
    }
  }
}

/**
 * Chain-specific error class
 */
export class ChainOperationError extends OmeoneError {
  constructor(message: string, details?: any) {
    super(message, 'CHAIN_OPERATION_ERROR', 500, details);
    this.name = 'ChainOperationError';
  }
}

/**
 * Validation error class
 */
export class ValidationError extends OmeoneError {
  constructor(message: string, field?: string) {
    super(message, 'VALIDATION_ERROR', 400, { field });
    this.name = 'ValidationError';
  }
}

/**
 * Authentication error class
 */
export class AuthenticationError extends OmeoneError {
  constructor(message: string = 'Authentication required') {
    super(message, 'AUTHENTICATION_ERROR', 401);
    this.name = 'AuthenticationError';
  }
}

/**
 * Authorization error class
 */
export class AuthorizationError extends OmeoneError {
  constructor(message: string = 'Insufficient permissions') {
    super(message, 'AUTHORIZATION_ERROR', 403);
    this.name = 'AuthorizationError';
  }
}

/**
 * Not found error class
 */
export class NotFoundError extends OmeoneError {
  constructor(resource: string, id?: string) {
    const message = id ? `${resource} with id ${id} not found` : `${resource} not found`;
    super(message, 'NOT_FOUND_ERROR', 404, { resource, id });
    this.name = 'NotFoundError';
  }
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

/**
 * Make all properties optional
 */
export type PartialDeep<T> = {
  [P in keyof T]?: T[P] extends object ? PartialDeep<T[P]> : T[P];
};

/**
 * Pick specific fields and make them required
 */
export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>;

/**
 * Omit fields and make remaining fields partial
 */
export type PartialExcept<T, K extends keyof T> = Partial<T> & Pick<T, K>;

/**
 * Extract promise type
 */
export type Awaited<T> = T extends Promise<infer U> ? U : T;

/**
 * Database entity base interface
 */
export interface BaseEntity {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  version?: number;
}

/**
 * Audit trail interface
 */
export interface AuditTrail {
  action: string;
  userId: string;
  timestamp: Date;
  details?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Timestamped interface
 */
export interface Timestamped {
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Versioned interface
 */
export interface Versioned {
  version: number;
  lastModified: Date;
  modifiedBy: string;
}

// ============================================================================
// TYPE GUARDS
// ============================================================================

/**
 * Type guard for EngineResponse
 */
export function isEngineResponse<T>(obj: any): obj is EngineResponse<T> {
  return obj && typeof obj === 'object' && typeof obj.success === 'boolean';
}

/**
 * Type guard for ApiResult
 */
export function isApiResult<T>(obj: any): obj is ApiResult<T> {
  return obj && typeof obj === 'object' && typeof obj.success === 'boolean';
}

/**
 * Type guard for Result
 */
export function isResult<T, E>(obj: any): obj is Result<T, E> {
  return obj && typeof obj === 'object' && typeof obj.success === 'boolean';
}

/**
 * Type guard for OmeoneError
 */
export function isOmeoneError(obj: any): obj is OmeoneError {
  return obj instanceof Error && 'code' in obj && 'statusCode' in obj;
}

// ============================================================================
// CONSTANTS AND ENUMS
// ============================================================================

/**
 * Standard HTTP status codes
 */
export enum HttpStatusCode {
  OK = 200,
  CREATED = 201,
  ACCEPTED = 202,
  NO_CONTENT = 204,
  BAD_REQUEST = 400,
  UNAUTHORIZED = 401,
  FORBIDDEN = 403,
  NOT_FOUND = 404,
  CONFLICT = 409,
  UNPROCESSABLE_ENTITY = 422,
  INTERNAL_SERVER_ERROR = 500,
  BAD_GATEWAY = 502,
  SERVICE_UNAVAILABLE = 503
}

/**
 * Standard error codes
 */
export enum ErrorCode {
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  AUTHENTICATION_ERROR = 'AUTHENTICATION_ERROR',
  AUTHORIZATION_ERROR = 'AUTHORIZATION_ERROR',
  NOT_FOUND_ERROR = 'NOT_FOUND_ERROR',
  CHAIN_OPERATION_ERROR = 'CHAIN_OPERATION_ERROR',
  STORAGE_ERROR = 'STORAGE_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR',
  INTERNAL_ERROR = 'INTERNAL_ERROR'
}

// ============================================================================
// BACKWARDS COMPATIBILITY - LEGACY EXPORTS
// ============================================================================

// Legacy common types export for compatibility
export type { ApiError as CommonApiError, ChainError as CommonChainError, Result as CommonResult };

// Legacy reputation types - inline definitions to avoid import conflicts
export interface LegacyReputationTransactionData {
  userId: string;
  action: 'upvote' | 'downvote' | 'save' | 'follow' | 'unfollow';
  targetId: string;
  targetType: 'recommendation' | 'user' | 'list';
  weight: number;
  timestamp: number;
  metadata?: Record<string, any>;
}

export interface LegacyTokenTransactionData {
  from: string;
  to: string;
  amount: number;
  tokenType: 'TOK' | 'REWARD';
  reason: string;
  timestamp: number;
  metadata?: Record<string, any>;
}