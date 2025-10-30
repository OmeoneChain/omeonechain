// src/types/common.ts - Standardized error types and shared utilities
// Updated for Trust Score 2.0 with additional common types

// ============================================
// ERROR TYPES (EXISTING)
// ============================================

export interface ApiError {
  message: string;
  code: string;
  status?: number;
  details?: any;
}

export interface ChainError extends ApiError {
  chainId?: string;
  transactionId?: string;
  blockHeight?: number;
}

export interface ValidationError extends ApiError {
  field?: string;
  value?: any;
  constraint?: string;
}

// Result wrapper type for consistent error handling
export type Result<T, E = ApiError> = {
  success: true;
  data: T;
} | {
  success: false;
  error: E;
};

// Helper functions for error handling
export function createError(message: string, code: string, status?: number): ApiError {
  return { message, code, status };
}

export function createSuccess<T>(data: T): Result<T> {
  return { success: true, data };
}

export function createFailure<E = ApiError>(error: E): Result<never, E> {
  return { success: false, error };
}

// Type guards
export function isApiError(obj: any): obj is ApiError {
  return obj && typeof obj.message === 'string' && typeof obj.code === 'string';
}

export function isResult<T>(obj: any): obj is Result<T> {
  return obj && typeof obj.success === 'boolean';
}

// ============================================
// TRUST SCORE 2.0 COMMON TYPES
// ============================================

/**
 * Pagination parameters
 * Used across all list endpoints
 */
export interface PaginationParams {
  offset: number;
  limit: number;
}

/**
 * Pagination metadata in responses
 */
export interface PaginationMeta {
  offset: number;
  limit: number;
  total: number;
  hasMore: boolean;
}

/**
 * Sort parameters
 */
export interface SortParams {
  field: string;
  direction: 'asc' | 'desc';
}

/**
 * Geographic coordinates
 */
export interface Coordinates {
  latitude: number;
  longitude: number;
}

/**
 * Location with optional radius for proximity searches
 */
export interface LocationQuery extends Coordinates {
  radiusKm: number;
}

/**
 * Date range filter
 */
export interface DateRange {
  start: string; // ISO8601
  end: string;   // ISO8601
}

/**
 * Numeric range filter
 */
export interface NumericRange {
  min: number;
  max: number;
}

/**
 * Price range using standard symbols
 */
export type PriceRange = '$' | '$$' | '$$$' | '$$$$';

/**
 * Timestamp with timezone
 */
export type Timestamp = string; // ISO8601 format

/**
 * UUID string type alias for clarity
 */
export type UUID = string;

/**
 * IPFS hash type alias
 */
export type IPFSHash = string;

/**
 * Blockchain transaction ID type alias
 */
export type TransactionId = string;

// ============================================
// USER PROFILE COMMON TYPES
// ============================================

/**
 * Basic user profile information
 * Used across the application for user references
 */
export interface UserProfile {
  id: UUID;
  username: string;
  display_name?: string;
  avatar_url?: string;
  wallet_address?: string;
  verification_level?: string;
  reputation_score?: number;
  followers_count?: number;
  following_count?: number;
}

/**
 * Minimal user reference (for efficiency)
 */
export interface UserReference {
  id: UUID;
  username: string;
  display_name?: string;
  avatar_url?: string;
}

// ============================================
// ENGAGEMENT METRICS
// ============================================

/**
 * Engagement metrics for content
 */
export interface EngagementMetrics {
  likes_count: number;
  saves_count: number;
  comments_count: number;
  shares_count: number;
  views_count?: number;
}

/**
 * User's engagement state with a piece of content
 */
export interface UserEngagement {
  has_liked: boolean;
  has_saved: boolean;
  has_commented: boolean;
  has_shared: boolean;
}

// ============================================
// SEARCH AND FILTER TYPES
// ============================================

/**
 * Text search parameters
 */
export interface TextSearch {
  query: string;
  fields?: string[]; // Which fields to search in
}

/**
 * Common filter base
 * Extended by specific entity filters
 */
export interface BaseFilter {
  pagination?: PaginationParams;
  sort?: SortParams;
  text_search?: TextSearch;
}

// ============================================
// CONTENT TYPES
// ============================================

/**
 * Media types supported
 */
export enum MediaType {
  IMAGE = 'image',
  VIDEO = 'video',
  AUDIO = 'audio'
}

/**
 * Content visibility levels
 */
export enum VisibilityLevel {
  PUBLIC = 'public',
  FOLLOWERS_ONLY = 'followers_only',
  MUTUAL_FOLLOWS = 'mutual_follows',
  PRIVATE = 'private'
}

/**
 * Content status
 */
export enum ContentStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  ARCHIVED = 'archived',
  DELETED = 'deleted'
}

// ============================================
// BLOCKCHAIN TYPES
// ============================================

/**
 * Blockchain transaction status
 */
export enum BlockchainStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  FAILED = 'failed'
}

/**
 * Smart contract interaction result
 */
