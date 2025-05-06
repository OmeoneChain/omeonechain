/**
 * Service Engine
 * 
 * Core business logic for managing service entities and experiences
 * Based on Technical Specifications A.2.4
 */

import { ChainAdapter, Transaction } from '../adapters/chain-adapter';
import { StorageProvider } from '../storage/storage-provider';
import { 
  Service, 
  ServiceFilter,
  ServiceLocation,
  VerificationStatus,
  ServiceExperience
} from '../types/service';
import { v4 as uuidv4 } from 'uuid';

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
 * Default service engine options
 */
const DEFAULT_OPTIONS: ServiceEngineOptions = {
  enableVerification: true,
  experienceOptions: {
    protocolFeePercentage: 3
  }
};

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
export class ServiceEngine {
  private adapter: ChainAdapter;
  private storage: StorageProvider;
  private options: ServiceEngineOptions;
  private chainId: string | null = null;
  
  /**
   * Create a new ServiceEngine instance
   * 
   * @param adapter Chain adapter for blockchain interactions
   * @param storage Storage provider for off-chain content
   * @param options Engine options
   */
  constructor(
    adapter: ChainAdapter,
    storage: StorageProvider,
    options: ServiceEngineOptions = {}
  ) {
    this.adapter = adapter;
    this.storage = storage;
    this.options = { ...DEFAULT_OPTIONS, ...options };
    
    // Merge experience options
    if (options.experienceOptions) {
      this.options.experienceOptions = {
        ...DEFAULT_OPTIONS.experienceOptions,
        ...options.experienceOptions
      };
    }
  }
  
  /**
   * Initialize the engine
   * 
   * @returns Promise resolving when initialized
   */
  async initialize(): Promise<void> {
    // Get chain ID from adapter or options
    this.chainId = this.options.chainId || await this.adapter.getChainId();
  }
  
  /**
   * Create or update a service entity
   * 
   * @param requesterId User requesting the creation/update
   * @param service Service data
   * @returns Created/updated service
   */
  async createOrUpdateService(
    requesterId: string,
    service: Omit<Service, 'createdAt' | 'updatedAt' | 'averageRating' | 'totalRecommendations' | 'totalUpvotes'>
  ): Promise<Service> {
    // Check if service already exists
    let existingService: Service | null = null;
    let isUpdate = false;
    
    if (service.serviceId) {
      try {
        existingService = await this.getServiceById(service.serviceId);
        isUpdate = true;
      } catch (error) {
        // Service doesn't exist yet
      }
    }
    
    // Generate ID if not provided
    const serviceId = service.serviceId || uuidv4();
    const timestamp = new Date().toISOString();
    
    // Create new service or update existing
    let updatedService: Service;
    
    if (existingService) {
      // Validate requesterId is authorized to update
      if (this.options.enableVerification && existingService.verificationStatus === VerificationStatus.VERIFIED) {
        // For verified services, need to check if requester is the verified owner
        const verificationRequest = await this.getVerificationRequestByServiceId(serviceId);
        
        if (!verificationRequest || verificationRequest.requesterId !== requesterId) {
          throw new Error('Only the verified owner can update this service');
        }
      }
      
      // Update service
      updatedService = {
        ...existingService,
        name: service.name || existingService.name,
        category: service.category || existingService.category,
        subcategories: service.subcategories || existingService.subcategories,
        location: service.location || existingService.location,
        website: service.website !== undefined ? service.website : existingService.website,
        contact: service.contact !== undefined ? service.contact : existingService.contact,
        verificationStatus: service.verificationStatus || existingService.verificationStatus,
        updatedAt: timestamp
      };
    } else {
      // Create new service
      updatedService = {
        serviceId,
        name: service.name,
        category: service.category,
        subcategories: service.subcategories || [],
        location: service.location,
        website: service.website,
        contact: service.contact,
        verificationStatus: service.verificationStatus || VerificationStatus.UNCLAIMED,
        averageRating: 0,
        totalRecommendations: 0,
        totalUpvotes: 0,
        createdAt: timestamp,
        updatedAt: timestamp
      };
    }
    
    // Submit transaction
    const txResult = await this.adapter.submitTx({
      sender: requesterId,
      payload: {
        objectType: 'service',
        action: isUpdate ? 'update' : 'create',
        data: updatedService
      },
      feeOptions: {
        sponsorWallet: this.options.sponsorWallet
      }
    });
    
    return updatedService;
  }
  
