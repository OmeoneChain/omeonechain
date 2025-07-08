/**
 * Adapter-specific recommendation types for OmeoneChain
 * 
 * This file provides mappings and utility functions to convert between
 * the core recommendation types and the formats needed by various chain adapters.
 */

// Import core recommendation types
import { 
  Recommendation, 
  Location, 
  Content, 
  MediaItem, 
  TangleReference,
  RecommendationActionType
} from './recommendation';

/**
 * Recommendation adapter interface
 */
export interface RecommendationAdapter {
  /**
   * Create a new recommendation
   */
  createRecommendation(data: RecommendationTransactionData): Promise<RecommendationResult>;
  
  /**
   * Update an existing recommendation
   */
  updateRecommendation(id: string, data: Partial<RecommendationTransactionData>): Promise<RecommendationResult>;
  
  /**
   * Vote on a recommendation
   */
  voteOnRecommendation(recommendationId: string, userId: string, voteType: 'upvote' | 'downvote'): Promise<VoteResult>;
  
  /**
   * Get recommendation by ID
   */
  getRecommendation(id: string): Promise<Recommendation | null>;
  
  /**
   * Query recommendations with filters
   */
  queryRecommendations(filters: RecommendationQuery): Promise<RecommendationQueryResult>;
  
  /**
   * Delete a recommendation
   */
  deleteRecommendation(id: string, userId: string): Promise<boolean>;
}

/**
 * Recommendation query parameters
 */
export interface RecommendationQuery {
  /**
   * Filter by category
   */
  category?: string;
  
  /**
   * Filter by location (with radius)
   */
  location?: {
    lat: number;
    lng: number;
    radius: number; // in kilometers
  };
  
  /**
   * Filter by author
   */
  author?: string;
  
  /**
   * Filter by minimum rating
   */
  minRating?: number;
  
  /**
   * Filter by tags
   */
  tags?: string[];
  
  /**
   * Filter by verification status
   */
  verified?: boolean;
  
  /**
   * Date range filter
   */
  dateRange?: {
    from: string;
    to: string;
  };
  
  /**
   * Sorting options
   */
  sort?: {
    field: 'rating' | 'timestamp' | 'votes' | 'relevance';
    direction: 'asc' | 'desc';
  };
  
  /**
   * Pagination
   */
  pagination?: {
    offset: number;
    limit: number;
  };
}

/**
 * Recommendation query result
 */
export interface RecommendationQueryResult {
  /**
   * Found recommendations
   */
  recommendations: Recommendation[];
  
  /**
   * Total count (for pagination)
   */
  total: number;
  
  /**
   * Pagination info
   */
  pagination: {
    offset: number;
    limit: number;
    hasMore: boolean;
  };
}

/**
 * Recommendation operation result
 */
export interface RecommendationResult {
  /**
   * Success status
   */
  success: boolean;
  
  /**
   * Recommendation ID
   */
  recommendationId: string;
  
  /**
   * Transaction hash
   */
  transactionHash?: string;
  
  /**
   * Error message if failed
   */
  error?: string;
  
  /**
   * Additional metadata
   */
  metadata?: Record<string, any>;
}

/**
 * Vote operation result
 */
export interface VoteResult {
  /**
   * Success status
   */
  success: boolean;
  
  /**
   * Vote ID
   */
  voteId: string;
  
  /**
   * Updated vote counts
   */
  votes?: {
    upvotes: number;
    downvotes: number;
    total: number;
  };
  
  /**
   * Transaction hash
   */
  transactionHash?: string;
  
  /**
   * Error message if failed
   */
  error?: string;
}

/**
 * Simplified recommendation format for chain transactions
 * Used when submitting recommendations to blockchain adapters
 */
export interface RecommendationTransactionData {
  /**
   * Unique identifier for the recommendation (optional for new recommendations)
   */
  id?: string;
  
  /**
   * Public key or identifier of the author
   */
  author: string;
  
  /**
   * Identifier of the service being recommended
   */
  serviceId: string;
  
  /**
   * Service category (e.g., "restaurant", "hotel")
   */
  category: string;
  
