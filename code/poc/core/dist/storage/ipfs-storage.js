"use strict";
/**
 * IPFS Storage Provider
 *
 * Implementation of the StorageProvider interface for IPFS
 * Based on Technical Specifications A.3.4 (Hybrid Storage System)
 * Updated to fix TypeScript compatibility issues
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.IPFSStorage = void 0;
const ipfs_http_client_1 = require("ipfs-http-client");
const cid_1 = require("multiformats/cid");
const json = __importStar(require("multiformats/codecs/json"));
const sha2_1 = require("multiformats/hashes/sha2");
/**
 * Default IPFS storage options
 */
const DEFAULT_OPTIONS = {
    apiUrl: 'https://ipfs.infura.io:5001',
    gatewayUrl: 'https://ipfs.io/ipfs/',
    defaultPin: true,
    timeout: 30000
};
/**
 * IPFS implementation of the StorageProvider interface
 */
class IPFSStorage {
    /**
     * Create a new IPFSStorage instance
     *
     * @param options IPFS storage options
     */
    constructor(options = {}) {
        this.client = null;
        this.connected = false;
        this.options = { ...DEFAULT_OPTIONS, ...options };
    }
    /**
     * Whether IPFS supports content retrieval
     */
    get supportsRetrieval() {
        return true;
    }
    /**
     * Whether IPFS supports content deletion (unpin only)
     */
    get supportsDeletion() {
        return true;
    }
    /**
     * Connect to the IPFS node
     *
     * @param options Connection options
     */
    async connect(options) {
        if (this.connected) {
            return;
        }
        // Override options if provided
        if (options) {
            this.options = { ...this.options, ...options };
        }
        try {
            const clientOptions = {
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
            this.client = (0, ipfs_http_client_1.create)(clientOptions);
            // Test connection with timeout handling
            const versionPromise = this.client.version();
            const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Connection timeout')), this.options.timeout));
            await Promise.race([versionPromise, timeoutPromise]);
            // Configure pinning service if provided
            if (this.options.pinningService) {
                try {
                    await this.client.pin.remote.service.add(this.options.pinningService.name, {
                        endpoint: this.options.pinningService.endpoint,
                        key: this.options.pinningService.key
                    });
                }
                catch (error) {
                    console.warn('Failed to add pinning service:', error);
                    // Don't fail connection if pinning service setup fails
                }
            }
            this.connected = true;
        }
        catch (error) {
            throw new Error(`Failed to connect to IPFS: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    /**
     * Disconnect from the IPFS node
     */
    async disconnect() {
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
    async storeFile(data, mimeType, metadata, options) {
        this.ensureConnected();
        try {
            // Convert data to Buffer if needed
            let buffer;
            if (Buffer.isBuffer(data)) {
                buffer = data;
            }
            else if (typeof data === 'string') {
                buffer = Buffer.from(data, 'utf8');
            }
            else if (data instanceof Blob) {
                const arrayBuffer = await data.arrayBuffer();
                buffer = Buffer.from(arrayBuffer);
            }
            else {
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
            const result = await this.client.add(file, {
                pin: options?.pin ?? this.options.defaultPin,
                cidVersion: 1
            });
            // Pin to remote service if configured
            if (this.options.pinningService &&
                (options?.pin ?? this.options.defaultPin)) {
                try {
                    await this.client.pin.remote.add(result.cid, {
                        service: this.options.pinningService.name,
                        name: metadata?.caption || `File uploaded at ${new Date().toISOString()}`
                    });
                }
                catch (error) {
                    console.warn('Failed to pin to remote service:', error);
                    // Don't fail the upload if remote pinning fails
                }
            }
            return result.cid.toString();
        }
        catch (error) {
            throw new Error(`Failed to store file in IPFS: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    /**
     * Retrieve a file from IPFS
     *
     * @param cid Content identifier
     * @returns File data
     */
    async retrieveFile(cid) {
        this.ensureConnected();
        try {
            // Parse and validate CID
            const parsedCid = cid_1.CID.parse(cid);
            // Get file chunks with timeout
            const chunks = [];
            const catIterable = this.client.cat(parsedCid, {
                timeout: this.options.timeout
            });
            for await (const chunk of catIterable) {
                chunks.push(chunk);
            }
            // Combine chunks into a single buffer
            return Buffer.concat(chunks);
        }
        catch (error) {
            throw new Error(`Failed to retrieve file from IPFS: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    /**
     * Check if a file exists in IPFS
     *
     * @param cid Content identifier
     * @returns Whether the file exists
     */
    async fileExists(cid) {
        this.ensureConnected();
        try {
            // Parse CID first to validate format
            const parsedCid = cid_1.CID.parse(cid);
            // Try to get file stat with timeout
            await this.client.files.stat(`/ipfs/${parsedCid.toString()}`, {
                timeout: 5000 // Shorter timeout for existence check
            });
            return true;
        }
        catch (error) {
            return false;
        }
    }
    /**
     * Delete a file from IPFS (unpin)
     *
     * @param cid Content identifier
     * @returns Whether the deletion was successful
     */
    async deleteFile(cid) {
        this.ensureConnected();
        try {
            // Parse and validate CID
            const parsedCid = cid_1.CID.parse(cid);
            // Unpin from local node
            await this.client.pin.rm(parsedCid);
            // Unpin from remote service if configured
            if (this.options.pinningService) {
                try {
                    await this.client.pin.remote.rm({
                        cid: parsedCid,
                        service: this.options.pinningService.name
                    });
                }
                catch (error) {
                    console.warn('Failed to unpin from remote service:', error);
                    // Don't fail if remote unpin fails
                }
            }
            return true;
        }
        catch (error) {
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
    async getFileMetadata(cid) {
        this.ensureConnected();
        try {
            // Parse and validate CID
            const parsedCid = cid_1.CID.parse(cid);
            // Get file stats
            const stats = await this.client.files.stat(`/ipfs/${parsedCid.toString()}`);
            // Check pin status
            let isPinned = false;
            try {
                const pins = this.client.pin.ls({ paths: [parsedCid] });
                const pinArray = [];
                for await (const pin of pins) {
                    pinArray.push(pin);
                }
                isPinned = pinArray.length > 0;
            }
            catch (error) {
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
        }
        catch (error) {
            throw new Error(`Failed to get file metadata from IPFS: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    /**
     * Get the gateway URL for a CID
     *
     * @param cid Content identifier
     * @returns Gateway URL
     */
    getGatewayUrl(cid) {
        // Validate CID format before creating URL
        try {
            const parsedCid = cid_1.CID.parse(cid);
            return `${this.options.gatewayUrl}${parsedCid.toString()}`;
        }
        catch (error) {
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
    async store(data) {
        try {
            // Convert data to buffer
            const buffer = Buffer.from(JSON.stringify(data), 'utf8');
            // Add to IPFS
            const result = await this.client.add(buffer, {
                pin: this.options.defaultPin,
                cidVersion: 1
            });
            // Conservative fix: Return CID string instead of result object
            return result.cid.toString();
        }
        catch (error) {
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
    async retrieve(cid) {
        try {
            // Parse CID to validate format
            const parsedCid = cid_1.CID.parse(cid);
            // Get data from IPFS
            const chunks = [];
            for await (const chunk of this.client.cat(parsedCid)) {
                chunks.push(chunk);
            }
            // Combine chunks
            const buffer = Buffer.concat(chunks);
            return {
                success: true,
                data: buffer,
                contentType: 'application/json'
            };
        }
        catch (error) {
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
    async pin(cid) {
        try {
            const parsedCid = cid_1.CID.parse(cid);
            await this.client.pin.add(parsedCid);
            return true;
        }
        catch (error) {
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
    async unpin(cid) {
        try {
            const parsedCid = cid_1.CID.parse(cid);
            await this.client.pin.rm(parsedCid);
            return true;
        }
        catch (error) {
            console.error('IPFS unpin error:', error);
            return false;
        }
    }
    /**
     * Health check for circuit breaker
     *
     * @returns Health status
     */
    async healthCheck() {
        try {
            if (!this.client)
                return false;
            const id = await this.client.id();
            return !!id;
        }
        catch (error) {
            return false;
        }
    }
    /**
     * Create content hash for verification
     *
     * @param data Data to hash
     * @returns Content hash
     */
    static async createHash(data) {
        try {
            const bytes = new TextEncoder().encode(JSON.stringify(data));
            const hash = await sha2_1.sha256.digest(bytes);
            const cid = cid_1.CID.create(1, json.code, hash);
            return cid.toString();
        }
        catch (error) {
            throw new Error(`Failed to create hash: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    /**
     * Check if client is connected
     * Conservative fix: Match StorageProvider interface signature (async)
     *
     * @returns Connection status as Promise
     */
    async isConnected() {
        return Promise.resolve(this.connected && this.client !== null);
    }
    /**
     * Get current options
     *
     * @returns Current IPFS options
     */
    getOptions() {
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
    async storeWithResult(key, value) {
        try {
            const cid = await this.store(value);
            return { success: true, key, cid, size: JSON.stringify(value).length };
        }
        catch (error) {
            return { success: false, error: error.message };
        }
    }
    /**
     * Retrieve data with metadata
     * @param key Storage key/CID
     * @returns Data with metadata
     */
    async retrieveWithMetadata(key) {
        try {
            const result = await this.retrieve(key);
            return { ...result, key };
        }
        catch (error) {
            return { success: false, error: error.message };
        }
    }
    /**
     * Check if content exists
     * @param key Storage key/CID
     * @returns Existence status
     */
    async exists(key) {
        return this.fileExists(key);
    }
    /**
     * Get content metadata
     * @param key Storage key/CID
     * @returns Metadata
     */
    async getMetadata(key) {
        try {
            return await this.getFileMetadata(key);
        }
        catch (error) {
            return { error: error.message };
        }
    }
    /**
     * Ensure the client is connected
     *
     * @private
     * @throws Error if not connected
     */
    ensureConnected() {
        if (!this.connected || !this.client) {
            throw new Error('IPFS client is not connected. Call connect() first.');
        }
    }
}
exports.IPFSStorage = IPFSStorage;
//# sourceMappingURL=ipfs-storage.js.map