  /**
   * Get a service by ID
   * 
   * @param serviceId Service ID
   * @returns Service with the specified ID
   */
  async getServiceById(serviceId: string): Promise<Service> {
    // Query the blockchain for the service
    const result = await this.adapter.queryState<Service>({
      objectType: 'service',
      filter: {
        serviceId
      }
    });
    
    if (result.results.length === 0) {
      throw new Error(`Service not found: ${serviceId}`);
    }
    
    return result.results[0];
  }
  
  /**
   * Query services based on filter criteria
   * 
   * @param filter Filter criteria
   * @returns Services matching the filter
   */
  async queryServices(filter: ServiceFilter): Promise<{
    services: Service[];
    total: number;
    pagination?: {
      offset: number;
      limit: number;
      hasMore: boolean;
    };
  }> {
    // Query the blockchain for services
    const result = await this.adapter.queryState<Service>({
      objectType: 'service',
      filter: {
        ...(filter.nameSearch && { nameSearch: filter.nameSearch }),
        ...(filter.category && { category: filter.category }),
        ...(filter.subcategories && { subcategories: filter.subcategories }),
        ...(filter.minRating && { minRating: filter.minRating }),
        ...(filter.verificationStatus && { verificationStatus: filter.verificationStatus }),
        ...(filter.city && { city: filter.city }),
        ...(filter.country && { country: filter.country })
        // Note: nearLocation filter is handled by the adapter
      },
      sort: filter.sort,
      pagination: filter.pagination
    });
    
    return {
      services: result.results,
      total: result.total,
      pagination: result.pagination
    };
  }
  
  /**
   * Search for services near a location
   * 
   * @param latitude Latitude coordinate
   * @param longitude Longitude coordinate
   * @param radiusKm Search radius in kilometers
   * @param filter Additional filter criteria
   * @returns Services near the location
   */
  async searchServicesByLocation(
    latitude: number,
    longitude: number,
    radiusKm: number = 5,
    filter: Omit<ServiceFilter, 'nearLocation' | 'pagination'> = {},
    pagination: { offset: number; limit: number } = { offset: 0, limit: 20 }
  ): Promise<{
    services: Service[];
    total: number;
    pagination: {
      offset: number;
      limit: number;
      hasMore: boolean;
    };
  }> {
    // Create filter with location
    const locationFilter: ServiceFilter = {
      ...filter,
      nearLocation: {
        latitude,
        longitude,
        radiusKm
      },
      pagination
    };
    
    return this.queryServices(locationFilter);
  }
  
  /**
   * Update service metrics based on recommendations
   * 
   * @param serviceId Service ID
   * @param rating New rating to include in average
   * @param isUpvote Whether this is an upvote
   * @returns Updated service
   */
  async updateServiceMetrics(
    serviceId: string,
    rating?: number,
    isUpvote: boolean = false
  ): Promise<Service> {
    // Get existing service
    const service = await this.getServiceById(serviceId);
    
    // Update metrics
    const updatedService: Service = {
      ...service,
      updatedAt: new Date().toISOString()
    };
    
    // Update recommendation count
    if (rating !== undefined) {
      updatedService.totalRecommendations += 1;
      
      // Update average rating
      const oldTotal = service.averageRating * service.totalRecommendations;
      const newTotal = oldTotal + rating;
      updatedService.averageRating = newTotal / updatedService.totalRecommendations;
    }
    
    // Update upvote count
    if (isUpvote) {
      updatedService.totalUpvotes += 1;
    }
    
    // Submit transaction
    await this.adapter.submitTx({
      sender: this.options.sponsorWallet || 'SYSTEM',
      payload: {
        objectType: 'service',
        action: 'update',
        data: updatedService
      },
      feeOptions: {
        sponsorWallet: this.options.sponsorWallet
      }
    });
    
    return updatedService;
  }
  
