/**
 * IPFS Storage Provider
 * 
 * Implementation of the StorageProvider interface for IPFS
 * Based on Technical Specifications A.3.4 (Hybrid Storage System)
 * Updated to fix TypeScript compatibility issues
 */

import { create, IPFSHTTPClient } from 'ipfs-http-client';
import { StorageProvider, StorageOptions } from './storage-provider';
import { CID } from 'multiformats/cid';
import { base58btc } from 'multiformats/bases/base58';
import * as json from 'multiformats/codecs/json';
import { sha256 } from 'multiformats/hashes/sha2';

/**
 * IPFS storage options
 */
export interface IPFSStorageOptions {
  /**
   * IPFS API URL
   */
  apiUrl?: string;
  
  /**
   * IPFS gateway URL
   */
  gatewayUrl?: string;
  
  /**
   * Authentication token
   */
  authToken?: string;
  
  /**
   * Default pin setting (default: true)
   */
  defaultPin?: boolean;
  
  /**
   * Request timeout in milliseconds
   */
  timeout?: number;
  
  /**
   * Optional Pinning Service API config
   */
  pinningService?: {
    /**
     * Service name
     */
    name: string;
    
    /**
     * Service endpoint
     */
    endpoint: string;
    
    /**
     * Service key
     */
    key: string;
  };
}

/**
 * Default IPFS storage options
 */
const DEFAULT_OPTIONS: IPFSStorageOptions = {
  apiUrl: 'https://ipfs.infura.io:5001',
  gatewayUrl: 'https://ipfs.io/ipfs/',
  defaultPin: true,
  timeout: 30000
};

/**
 * Storage result interface for better type safety
 */
export interface IpfsStorageResult {
  success: boolean;
  cid?: string;
  error?: string;
  size?: number;
}

/**
 * Retrieval result interface for better type safety
 */
export interface IpfsRetrievalResult {
  success: boolean;
  data?: Buffer;
  error?: string;
  contentType?: string;
}

/**
 * IPFS implementation of the StorageProvider interface
 */
export class IPFSStorage implements StorageProvider {
  private client: IPFSHTTPClient | null = null;
  private options: IPFSStorageOptions;
  private connected: boolean = false;
  
  /**
   * Create a new IPFSStorage instance
   * 
   * @param options IPFS storage options
   */
  constructor(options: IPFSStorageOptions = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }
  
  /**
   * Whether IPFS supports content retrieval
   */
  get supportsRetrieval(): boolean {
    return true;
  }
  
  /**
   * Whether IPFS supports content deletion (unpin only)
   */
  get supportsDeletion(): boolean {
    return true;
  }
  
