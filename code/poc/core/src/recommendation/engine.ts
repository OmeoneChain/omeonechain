/**
 * Recommendation Engine
 * 
 * Core business logic for processing, storing, and retrieving user recommendations
 * Based on Technical Specifications A.3.1
 */

import { ChainAdapter, Transaction } from '../adapters/chain-adapter';
import { StorageProvider } from '../storage/storage-provider';
import { 
  Recommendation, 
  RecommendationFilter,
  RecommendationAction,
  RecommendationActionType,
  Content,
  MediaItem
} from '../types/recommendation';
import { createHash } from 'crypto';
import { v4 as uuidv4 } from 'uuid';

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
}

/**
 * Default recommendation engine options
 */
const DEFAULT_OPTIONS: RecommendationEngineOptions = {
  batchSize: 50,
  validateContent: true,
  spamDetection: true
};

/**
 * Content validation result
 */
interface ContentValidationResult {
  /**
   * Whether the content is valid
   */
  valid: boolean;
  
  /**
   * Error message if invalid
   */
  error?: string;
  
  /**
   * Content quality score (0-1)
   */
  qualityScore?: number;
  
  /**
   * Detected language
   */
  detectedLanguage?: string;
  
  /**
   * Whether the content appears to be spam
   */
  isSpam?: boolean;
}

/**
 * Implementation of the Recommendation Engine
 * Handles processing, storing, and retrieving recommendations
 */
export class RecommendationEngine {
  private adapter: ChainAdapter;
  private storage: StorageProvider;
  private options: RecommendationEngineOptions;
  private chainId: string | null = null;
  
  /**
   * Create a new RecommendationEngine instance
   * 
   * @param adapter Chain adapter for blockchain interactions
   * @param storage Storage provider for off-chain content
   * @param options Engine options
   */
  constructor(
    adapter: ChainAdapter,
    storage: StorageProvider,
    options: RecommendationEngineOptions = {}
  ) {
    this.adapter = adapter;
    this.storage = storage;
    this.options = { ...DEFAULT_OPTIONS, ...options };
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
   * Submit a new recommendation
   * 
   * @param author Author's public key or identifier
   * @param recommendation Recommendation content
   * @returns Submitted recommendation with ID and metadata
   */
  async submitRecommendation(
    author: string,
    recommendation: Omit<Recommendation, 'id' | 'author' | 'timestamp' | 'contentHash' | 'tangle' | 'chainID'>
  ): Promise<Recommendation> {
    // Generate ID and timestamp
    const id = uuidv4();
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
    const updatedMedia: MediaItem[] = [];
    for (const media of recommendation.content.media || []) {
      // If media already has IPFS hash, use it
      if (media.ipfsHash) {
        updatedMedia.push(media);
        continue;
      }
      
      // Otherwise, upload to IPFS
      if (media.data) {
        const ipfsHash = await this.storage.storeFile(
          media.data, 
          media.type, 
          media.caption
        );
        
        updatedMedia.push({
          type: media.type,
          ipfsHash,
          caption: media.caption
        });
      }
    }
    
    // Create content with updated media
    const content: Content = {
      title: recommendation.content.title,
      body: recommendation.content.body,
      media: updatedMedia
    };
    
    // Generate content hash
    const contentHash = this.hashContent(content);
    
    // Prepare recommendation object
    const newRecommendation: Omit<Recommendation, 'tangle'> = {
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
    
    // Create transaction payload
    const txPayload = {
      objectType: 'recommendation',
      action: 'create',
      data: newRecommendation
    };
    
    // Submit transaction to the blockchain
    const txResult = await this.adapter.submitTx({
      sender: author,
      payload: txPayload,
      feeOptions: {
        sponsorWallet: this.options.sponsorWallet
      }
    });
    
    // Return complete recommendation with tangle reference
    return {
      ...newRecommendation,
      tangle: {
        objectId: txResult.objectId || txResult.id,
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
  async getRecommendations(filter: RecommendationFilter): Promise<{
    recommendations: Recommendation[];
    total: number;
    pagination?: {
      offset: number;
      limit: number;
      hasMore: boolean;
    };
  }> {
    // Query the blockchain for recommendations
    const result = await this.adapter.queryState<Recommendation>({
      objectType: 'recommendation',
      filter: {
        ...(filter.author && { author: filter.author }),
        ...(filter.category && { category: filter.category }),
        ...(filter.serviceId && { serviceId: filter.serviceId }),
        ...(filter.minRating && { minRating: filter.minRating }),
        // Location-based filtering is handled by the adapter
      },
      sort: filter.sort,
      pagination: filter.pagination
    });
    
    // For each recommendation, load full content from IPFS if needed
    const recommendations = await Promise.all(
      result.results.map(async (rec) => {
        // If media items exist, ensure full content is loaded
        for (let i = 0; i < rec.content.media.length; i++) {
          const media = rec.content.media[i];
          if (media.ipfsHash && !media.data && this.storage.supportsRetrieval) {
            try {
              const data = await this.storage.retrieveFile(media.ipfsHash);
              rec.content.
