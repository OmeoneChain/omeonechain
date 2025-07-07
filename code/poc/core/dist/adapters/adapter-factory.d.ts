import { ChainAdapter } from "./chain-adapter";
/**
 * AdapterType enum defines the available adapter types
 * REMOVED: MOCK adapter type for blockchain-first approach
 */
export declare enum AdapterType {
    REBASED = "rebased",
    EVM = "evm"
}
/**
 * Configuration for the Rebased adapter (ENHANCED)
 */
export interface RebasedAdapterConfig {
    nodeUrl: string;
    apiKey?: string;
    seed?: string;
    account?: {
        address: string;
        privateKey: string;
    };
    sponsorWallet?: {
        address: string;
        privateKey: string;
    };
    contractAddresses?: {
        recommendation: string;
        reputation: string;
        token: string;
        governance: string;
        service: string;
    };
    options?: {
        retryAttempts?: number;
        maxFeePerTransaction?: number;
        timeoutMs?: number;
    };
    useProductionAdapter?: boolean;
    enableMetrics?: boolean;
    enableCache?: boolean;
}
/**
 * Configuration for the EVM adapter
 */
export interface EVMAdapterConfig {
    rpcUrl: string;
    contractAddresses: Record<string, string>;
    privateKey?: string;
    chainId?: number;
}
/**
 * Combined adapter configuration
 * REMOVED: MockAdapterConfig from union type
 */
export type AdapterConfig = {
    type: AdapterType;
} & (RebasedAdapterConfig | EVMAdapterConfig);
/**
 * AdapterFactory class provides methods to create and manage chain adapters
 * BLOCKCHAIN-FIRST: Focused on RebasedAdapter and EVMAdapter only
 */
export declare class AdapterFactory {
    private static instance;
    private adapters;
    private activeAdapter;
    private activeAdapterType;
    /**
     * Private constructor to enforce singleton pattern
     */
    private constructor();
    /**
     * Get the singleton instance of AdapterFactory
     * @returns AdapterFactory instance
     */
    static getInstance(): AdapterFactory;
    /**
     * Create a new adapter instance - BLOCKCHAIN-FIRST APPROACH
     * @param config Adapter configuration
     * @returns Created adapter
     */
    createAdapter(config: AdapterConfig): ChainAdapter;
    /**
     * Create Rebased adapter with production option (BLOCKCHAIN-FIRST)
     */
    private createRebasedAdapter;
    /**
     * Create EVM adapter with proper interface compliance (Fallback option)
     */
    private createEVMAdapter;
    /**
     * Get an existing adapter by type
     * @param type Adapter type
     * @returns Adapter instance or null if not found
     */
    getAdapter(type: AdapterType): ChainAdapter | null;
    /**
     * Set the active adapter to use for chain interactions
     * @param type Adapter type
     * @returns Active adapter
     */
    setActiveAdapter(type: AdapterType): Promise<ChainAdapter>;
    /**
     * Type guard to check if adapter has connection methods
     */
    private hasConnectionMethod;
    /**
     * Get the currently active adapter
     * @returns Active adapter or null if none set
     */
    getActiveAdapter(): ChainAdapter | null;
    /**
     * Get the type of the currently active adapter
     * @returns Active adapter type or null if none set
     */
    getActiveAdapterType(): AdapterType | null;
    /**
     * Get adapter health status (BLOCKCHAIN-FIRST)
     */
    getAdapterHealth(): Promise<{
        type: AdapterType | null;
        healthy: boolean;
        details: any;
    }>;
    /**
     * Get adapter metrics if available
     */
    getAdapterMetrics(): any;
    /**
     * Refresh adapter connection
     */
    refreshConnection(): void;
    /**
     * Migrate from one adapter to another, transferring state if possible
     * @param fromType Source adapter type
     * @param toType Target adapter type
     * @param migrationData Additional data needed for migration
     * @returns Success status
     */
    migrateAdapter(fromType: AdapterType, toType: AdapterType, migrationData?: any): Promise<boolean>;
    /**
     * Disconnect and remove all adapters
     */
    reset(): Promise<void>;
    /**
     * Create a specific adapter instance using simple parameters
     * BLOCKCHAIN-FIRST: Removed MockAdapter option
     * @param type Adapter type
     * @param options Simple options object
     * @returns Created adapter
     * @deprecated Use createAdapter with full configuration instead
     */
    createAdapterSimple(type: AdapterType, options?: Record<string, any>): ChainAdapter;
}