  /**
   * Submit a verification request for a service
   * 
   * @param requesterId User requesting verification
   * @param serviceId Service to verify
   * @param documents Verification documents (IPFS hashes)
   * @returns Verification request
   */
  async requestServiceVerification(
    requesterId: string,
    serviceId: string,
    documents: string[]
  ): Promise<VerificationRequest> {
    // Check if the service exists
    await this.getServiceById(serviceId);
    
    // Check if there's already a pending request
    const existingRequest = await this.getVerificationRequestByServiceId(serviceId);
    
    if (existingRequest && existingRequest.status === 'pending') {
      throw new Error(`Verification already pending for service: ${serviceId}`);
    }
    
    // Create verification request
    const requestId = uuidv4();
    const timestamp = new Date().toISOString();
    
    const request: VerificationRequest = {
      requestId,
      serviceId,
      requesterId,
      documents,
      status: 'pending',
      timestamp
    };
    
    // Submit transaction
    await this.adapter.submitTx({
      sender: requesterId,
      payload: {
        objectType: 'verification_request',
        action: 'create',
        data: request
      },
      feeOptions: {
        sponsorWallet: this.options.sponsorWallet
      }
    });
    
    // Update service status to claimed
    const service = await this.getServiceById(serviceId);
    
    if (service.verificationStatus === VerificationStatus.UNCLAIMED) {
      await this.createOrUpdateService(requesterId, {
        ...service,
        verificationStatus: VerificationStatus.CLAIMED
      });
    }
    
    return request;
  }
  
  /**
   * Get verification request by service ID
   * 
   * @param serviceId Service ID
   * @returns Most recent verification request for the service
   */
  async getVerificationRequestByServiceId(serviceId: string): Promise<VerificationRequest | null> {
    // Query the blockchain for verification requests
    const result = await this.adapter.queryState<VerificationRequest>({
      objectType: 'verification_request',
      filter: {
        serviceId
      },
      sort: {
        field: 'timestamp',
        direction: 'desc'
      },
      pagination: {
        offset: 0,
        limit: 1
      }
    });
    
    return result.results.length > 0 ? result.results[0] : null;
  }
  
  /**
   * Review a verification request
   * 
   * @param reviewerId Reviewer's ID
   * @param requestId Request ID
   * @param approved Whether the request is approved
   * @param notes Optional review notes
   * @returns Updated verification request
   */
  async reviewVerificationRequest(
    reviewerId: string,
    requestId: string,
    approved: boolean,
    notes?: string
  ): Promise<VerificationRequest> {
    // Get verification request
    const result = await this.adapter.queryState<VerificationRequest>({
      objectType: 'verification_request',
      filter: {
        requestId
      }
    });
    
    if (result.results.length === 0) {
      throw new Error(`Verification request not found: ${requestId}`);
    }
    
    const request = result.results[0];
    
    // Validate request is pending
    if (request.status !== 'pending') {
      throw new Error(`Verification request already processed: ${requestId}`);
    }
    
    // Update request
    const updatedRequest: VerificationRequest = {
      ...request,
      status: approved ? 'approved' : 'rejected',
      reviewerId,
      reviewNotes: notes
    };
    
    // Submit transaction
    await this.adapter.submitTx({
      sender: reviewerId,
      payload: {
        objectType: 'verification_request',
        action: 'update',
        data: updatedRequest
      },
      feeOptions: {
        sponsorWallet: this.options.sponsorWallet
      }
    });
    
    // Update service status if approved
    if (approved) {
      const service = await this.getServiceById(request.serviceId);
      
      await this.createOrUpdateService(reviewerId, {
        ...service,
        verificationStatus: VerificationStatus.VERIFIED
      });
    }
    
    return updatedRequest;
  }
  
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
  async createServiceExperience(
    requesterId: string,
    serviceId: string,
    title: string,
    description: string,
    price: number,
    supply: number,
    options?: {
      startTime?: string;
      endTime?: string;
      mediaHash?: string;
    }
  ): Promise<ServiceExperience> {
    // Check if the service exists and requester is authorized
    const service = await this.getServiceById(serviceId);
    
    // For verified services, check if requester is the verified owner
    if (service.verificationStatus === VerificationStatus.VERIFIED) {
      const verificationRequest = await this.getVerificationRequestByServiceId(serviceId);
      
      if (!verificationRequest || verificationRequest.requesterId !== requesterId) {
        throw new Error('Only the verified owner can create experiences for this service');
      }
    }
    
    // Create experience
    const experienceId = uuidv4();
    const timestamp = new Date().toISOString();
    
    const experience: ServiceExperience = {
      experienceId,
      serviceId,
      title,
      description,
      price,
      supply,
      purchased: 0,
      startTime: options?.startTime,
      endTime: options?.endTime,
      mediaHash: options?.mediaHash,
      isActive: true,
      createdAt: timestamp
    };
    
    // Submit transaction
    await this.adapter.submitTx({
      sender: requesterId,
      payload: {
        objectType: 'service_experience',
        action: 'create',
        data: experience
      },
      feeOptions: {
        sponsorWallet: this.options.sponsorWallet
      }
    });
    
    return experience;
  }
  
