"use strict";
/**
 * Adapter-specific recommendation types for OmeoneChain
 *
 * This file provides mappings and utility functions to convert between
 * the core recommendation types and the formats needed by various chain adapters.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.recommendationActionMap = void 0;
exports.toTransactionData = toTransactionData;
exports.getActionDetail = getActionDetail;
exports.formatContentReferences = formatContentReferences;
exports.uploadMedia = uploadMedia;
exports.validateMediaUpload = validateMediaUpload;
exports.processMediaUploads = processMediaUploads;
exports.validateRecommendationData = validateRecommendationData;
exports.calculateTrustScore = calculateTrustScore;
exports.isRecommendationTransactionData = isRecommendationTransactionData;
// Import core recommendation types
const recommendation_1 = require("./recommendation");
/**
 * Mapping for recommendation action types between systems
 */
exports.recommendationActionMap = {
    [recommendation_1.RecommendationActionType.CREATE]: 'create',
    [recommendation_1.RecommendationActionType.UPDATE]: 'update',
    [recommendation_1.RecommendationActionType.UPVOTE]: 'vote',
    [recommendation_1.RecommendationActionType.DOWNVOTE]: 'vote',
    [recommendation_1.RecommendationActionType.DELETE]: 'delete'
};
/**
 * Transforms a full recommendation to transaction data format
 * @param recommendation Full recommendation object
 * @returns Simplified recommendation data for transaction
 */
function toTransactionData(recommendation) {
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
function getActionDetail(actionType) {
    switch (actionType) {
        case recommendation_1.RecommendationActionType.UPVOTE:
            return 'upvote';
        case recommendation_1.RecommendationActionType.DOWNVOTE:
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
function formatContentReferences(content) {
    // Generate content hash from available content properties
    let contentText = '';
    if ('text' in content && content.text) {
        // Conservative fix: Type assertion to string
        contentText = content.text || '';
    }
    else if ('description' in content && content.description) {
        // Conservative fix: Type assertion to string  
        contentText = content.description || '';
    }
    else if ('title' in content && content.title) {
        contentText = content.title || '';
    }
    return {
        // Conservative fix: Ensure string return types
        contentCid: contentText ? generateContentHash(contentText) : generateContentHash('empty'),
        mediaCids: content.media ? content.media.map(media => media.ipfsHash || 'fallback-hash') : []
    };
}
/**
 * Upload media files with proper type safety
 * @param media Array of media files to upload
 * @returns Array of IPFS hashes for uploaded media
 */
async function uploadMedia(media) {
    // Implementation would handle actual media upload to IPFS
    // This is a placeholder that returns mock hashes
    return media.map((file, index) => `Qm${index.toString().padStart(44, '0')}`);
}
/**
 * Validate media upload parameters
 * @param media Media upload object to validate
 * @returns True if valid, throws error if invalid
 */
function validateMediaUpload(media) {
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
async function processMediaUploads(mediaList) {
    const successful = [];
    const failed = [];
    for (const media of mediaList) {
        try {
            validateMediaUpload(media);
            const hashes = await uploadMedia([media]);
            successful.push(...hashes);
        }
        catch (error) {
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
function validateRecommendationData(data) {
    const errors = [];
    const warnings = [];
    // Required field validation
    if (!data.author)
        errors.push('Author is required');
    if (!data.serviceId)
        errors.push('Service ID is required');
    if (!data.category)
        errors.push('Category is required');
    if (!data.location)
        errors.push('Location is required');
    if (typeof data.rating !== 'number' || data.rating < 1 || data.rating > 5) {
        errors.push('Rating must be between 1 and 5');
    }
    if (!data.contentHash)
        errors.push('Content hash is required');
    // Content quality assessment
    const qualityScore = calculateQualityScore(data);
    const spamScore = calculateSpamScore(data);
    if (qualityScore < 0.3)
        warnings.push('Content quality appears low');
    if (spamScore > 0.7)
        errors.push('Content appears to be spam');
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
function calculateTrustScore(recommendation, socialSignals) {
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
function generateContentHash(content) {
    // This would use actual hashing algorithm
    return `Qm${content.length.toString().padStart(44, '0')}`;
}
/**
 * Calculate content quality score (placeholder implementation)
 */
function calculateQualityScore(data) {
    let score = 0.5; // Base score
    // Length bonus
    if (data.contentHash.length > 10)
        score += 0.2;
    // Tags bonus
    if (data.tags && data.tags.length > 0)
        score += 0.1;
    // Rating consistency
    if (data.rating >= 3 && data.rating <= 5)
        score += 0.2;
    return Math.min(1.0, score);
}
/**
 * Calculate spam score (placeholder implementation)
 */
function calculateSpamScore(data) {
    let spamScore = 0;
    // Very short content
    if (data.contentHash.length < 5)
        spamScore += 0.3;
    // Extreme ratings
    if (data.rating === 1 || data.rating === 5)
        spamScore += 0.1;
    // No tags
    if (!data.tags || data.tags.length === 0)
        spamScore += 0.1;
    return Math.min(1.0, spamScore);
}
/**
 * Type guard for RecommendationTransactionData
 */
function isRecommendationTransactionData(data) {
    return data &&
        typeof data.author === 'string' &&
        typeof data.serviceId === 'string' &&
        typeof data.category === 'string' &&
        data.location &&
        typeof data.rating === 'number' &&
        typeof data.contentHash === 'string';
}
//# sourceMappingURL=recommendation-adapters.js.map