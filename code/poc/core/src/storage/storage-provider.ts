/**
 * Storage Provider Interface
 * 
 * Defines the common interface for different storage implementations
 * Based on Technical Specifications A.3.4
 */

/**
 * Storage options
 */
export interface StorageOptions {
  /**
   * Replication factor (number of copies)
   */
  replication?: number;
  
  /**
   * Whether to pin the content
   */
  pin?: boolean;
  
  /**
   * Set content expiration
   */
  expiration?: Date;
  
  /**
   * Additional provider-specific options
   */
  [key: string]: any;
}

/**
 * Storage result containing stored content information
 */
export interface StorageResult {
  /**
   * Content identifier (CID, hash, etc.)
   */
  cid: string;
  
  /**
   * Content size in bytes
   */
  size: number;
  
  /**
   * Storage timestamp
   */
  timestamp: Date;
  
  /**
   * Additional metadata
   */
  metadata?: Record<string, any>;
}

/**
 * Retrieval result containing content and metadata
 */
export interface RetrievalResult {
  /**
   * Retrieved content
   */
  data: Buffer | string | any;
  
  /**
   * Content metadata
   */
  metadata: {
    size: number;
    mimeType: string;
    created: Date;
    [key: string]: any;
  };
  
  /**
   * Content identifier
   */
  cid: string;
}

/**
 * Storage provider interface
 * Abstracts different storage implementations (IPFS, Arweave, etc.)
 * FIXED: Added store/retrieve methods that engines expect
 */
export interface StorageProvider {
  /**
   * Whether the provider supports content retrieval
   */
  readonly supportsRetrieval: boolean;
  
  /**
   * Whether the provider supports content deletion
   */
  readonly supportsDeletion: boolean;
  
  // ============================================================================
  // CORE METHODS THAT ENGINES EXPECT - PHASE 2C FIX
  // ============================================================================
  
  /**
   * Store data with a key (what engines expect)
   * @param key Storage key/identifier
   * @param value Data to store (any type)
   * @returns Storage identifier/hash
   */
  store(key: string, value: any): Promise<string>;
  
  /**
   * Retrieve data by key (what engines expect)
   * @param key Storage key/identifier
   * @returns Stored data
   */
  retrieve(key: string): Promise<any>;
  
  // ============================================================================
  // EXTENDED FILE-SPECIFIC METHODS (backward compatibility)
  // ============================================================================
  
  /**
   * Store a file in the storage provider
   * 
   * @param data File data as a Buffer, Blob, or string
   * @param mimeType MIME type of the file
   * @param metadata Optional metadata
   * @param options Storage options
   * @returns Content identifier (CID or similar)
   */
  storeFile(
    data: Buffer | Blob | string,
    mimeType: string,
    metadata?: Record<string, any>,
    options?: StorageOptions
  ): Promise<string>;
  
  /**
   * Retrieve a file from the storage provider
   * 
   * @param cid Content identifier
   * @param options Retrieval options
   * @returns File data
   */
  retrieveFile(
    cid: string,
    options?: Record<string, any>
  ): Promise<Buffer>;
  
  /**
   * Store data with detailed result
   * 
   * @param data Data to store
   * @param options Storage options
   * @returns Detailed storage result
   */
  storeWithResult(
    data: any,
    options?: StorageOptions
  ): Promise<StorageResult>;
  
  /**
   * Retrieve data with metadata
   * 
   * @param cid Content identifier
   * @param options Retrieval options
   * @returns Detailed retrieval result
   */
  retrieveWithMetadata(
    cid: string,
    options?: Record<string, any>
  ): Promise<RetrievalResult>;
  
  // ============================================================================
  // UTILITY METHODS
  // ============================================================================
  
  /**
   * Check if a file exists in the storage provider
   * 
   * @param cid Content identifier
   * @returns Whether the file exists
   */
  fileExists(cid: string): Promise<boolean>;
  
  /**
   * Check if data exists by key
   * 
   * @param key Storage key
   * @returns Whether the data exists
   */
  exists(key: string): Promise<boolean>;
  
  /**
   * Delete a file from the storage provider (if supported)
   * 
   * @param cid Content identifier
   * @returns Whether the deletion was successful
   */
  deleteFile?(cid: string): Promise<boolean>;
  
  /**
   * Delete data by key
   * 
   * @param key Storage key
   * @returns Whether the deletion was successful
   */
  delete?(key: string): Promise<boolean>;
  
  /**
   * Get metadata about a file
   * 
   * @param cid Content identifier
   * @returns File metadata
   */
  getFileMetadata(cid: string): Promise<{
    size: number;
    mimeType: string;
    created: Date;
    [key: string]: any;
  }>;
  
  /**
   * Get metadata about stored data
   * 
   * @param key Storage key
   * @returns Data metadata
   */
  getMetadata(key: string): Promise<{
    size: number;
    created: Date;
    modified?: Date;
    [key: string]: any;
  }>;
  
  // ============================================================================
  // CONNECTION METHODS
  // ============================================================================
  
  /**
   * Connect to the storage provider
   * 
   * @param options Connection options
   * @returns Promise resolving when connected
   */
  connect(options?: Record<string, any>): Promise<void>;
  
  /**
   * Disconnect from the storage provider
   * 
   * @returns Promise resolving when disconnected
   */
  disconnect(): Promise<void>;
  
  /**
   * Check if connected to storage provider
   * 
   * @returns Whether connected
   */
  isConnected(): Promise<boolean>;
  
