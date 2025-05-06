/**
 * Adapter-specific recommendation types for OmeoneChain
 * 
 * This file provides mappings and utility functions to convert between
 * the core recommendation types and the formats needed by various chain adapters.
 */

import { 
  Recommendation, 
  Location, 
  Content, 
  MediaItem, 
  TangleReference,
  RecommendationActionType
} from '../../types/recommendation';

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
export const recommendationActionMap = {
  [RecommendationActionType.CREATE]: 'create',
  [RecommendationActionType.UPDATE]: 'update',
  [RecommendationActionType.UPVOTE]: 'vote', // Chain adapter uses 'vote' with an 'upvote' detail
  [RecommendationActionType.DOWNVOTE]: 'vote', // Chain adapter uses 'vote' with a 'downvote' detail
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
  // This is a placeholder - in a real implementation, this would format the content
  // and media references according to chain adapter requirements
  
  return {
    contentCid: '', // Content CID would be generated from content
    mediaCids: content.media.map(media => media.ipfsHash)
  };
}
