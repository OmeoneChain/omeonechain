/**
 * Adapter-specific recommendation types for OmeoneChain
 *
 * This file provides mappings and utility functions to convert between
 * the core recommendation types and the formats needed by various chain adapters.
 */
import { Recommendation, Location, Content, TangleReference, RecommendationActionType } from './recommendation';
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
        radius: number;
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
export declare const recommendationActionMap: {
    create: string;
    update: string;
    upvote: string;
    downvote: string;
    delete: string;
};
/**
 * Transforms a full recommendation to transaction data format
 * @param recommendation Full recommendation object
 * @returns Simplified recommendation data for transaction
 */
export declare function toTransactionData(recommendation: Recommendation): RecommendationTransactionData;
/**
 * Determines the action detail based on the recommendation action type
 * @param actionType Recommendation action type
 * @returns Action detail string for chain adapter
 */
export declare function getActionDetail(actionType: RecommendationActionType): string | undefined;
/**
 * Formats IPFS content references for chain submission
 * @param content Recommendation content
 * @returns Formatted IPFS references
 */
export declare function formatContentReferences(content: Content): {
    contentCid: string;
    mediaCids: string[];
};
/**
 * Upload media files with proper type safety
 * @param media Array of media files to upload
 * @returns Array of IPFS hashes for uploaded media
 */
export declare function uploadMedia(media: MediaUpload[]): Promise<string[]>;
/**
 * Validate media upload parameters
 * @param media Media upload object to validate
 * @returns True if valid, throws error if invalid
 */
export declare function validateMediaUpload(media: MediaUpload): boolean;
/**
 * Process multiple media uploads with validation
 * @param mediaList Array of media uploads to process
 * @returns Promise resolving to array of upload results
 */
export declare function processMediaUploads(mediaList: MediaUpload[]): Promise<{
    successful: string[];
    failed: {
        media: MediaUpload;
        error: string;
    }[];
}>;
/**
 * Validate recommendation data
 * @param data Recommendation data to validate
 * @returns Validation result
 */
export declare function validateRecommendationData(data: RecommendationTransactionData): RecommendationValidation;
/**
 * Calculate trust score for recommendation
 * @param recommendation Recommendation data
 * @param socialSignals Social interaction data
 * @returns Trust score calculation
 */
export declare function calculateTrustScore(recommendation: RecommendationTransactionData, socialSignals: Array<{
    userId: string;
    weight: number;
    distance: number;
}>): TrustScoreData;
/**
 * Type guard for RecommendationTransactionData
 */
export declare function isRecommendationTransactionData(data: any): data is RecommendationTransactionData;
