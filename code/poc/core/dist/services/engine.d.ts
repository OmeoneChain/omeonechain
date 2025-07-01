/**
 * Service Engine
 *
 * Core business logic for managing service entities and experiences
 * Based on Technical Specifications A.3.4
 */
import { ChainAdapter } from '../types/chain';
import { StorageProvider } from '../storage/storage-provider';
import { Service, ServiceFilter, ServiceExperience } from '../types/service';
/**
 * Options for the service engine
 */
export interface ServiceEngineOptions {
    /**
     * Chain ID
     */
    chainId?: string;
    /**
     * Enable service verification
     */
    enableVerification?: boolean;
    /**
     * Sponsor wallet for fee payments
     */
    sponsorWallet?: string;
    /**
     * Experience NFT options
     */
    experienceOptions?: {
        /**
         * NFT contract address
         */
        contractAddress?: string;
        /**
         * Protocol fee percentage
         */
        protocolFeePercentage?: number;
    };
}
/**
 * Service verification request
 */
export interface VerificationRequest {
    /**
     * Unique identifier
     */
    requestId: string;
    /**
     * Service ID
     */
    serviceId: string;
    /**
     * User ID requesting verification
     */
    requesterId: string;
    /**
     * Verification documents (IPFS hashes)
     */
    documents: string[];
    /**
     * Request status
     */
    status: 'pending' | 'approved' | 'rejected';
    /**
     * ISO8601 timestamp
     */
    timestamp: string;
    /**
     * Optional reviewer ID
     */
    reviewerId?: string;
    /**
     * Optional review notes
     */
    reviewNotes?: string;
}
/**
 * Implementation of the Service Engine
 * Handles service entity management and experiences
 */
export declare class ServiceEngine {
    private adapter;
    private storage;
    private options;
    private chainId;
    /**
     * Create a new ServiceEngine instance
     *
     * @param adapter Chain adapter for blockchain interactions
     * @param storage Storage provider for off-chain content
     * @param options Engine options
     */
    constructor(adapter: ChainAdapter, storage: StorageProvider, options?: ServiceEngineOptions);
    /**
     * Initialize the engine
     *
     * @returns Promise resolving when initialized
     */
    initialize(): Promise<void>;
    /**
     * Create or update a service entity
     *
     * @param requesterId User requesting the creation/update
     * @param service Service data
     * @returns Created/updated service
     */
    createOrUpdateService(requesterId: string, service: Omit<Service, 'createdAt' | 'updatedAt' | 'averageRating' | 'totalRecommendations' | 'totalUpvotes'>): Promise<Service>;
    /**
     * Get a service by ID
     *
     * @param serviceId Service ID
     * @returns Service with the specified ID
     */
    getServiceById(serviceId: string): Promise<Service>;
    /**
     * Query services based on filter criteria
     *
     * @param filter Filter criteria
     * @returns Services matching the filter
     */
    queryServices(filter: ServiceFilter): Promise<{
        services: Service[];
        total: number;
        pagination?: {
            offset: number;
            limit: number;
            hasMore: boolean;
        };
    }>;
    /**
     * Search for services near a location
     *
     * @param latitude Latitude coordinate
     * @param longitude Longitude coordinate
     * @param radiusKm Search radius in kilometers
     * @param filter Additional filter criteria
     * @returns Services near the location
     */
    searchServicesByLocation(latitude: number, longitude: number, radiusKm?: number, filter?: Omit<ServiceFilter, 'nearLocation' | 'pagination'>, pagination?: {
        offset: number;
        limit: number;
    }): Promise<{
        services: Service[];
        total: number;
        pagination: {
            offset: number;
            limit: number;
            hasMore: boolean;
        };
    }>;
    /**
     * Update service metrics based on recommendations
     *
     * @param serviceId Service ID
     * @param rating New rating to include in average
     * @param isUpvote Whether this is an upvote
     * @returns Updated service
     */
    updateServiceMetrics(serviceId: string, rating?: number, isUpvote?: boolean): Promise<Service>;
    /**
     * Submit a verification request for a service
     *
     * @param requesterId User requesting verification
     * @param serviceId Service to verify
     * @param documents Verification documents (IPFS hashes)
     * @returns Verification request
     */
    requestServiceVerification(requesterId: string, serviceId: string, documents: string[]): Promise<VerificationRequest>;
    /**
     * Get verification request by service ID
     *
     * @param serviceId Service ID
     * @returns Most recent verification request for the service
     */
    getVerificationRequestByServiceId(serviceId: string): Promise<VerificationRequest | null>;
    /**
     * Review a verification request
     *
     * @param reviewerId Reviewer's ID
     * @param requestId Request ID
     * @param approved Whether the request is approved
     * @param notes Optional review notes
     * @returns Updated verification request
     */
    reviewVerificationRequest(reviewerId: string, requestId: string, approved: boolean, notes?: string): Promise<VerificationRequest>;
    /**
     * Create a service experience (NFT)
     *
     * @param serviceId Service offering the experience
     * @param title Experience title
     * @param description Experience description
     * @param price Price in tokens
     * @param supply Maximum number available
     * @param options Optional parameters
     * @returns Created experience
     */
    createServiceExperience(requesterId: string, serviceId: string, title: string, description: string, price: number, supply: number, options?: {
        startTime?: string;
        endTime?: string;
        mediaHash?: string;
    }): Promise<ServiceExperience>;
    /**
     * Get experiences for a service
     *
     * @param serviceId Service ID
     * @param activeOnly Whether to return only active experiences
     * @param pagination Pagination options
     * @returns Experiences for the service
     */
    getServiceExperiences(serviceId: string, activeOnly?: boolean, pagination?: {
        offset: number;
        limit: number;
    }): Promise<{
        experiences: ServiceExperience[];
        total: number;
        pagination: {
            offset: number;
            limit: number;
            hasMore: boolean;
        };
    }>;
    /**
     * Get an experience by ID
     *
     * @param experienceId Experience ID
     * @returns Experience with the specified ID
     */
    getExperienceById(experienceId: string): Promise<ServiceExperience>;
    /**
     * Purchase an experience
     *
     * @param userId User purchasing the experience
     * @param experienceId Experience ID
     * @returns Updated experience
     */
    purchaseExperience(userId: string, experienceId: string): Promise<ServiceExperience>;
    /**
     * Update an experience
     *
     * @param requesterId User requesting the update
     * @param experienceId Experience ID
     * @param updates Fields to update
     * @returns Updated experience
     */
    updateExperience(requesterId: string, experienceId: string, updates: Partial<Omit<ServiceExperience, 'experienceId' | 'serviceId' | 'purchased' | 'createdAt'>>): Promise<ServiceExperience>;
    /**
     * Get popular services based on recommendations and ratings
     *
     * @param category Optional category filter
     * @param limit Maximum number of services to return
     * @returns Popular services
     */
    getPopularServices(category?: string, limit?: number): Promise<Service[]>;
    /**
     * Get nearby services
     *
     * @param latitude Latitude coordinate
     * @param longitude Longitude coordinate
     * @param radiusKm Search radius in kilometers
     * @param category Optional category filter
     * @param limit Maximum number of services to return
     * @returns Nearby services
     */
    getNearbyServices(latitude: number, longitude: number, radiusKm?: number, category?: string, limit?: number): Promise<Service[]>;
    /**
     * Calculate protocol fee for experience purchase
     *
     * @param price Experience price
     * @returns Protocol fee amount
     */
    calculateProtocolFee(price: number): number;
}