  /**
   * Geographic location of the recommendation
   */
  location: Location;
  
  /**
   * Rating on a 1-5 scale
   */
  rating: number;
  
  /**
   * Hash of the content for verification
   */
  contentHash: string;
  
  /**
   * Optional ISO8601 timestamp of creation
   */
  timestamp?: string;
  
  /**
   * Optional array of relevant tags
   */
  tags?: string[];
  
  /**
   * Optional verification status
   */
  verificationStatus?: string;
  
  /**
   * Optional chain reference data
   */
  tangle?: TangleReference;
  
  /**
   * Optional chain identifier
   */
  chainID?: string;
}

/**
 * Media upload structure
 */
export interface MediaUpload {
  file: File | Buffer;
  filename: string;
  mimetype: string;
  size: number;
}

/**
 * Recommendation content for creation
 */
export interface RecommendationContentData {
  /**
   * Recommendation title
   */
  title: string;
  
  /**
   * Recommendation description
   */
  description: string;
  
  /**
   * Rich text content
   */
  content?: string;
  
  /**
   * Media attachments
   */
  media?: MediaUpload[];
  
  /**
   * Tags for categorization
   */
  tags?: string[];
  
  /**
   * Additional metadata
   */
  metadata?: Record<string, any>;
}

/**
 * Recommendation creation request
 */
export interface CreateRecommendationRequest {
  /**
   * Service being recommended
   */
  serviceId: string;
  
  /**
   * Recommendation category
   */
  category: string;
  
  /**
   * Location information
   */
  location: Location;
  
  /**
   * Rating (1-5)
   */
  rating: number;
  
  /**
   * Content data
   */
  content: RecommendationContentData;
  
  /**
   * Author information
   */
  author: string;
  
  /**
   * Verification status
   */
  verificationStatus?: 'pending' | 'verified' | 'rejected';
}

/**
 * Recommendation update request
 */
export interface UpdateRecommendationRequest {
  /**
   * Recommendation ID to update
   */
  id: string;
  
  /**
   * Updated content (partial)
   */
  content?: Partial<RecommendationContentData>;
  
  /**
   * Updated rating
   */
  rating?: number;
  
  /**
   * Updated tags
   */
  tags?: string[];
  
  /**
   * Updated verification status
   */
  verificationStatus?: 'pending' | 'verified' | 'rejected';
  
  /**
   * Update reason
   */
  updateReason?: string;
}

/**
 * Vote transaction data
 */
export interface VoteTransactionData {
  /**
   * Recommendation being voted on
   */
  recommendationId: string;
  
  /**
   * User casting the vote
   */
  userId: string;
  
  /**
   * Type of vote
   */
  voteType: 'upvote' | 'downvote';
  
  /**
   * Vote weight (based on user reputation)
   */
  weight?: number;
  
  /**
   * Vote timestamp
   */
  timestamp: number;
  
  /**
   * Social distance (for trust calculations)
   */
  socialDistance?: number;
}

/**
 * Content processing result
 */
export interface ContentProcessingResult {
  /**
   * Generated content hash
   */
  contentHash: string;
  
  /**
   * IPFS content ID
   */
  contentCid: string;
  
  /**
   * Media IPFS IDs
   */
  mediaCids: string[];
  
  /**
   * Processing success status
   */
  success: boolean;
  
  /**
   * Error message if failed
   */
  error?: string;
}

/**
 * Recommendation validation result
 */
export interface RecommendationValidation {
  /**
   * Validation success
   */
  isValid: boolean;
  
  /**
   * Validation errors
   */
  errors: string[];
  
  /**
   * Validation warnings
   */
  warnings: string[];
  
  /**
   * Spam detection result
   */
  spamScore: number;
  
  /**
   * Content quality score
   */
  qualityScore: number;
}

/**
 * Trust score calculation data
 */
export interface TrustScoreData {
  /**
   * Base recommendation score
   */
  baseScore: number;
  
  /**
   * Social trust weights
   */
  socialWeights: Array<{
    userId: string;
    weight: number;
    distance: number;
  }>;
  