  /**
   * Get experiences for a service
   * 
   * @param serviceId Service ID
   * @param activeOnly Whether to return only active experiences
   * @param pagination Pagination options
   * @returns Experiences for the service
   */
  async getServiceExperiences(
    serviceId: string,
    activeOnly: boolean = true,
    pagination: { offset: number; limit: number } = { offset: 0, limit: 20 }
  ): Promise<{
    experiences: ServiceExperience[];
    total: number;
    pagination: {
      offset: number;
      limit: number;
      hasMore: boolean;
    };
  }> {
    // Query the blockchain for experiences
    const result = await this.adapter.queryState<ServiceExperience>({
      objectType: 'service_experience',
      filter: {
        serviceId,
        ...(activeOnly && { isActive: true })
      },
      sort: {
        field: 'createdAt',
        direction: 'desc'
      },
      pagination
    });
    
    return {
      experiences: result.results,
      total: result.total,
      pagination: {
        offset: pagination.offset,
        limit: pagination.limit,
        hasMore: pagination.offset + result.results.length < result.total
      }
    };
  }
  
  /**
   * Get an experience by ID
   * 
   * @param experienceId Experience ID
   * @returns Experience with the specified ID
   */
  async getExperienceById(experienceId: string): Promise<ServiceExperience> {
    // Query the blockchain for the experience
    const result = await this.adapter.queryState<ServiceExperience>({
      objectType: 'service_experience',
      filter: {
        experienceId
      }
    });
    
    if (result.results.length === 0) {
      throw new Error(`Experience not found: ${experienceId}`);
    }
    
    return result.results[0];
  }
  
  /**
   * Purchase an experience
   * 
   * @param userId User purchasing the experience
   * @param experienceId Experience ID
   * @returns Updated experience
   */
  async purchaseExperience(
    userId: string,
    experienceId: string
  ): Promise<ServiceExperience> {
    // Get the experience
    const experience = await this.getExperienceById(experienceId);
    
    // Validate experience is active and available
    if (!experience.isActive) {
      throw new Error(`Experience is not active: ${experienceId}`);
    }
    
    if (experience.purchased >= experience.supply) {
      throw new Error(`Experience is sold out: ${experienceId}`);
    }
    
    // Check if time constraints are satisfied
    const now = new Date();
    
    if (experience.startTime && new Date(experience.startTime) > now) {
      throw new Error(`Experience sales have not started yet: ${experienceId}`);
    }
    
    if (experience.endTime && new Date(experience.endTime) < now) {
      throw new Error(`Experience sales have ended: ${experienceId}`);
    }
    
    // Update experience
    const updatedExperience: ServiceExperience = {
      ...experience,
      purchased: experience.purchased + 1
    };
    
    // Submit transaction
    await this.adapter.submitTx({
      sender: userId,
      payload: {
        objectType: 'service_experience',
        action: 'update',
        data: updatedExperience
      },
      feeOptions: {
        sponsorWallet: this.options.sponsorWallet
      }
    });
    
    // If the experience is now sold out, update isActive
    if (updatedExperience.purchased >= updatedExperience.supply) {
      updatedExperience.isActive = false;
      
      // Submit another transaction to update status
      await this.adapter.submitTx({
        sender: this.options.sponsorWallet || 'SYSTEM',
        payload: {
          objectType: 'service_experience',
          action: 'update',
          data: updatedExperience
        },
        feeOptions: {
          sponsorWallet: this.options.sponsorWallet
        }
      });
    }
    
    return updatedExperience;
  }
  
