/**
 * IPFS Storage Provider
 * 
 * Implementation of the StorageProvider interface for IPFS
 * Based on Technical Specifications A.3.4 (Hybrid Storage System)
 */

import { create, IPFSHTTPClient } from 'ipfs-http-client';
import { StorageProvider, StorageOptions } from './storage-provider';
import { CID } from 'multiformats/cid';
import { base58btc } from 'multiformats/bases/base58';

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
  defaultPin: true
};

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
      const clientOptions: Record<string, any> = {};
      
      // Add authentication if provided
      if (this.options.authToken) {
        clientOptions.headers = {
          authorization: `Bearer ${this.options.authToken}`
        };
      }
      
      // Create IPFS client
      this.client = create({
        url: this.options.apiUrl,
        ...clientOptions
      });
      
      // Test connection
      await this.client.version();
      
      // Configure pinning service if provided
      if (this.options.pinningService) {
        await this.client.pin.remote.service.add(
          this.options.pinningService.name,
          {
            endpoint: this.options.pinningService.endpoint,
            key: this.options.pinningService.key
          }
        );
      }
      
      this.connected = true;
    } catch (error) {
      throw new Error(`Failed to connect to IPFS: ${error}`);
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
    
    // Convert data to Buffer if needed
    let buffer: Buffer;
    if (Buffer.isBuffer(data)) {
      buffer = data;
    } else if (typeof data === 'string') {
      buffer = Buffer.from(data);
    } else if (data instanceof Blob) {
      buffer = Buffer.from(await data.arrayBuffer());
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
    
    // Upload to IPFS
    const result = await this.client!.add(file, {
      pin: options?.pin ?? this.options.defaultPin
    });
    
    // Pin to remote service if configured
    if (
      this.options.pinningService && 
      (options?.pin ?? this.options.defaultPin)
    ) {
      await this.client!.pin.remote.add(result.cid, {
        service: this.options.pinningService.name,
        name: metadata?.caption || `File uploaded at ${new Date().toISOString()}`
      });
    }
    
    return result.cid.toString();
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
      // Parse CID
      const parsedCid = CID.parse(cid);
      
      // Get file chunks
      const chunks: Uint8Array[] = [];
      for await (const chunk of this.client!.cat(parsedCid)) {
        chunks.push(chunk);
      }
      
      // Combine chunks into a single buffer
      return Buffer.concat(chunks);
    } catch (error) {
      throw new Error(`Failed to retrieve file from IPFS: ${error}`);
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
      // Try to get file stat
      await this.client!.files.stat(`/ipfs/${cid}`);
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
      // Parse CID
      const parsedCid = CID.parse(cid);
      
      // Unpin from local node
      await this.client!.pin.rm(parsedCid);
      
      // Unpin from remote service if configured
      if (this.options.pinningService) {
        await this.client!.pin.remote.rm({
          cid: parsedCid,
          service: this.options.pinningService.name
        });
      }
      
      return true;
    } catch (error) {
      console.warn(`Failed to unpin file from IPFS: ${error}`);
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
      // Parse CID
      const parsedCid = CID.parse(cid);
      
      // Get file stats
      const stats = await this.client!.files.stat(`/ipfs/${parsedCid}`);
      
      // Get pin status
      const pins = await this.client!.pin.ls({ paths: [parsedCid] });
      const isPinned = Array.from(pins).length > 0;
      
      // Return metadata
      return {
        size: stats.size,
        mimeType: 'application/octet-stream', // IPFS doesn't store MIME types
        created: new Date(), // IPFS doesn't store creation times
        cid: parsedCid.toString(),
        isPinned,
        type: stats.type
      };
    } catch (error) {
      throw new Error(`Failed to get file metadata from IPFS: ${error}`);
    }
  }
  
  /**
   * Get the gateway URL for a CID
   * 
   * @param cid Content identifier
   * @returns Gateway URL
   */
  getGatewayUrl(cid: string): string {
    return `${this.options.gatewayUrl}${cid}`;
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
