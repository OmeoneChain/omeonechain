"use strict";
// code/poc/core/src/adapters/adapter-factory.ts (BLOCKCHAIN-FIRST VERSION)
// MockAdapter removed for aggressive blockchain-first approach
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdapterFactory = exports.AdapterType = void 0;
const rebased_adapter_1 = require("./rebased-adapter");
const evm_adapter_1 = require("./evm-adapter");
// REMOVED: import { MockAdapter } from './mock-adapter';
const production_rebased_adapter_1 = require("./production-rebased-adapter");
/**
 * AdapterType enum defines the available adapter types
 * REMOVED: MOCK adapter type for blockchain-first approach
 */
var AdapterType;
(function (AdapterType) {
    AdapterType["REBASED"] = "rebased";
    AdapterType["EVM"] = "evm";
    // REMOVED: MOCK = 'mock'
})(AdapterType || (exports.AdapterType = AdapterType = {}));
/**
 * AdapterFactory class provides methods to create and manage chain adapters
 * BLOCKCHAIN-FIRST: Focused on RebasedAdapter and EVMAdapter only
 */
class AdapterFactory {
    /**
     * Private constructor to enforce singleton pattern
     */
    constructor() {
        this.adapters = new Map();
        this.activeAdapter = null;
        this.activeAdapterType = null;
    }
    /**
     * Get the singleton instance of AdapterFactory
     * @returns AdapterFactory instance
     */
    static getInstance() {
        if (!AdapterFactory.instance) {
            AdapterFactory.instance = new AdapterFactory();
        }
        return AdapterFactory.instance;
    }
    /**
     * Create a new adapter instance - BLOCKCHAIN-FIRST APPROACH
     * @param config Adapter configuration
     * @returns Created adapter
     */
    createAdapter(config) {
        let adapter;
        switch (config.type) {
            case AdapterType.REBASED:
                adapter = this.createRebasedAdapter(config);
                break;
            case AdapterType.EVM:
                adapter = this.createEVMAdapter(config);
                break;
            // REMOVED: MockAdapter case entirely
            default:
                throw new Error(`Unsupported adapter type: ${config.type}. Use REBASED for blockchain development.`);
        }
        // Store the adapter by type
        this.adapters.set(config.type, adapter);
        return adapter;
    }
    /**
     * Create Rebased adapter with production option (BLOCKCHAIN-FIRST)
     */
    createRebasedAdapter(config) {
        // Option to use ProductionRebasedAdapter
        if (config.useProductionAdapter === true) {
            console.log('⚡ Creating ProductionRebasedAdapter with enterprise features');
            // Create ProductionRebasedAdapter with proper ChainConfig
            const productionConfig = {
                networkId: 'iota-rebased-testnet',
                rpcUrl: config.nodeUrl,
                indexerUrl: config.nodeUrl.replace('/api', '/indexer'), // Infer indexer URL
                explorerUrl: config.nodeUrl.replace('/api', '/explorer') // Infer explorer URL
            };
            // Check if ProductionRebasedAdapter accepts ChainConfig
            if (production_rebased_adapter_1.ProductionRebasedAdapter.length > 0) {
                return new production_rebased_adapter_1.ProductionRebasedAdapter(productionConfig);
            }
            else {
                return new production_rebased_adapter_1.ProductionRebasedAdapter();
            }
        }
        // Standard RebasedAdapter for blockchain development
        console.log('⚡ Creating standard RebasedAdapter for blockchain development');
        if (config.account || config.sponsorWallet || config.contractAddresses) {
            const rebasedAdapter = new rebased_adapter_1.RebasedAdapter({
                network: 'testnet',
                nodeUrl: config.nodeUrl,
                account: config.account || {
                    address: '',
                    privateKey: config.seed || '',
                },
                sponsorWallet: config.sponsorWallet,
                contractAddresses: config.contractAddresses || {
                    recommendation: '0x4f6d656f6e654368e4b8bce8a18de6bd8a8e5ddb',
                    reputation: '0x4f6d656f6e655265e4b8bce8a18de6bd8a8e5dda',
                    token: '0x4f6d656f6e6554e4b8bce8a18de6bd8a8e5dcc1',
                    governance: '0x4f6d656f6e65476f7665726e616e63655ddc7',
                    service: '0x4f6d656f6e65536572766963655ddc8',
                },
                options: config.options
            });
            return rebasedAdapter;
        }
        else {
            // Handle legacy constructor with fallback
            try {
                const rebasedAdapter = new rebased_adapter_1.RebasedAdapter(config.nodeUrl, config.apiKey, config.seed);
                return rebasedAdapter;
            }
            catch (error) {
                // Fallback to config-based constructor
                const rebasedAdapter = new rebased_adapter_1.RebasedAdapter({
                    network: 'testnet',
                    nodeUrl: config.nodeUrl,
                    account: {
                        address: '',
                        privateKey: config.seed || '',
                    }
                });
                return rebasedAdapter;
            }
        }
    }
    /**
     * Create EVM adapter with proper interface compliance (Fallback option)
     */
    createEVMAdapter(config) {
        // Create ChainConfig for EVM adapter
        const chainConfig = {
            networkId: config.chainId?.toString() || 'evm-local',
            rpcUrl: config.rpcUrl,
            gasPrice: 1000000000, // 1 gwei default
            gasLimit: 21000
        };
        try {
            // Try with all parameters
            const evmAdapter = new evm_adapter_1.EVMAdapter(config.rpcUrl, config.contractAddresses, config.privateKey, config.chainId);
            return evmAdapter;
        }
        catch (error) {
            // Fallback to config-based constructor if available
            try {
                const evmAdapter = new evm_adapter_1.EVMAdapter(chainConfig);
                return evmAdapter;
            }
            catch (fallbackError) {
                // Last resort - try with minimal parameters
                const evmAdapter = new evm_adapter_1.EVMAdapter(config.rpcUrl, config.contractAddresses);
                return evmAdapter;
            }
        }
    }
    // REMOVED: createMockAdapter method entirely (lines ~242-273)
    /**
     * Get an existing adapter by type
     * @param type Adapter type
     * @returns Adapter instance or null if not found
     */
    getAdapter(type) {
        return this.adapters.get(type) || null;
    }
    /**
     * Set the active adapter to use for chain interactions
     * @param type Adapter type
     * @returns Active adapter
     */
    async setActiveAdapter(type) {
        const adapter = this.getAdapter(type);
        if (!adapter) {
            throw new Error(`Adapter of type ${type} not found. Create it first.`);
        }
        // Connect to the adapter if not already connected
        if (this.hasConnectionMethod(adapter) && !adapter.isConnectedToNode()) {
            try {
                await adapter.connect();
            }
            catch (error) {
                const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                throw new Error(`Failed to connect to ${type} adapter: ${errorMessage}`);
            }
        }
        // Disconnect from previous active adapter if different
        if (this.activeAdapter && this.activeAdapterType !== type) {
            try {
                await this.activeAdapter.disconnect();
            }
            catch (error) {
                const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                console.warn(`Warning: Failed to disconnect from previous adapter: ${errorMessage}`);
            }
        }
        this.activeAdapter = adapter;
        this.activeAdapterType = type;
        return adapter;
    }
    /**
     * Type guard to check if adapter has connection methods
     */
    hasConnectionMethod(adapter) {
        return typeof adapter.isConnectedToNode === 'function' &&
            typeof adapter.connect === 'function' &&
            typeof adapter.disconnect === 'function';
    }
    /**
     * Get the currently active adapter
     * @returns Active adapter or null if none set
     */
    getActiveAdapter() {
        return this.activeAdapter;
    }
    /**
     * Get the type of the currently active adapter
     * @returns Active adapter type or null if none set
     */
    getActiveAdapterType() {
        return this.activeAdapterType;
    }
    /**
     * Get adapter health status (BLOCKCHAIN-FIRST)
     */
    async getAdapterHealth() {
        if (!this.activeAdapter) {
            return {
                type: this.activeAdapterType,
                healthy: false,
                details: { error: 'No active adapter' },
            };
        }
        // Enhanced health check for ProductionRebasedAdapter
        if (this.activeAdapter instanceof production_rebased_adapter_1.ProductionRebasedAdapter) {
            try {
                if (typeof this.activeAdapter.getHealthStatus === 'function') {
                    const healthStatus = await this.activeAdapter.getHealthStatus();
                    return {
                        type: this.activeAdapterType,
                        healthy: healthStatus.overall === 'healthy',
                        details: healthStatus,
                    };
                }
            }
            catch (error) {
                return {
                    type: this.activeAdapterType,
                    healthy: false,
                    details: { error: 'Health check failed' },
                };
            }
        }
        // Basic health check for other adapters
        try {
            let isConnected = true;
            if (this.hasConnectionMethod(this.activeAdapter)) {
                isConnected = this.activeAdapter.isConnectedToNode();
            }
            else if (typeof this.activeAdapter.isConnected === 'function') {
                isConnected = this.activeAdapter.isConnected();
            }
            return {
                type: this.activeAdapterType,
                healthy: isConnected,
                details: { connected: isConnected },
            };
        }
        catch (error) {
            return {
                type: this.activeAdapterType,
                healthy: false,
                details: { error: error instanceof Error ? error.message : 'Unknown error' },
            };
        }
    }
    /**
     * Get adapter metrics if available
     */
    getAdapterMetrics() {
        if (this.activeAdapter instanceof production_rebased_adapter_1.ProductionRebasedAdapter) {
            try {
                const metrics = {};
                if (typeof this.activeAdapter.getMetrics === 'function') {
                    metrics.performance = this.activeAdapter.getMetrics();
                }
                if (typeof this.activeAdapter.getConnectionStatus === 'function') {
                    metrics.connection = this.activeAdapter.getConnectionStatus();
                }
                if (typeof this.activeAdapter.getSponsorWalletStatus === 'function') {
                    metrics.sponsorWallet = this.activeAdapter.getSponsorWalletStatus();
                }
                return metrics;
            }
            catch (error) {
                return {
                    type: this.activeAdapterType,
                    error: 'Failed to get metrics',
                };
            }
        }
        return {
            type: this.activeAdapterType,
            note: 'Metrics only available for ProductionRebasedAdapter',
        };
    }
    /**
     * Refresh adapter connection
     */
    refreshConnection() {
        if (this.activeAdapter instanceof production_rebased_adapter_1.ProductionRebasedAdapter) {
            try {
                if (typeof this.activeAdapter.refreshConnection === 'function') {
                    this.activeAdapter.refreshConnection();
                    console.log('🔄 Production adapter connection refreshed');
                }
                else {
                    console.log('ℹ️ Refresh connection method not available');
                }
            }
            catch (error) {
                console.error('❌ Failed to refresh connection:', error);
            }
        }
        else {
            console.log('ℹ️ Connection refresh only available for ProductionRebasedAdapter');
        }
    }
    /**
     * Migrate from one adapter to another, transferring state if possible
     * @param fromType Source adapter type
     * @param toType Target adapter type
     * @param migrationData Additional data needed for migration
     * @returns Success status
     */
    async migrateAdapter(fromType, toType, migrationData) {
        const sourceAdapter = this.getAdapter(fromType);
        const targetAdapter = this.getAdapter(toType);
        if (!sourceAdapter || !targetAdapter) {
            throw new Error('Both source and target adapters must be created before migration.');
        }
        // Ensure both adapters are connected
        if (this.hasConnectionMethod(sourceAdapter) && !sourceAdapter.isConnectedToNode()) {
            try {
                await sourceAdapter.connect();
            }
            catch (error) {
                const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                throw new Error(`Failed to connect to source adapter: ${errorMessage}`);
            }
        }
        if (this.hasConnectionMethod(targetAdapter) && !targetAdapter.isConnectedToNode()) {
            try {
                await targetAdapter.connect();
            }
            catch (error) {
                const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                throw new Error(`Failed to connect to target adapter: ${errorMessage}`);
            }
        }
        try {
            console.log(`Starting migration from ${fromType} to ${toType}...`);
            // Migration process would be implemented here
            // This is a placeholder for the actual migration logic, which depends on
            // the specific requirements of the project
            // Set the target adapter as active
            await this.setActiveAdapter(toType);
            console.log(`Migration from ${fromType} to ${toType} completed successfully.`);
            return true;
        }
        catch (error) {
            console.error(`Migration from ${fromType} to ${toType} failed:`, error);
            return false;
        }
    }
    /**
     * Disconnect and remove all adapters
     */
    async reset() {
        // Disconnect all adapters
        for (const adapter of this.adapters.values()) {
            if (this.hasConnectionMethod(adapter) && adapter.isConnectedToNode()) {
                try {
                    await adapter.disconnect();
                }
                catch (error) {
                    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                    console.warn(`Warning: Failed to disconnect adapter: ${errorMessage}`);
                }
            }
        }
        // Clear the adapters map
        this.adapters.clear();
        this.activeAdapter = null;
        this.activeAdapterType = null;
    }
    /**
     * Create a specific adapter instance using simple parameters
     * BLOCKCHAIN-FIRST: Removed MockAdapter option
     * @param type Adapter type
     * @param options Simple options object
     * @returns Created adapter
     * @deprecated Use createAdapter with full configuration instead
     */
    createAdapterSimple(type, options = {}) {
        switch (type) {
            case AdapterType.REBASED:
                return this.createAdapter({
                    type,
                    nodeUrl: options.nodeUrl || 'https://api.testnet.rebased.iota.org',
                    apiKey: options.apiKey,
                    seed: options.seed,
                    useProductionAdapter: options.useProductionAdapter,
                });
            case AdapterType.EVM:
                return this.createAdapter({
                    type,
                    rpcUrl: options.rpcUrl || 'http://localhost:8545',
                    contractAddresses: options.contractAddresses || {},
                    privateKey: options.privateKey,
                    chainId: options.chainId || 1
                });
            // REMOVED: MockAdapter case entirely
            default:
                throw new Error(`Unsupported adapter type: ${type}. Use REBASED for blockchain development.`);
        }
    }
}
exports.AdapterFactory = AdapterFactory;
//# sourceMappingURL=adapter-factory.js.map