  // ============================================================================
  // BATCH OPERATIONS (for efficiency)
  // ============================================================================
  
  /**
   * Store multiple items at once
   * 
   * @param items Array of key-value pairs to store
   * @returns Array of storage identifiers
   */
  storeBatch?(items: Array<{ key: string; value: any }>): Promise<string[]>;
  
  /**
   * Retrieve multiple items at once
   * 
   * @param keys Array of keys to retrieve
   * @returns Array of retrieved values
   */
  retrieveBatch?(keys: string[]): Promise<any[]>;
  
  /**
   * Delete multiple items at once
   * 
   * @param keys Array of keys to delete
   * @returns Array of deletion success statuses
   */
  deleteBatch?(keys: string[]): Promise<boolean[]>;
}

/**
 * Base storage provider class with default implementations
 * Can be extended by specific storage provider implementations
 */
export abstract class BaseStorageProvider implements StorageProvider {
  abstract readonly supportsRetrieval: boolean;
  abstract readonly supportsDeletion: boolean;
  
  // Core methods (must be implemented)
  abstract store(key: string, value: any): Promise<string>;
  abstract retrieve(key: string): Promise<any>;
  
  // File methods (can be implemented in terms of core methods)
  async storeFile(
    data: Buffer | Blob | string,
    mimeType: string,
    metadata?: Record<string, any>,
    options?: StorageOptions
  ): Promise<string> {
    const key = this.generateFileKey(mimeType, metadata);
    return this.store(key, { data, mimeType, metadata, ...options });
  }
  
  async retrieveFile(
    cid: string,
    options?: Record<string, any>
  ): Promise<Buffer> {
    const result = await this.retrieve(cid);
    return result.data;
  }
  
  // Default implementations
  async exists(key: string): Promise<boolean> {
    try {
      await this.retrieve(key);
      return true;
    } catch {
      return false;
    }
  }
  
  async fileExists(cid: string): Promise<boolean> {
    return this.exists(cid);
  }
  
  async storeWithResult(
    data: any,
    options?: StorageOptions
  ): Promise<StorageResult> {
    const key = this.generateKey();
    const cid = await this.store(key, data);
    
    return {
      cid,
      size: this.calculateSize(data),
      timestamp: new Date(),
      metadata: options
    };
  }
  
  async retrieveWithMetadata(
    cid: string,
    options?: Record<string, any>
  ): Promise<RetrievalResult> {
    const data = await this.retrieve(cid);
    const metadata = await this.getMetadata(cid);
    
    return {
      data,
      metadata: {
        ...metadata, // CONSERVATIVE FIX: Spread first to avoid conflicts
        size: metadata.size,
        mimeType: 'application/octet-stream',
        created: metadata.created
      } as any,
      cid
    };
  }
  
  async getMetadata(key: string): Promise<{
    size: number;
    created: Date;
    modified?: Date;
    [key: string]: any;
  }> {
    // Default implementation - should be overridden by specific providers
    const data = await this.retrieve(key);
    return {
      size: this.calculateSize(data),
      created: new Date(),
    };
  }
  
  async getFileMetadata(cid: string): Promise<{
    size: number;
    mimeType: string;
    created: Date;
    [key: string]: any;
  }> {
    const result = await this.retrieve(cid);
    return {
      size: this.calculateSize(result.data || result),
      mimeType: result.mimeType || 'application/octet-stream',
      created: new Date(),
      ...result.metadata
    } as any; // CONSERVATIVE FIX: Prevent duplicate property conflicts
  }
  
  async isConnected(): Promise<boolean> {
    return true; // Default implementation
  }
  
  // Connection methods (must be implemented)
  abstract connect(options?: Record<string, any>): Promise<void>;
  abstract disconnect(): Promise<void>;
  
  // Utility methods
  protected generateKey(): string {
    return `key_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  protected generateFileKey(mimeType: string, metadata?: Record<string, any>): string {
    const ext = this.getFileExtension(mimeType);
    return `file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}${ext}`;
  }
  
  protected getFileExtension(mimeType: string): string {
    const mimeMap: Record<string, string> = {
      'image/jpeg': '.jpg',
      'image/png': '.png',
      'image/gif': '.gif',
      'image/webp': '.webp',
      'video/mp4': '.mp4',
      'audio/mpeg': '.mp3',
      'text/plain': '.txt',
      'application/json': '.json'
    };
    
    return mimeMap[mimeType] || '';
  }
  
  protected calculateSize(data: any): number {
    if (Buffer.isBuffer(data)) {
      return data.length;
    }
    if (typeof data === 'string') {
      return Buffer.byteLength(data, 'utf8');
    }
    if (data instanceof Blob) {
      return data.size;
    }
    // For objects, estimate size
    return Buffer.byteLength(JSON.stringify(data), 'utf8');
  }
}

/**
 * Storage provider factory interface
 */
export interface StorageProviderFactory {
  /**
   * Create a storage provider instance
   */
  createProvider(type: string, config: Record<string, any>): Promise<StorageProvider>;
  
  /**
   * Get available provider types
   */
  getAvailableProviders(): string[];
}

/**
 * Storage provider configuration
 */
export interface StorageProviderConfig {
  /**
   * Provider type (ipfs, arweave, etc.)
   */
  type: string;
  
  /**
   * Provider-specific configuration
   */
  config: Record<string, any>;
  
  /**
   * Default storage options
   */
  defaultOptions?: StorageOptions;
}

// CONSERVATIVE FIX: Removed duplicate re-exports to prevent conflicts
// The interfaces and classes are already exported above