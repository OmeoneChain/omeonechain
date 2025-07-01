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
 * Storage provider interface
 * Abstracts different storage implementations (IPFS, Arweave, etc.)
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
    /**
     * Store a file in the storage provider
     *
     * @param data File data as a Buffer, Blob, or string
     * @param mimeType MIME type of the file
     * @param metadata Optional metadata
     * @param options Storage options
     * @returns Content identifier (CID or similar)
     */
    storeFile(data: Buffer | Blob | string, mimeType: string, metadata?: Record<string, any>, options?: StorageOptions): Promise<string>;
    /**
     * Retrieve a file from the storage provider
     *
     * @param cid Content identifier
     * @param options Retrieval options
     * @returns File data
     */
    retrieveFile(cid: string, options?: Record<string, any>): Promise<Buffer>;
    /**
     * Check if a file exists in the storage provider
     *
     * @param cid Content identifier
     * @returns Whether the file exists
     */
    fileExists(cid: string): Promise<boolean>;
    /**
     * Delete a file from the storage provider (if supported)
     *
     * @param cid Content identifier
     * @returns Whether the deletion was successful
     */
    deleteFile?(cid: string): Promise<boolean>;
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
}
