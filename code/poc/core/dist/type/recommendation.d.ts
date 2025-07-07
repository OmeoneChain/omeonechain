/**
 * Recommendation Data Structure
 *
 * Represents a recommendation in the OmeoneChain system
 * Based on Technical Specifications A.2.1
 */
export interface Location {
    /**
     * Latitude coordinate
     */
    latitude: number;
    /**
     * Longitude coordinate
     */
    longitude: number;
    /**
     * Optional human-readable address
     */
    address?: string;
}
export interface MediaItem {
    /**
     * Type of media ("image", "video", etc.)
     */
    type: string;
    /**
     * Reference to stored media on IPFS
     */
    ipfsHash: string;
    /**
     * Optional caption for the media
     */
    caption?: string;
}
export interface Content {
    /**
     * Title of the recommendation
     */
    title: string;
    /**
     * Main body text of the recommendation
     */
    body: string;
    /**
     * Array of media items attached to the recommendation
     */
    media: MediaItem[];
}
export interface TangleReference {
    /**
     * On-chain object ID
     */
    objectId: string;
    /**
     * Ledger commit height
     */
    commitNumber: number;
}
/**
 * Main Recommendation interface defining the structure of recommendation data
 */
export interface Recommendation {
    /**
     * Unique identifier for the recommendation
     */
    id: string;
    /**
     * Public key or identifier of the author
     */
    author: string;
    /**
     * ISO8601 timestamp of creation
     */
    timestamp: string;
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
     * Content of the recommendation
     */
    content: Content;
    /**
     * Array of relevant tags
     */
    tags: string[];
    /**
     * Verification status ("verified", "unverified")
     */
    verificationStatus: string;
    /**
     * Hash of the content for verification
     */
    contentHash: string;
    /**
     * Reference to on-chain storage
     */
    tangle: TangleReference;
    /**
     * Indicates originating chain
     */
    chainID: string;
}
/**
 * Types of actions that can be performed on a recommendation
 */
export declare enum RecommendationActionType {
    CREATE = "create",
    UPDATE = "update",
    UPVOTE = "upvote",
    DOWNVOTE = "downvote",
    DELETE = "delete"
}
/**
 * Structure for recommendation action events
 */
export interface RecommendationAction {
    /**
     * Type of action performed
     */
    type: RecommendationActionType;
    /**
     * ID of the recommendation being acted upon
     */
    recommendationId: string;
    /**
     * User performing the action
     */
    userId: string;
    /**
     * Timestamp of the action
     */
    timestamp: string;
    /**
     * Additional data related to the action
     */
    data?: any;
}
/**
 * Filter parameters for retrieving recommendations
 */
export interface RecommendationFilter {
    /**
     * Optional author/user ID to filter by
     */
    author?: string;
    /**
     * Optional category to filter by
     */
    category?: string;
    /**
     * Optional service ID to filter by
     */
    serviceId?: string;
    /**
     * Optional tags to filter by (any match)
     */
    tags?: string[];
    /**
     * Optional minimum rating threshold
     */
    minRating?: number;
    /**
     * Optional location to search near
     */
    nearLocation?: {
        latitude: number;
        longitude: number;
        radiusKm: number;
    };
    /**
     * Pagination parameters
     */
    pagination?: {
        offset: number;
        limit: number;
    };
    /**
     * Sorting parameters
     */
    sort?: {
        field: string;
        direction: 'asc' | 'desc';
    };
}
