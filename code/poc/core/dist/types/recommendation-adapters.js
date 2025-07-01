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
const recommendation_1 = require("../../types/recommendation");
/**
 * Mapping for recommendation action types between systems
 */
exports.recommendationActionMap = {
    [recommendation_1.RecommendationActionType.CREATE]: 'create',
    [recommendation_1.RecommendationActionType.UPDATE]: 'update',
    [recommendation_1.RecommendationActionType.UPVOTE]: 'vote', // Chain adapter uses 'vote' with an 'upvote' detail
    [recommendation_1.RecommendationActionType.DOWNVOTE]: 'vote', // Chain adapter uses 'vote' with a 'downvote' detail
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
    // This is a placeholder - in a real implementation, this would format the content
    // and media references according to chain adapter requirements
    return {
        contentCid: '', // Content CID would be generated from content
        mediaCids: content.media.map(media => media.ipfsHash)
    };
}
//# sourceMappingURL=recommendation-adapters.js.map