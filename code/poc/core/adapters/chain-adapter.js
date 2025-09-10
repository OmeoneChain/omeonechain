/**
 * Chain Adapter Interface
 *
 * Provides a common interface for different blockchain implementations
 * Based on Technical Specifications A.1.3 (Blockchain Abstraction Layer)
 * Updated to fix TypeScript compatibility issues
 */
/**
 * Abstract base class for chain adapters
 * Provides common functionality and structure
 */
export class BaseChainAdapter {
    constructor(config) {
        this.connected = false;
        this.config = config;
    }
    /**
     * Default health check implementation
     */
    async healthCheck() {
        try {
            await this.getChainId();
            return true;
        }
        catch (error) {
            return false;
        }
    }
    /**
     * Default network info implementation
     */
    async getNetworkInfo() {
        try {
            const chainId = await this.getChainId();
            const currentCommit = await this.getCurrentCommit();
            const isHealthy = await this.healthCheck();
            return {
                chainId,
                currentCommit,
                networkStatus: isHealthy ? 'healthy' : 'down',
                lastUpdate: new Date().toISOString()
            };
        }
        catch (error) {
            return {
                chainId: 'unknown',
                currentCommit: 0,
                networkStatus: 'down',
                lastUpdate: new Date().toISOString()
            };
        }
    }
    /**
     * Check if adapter is connected
     */
    isConnected() {
        return this.connected;
    }
    /**
     * Get adapter configuration
     */
    getConfig() {
        return { ...this.config };
    }
}
