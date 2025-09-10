/**
 * Mock IPFS Storage Provider
 *
 * Temporary mock implementation to bypass ipfs-http-client dependency issues
 * This removes the problematic import while maintaining interface compatibility
 */
/**
 * Default mock options
 */
const DEFAULT_OPTIONS = {
    apiUrl: 'https://ipfs.infura.io:5001',
    gatewayUrl: 'https://ipfs.io/ipfs/',
    defaultPin: true,
    timeout: 30000
};
/**
 * Mock IPFS implementation - logs actions but doesn't actually use IPFS
 */
export class IPFSStorage {
    constructor(options = {}) {
        this.connected = false;
        this.mockCidCounter = 1;
        this.mockStorage = new Map();
        this.options = { ...DEFAULT_OPTIONS, ...options };
        console.log('🔧 Mock IPFS Storage initialized with options:', this.options);
    }
    get supportsRetrieval() {
        return true;
    }
    get supportsDeletion() {
        return true;
    }
    async connect(options) {
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
    async disconnect() {
        this.connected = false;
        console.log('🔌 Mock IPFS disconnected');
    }
    async storeFile(data, mimeType, metadata, options) {
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
    async retrieveFile(cid) {
        this.ensureConnected();
        const stored = this.mockStorage.get(cid);
        if (!stored) {
            throw new Error(`Mock IPFS: File not found with CID ${cid}`);
        }
        console.log('📥 Mock IPFS retrieved file:', cid);
        // Convert data to Buffer
        if (Buffer.isBuffer(stored.data)) {
            return stored.data;
        }
        else if (typeof stored.data === 'string') {
            return Buffer.from(stored.data, 'utf8');
        }
        else {
            return Buffer.from(JSON.stringify(stored.data), 'utf8');
        }
    }
    async fileExists(cid) {
        this.ensureConnected();
        const exists = this.mockStorage.has(cid);
        console.log('🔍 Mock IPFS file exists check:', cid, '→', exists);
        return exists;
    }
    async deleteFile(cid) {
        this.ensureConnected();
        const deleted = this.mockStorage.delete(cid);
        console.log('🗑️ Mock IPFS deleted file:', cid, '→', deleted);
        return deleted;
    }
    async getFileMetadata(cid) {
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
    getGatewayUrl(cid) {
        const url = `${this.options.gatewayUrl}${cid}`;
        console.log('🔗 Mock IPFS gateway URL:', cid, '→', url);
        return url;
    }
    async store(data) {
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
    async retrieve(cid) {
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
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown retrieval error'
            };
        }
    }
    async pin(cid) {
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
    async unpin(cid) {
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
    async healthCheck() {
        const healthy = this.connected;
        console.log('❤️ Mock IPFS health check:', healthy);
        return healthy;
    }
    static async createHash(data) {
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
    async isConnected() {
        return Promise.resolve(this.connected);
    }
    getOptions() {
        return { ...this.options };
    }
    // Additional StorageProvider interface methods
    async storeWithResult(key, value) {
        try {
            const cid = await this.store(value);
            const result = { success: true, key, cid, size: JSON.stringify(value).length };
            console.log('✅ Mock IPFS store with result:', result);
            return result;
        }
        catch (error) {
            const result = { success: false, error: error.message };
            console.log('❌ Mock IPFS store failed:', result);
            return result;
        }
    }
    async retrieveWithMetadata(key) {
        try {
            const result = await this.retrieve(key);
            const enhanced = { ...result, key };
            console.log('✅ Mock IPFS retrieve with metadata:', key, enhanced.success);
            return enhanced;
        }
        catch (error) {
            const result = { success: false, error: error.message };
            console.log('❌ Mock IPFS retrieve failed:', result);
            return result;
        }
    }
    async exists(key) {
        return this.fileExists(key);
    }
    async getMetadata(key) {
        try {
            const metadata = await this.getFileMetadata(key);
            console.log('ℹ️ Mock IPFS get metadata success:', key);
            return metadata;
        }
        catch (error) {
            const result = { error: error.message };
            console.log('❌ Mock IPFS get metadata failed:', result);
            return result;
        }
    }
    ensureConnected() {
        if (!this.connected) {
            throw new Error('Mock IPFS client is not connected. Call connect() first.');
        }
    }
    getDataSize(data) {
        if (Buffer.isBuffer(data)) {
            return data.length;
        }
        else if (typeof data === 'string') {
            return Buffer.byteLength(data, 'utf8');
        }
        else {
            return Buffer.byteLength(JSON.stringify(data), 'utf8');
        }
    }
}
// Export alias for compatibility
export const IPFSStorageProvider = IPFSStorage;