export interface ContractInteraction {
  transaction_id: TransactionId;
  status: BlockchainStatus;
  block_height?: number;
  gas_used?: number;
  error?: string;
}

// ============================================
// TOKEN ECONOMICS
// ============================================

/**
 * Token reward breakdown
 */
export interface TokenRewards {
  base_reward: number;
  social_reward: number;
  quality_bonus: number;
  total: number;
}

/**
 * Token transaction types
 */
export enum TokenTransactionType {
  EARN = 'earn',
  SPEND = 'spend',
  STAKE = 'stake',
  UNSTAKE = 'unstake',
  TRANSFER = 'transfer'
}

/**
 * Token transaction record
 */
export interface TokenTransaction {
  id: UUID;
  user_id: UUID;
  type: TokenTransactionType;
  amount: number;
  balance_after: number;
  description: string;
  timestamp: Timestamp;
  related_entity_id?: UUID;
  related_entity_type?: string;
}

// ============================================
// TRUST SCORE 2.0 SPECIFIC TYPES
// ============================================

/**
 * Trust Score component weights
 */
export interface TrustScoreWeights {
  social: number;        // Default: 0.3
  taste: number;         // Default: 0.5
  contextual: number;    // Default: 0.2
}

/**
 * Confidence level enumeration
 */
export enum ConfidenceLevel {
  VERY_LOW = 'very_low',     // < 0.2
  LOW = 'low',               // 0.2 - 0.4
  MEDIUM = 'medium',         // 0.4 - 0.6
  HIGH = 'high',             // 0.6 - 0.8
  VERY_HIGH = 'very_high'    // > 0.8
}

/**
 * Helper to convert numeric confidence to level
 */
export function getConfidenceLevel(score: number): ConfidenceLevel {
  if (score < 0.2) return ConfidenceLevel.VERY_LOW;
  if (score < 0.4) return ConfidenceLevel.LOW;
  if (score < 0.6) return ConfidenceLevel.MEDIUM;
  if (score < 0.8) return ConfidenceLevel.HIGH;
  return ConfidenceLevel.VERY_HIGH;
}

/**
 * Calculation metadata
 * Used to track when calculations were performed and with what algorithm version
 */
export interface CalculationMetadata {
  calculated_at: Timestamp;
  algorithm_version: string;
  confidence_level: number;
  data_points_used: number;
}

// ============================================
// API RESPONSE WRAPPERS
// ============================================

/**
 * Standard paginated list response
 */
export interface PaginatedResponse<T> {
  data: T[];
  pagination: PaginationMeta;
}

/**
 * Response with metadata
 */
export interface ResponseWithMetadata<T> {
  data: T;
  metadata: Record<string, any>;
}

/**
 * Batch operation result
 */
export interface BatchResult<T> {
  successful: T[];
  failed: Array<{
    item: T;
    error: ApiError;
  }>;
  summary: {
    total: number;
    succeeded: number;
    failed: number;
  };
}

// ============================================
// VALIDATION HELPERS
// ============================================

/**
 * Validate rating is in 0-10 range
 */
export function isValidRating(rating: number): boolean {
  return rating >= 0 && rating <= 10;
}

/**
 * Validate score is in 0-1 range
 */
export function isValidScore(score: number): boolean {
  return score >= 0 && score <= 1;
}

/**
 * Validate UUID format
 */
export function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

/**
 * Validate IPFS hash format (basic check)
 */
export function isValidIPFSHash(hash: string): boolean {
  return hash.startsWith('Qm') && hash.length === 46;
}

/**
 * Validate ISO8601 timestamp
 */
export function isValidTimestamp(timestamp: string): boolean {
  const date = new Date(timestamp);
  return !isNaN(date.getTime());
}

// ============================================
// UTILITY TYPES
// ============================================

/**
 * Make specific properties optional
 */
export type PartialBy<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

/**
 * Make specific properties required
 */
export type RequiredBy<T, K extends keyof T> = Omit<T, K> & Required<Pick<T, K>>;

/**
 * Extract keys of T where value is of type V
 */
export type KeysOfType<T, V> = {
  [K in keyof T]: T[K] extends V ? K : never;
}[keyof T];

/**
 * Async result type for promises
 */
export type AsyncResult<T, E = ApiError> = Promise<Result<T, E>>;

// ============================================
// CONSTANTS
// ============================================

/**
 * Default pagination limits
 */
export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

/**
 * Trust Score 2.0 default weights
 */
export const DEFAULT_TRUST_WEIGHTS: TrustScoreWeights = {
  social: 0.3,
  taste: 0.5,
  contextual: 0.2
};

/**
 * Minimum data points for reliable taste alignment
 */
export const MIN_TASTE_ALIGNMENT_DATAPOINTS = 3;

/**
 * Minimum trust score for token rewards
 */
export const MIN_TRUST_SCORE_FOR_REWARDS = 0.25;

/**
 * Rating scale bounds
 */
export const RATING_MIN = 0;
export const RATING_MAX = 10;