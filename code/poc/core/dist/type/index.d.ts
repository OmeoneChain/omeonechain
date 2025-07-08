export type { ChainAdapter, ChainTransaction, ChainState, ChainEvent, Transaction, TransactionResult, StateQuery, QueryResult, EventFilter, Event, NetworkInfo, TokenBalance, ObjectQuery } from './chain';
export type { Recommendation, Location, Content, MediaItem, RecommendationActionType } from './recommendation';
type ReputationEngine = any;
type UserProfile = any;
type Service = any;
type ServiceEngine = any;
type Token = any;
type TokenReward = any;
export type { ReputationEngine, UserProfile, Service, ServiceEngine, Token, TokenReward };
export type { TokenTransactionData as AdapterTokenTransactionData, TokenBalanceDetailed, TokenTransferRequest, TokenRewardClaim, StakingInfo, TokenActionType as AdapterTokenActionType } from './token-adapters';
export type { ReputationScore, UserReputation as AdapterUserReputation, UserVerification, UserActivity, SocialMetrics, ReputationAdapter, TrustRelationship } from './reputation-adapters';
export type { RecommendationAdapter, RecommendationQuery, RecommendationQueryResult, RecommendationResult, VoteResult, RecommendationTransactionData as AdapterRecommendationTransactionData, CreateRecommendationRequest, UpdateRecommendationRequest } from './recommendation-adapters';
export type { StorageProvider, StorageOptions, StorageResult, RetrievalResult } from '../storage/storage-provider';
export type { TransactionType as ChainTransactionType } from './chain';
export type { AdapterType, AdapterConfig, RebasedConfig, EVMConfig } from './chain';
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
/**
 * Base OmeoneChain error class
 */
export declare class OmeoneError extends Error {
    readonly code: string;
    readonly statusCode: number;
    readonly details?: any;
    constructor(message: string, code: string, statusCode?: number, details?: any);
}
/**
 * Chain-specific error class
 */
export declare class ChainOperationError extends OmeoneError {
    constructor(message: string, details?: any);
}
/**
 * Validation error class
 */
export declare class ValidationError extends OmeoneError {
    constructor(message: string, field?: string);
}
/**
 * Authentication error class
 */
export declare class AuthenticationError extends OmeoneError {
    constructor(message?: string);
}
/**
 * Authorization error class
 */
export declare class AuthorizationError extends OmeoneError {
    constructor(message?: string);
}
/**
 * Not found error class
 */
export declare class NotFoundError extends OmeoneError {
    constructor(resource: string, id?: string);
}
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
/**
 * Type guard for EngineResponse
 */
export declare function isEngineResponse<T>(obj: any): obj is EngineResponse<T>;
/**
 * Type guard for ApiResult
 */
export declare function isApiResult<T>(obj: any): obj is ApiResult<T>;
/**
 * Type guard for Result
 */
export declare function isResult<T, E>(obj: any): obj is Result<T, E>;
/**
 * Type guard for OmeoneError
 */
export declare function isOmeoneError(obj: any): obj is OmeoneError;
/**
 * Standard HTTP status codes
 */
export declare enum HttpStatusCode {
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
export declare enum ErrorCode {
    VALIDATION_ERROR = "VALIDATION_ERROR",
    AUTHENTICATION_ERROR = "AUTHENTICATION_ERROR",
    AUTHORIZATION_ERROR = "AUTHORIZATION_ERROR",
    NOT_FOUND_ERROR = "NOT_FOUND_ERROR",
    CHAIN_OPERATION_ERROR = "CHAIN_OPERATION_ERROR",
    STORAGE_ERROR = "STORAGE_ERROR",
    NETWORK_ERROR = "NETWORK_ERROR",
    INTERNAL_ERROR = "INTERNAL_ERROR"
}
export type { ApiError as CommonApiError, ChainError as CommonChainError, Result as CommonResult };
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
