/**
 * Adapter-specific recommendation types for OmeoneChain
 *
 * This file provides mappings and utility functions to convert between
 * the core recommendation types and the formats needed by various chain adapters.
 */
import { Recommendation, Location, Content, TangleReference, RecommendationActionType } from '../../types/recommendation';
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
 * Mapping for recommendation action types between systems
 */
export declare const recommendationActionMap: {
    [RecommendationActionType.CREATE]: string;
    [RecommendationActionType.UPDATE]: string;
    [RecommendationActionType.UPVOTE]: string;
    [RecommendationActionType.DOWNVOTE]: string;
    [RecommendationActionType.DELETE]: string;
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
