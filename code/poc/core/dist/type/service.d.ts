/**
 * Service Entity Model
 *
 * Represents services that are recommended in the OmeoneChain system
 * Based on Technical Specifications A.2.4
 */
export declare enum VerificationStatus {
    CLAIMED = "claimed",
    VERIFIED = "verified",
    UNCLAIMED = "unclaimed"
}
export interface ServiceLocation {
    /**
     * Latitude coordinate
     */
    latitude: number;
    /**
     * Longitude coordinate
     */
    longitude: number;
    /**
     * Street address
     */
    address: string;
    /**
     * City
     */
    city: string;
    /**
     * Country
     */
    country: string;
}
/**
 * Main Service interface defining the structure of service entity data
 */
export interface Service {
    /**
     * Unique identifier for the service
     */
    serviceId: string;
    /**
     * Name of the service
     */
    name: string;
    /**
     * Primary category
     */
    category: string;
    /**
     * Additional subcategories
     */
    subcategories: string[];
    /**
     * Geographic location
     */
    location: ServiceLocation;
    /**
     * Optional website URL
     */
    website?: string;
    /**
     * Optional contact information
     */
    contact?: string;
    /**
     * Verification status of the service
     */
    verificationStatus: VerificationStatus;
    /**
     * Average rating across all recommendations
     */
    averageRating: number;
    /**
     * Total count of recommendations
     */
    totalRecommendations: number;
    /**
     * Total count of upvotes across all recommendations
     */
    totalUpvotes: number;
    /**
     * ISO8601 timestamp of creation
     */
    createdAt: string;
    /**
     * ISO8601 timestamp of last update
     */
    updatedAt: string;
}
/**
 * NFT-based experience offered by a service
 */
export interface ServiceExperience {
    /**
     * Unique identifier
     */
    experienceId: string;
    /**
     * Service that offers this experience
     */
    serviceId: string;
    /**
     * Title of the experience
     */
    title: string;
    /**
     * Detailed description
     */
    description: string;
    /**
     * Price in tokens
     */
    price: number;
    /**
     * Maximum number available
     */
    supply: number;
    /**
     * Number already purchased
     */
    purchased: number;
    /**
     * Start date/time (if applicable)
     */
    startTime?: string;
    /**
     * End date/time (if applicable)
     */
    endTime?: string;
    /**
     * IPFS hash of media content
     */
    mediaHash?: string;
    /**
     * Whether the experience is active
     */
    isActive: boolean;
    /**
     * ISO8601 timestamp of creation
     */
    createdAt: string;
}
/**
 * Filter parameters for retrieving services
 */
export interface ServiceFilter {
    /**
     * Optional name search term
     */
    nameSearch?: string;
    /**
     * Optional category to filter by
     */
    category?: string;
    /**
     * Optional subcategories to filter by
     */
    subcategories?: string[];
    /**
     * Optional minimum rating threshold
     */
    minRating?: number;
    /**
     * Optional verification status
     */
    verificationStatus?: VerificationStatus;
    /**
     * Optional location to search near
     */
    nearLocation?: {
        latitude: number;
        longitude: number;
        radiusKm: number;
    };
    /**
     * Optional city search
     */
    city?: string;
    /**
     * Optional country search
     */
    country?: string;
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
