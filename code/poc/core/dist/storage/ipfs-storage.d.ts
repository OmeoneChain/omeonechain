/**
 * IPFS Storage Provider
 *
 * Implementation of the StorageProvider interface for IPFS
 * Based on Technical Specifications A.3.4 (Hybrid Storage System)
 * Updated to fix TypeScript compatibility issues
 */
import { StorageProvider, StorageOptions } from './storage-provider';
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
export declare class IPFSStorage implements StorageProvider {
    private client;
    private options;
    private connected;
    /**
     * Create a new IPFSStorage instance
     *
     * @param options IPFS storage options
     */
    constructor(options?: IPFSStorageOptions);
    /**
     * Whether IPFS supports content retrieval
     */
    get supportsRetrieval(): boolean;
    /**
     * Whether IPFS supports content deletion (unpin only)
     */
    get supportsDeletion(): boolean;
    /**
     * Connect to the IPFS node
     *
     * @param options Connection options
     */
    connect(options?: IPFSStorageOptions): Promise<void>;
    /**
     * Disconnect from the IPFS node
     */
    disconnect(): Promise<void>;
    /**
     * Store a file in IPFS
     *
     * @param data File data as Buffer, Blob, or string
     * @param mimeType MIME type of the file
     * @param metadata Optional metadata
     * @param options Storage options
     * @returns IPFS CID
     */
    storeFile(data: Buffer | Blob | string, mimeType: string, metadata?: Record<string, any>, options?: StorageOptions): Promise<string>;
    /**
     * Retrieve a file from IPFS
     *
     * @param cid Content identifier
     * @returns File data
     */
    retrieveFile(cid: string): Promise<Buffer>;
    /**
     * Check if a file exists in IPFS
     *
     * @param cid Content identifier
     * @returns Whether the file exists
     */
    fileExists(cid: string): Promise<boolean>;
    /**
     * Delete a file from IPFS (unpin)
     *
     * @param cid Content identifier
     * @returns Whether the deletion was successful
     */
    deleteFile(cid: string): Promise<boolean>;
    /**
     * Get metadata about a file in IPFS
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
     * Get the gateway URL for a CID
     *
     * @param cid Content identifier
     * @returns Gateway URL
     */
    getGatewayUrl(cid: string): string;
    /**
     * Store data and return result with error handling
     *
     * @param data Data to store
     * @returns Storage result
     */
    store(data: any): Promise<IpfsStorageResult>;
    /**
     * Retrieve data with error handling
     *
     * @param cid Content identifier
     * @returns Retrieval result
     */
    retrieve(cid: string): Promise<IpfsRetrievalResult>;
    /**
     * Pin content with error handling
     *
     * @param cid Content identifier
     * @returns Success status
     */
    pin(cid: string): Promise<boolean>;
    /**
     * Unpin content with error handling
     *
     * @param cid Content identifier
     * @returns Success status
     */
    unpin(cid: string): Promise<boolean>;
    /**
     * Health check for circuit breaker
     *
     * @returns Health status
     */
    healthCheck(): Promise<boolean>;
    /**
     * Create content hash for verification
     *
     * @param data Data to hash
     * @returns Content hash
     */
    static createHash(data: any): Promise<string>;
    /**
     * Check if client is connected
     *
     * @returns Connection status
     */
    isConnected(): boolean;
    /**
     * Get current options
     *
     * @returns Current IPFS options
     */
    getOptions(): IPFSStorageOptions;
    /**
     * Ensure the client is connected
     *
     * @private
     * @throws Error if not connected
     */
    private ensureConnected;
}
