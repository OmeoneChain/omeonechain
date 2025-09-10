/**
 * Mock IPFS Storage Provider
 * 
 * Temporary mock implementation to bypass ipfs-http-client dependency issues
 * This removes the problematic import while maintaining interface compatibility
 */

import { StorageProvider, StorageOptions } from './storage-provider';

/**
 * Mock IPFS storage options
 */
export interface IPFSStorageOptions {
  apiUrl?: string;
  gatewayUrl?: string;
  authToken?: string;
  defaultPin?: boolean;
  timeout?: number;
  pinningService?: {
    name: string;
    endpoint: string;
    key: string;
  };
}

/**
 * Default mock options
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
 * Mock IPFS implementation - logs actions but doesn't actually use IPFS
 */
export class IPFSStorage implements StorageProvider {
  private connected: boolean = false;
  private options: IPFSStorageOptions;
  private mockCidCounter = 1;
  private mockStorage = new Map<string, any>();
  
  constructor(options: IPFSStorageOptions = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
    console.log('🔧 Mock IPFS Storage initialized with options:', this.options);
  }
  
  get supportsRetrieval(): boolean {
    return true;
  }
  
  get supportsDeletion(): boolean {
    return true;
  }
  
  async connect(options?: IPFSStorageOptions): Promise<void> {
    if (this.connected) {
      return;
    }
    
    if (options) {
      this.options = { ...this.options, ...options };
    }
    
    console.log('🔗 Mock IPFS connecting to:', this.options.apiUrl);
    
    // Simulate connection delay
    await new Promise(resolve => setTimeout(resolve, 100));
    
    this.connected = true;
    console.log('✅ Mock IPFS connected successfully');
  }
  
  async disconnect(): Promise<void> {
    this.connected = false;
    console.log('🔌 Mock IPFS disconnected');
  }
  
  async storeFile(
    data: Buffer | Blob | string,
    mimeType: string,
    metadata?: Record<string, any>,
    options?: StorageOptions
  ): Promise<string> {
    this.ensureConnected();
    
    // Generate mock CID
    const mockCid = `Qm${this.mockCidCounter.toString().padStart(44, '0')}`;
    this.mockCidCounter++;
    
    // Store in mock storage
    this.mockStorage.set(mockCid, {
      data,
      mimeType,
      metadata: {
        ...metadata,
        timestamp: new Date().toISOString()
      },
      pinned: options?.pin ?? this.options.defaultPin
    });
    
    console.log('📦 Mock IPFS stored file:', {
      cid: mockCid,
      mimeType,
      size: this.getDataSize(data),
      pinned: options?.pin ?? this.options.defaultPin
    });
    
    return mockCid;
  }
  
  async retrieveFile(cid: string): Promise<Buffer> {
    this.ensureConnected();
    
    const stored = this.mockStorage.get(cid);
    if (!stored) {
      throw new Error(`Mock IPFS: File not found with CID ${cid}`);
    }
    
    console.log('📥 Mock IPFS retrieved file:', cid);
    
    // Convert data to Buffer
    if (Buffer.isBuffer(stored.data)) {
      return stored.data;
    } else if (typeof stored.data === 'string') {
      return Buffer.from(stored.data, 'utf8');
    } else {
      return Buffer.from(JSON.stringify(stored.data), 'utf8');
    }
  }
  
  async fileExists(cid: string): Promise<boolean> {
    this.ensureConnected();
    const exists = this.mockStorage.has(cid);
    console.log('🔍 Mock IPFS file exists check:', cid, '→', exists);
    return exists;
  }
  
  async deleteFile(cid: string): Promise<boolean> {
    this.ensureConnected();
    
    const deleted = this.mockStorage.delete(cid);
    console.log('🗑️ Mock IPFS deleted file:', cid, '→', deleted);
    return deleted;
  }
  
  async getFileMetadata(cid: string): Promise<{
    size: number;
    mimeType: string;
    created: Date;
    [key: string]: any;
  }> {
    this.ensureConnected();
    
    const stored = this.mockStorage.get(cid);
    if (!stored) {
      throw new Error(`Mock IPFS: File not found with CID ${cid}`);
    }
    
    const metadata = {
      size: this.getDataSize(stored.data),
      mimeType: stored.mimeType || 'application/octet-stream',
      created: new Date(stored.metadata?.timestamp || new Date()),
      cid,
      isPinned: stored.pinned || false,
      type: 'file',
      blocks: 1,
      cumulativeSize: this.getDataSize(stored.data)
    };
    
    console.log('ℹ️ Mock IPFS metadata:', cid, metadata);
    return metadata;
  }
  