  /**
   * Update an experience
   * 
   * @param requesterId User requesting the update
   * @param experienceId Experience ID
   * @param updates Fields to update
   * @returns Updated experience
   */
  async updateExperience(
    requesterId: string,
    experienceId: string,
    updates: Partial<Omit<ServiceExperience, 'experienceId' | 'serviceId' | 'purchased' | 'createdAt'>>
  ): Promise<ServiceExperience> {
    // Get the experience
    const experience = await this.getExperienceById(experienceId);
    
    // Get the service
    const service = await this.getServiceById(experience.serviceId);
    
    // Validate requester is authorized to update
    if (service.verificationStatus === VerificationStatus.VERIFIED) {
      const verificationRequest = await this.getVerificationRequestByServiceId(experience.serviceId);
      
      if (!verificationRequest || verificationRequest.requesterId !== requesterId) {
        throw new Error('Only the verified owner can update experiences for this service');
      }
    }
    
    // Update experience
    const updatedExperience: ServiceExperience = {
      ...experience,
      ...(updates.title !== undefined && { title: updates.title }),
      ...(updates.description !== undefined && { description: updates.description }),
      ...(updates.price !== undefined && { price: updates.price }),
      ...(updates.supply !== undefined && { supply: updates.supply }),
      ...(updates.startTime !== undefined && { startTime: updates.startTime }),
      ...(updates.endTime !== undefined && { endTime: updates.endTime }),
      ...(updates.mediaHash !== undefined && { mediaHash: updates.mediaHash }),
      ...(updates.isActive !== undefined && { isActive: updates.isActive })
    };
    
    // Ensure supply >= purchased
    if (updatedExperience.supply < updatedExperience.purchased) {
      throw new Error(`Supply cannot be less than purchased amount: ${updatedExperience.purchased}`);
    }
    
    // Submit transaction
    await this.adapter.submitTx({
      sender: requesterId,
      payload: {
        objectType: 'service_experience',
        action: 'update',
        data: updatedExperience
      },
      feeOptions: {
        sponsorWallet: this.options.sponsorWallet
      }
    });
    
    return updatedExperience;
  }
  
  /**
   * Get popular services based on recommendations and ratings
   * 
   * @param category Optional category filter
   * @param limit Maximum number of services to return
   * @returns Popular services
   */
  async getPopularServices(
    category?: string,
    limit: number = 10
  ): Promise<Service[]> {
    // Query the blockchain for services
    const result = await this.adapter.queryState<Service>({
      objectType: 'service',
      filter: {
        ...(category && { category })
      },
      sort: {
        field: 'totalUpvotes',
        direction: 'desc'
      },
      pagination: {
        offset: 0,
        limit
      }
    });
    
    return result.results;
  }
  
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
  async getNearbyServices(
    latitude: number,
    longitude: number,
    radiusKm: number = 5,
    category?: string,
    limit: number = 10
  ): Promise<Service[]> {
    // Use searchServicesByLocation with sorted results
    const result = await this.searchServicesByLocation(
      latitude,
      longitude,
      radiusKm,
      {
        ...(category && { category })
      },
      { offset: 0, limit }
    );
    
    return result.services;
  }
  
  /**
   * Calculate protocol fee for experience purchase
   * 
   * @param price Experience price
   * @returns Protocol fee amount
   */
  calculateProtocolFee(price: number): number {
    const feePercentage = this.options.experienceOptions?.protocolFeePercentage || 3;
    return (price * feePercentage) / 100;
  }
}
