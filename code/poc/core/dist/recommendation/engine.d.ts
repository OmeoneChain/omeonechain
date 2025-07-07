/**
 * Recommendation Engine
 *
 * Core business logic for processing, storing, and retrieving user recommendations
 * Based on Technical Specifications A.3.1
 */
import { ChainAdapter } from '../type/chain';
import { StorageProvider } from '../storage/storage-provider';
import { Recommendation, RecommendationFilter, RecommendationAction } from '../type/recommendation';
/**
 * Options for the recommendation engine
 */
export interface RecommendationEngineOptions {
    /**
     * Batch size for bulk operations
     */
    batchSize?: number;
    /**
     * Enable content validation
     */
    validateContent?: boolean;
    /**
     * Enable spam detection
     */
    spamDetection?: boolean;
    /**
     * Chain ID
     */
    chainId?: string;
    /**
     * Sponsor wallet for fee payments
     */
    sponsorWallet?: string;
}
/**
 * Implementation of the Recommendation Engine
 * Handles processing, storing, and retrieving recommendations
 */
export declare class RecommendationEngine {
    private adapter;
    private storage;
    private options;
    private chainId;
    /**
     * Create a new RecommendationEngine instance
     *
     * @param adapter Chain adapter for blockchain interactions
     * @param storage Storage provider for off-chain content
     * @param options Engine options
     */
    constructor(adapter: ChainAdapter, storage: StorageProvider, options?: RecommendationEngineOptions);
    /**
     * Initialize the engine
     *
     * @returns Promise resolving when initialized
     */
    initialize(): Promise<void>;
    /**
     * Submit a new recommendation
     *
     * @param author Author's public key or identifier
     * @param recommendation Recommendation content
     * @returns Submitted recommendation with ID and metadata
     */
    submitRecommendation(author: string, recommendation: Omit<Recommendation, 'id' | 'author' | 'timestamp' | 'contentHash' | 'tangle' | 'chainID'>): Promise<Recommendation>;
    /**
     * Get recommendations based on filter criteria
     *
     * @param filter Filter criteria
     * @returns Recommendations matching the filter
     */
    getRecommendations(filter: RecommendationFilter): Promise<{
        recommendations: Recommendation[];
        total: number;
        pagination?: {
            offset: number;
            limit: number;
            hasMore: boolean;
        };
    }>;
    /**
     * Vote on a recommendation (upvote or downvote)
     *
     * @param userId User's public key or identifier
     * @param recommendationId ID of the recommendation to vote on
     * @param isUpvote Whether the vote is an upvote (true) or downvote (false)
     * @returns Result of the vote action
     */
    voteOnRecommendation(userId: string, recommendationId: string, isUpvote: boolean): Promise<{
        success: boolean;
        action: RecommendationAction;
    }>;
    /**
     * Update an existing recommendation
     *
     * @param author Author's public key or identifier
     * @param recommendationId ID of the recommendation to update
     * @param updates Fields to update
     * @returns Updated recommendation
     */
    updateRecommendation(author: string, recommendationId: string, updates: Partial<Omit<Recommendation, 'id' | 'author' | 'timestamp' | 'contentHash' | 'tangle' | 'chainID'>>): Promise<Recommendation>;
    /**
     * Delete a recommendation (mark as deleted)
     *
     * @param author Author's public key or identifier
     * @param recommendationId ID of the recommendation to delete
     * @returns Result of the delete action
     */
    deleteRecommendation(author: string, recommendationId: string): Promise<{
        success: boolean;
    }>;
    /**
     * Get a recommendation by ID
     *
     * @param recommendationId ID of the recommendation to retrieve
     * @returns Recommendation with the specified ID
     */
    getRecommendationById(recommendationId: string): Promise<Recommendation>;
    /**
     * Search for recommendations with full-text search
     *
     * @param query Search query
     * @param filter Additional filter criteria
     * @returns Recommendations matching the search query
     */
    searchRecommendations(query: string, filter?: Omit<RecommendationFilter, 'pagination'>, pagination?: {
        offset: number;
        limit: number;
    }): Promise<{
        recommendations: Recommendation[];
        total: number;
        pagination: {
            offset: number;
            limit: number;
            hasMore: boolean;
        };
    }>;
    /**
     * Validate recommendation content
     *
     * @private
     * @param content Content to validate
     * @returns Validation result
     */
    private validateContent;
    /**
     * Hash content for verification
     *
     * @private
     * @param content Content to hash
     * @returns SHA-256 hash of the content
     */
    private hashContent;
}
