"use strict";
/**
 * Recommendation Engine
 *
 * Core business logic for processing, storing, and retrieving user recommendations
 * Based on Technical Specifications A.3.1
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.RecommendationEngine = void 0;
const recommendation_adapters_1 = require("../adapters/types/recommendation-adapters");
const recommendation_1 = require("../type/recommendation");
const crypto_1 = require("crypto");
const uuid_1 = require("uuid");
/**
 * Default recommendation engine options
 */
const DEFAULT_OPTIONS = {
    batchSize: 50,
    validateContent: true,
    spamDetection: true
};
/**
 * Implementation of the Recommendation Engine
 * Handles processing, storing, and retrieving recommendations
 */
class RecommendationEngine {
    /**
     * Create a new RecommendationEngine instance
     *
     * @param adapter Chain adapter for blockchain interactions
     * @param storage Storage provider for off-chain content
     * @param options Engine options
     */
    constructor(adapter, storage, options = {}) {
        this.chainId = null;
        this.adapter = adapter;
        this.storage = storage;
        this.options = { ...DEFAULT_OPTIONS, ...options };
    }
    /**
     * Initialize the engine
     *
     * @returns Promise resolving when initialized
     */
    async initialize() {
        // Get chain ID from adapter or options
        this.chainId = this.options.chainId || await this.adapter.getWalletAddress();
    }
    /**
     * Submit a new recommendation
     *
     * @param author Author's public key or identifier
     * @param recommendation Recommendation content
     * @returns Submitted recommendation with ID and metadata
     */
    async submitRecommendation(author, recommendation) {
        // Generate ID and timestamp
        const id = (0, uuid_1.v4)();
        const timestamp = new Date().toISOString();
        // Validate content if enabled
        if (this.options.validateContent) {
            const validationResult = await this.validateContent(recommendation.content);
            if (!validationResult.valid) {
                throw new Error(`Content validation failed: ${validationResult.error}`);
            }
            if (this.options.spamDetection && validationResult.isSpam) {
                throw new Error('Content appears to be spam');
            }
        }
        // Store media items in IPFS
        const updatedMedia = [];
        for (const media of recommendation.content.media || []) {
            // If media already has IPFS hash, use it
            if (media.ipfsHash) {
                updatedMedia.push(media);
                continue;
            }
            // Otherwise, upload to IPFS - check if media has content to upload
            if ('data' in media && media.data) {
                // Conservative fix: Only call storeFile if we have actual data
                const ipfsHash = await this.storage.storeFile(media.data, // Type assertion to handle the interface mismatch
                media.type, media.caption ? { caption: media.caption } : undefined);
                updatedMedia.push({
                    type: media.type,
                    ipfsHash,
                    caption: media.caption
                });
            }
            else {
                // Keep media item as is if no data to upload
                updatedMedia.push(media);
            }
        }
        // Create content with updated media
        const content = {
            title: recommendation.content.title,
            body: recommendation.content.body,
            media: updatedMedia
        };
        // Generate content hash
        const contentHash = this.hashContent(content);
        // Prepare recommendation object
        const newRecommendation = {
            id,
            author,
            timestamp,
            serviceId: recommendation.serviceId,
            category: recommendation.category,
            location: recommendation.location,
            rating: recommendation.rating,
            content,
            tags: recommendation.tags || [],
            verificationStatus: 'unverified',
            contentHash,
            chainID: this.chainId || 'unknown'
        };
        // Updated transaction submission
        const txPayload = {
            type: 'recommendation',
            action: 'create',
            requiresSignature: true,
            data: (0, recommendation_adapters_1.toTransactionData)(newRecommendation)
        };
        // Keep original method call pattern
        const txResult = await this.adapter.submitTransaction(txPayload);
        // Conservative fix: Handle undefined objectId
        return {
            ...newRecommendation,
            tangle: {
                objectId: txResult.objectId || 'pending',
                commitNumber: txResult.commitNumber || 0
            }
        };
    }
    /**
     * Get recommendations based on filter criteria
     *
     * @param filter Filter criteria
     * @returns Recommendations matching the filter
     */
    async getRecommendations(filter) {
        // Query the blockchain for recommendations
        const result = await this.adapter.queryObjects('recommendation', {
            ...(filter.author && { author: filter.author }),
            ...(filter.category && { category: filter.category }),
            ...(filter.serviceId && { serviceId: filter.serviceId }),
            ...(filter.minRating && { minRating: filter.minRating }),
            // Location-based filtering is handled by the adapter
        }, filter.pagination);
        // Transform results to expected format
        const recommendations = result.map(state => state.data);
        const total = result.length;
        // For each recommendation, load full content from IPFS if needed
        const recommendationsWithContent = await Promise.all(recommendations.map(async (rec) => {
            // If media items exist, ensure full content is loaded
            for (let i = 0; i < rec.content.media.length; i++) {
                const media = rec.content.media[i];
                if (media.ipfsHash && !('data' in media) && this.storage.supportsRetrieval) {
                    try {
                        const data = await this.storage.retrieveFile(media.ipfsHash);
                        rec.content.media[i] = {
                            ...media,
                            // Add data if retrieval successful, but maintain type safety
                        };
                    }
                    catch (error) {
                        console.warn(`Failed to load media ${media.ipfsHash}: ${error}`);
                    }
                }
            }
            return rec;
        }));
        // Calculate pagination
        const pagination = filter.pagination ? {
            offset: filter.pagination.offset,
            limit: filter.pagination.limit,
            hasMore: filter.pagination.offset + recommendationsWithContent.length < total
        } : undefined;
        return {
            recommendations: recommendationsWithContent,
            total,
            pagination
        };
    }
    /**
     * Vote on a recommendation (upvote or downvote)
     *
     * @param userId User's public key or identifier
     * @param recommendationId ID of the recommendation to vote on
     * @param isUpvote Whether the vote is an upvote (true) or downvote (false)
     * @returns Result of the vote action
     */
    async voteOnRecommendation(userId, recommendationId, isUpvote) {
        // Create action
        const actionType = isUpvote
            ? recommendation_1.RecommendationActionType.UPVOTE
            : recommendation_1.RecommendationActionType.DOWNVOTE;
        const action = {
            type: actionType,
            recommendationId,
            userId,
            timestamp: new Date().toISOString()
        };
        // Updated transaction submission
        const txPayload = {
            type: 'recommendation',
            action: 'vote',
            actionDetail: isUpvote ? 'upvote' : 'downvote',
            requiresSignature: true,
            data: {
                id: recommendationId,
                author: userId
            }
        };
        // Keep original method call pattern
        const txResult = await this.adapter.submitTransaction(txPayload);
        return {
            success: true,
            action
        };
    }
    /**
     * Update an existing recommendation
     *
     * @param author Author's public key or identifier
     * @param recommendationId ID of the recommendation to update
     * @param updates Fields to update
     * @returns Updated recommendation
     */
    async updateRecommendation(author, recommendationId, updates) {
        // Get the existing recommendation
        const existing = await this.getRecommendationById(recommendationId);
        // Verify author is allowed to update
        if (existing.author !== author) {
            throw new Error('Only the author can update a recommendation');
        }
        // Prepare content updates
        let updatedContent;
        if (updates.content) {
            // Process new media items
            const updatedMedia = [];
            // Start with existing media that isn't being replaced
            const existingMedia = existing.content.media || [];
            // Add new media items
            for (const media of updates.content.media || []) {
                // If media already has IPFS hash, use it
                if (media.ipfsHash) {
                    updatedMedia.push(media);
                    continue;
                }
                // Otherwise, upload to IPFS - check if media has content to upload
                if ('data' in media && media.data) {
                    // Conservative fix: Only call storeFile if we have actual data
                    const ipfsHash = await this.storage.storeFile(media.data, // Type assertion to handle the interface mismatch
                    media.type, media.caption ? { caption: media.caption } : undefined);
                    updatedMedia.push({
                        type: media.type,
                        ipfsHash,
                        caption: media.caption
                    });
                }
                else {
                    // Keep media item as is if no data to upload
                    updatedMedia.push(media);
                }
            }
            // Create content with updated fields
            updatedContent = {
                title: updates.content.title || existing.content.title,
                body: updates.content.body || existing.content.body,
                media: updatedMedia.length > 0 ? updatedMedia : existing.content.media
            };
            // Validate updated content
            if (this.options.validateContent) {
                const validationResult = await this.validateContent(updatedContent);
                if (!validationResult.valid) {
                    throw new Error(`Content validation failed: ${validationResult.error}`);
                }
                if (this.options.spamDetection && validationResult.isSpam) {
                    throw new Error('Updated content appears to be spam');
                }
            }
        }
        // Create updated recommendation
        const updatedRecommendation = {
            ...existing,
            content: updatedContent || existing.content,
            serviceId: updates.serviceId || existing.serviceId,
            category: updates.category || existing.category,
            location: updates.location || existing.location,
            rating: updates.rating !== undefined ? updates.rating : existing.rating,
            tags: updates.tags || existing.tags,
            contentHash: updatedContent ? this.hashContent(updatedContent) : existing.contentHash
        };
        // Updated transaction submission
        const txPayload = {
            type: 'recommendation',
            action: 'update',
            requiresSignature: true,
            data: (0, recommendation_adapters_1.toTransactionData)(updatedRecommendation)
        };
        // Keep original method call pattern
        const txResult = await this.adapter.submitTransaction(txPayload);
        // Return updated recommendation with new tangle reference
        return {
            ...updatedRecommendation,
            tangle: {
                objectId: txResult.objectId || existing.tangle.objectId,
                commitNumber: txResult.commitNumber || 0
            }
        };
    }
    /**
     * Delete a recommendation (mark as deleted)
     *
     * @param author Author's public key or identifier
     * @param recommendationId ID of the recommendation to delete
     * @returns Result of the delete action
     */
    async deleteRecommendation(author, recommendationId) {
        // Get the existing recommendation
        const existing = await this.getRecommendationById(recommendationId);
        // Verify author is allowed to delete
        if (existing.author !== author) {
            throw new Error('Only the author can delete a recommendation');
        }
        // Updated transaction submission
        const txPayload = {
            type: 'recommendation',
            action: 'delete',
            requiresSignature: true,
            data: {
                id: recommendationId,
                author
            }
        };
        // Submit transaction
        const txResult = await this.adapter.submitTransaction(txPayload);
        return {
            success: true
        };
    }
    /**
     * Get a recommendation by ID
     *
     * @param recommendationId ID of the recommendation to retrieve
     * @returns Recommendation with the specified ID
     */
    async getRecommendationById(recommendationId) {
        try {
            // Conservative fix: Create proper StateQuery object
            const stateQuery = {
                objectType: 'recommendation',
                objectId: recommendationId
            };
            const result = await this.adapter.queryState(stateQuery);
            // Conservative fix: Access data property if it exists, otherwise cast
            const recommendation = ('data' in result ? result.data : result);
            // Load media content if needed
            for (let i = 0; i < recommendation.content.media.length; i++) {
                const media = recommendation.content.media[i];
                if (media.ipfsHash && !('data' in media) && this.storage.supportsRetrieval) {
                    try {
                        const data = await this.storage.retrieveFile(media.ipfsHash);
                        recommendation.content.media[i] = {
                            ...media,
                            // Add data if retrieval successful, but maintain type safety
                        };
                    }
                    catch (error) {
                        console.warn(`Failed to load media ${media.ipfsHash}: ${error}`);
                    }
                }
            }
            return recommendation;
        }
        catch (error) {
            throw new Error(`Recommendation not found: ${recommendationId}`);
        }
    }
    /**
     * Search for recommendations with full-text search
     *
     * @param query Search query
     * @param filter Additional filter criteria
     * @returns Recommendations matching the search query
     */
    async searchRecommendations(query, filter = {}, pagination = { offset: 0, limit: 20 }) {
        // Create search filter with query
        const searchFilter = {
            ...filter,
            searchQuery: query
        };
        // Query objects with the combined filter
        const result = await this.adapter.queryObjects('recommendation', searchFilter, pagination);
        // Transform results to expected format
        const recommendations = result.map(state => state.data);
        const total = result.length;
        // Load media content if needed
        const recommendationsWithContent = await Promise.all(recommendations.map(async (rec) => {
            for (let i = 0; i < rec.content.media.length; i++) {
                const media = rec.content.media[i];
                if (media.ipfsHash && !('data' in media) && this.storage.supportsRetrieval) {
                    try {
                        const data = await this.storage.retrieveFile(media.ipfsHash);
                        rec.content.media[i] = {
                            ...media,
                            // Add data if retrieval successful, but maintain type safety
                        };
                    }
                    catch (error) {
                        console.warn(`Failed to load media ${media.ipfsHash}: ${error}`);
                    }
                }
            }
            return rec;
        }));
        return {
            recommendations: recommendationsWithContent,
            total,
            pagination: {
                offset: pagination.offset,
                limit: pagination.limit,
                hasMore: pagination.offset + recommendationsWithContent.length < total
            }
        };
    }
    /**
     * Validate recommendation content
     *
     * @private
     * @param content Content to validate
     * @returns Validation result
     */
    async validateContent(content) {
        // Simple validation for now - check required fields
        if (!content.title || content.title.trim().length === 0) {
            return { valid: false, error: 'Title is required' };
        }
        if (!content.body || content.body.trim().length === 0) {
            return { valid: false, error: 'Body is required' };
        }
        // TODO: Implement more sophisticated validation such as:
        // - Language detection
        // - Spam detection
        // - Toxicity detection
        // - Content policy checking
        return {
            valid: true,
            qualityScore: 0.8,
            detectedLanguage: 'en',
            isSpam: false
        };
    }
    /**
     * Hash content for verification
     *
     * @private
     * @param content Content to hash
     * @returns SHA-256 hash of the content
     */
    hashContent(content) {
        const contentStr = JSON.stringify({
            title: content.title,
            body: content.body,
            media: content.media.map(m => ({ type: m.type, ipfsHash: m.ipfsHash, caption: m.caption }))
        });
        return (0, crypto_1.createHash)('sha256').update(contentStr).digest('hex');
    }
}
exports.RecommendationEngine = RecommendationEngine;
//# sourceMappingURL=engine.js.map