  /**
   * Author reputation
   */
  authorReputation: number;
  
  /**
   * Content quality metrics
   */
  contentMetrics: {
    length: number;
    mediaCount: number;
    tagRelevance: number;
  };
  
  /**
   * Calculated trust score
   */
  trustScore: number;
}

/**
 * Mapping for recommendation action types between systems
 */
export const recommendationActionMap = {
  [RecommendationActionType.CREATE]: 'create',
  [RecommendationActionType.UPDATE]: 'update',
  [RecommendationActionType.UPVOTE]: 'vote',
  [RecommendationActionType.DOWNVOTE]: 'vote',
  [RecommendationActionType.DELETE]: 'delete'
};

/**
 * Transforms a full recommendation to transaction data format
 * @param recommendation Full recommendation object
 * @returns Simplified recommendation data for transaction
 */
export function toTransactionData(recommendation: Recommendation): RecommendationTransactionData {
  return {
    id: recommendation.id,
    author: recommendation.author,
    serviceId: recommendation.serviceId,
    category: recommendation.category,
    location: recommendation.location,
    rating: recommendation.rating,
    contentHash: recommendation.contentHash,
    timestamp: recommendation.timestamp,
    tags: recommendation.tags,
    verificationStatus: recommendation.verificationStatus,
    tangle: recommendation.tangle,
    chainID: recommendation.chainID
  };
}

/**
 * Determines the action detail based on the recommendation action type
 * @param actionType Recommendation action type
 * @returns Action detail string for chain adapter
 */
export function getActionDetail(actionType: RecommendationActionType): string | undefined {
  switch (actionType) {
    case RecommendationActionType.UPVOTE:
      return 'upvote';
    case RecommendationActionType.DOWNVOTE:
      return 'downvote';
    default:
      return undefined;
  }
}

/**
 * Formats IPFS content references for chain submission
 * @param content Recommendation content
 * @returns Formatted IPFS references
 */
export function formatContentReferences(content: Content): { contentCid: string, mediaCids: string[] } {
  // Generate content hash from available content properties
  let contentText = '';
  if ('text' in content && content.text) {
    // Conservative fix: Type assertion to string
    contentText = (content.text as any) || '';
  } else if ('description' in content && content.description) {
    // Conservative fix: Type assertion to string  
    contentText = (content.description as any) || '';
  } else if ('title' in content && content.title) {
    contentText = (content.title as any) || '';
  }
  
  return {
    // Conservative fix: Ensure string return types
    contentCid: contentText ? generateContentHash(contentText) : generateContentHash('empty'),
    mediaCids: content.media ? content.media.map(media => (media as any).ipfsHash || 'fallback-hash') : []
  };
}

/**
 * Upload media files with proper type safety
 * @param media Array of media files to upload
 * @returns Array of IPFS hashes for uploaded media
 */
export async function uploadMedia(media: MediaUpload[]): Promise<string[]> {
  // Implementation would handle actual media upload to IPFS
  // This is a placeholder that returns mock hashes
  return media.map((file, index) => `Qm${index.toString().padStart(44, '0')}`);
}

/**
 * Validate media upload parameters
 * @param media Media upload object to validate
 * @returns True if valid, throws error if invalid
 */
export function validateMediaUpload(media: MediaUpload): boolean {
  if (!media.file) {
    throw new Error('Media file is required');
  }
  
  if (!media.filename || media.filename.trim() === '') {
    throw new Error('Media filename is required');
  }
  
  if (!media.mimetype || media.mimetype.trim() === '') {
    throw new Error('Media mimetype is required');
  }
  
  if (typeof media.size !== 'number' || media.size <= 0) {
    throw new Error('Media size must be a positive number');
  }
  
  return true;
}

/**
 * Process multiple media uploads with validation
 * @param mediaList Array of media uploads to process
 * @returns Promise resolving to array of upload results
 */