  /**
   * Connect to the IPFS node
   * 
   * @param options Connection options
   */
  async connect(options?: IPFSStorageOptions): Promise<void> {
    if (this.connected) {
      return;
    }
    
    // Override options if provided
    if (options) {
      this.options = { ...this.options, ...options };
    }
    
    try {
      const clientOptions: any = {
        url: this.options.apiUrl,
        timeout: this.options.timeout
      };
      
      // Add authentication if provided
      if (this.options.authToken) {
        clientOptions.headers = {
          authorization: `Bearer ${this.options.authToken}`
        };
      }
      
      // Create IPFS client
      this.client = create(clientOptions);
      
      // Test connection with timeout handling
      const versionPromise = this.client.version();
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Connection timeout')), this.options.timeout)
      );
      
      await Promise.race([versionPromise, timeoutPromise]);
      
      // Configure pinning service if provided
      if (this.options.pinningService) {
        try {
          await this.client.pin.remote.service.add(
            this.options.pinningService.name,
            {
              endpoint: this.options.pinningService.endpoint,
              key: this.options.pinningService.key
            }
          );
        } catch (error) {
          console.warn('Failed to add pinning service:', error);
          // Don't fail connection if pinning service setup fails
        }
      }
      
      this.connected = true;
    } catch (error) {
      throw new Error(`Failed to connect to IPFS: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  /**
   * Disconnect from the IPFS node
   */
  async disconnect(): Promise<void> {
    this.client = null;
    this.connected = false;
  }
  
  /**
   * Store a file in IPFS
   * 
   * @param data File data as Buffer, Blob, or string
   * @param mimeType MIME type of the file
   * @param metadata Optional metadata
   * @param options Storage options
   * @returns IPFS CID
   */
  async storeFile(
    data: Buffer | Blob | string,
    mimeType: string,
    metadata?: Record<string, any>,
    options?: StorageOptions
  ): Promise<string> {
    this.ensureConnected();
    
    try {
      // Convert data to Buffer if needed
      let buffer: Buffer;
      if (Buffer.isBuffer(data)) {
        buffer = data;
      } else if (typeof data === 'string') {
        buffer = Buffer.from(data, 'utf8');
      } else if (data instanceof Blob) {
        const arrayBuffer = await data.arrayBuffer();
        buffer = Buffer.from(arrayBuffer);
      } else {
        throw new Error('Unsupported data type');
      }
      
      // Create file object with metadata
      const file = {
        path: 'content',
        content: buffer,
        mimeType,
        metadata: {
          ...metadata,
          timestamp: new Date().toISOString()
        }
      };
      
      // Upload to IPFS with proper error handling
      const result = await this.client!.add(file, {
        pin: options?.pin ?? this.options.defaultPin,
        cidVersion: 1
      });
      
      // Pin to remote service if configured
      if (
        this.options.pinningService && 
        (options?.pin ?? this.options.defaultPin)
      ) {
        try {
          await this.client!.pin.remote.add(result.cid, {
            service: this.options.pinningService.name,
            name: metadata?.caption || `File uploaded at ${new Date().toISOString()}`
          });
        } catch (error) {
          console.warn('Failed to pin to remote service:', error);
          // Don't fail the upload if remote pinning fails
        }
      }
      
      return result.cid.toString();
    } catch (error) {
      throw new Error(`Failed to store file in IPFS: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  /**
   * Retrieve a file from IPFS
   * 
   * @param cid Content identifier
   * @returns File data
   */
  async retrieveFile(cid: string): Promise<Buffer> {
    this.ensureConnected();
    
    try {
      // Parse and validate CID
      const parsedCid = CID.parse(cid);
      
      // Get file chunks with timeout
      const chunks: Uint8Array[] = [];
      const catIterable = this.client!.cat(parsedCid, {
        timeout: this.options.timeout
      });
      
      for await (const chunk of catIterable) {
        chunks.push(chunk);
      }
      
      // Combine chunks into a single buffer
      return Buffer.concat(chunks);
    } catch (error) {
      throw new Error(`Failed to retrieve file from IPFS: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  /**
   * Check if a file exists in IPFS
   * 
   * @param cid Content identifier
   * @returns Whether the file exists
   */
  async fileExists(cid: string): Promise<boolean> {
    this.ensureConnected();
    
    try {
      // Parse CID first to validate format
      const parsedCid = CID.parse(cid);
      
      // Try to get file stat with timeout
      await this.client!.files.stat(`/ipfs/${parsedCid.toString()}`, {
        timeout: 5000 // Shorter timeout for existence check
      });
      return true;
    } catch (error) {
      return false;
    }
  }
  
  /**
   * Delete a file from IPFS (unpin)
   * 
   * @param cid Content identifier
   * @returns Whether the deletion was successful
   */
  async deleteFile(cid: string): Promise<boolean> {
    this.ensureConnected();
    
    try {
      // Parse and validate CID
      const parsedCid = CID.parse(cid);
      
      // Unpin from local node
      await this.client!.pin.rm(parsedCid);
      
      // Unpin from remote service if configured
      if (this.options.pinningService) {
        try {
          await this.client!.pin.remote.rm({
            cid: parsedCid,
            service: this.options.pinningService.name
          });
        } catch (error) {
          console.warn('Failed to unpin from remote service:', error);
          // Don't fail if remote unpin fails
        }
      }
      
      return true;
    } catch (error) {
      console.warn(`Failed to unpin file from IPFS: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return false;
    }
  }
  
  /**
   * Get metadata about a file in IPFS
   * 
   * @param cid Content identifier
   * @returns File metadata
   */
  async getFileMetadata(cid: string): Promise<{
    size: number;
    mimeType: string;
    created: Date;
    [key: string]: any;
  }> {
    this.ensureConnected();
    
    try {
      // Parse and validate CID
      const parsedCid = CID.parse(cid);
      
      // Get file stats
      const stats = await this.client!.files.stat(`/ipfs/${parsedCid.toString()}`);
      
      // Check pin status
      let isPinned = false;
      try {
        const pins = this.client!.pin.ls({ paths: [parsedCid] });
        const pinArray = [];
        for await (const pin of pins) {
          pinArray.push(pin);
        }
        isPinned = pinArray.length > 0;
      } catch (error) {
        // Ignore pin check errors
        isPinned = false;
      }
      
      // Return metadata
      return {
        size: stats.size,
        mimeType: 'application/octet-stream', // IPFS doesn't store MIME types
        created: new Date(), // IPFS doesn't store creation times
        cid: parsedCid.toString(),
        isPinned,
        type: stats.type,
        blocks: stats.blocks,
        cumulativeSize: stats.cumulativeSize
      };
    } catch (error) {
      throw new Error(`Failed to get file metadata from IPFS: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  /**
   * Get the gateway URL for a CID
   * 
   * @param cid Content identifier
   * @returns Gateway URL
   */
  getGatewayUrl(cid: string): string {
    // Validate CID format before creating URL
    try {
      const parsedCid = CID.parse(cid);
      return `${this.options.gatewayUrl}${parsedCid.toString()}`;
    } catch (error) {
      throw new Error(`Invalid CID format: ${cid}`);
    }
  }
  
  /**
   * Store data and return result with error handling
   * Conservative fix: Match StorageProvider interface signature
   * 
   * @param data Data to store
   * @returns Storage result as string (CID)
   */
  async store(data: any): Promise<string> {
    try {
      // Convert data to buffer
      const buffer = Buffer.from(JSON.stringify(data), 'utf8');
      
      // Add to IPFS
      const result = await this.client!.add(buffer, {
        pin: this.options.defaultPin,
        cidVersion: 1
      });

      // Conservative fix: Return CID string instead of result object
      return result.cid.toString();
    } catch (error) {
      // Conservative fix: Return error string instead of result object
      throw new Error(error instanceof Error ? error.message : 'Unknown IPFS storage error');
    }
  }

  /**
   * Retrieve data with error handling
   * 
   * @param cid Content identifier
   * @returns Retrieval result
   */
  async retrieve(cid: string): Promise<IpfsRetrievalResult> {
    try {
      // Parse CID to validate format
      const parsedCid = CID.parse(cid);
      
      // Get data from IPFS
      const chunks: Uint8Array[] = [];
      for await (const chunk of this.client!.cat(parsedCid)) {
        chunks.push(chunk);
      }

      // Combine chunks
      const buffer = Buffer.concat(chunks);

      return {
        success: true,
        data: buffer,
        contentType: 'application/json'
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown IPFS retrieval error'
      };
    }
  }

  /**
   * Pin content with error handling
   * 
   * @param cid Content identifier
   * @returns Success status
   */
  async pin(cid: string): Promise<boolean> {
    try {
      const parsedCid = CID.parse(cid);
      await this.client!.pin.add(parsedCid);
      return true;
    } catch (error) {
      console.error('IPFS pin error:', error);
      return false;
    }
  }

  /**
   * Unpin content with error handling
   * 
   * @param cid Content identifier
   * @returns Success status
   */
  async unpin(cid: string): Promise<boolean> {
    try {
      const parsedCid = CID.parse(cid);
      await this.client!.pin.rm(parsedCid);
      return true;
    } catch (error) {
      console.error('IPFS unpin error:', error);
      return false;
    }
  }

  /**
   * Health check for circuit breaker
   * 
   * @returns Health status
   */
  async healthCheck(): Promise<boolean> {
    try {
      if (!this.client) return false;
      const id = await this.client.id();
      return !!id;
    } catch (error) {
      return false;
    }
  }

  /**
   * Create content hash for verification
   * 
   * @param data Data to hash
   * @returns Content hash
   */
  static async createHash(data: any): Promise<string> {
    try {
      const bytes = new TextEncoder().encode(JSON.stringify(data));
      const hash = await sha256.digest(bytes);
      const cid = CID.create(1, json.code, hash);
      return cid.toString();
    } catch (error) {
      throw new Error(`Failed to create hash: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  /**
   * Check if client is connected
   * Conservative fix: Match StorageProvider interface signature (async)
   * 
   * @returns Connection status as Promise
   */
  async isConnected(): Promise<boolean> {
    return Promise.resolve(this.connected && this.client !== null);
  }
  
  /**
   * Get current options
   * 
   * @returns Current IPFS options
   */
  getOptions(): IPFSStorageOptions {
    return { ...this.options };
  }
  
  /**
   * Conservative fix: Add missing StorageProvider interface methods
   */

  /**
   * Store data with result metadata
   * @param key Storage key
   * @param value Data to store
   * @returns Storage result with metadata
   */
  async storeWithResult(key: string, value: any): Promise<any> {
    try {
      const cid = await this.store(value);
      return { success: true, key, cid, size: JSON.stringify(value).length };
    } catch (error) {
      return { success: false, error: (error as any).message };
    }
  }

  /**
   * Retrieve data with metadata
   * @param key Storage key/CID
   * @returns Data with metadata
   */
  async retrieveWithMetadata(key: string): Promise<any> {
    try {
      const result = await this.retrieve(key);
      return { ...result, key };
    } catch (error) {
      return { success: false, error: (error as any).message };
    }
  }

  /**
   * Check if content exists
   * @param key Storage key/CID
   * @returns Existence status
   */
  async exists(key: string): Promise<boolean> {
    return this.fileExists(key);
  }

  /**
   * Get content metadata
   * @param key Storage key/CID
   * @returns Metadata
   */
  async getMetadata(key: string): Promise<any> {
    try {
      return await this.getFileMetadata(key);
    } catch (error) {
      return { error: (error as any).message };
    }
  }

  /**
   * Ensure the client is connected
   * 
   * @private
   * @throws Error if not connected
   */
  private ensureConnected(): void {
    if (!this.connected || !this.client) {
      throw new Error('IPFS client is not connected. Call connect() first.');
    }
  }
}