  getGatewayUrl(cid: string): string {
    const url = `${this.options.gatewayUrl}${cid}`;
    console.log('🔗 Mock IPFS gateway URL:', cid, '→', url);
    return url;
  }
  
  async store(data: any): Promise<string> {
    this.ensureConnected();
    
    const buffer = Buffer.from(JSON.stringify(data), 'utf8');
    const mockCid = `Qm${this.mockCidCounter.toString().padStart(44, '0')}`;
    this.mockCidCounter++;
    
    this.mockStorage.set(mockCid, {
      data: buffer,
      mimeType: 'application/json',
      metadata: { timestamp: new Date().toISOString() },
      pinned: this.options.defaultPin
    });
    
    console.log('💾 Mock IPFS stored data:', {
      cid: mockCid,
      size: buffer.length,
      type: 'application/json'
    });
    
    return mockCid;
  }
  
  async retrieve(cid: string): Promise<IpfsRetrievalResult> {
    this.ensureConnected();
    
    try {
      const stored = this.mockStorage.get(cid);
      if (!stored) {
        return {
          success: false,
          error: `Mock IPFS: File not found with CID ${cid}`
        };
      }
      
      console.log('📤 Mock IPFS retrieved data:', cid);
      
      return {
        success: true,
        data: Buffer.isBuffer(stored.data) ? stored.data : Buffer.from(JSON.stringify(stored.data)),
        contentType: stored.mimeType || 'application/json'
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown retrieval error'
      };
    }
  }
  
  async pin(cid: string): Promise<boolean> {
    this.ensureConnected();
    
    const stored = this.mockStorage.get(cid);
    if (stored) {
      stored.pinned = true;
      console.log('📌 Mock IPFS pinned:', cid);
      return true;
    }
    
    console.log('❌ Mock IPFS pin failed (not found):', cid);
    return false;
  }
  
  async unpin(cid: string): Promise<boolean> {
    this.ensureConnected();
    
    const stored = this.mockStorage.get(cid);
    if (stored) {
      stored.pinned = false;
      console.log('📌❌ Mock IPFS unpinned:', cid);
      return true;
    }
    
    console.log('❌ Mock IPFS unpin failed (not found):', cid);
    return false;
  }
  
  async healthCheck(): Promise<boolean> {
    const healthy = this.connected;
    console.log('❤️ Mock IPFS health check:', healthy);
    return healthy;
  }
  
  static async createHash(data: any): Promise<string> {
    // Create a simple deterministic hash for testing
    const str = JSON.stringify(data);
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    const mockCid = `Qm${Math.abs(hash).toString().padStart(44, '0')}`;
    console.log('🔨 Mock IPFS created hash:', mockCid);
    return mockCid;
  }
  
  async isConnected(): Promise<boolean> {
    return Promise.resolve(this.connected);
  }
  
  getOptions(): IPFSStorageOptions {
    return { ...this.options };
  }
  
  // Additional StorageProvider interface methods
  async storeWithResult(key: string, value: any): Promise<any> {
    try {
      const cid = await this.store(value);
      const result = { success: true, key, cid, size: JSON.stringify(value).length };
      console.log('✅ Mock IPFS store with result:', result);
      return result;
    } catch (error) {
      const result = { success: false, error: (error as any).message };
      console.log('❌ Mock IPFS store failed:', result);
      return result;
    }
  }
  
  async retrieveWithMetadata(key: string): Promise<any> {
    try {
      const result = await this.retrieve(key);
      const enhanced = { ...result, key };
      console.log('✅ Mock IPFS retrieve with metadata:', key, enhanced.success);
      return enhanced;
    } catch (error) {
      const result = { success: false, error: (error as any).message };
      console.log('❌ Mock IPFS retrieve failed:', result);
      return result;
    }
  }
  
  async exists(key: string): Promise<boolean> {
    return this.fileExists(key);
  }
  
  async getMetadata(key: string): Promise<any> {
    try {
      const metadata = await this.getFileMetadata(key);
      console.log('ℹ️ Mock IPFS get metadata success:', key);
      return metadata;
    } catch (error) {
      const result = { error: (error as any).message };
      console.log('❌ Mock IPFS get metadata failed:', result);
      return result;
    }
  }
  
  private ensureConnected(): void {
    if (!this.connected) {
      throw new Error('Mock IPFS client is not connected. Call connect() first.');
    }
  }
  
  private getDataSize(data: any): number {
    if (Buffer.isBuffer(data)) {
      return data.length;
    } else if (typeof data === 'string') {
      return Buffer.byteLength(data, 'utf8');
    } else {
      return Buffer.byteLength(JSON.stringify(data), 'utf8');
    }
  }
}

// Export alias for compatibility
export const IPFSStorageProvider = IPFSStorage;