export async function processMediaUploads(mediaList: MediaUpload[]): Promise<{
  successful: string[];
  failed: { media: MediaUpload; error: string }[];
}> {
  const successful: string[] = [];
  const failed: { media: MediaUpload; error: string }[] = [];
  
  for (const media of mediaList) {
    try {
      validateMediaUpload(media);
      const hashes = await uploadMedia([media]);
      successful.push(...hashes);
    } catch (error) {
      failed.push({
        media,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
  
  return { successful, failed };
}

/**
 * Validate recommendation data
 * @param data Recommendation data to validate
 * @returns Validation result
 */
export function validateRecommendationData(data: RecommendationTransactionData): RecommendationValidation {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Required field validation
  if (!data.author) errors.push('Author is required');
  if (!data.serviceId) errors.push('Service ID is required');
  if (!data.category) errors.push('Category is required');
  if (!data.location) errors.push('Location is required');
  if (typeof data.rating !== 'number' || data.rating < 1 || data.rating > 5) {
    errors.push('Rating must be between 1 and 5');
  }
  if (!data.contentHash) errors.push('Content hash is required');
  
  // Content quality assessment
  const qualityScore = calculateQualityScore(data);
  const spamScore = calculateSpamScore(data);
  
  if (qualityScore < 0.3) warnings.push('Content quality appears low');
  if (spamScore > 0.7) errors.push('Content appears to be spam');
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    spamScore,
    qualityScore
  };
}

/**
 * Calculate trust score for recommendation
 * @param recommendation Recommendation data
 * @param socialSignals Social interaction data
 * @returns Trust score calculation
 */
export function calculateTrustScore(
  recommendation: RecommendationTransactionData,
  socialSignals: Array<{ userId: string; weight: number; distance: number }>
): TrustScoreData {
  const baseScore = recommendation.rating / 5.0; // Normalize to 0-1
  
  const socialWeights = socialSignals.map(signal => ({
    userId: signal.userId,
    weight: signal.distance === 1 ? signal.weight * 0.75 : signal.weight * 0.25,
    distance: signal.distance
  }));
  
  const socialTrustScore = socialWeights.reduce((sum, w) => sum + w.weight, 0);
  const trustScore = Math.min(1.0, (baseScore + socialTrustScore) / 2);
  
  return {
    baseScore,
    socialWeights,
    authorReputation: 0.5, // Would be calculated from user data
    contentMetrics: {
      length: recommendation.contentHash.length,
      mediaCount: 0, // Would be calculated from content
      tagRelevance: (recommendation.tags?.length || 0) / 10
    },
    trustScore
  };
}

/**
 * Generate content hash (placeholder implementation)
 */
function generateContentHash(content: string): string {
  // This would use actual hashing algorithm
  return `Qm${content.length.toString().padStart(44, '0')}`;
}

/**
 * Calculate content quality score (placeholder implementation)
 */
function calculateQualityScore(data: RecommendationTransactionData): number {
  let score = 0.5; // Base score
  
  // Length bonus
  if (data.contentHash.length > 10) score += 0.2;
  
  // Tags bonus
  if (data.tags && data.tags.length > 0) score += 0.1;
  
  // Rating consistency
  if (data.rating >= 3 && data.rating <= 5) score += 0.2;
  
  return Math.min(1.0, score);
}

/**
 * Calculate spam score (placeholder implementation)
 */
function calculateSpamScore(data: RecommendationTransactionData): number {
  let spamScore = 0;
  
  // Very short content
  if (data.contentHash.length < 5) spamScore += 0.3;
  
  // Extreme ratings
  if (data.rating === 1 || data.rating === 5) spamScore += 0.1;
  
  // No tags
  if (!data.tags || data.tags.length === 0) spamScore += 0.1;
  
  return Math.min(1.0, spamScore);
}

/**
 * Type guard for RecommendationTransactionData
 */
export function isRecommendationTransactionData(data: any): data is RecommendationTransactionData {
  return data &&
    typeof data.author === 'string' &&
    typeof data.serviceId === 'string' &&
    typeof data.category === 'string' &&
    data.location &&
    typeof data.rating === 'number' &&
    typeof data.contentHash === 'string';
}