"use strict";
/**
 * Storage Provider Interface
 *
 * Defines the common interface for different storage implementations
 * Based on Technical Specifications A.3.4
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseStorageProvider = void 0;
/**
 * Base storage provider class with default implementations
 * Can be extended by specific storage provider implementations
 */
class BaseStorageProvider {
    // File methods (can be implemented in terms of core methods)
    async storeFile(data, mimeType, metadata, options) {
        const key = this.generateFileKey(mimeType, metadata);
        return this.store(key, { data, mimeType, metadata, ...options });
    }
    async retrieveFile(cid, options) {
        const result = await this.retrieve(cid);
        return result.data;
    }
    // Default implementations
    async exists(key) {
        try {
            await this.retrieve(key);
            return true;
        }
        catch {
            return false;
        }
    }
    async fileExists(cid) {
        return this.exists(cid);
    }
    async storeWithResult(data, options) {
        const key = this.generateKey();
        const cid = await this.store(key, data);
        return {
            cid,
            size: this.calculateSize(data),
            timestamp: new Date(),
            metadata: options
        };
    }
    async retrieveWithMetadata(cid, options) {
        const data = await this.retrieve(cid);
        const metadata = await this.getMetadata(cid);
        return {
            data,
            metadata: {
                ...metadata, // CONSERVATIVE FIX: Spread first to avoid conflicts
                size: metadata.size,
                mimeType: 'application/octet-stream',
                created: metadata.created
            },
            cid
        };
    }
    async getMetadata(key) {
        // Default implementation - should be overridden by specific providers
        const data = await this.retrieve(key);
        return {
            size: this.calculateSize(data),
            created: new Date(),
        };
    }
    async getFileMetadata(cid) {
        const result = await this.retrieve(cid);
        return {
            size: this.calculateSize(result.data || result),
            mimeType: result.mimeType || 'application/octet-stream',
            created: new Date(),
            ...result.metadata
        }; // CONSERVATIVE FIX: Prevent duplicate property conflicts
    }
    async isConnected() {
        return true; // Default implementation
    }
    // Utility methods
    generateKey() {
        return `key_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    generateFileKey(mimeType, metadata) {
        const ext = this.getFileExtension(mimeType);
        return `file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}${ext}`;
    }
    getFileExtension(mimeType) {
        const mimeMap = {
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
    calculateSize(data) {
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
exports.BaseStorageProvider = BaseStorageProvider;
// CONSERVATIVE FIX: Removed duplicate re-exports to prevent conflicts
// The interfaces and classes are already exported above
//# sourceMappingURL=storage-provider.js.map