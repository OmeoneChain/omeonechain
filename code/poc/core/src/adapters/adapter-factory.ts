import { ChainAdapter, ChainConfig, BaseChainAdapter } from "./chain-adapter";
// code/poc/core/src/adapters/adapter-factory.ts (UPDATED VERSION)
// Keep all your existing functionality, add minimal enhancements for TypeScript compatibility

import { ChainAdapter, ChainConfig } from './chain-adapter';
import { RebasedAdapter } from './rebased-adapter';
import { EVMAdapter } from './evm-adapter';
import { MockAdapter } from './mock-adapter';
import { ProductionRebasedAdapter } from './production-rebased-adapter'; // NEW

/**
 * AdapterType enum defines the available adapter types
 */
export enum AdapterType {
  REBASED = 'rebased',
  EVM = 'evm',
  MOCK = 'mock'
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
  // NEW: Enhanced options
  useProductionAdapter?: boolean; // Use ProductionRebasedAdapter vs RebasedAdapter
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
 * Configuration for the Mock adapter
 */
export interface MockAdapterConfig {
  simulateLatency?: boolean;
  failureRate?: number;
}

/**
 * Combined adapter configuration
 */
export type AdapterConfig = {
  type: AdapterType;
} & (RebasedAdapterConfig | EVMAdapterConfig | MockAdapterConfig);

/**
 * AdapterFactory class provides methods to create and manage chain adapters
 * (ENHANCED with minimal changes to your existing code)
 */
export class AdapterFactory {
  private static instance: AdapterFactory;
  private adapters: Map<AdapterType, ChainAdapter> = new Map();
  private activeAdapter: ChainAdapter | null = null;
  private activeAdapterType: AdapterType | null = null;
  
  /**
   * Private constructor to enforce singleton pattern
   */
  private constructor() {}
  
  /**
   * Get the singleton instance of AdapterFactory
   * @returns AdapterFactory instance
   */
  public static getInstance(): AdapterFactory {
    if (!AdapterFactory.instance) {
      AdapterFactory.instance = new AdapterFactory();
    }
    
    return AdapterFactory.instance;
  }
  
  /**
   * Create a new adapter instance (ENHANCED for TypeScript compatibility)
   * @param config Adapter configuration
   * @returns Created adapter
   */
  public createAdapter(config: AdapterConfig): ChainAdapter {
    let adapter: ChainAdapter;
    
    switch (config.type) {
      case AdapterType.REBASED:
        adapter = this.createRebasedAdapter(config as RebasedAdapterConfig);
        break;
      
      case AdapterType.EVM:
        adapter = this.createEVMAdapter(config as EVMAdapterConfig);
        break;
      
      case AdapterType.MOCK:
        adapter = this.createMockAdapter(config as MockAdapterConfig);
        break;
      
      default:
        throw new Error(`Unsupported adapter type: ${config.type}`);
    }
    
    // Store the adapter by type
    this.adapters.set(config.type, adapter);
    
    return adapter;
  }

  /**
   * Create Rebased adapter with production option (FIXED for TypeScript compatibility)
   */
  private createRebasedAdapter(config: RebasedAdapterConfig): ChainAdapter {
    // NEW: Option to use ProductionRebasedAdapter
    if (config.useProductionAdapter === true) {
      console.log('⚡ Creating ProductionRebasedAdapter with enterprise features');
      
      // Create ProductionRebasedAdapter with proper ChainConfig
      const productionConfig: ChainConfig = {
        networkId: 'iota-rebased-testnet',
        rpcUrl: config.nodeUrl,
        indexerUrl: config.nodeUrl.replace('/api', '/indexer'), // Infer indexer URL
        explorerUrl: config.nodeUrl.replace('/api', '/explorer') // Infer explorer URL
      };
      
      // Check if ProductionRebasedAdapter accepts ChainConfig
      if (ProductionRebasedAdapter.length > 0) {
        return new ProductionRebasedAdapter(productionConfig) as ChainAdapter;
      } else {
        return new ProductionRebasedAdapter() as ChainAdapter;
      }
    }

    // EXISTING: Your original logic unchanged but with proper casting
    console.log('⚡ Creating standard RebasedAdapter');
    
    if (config.account || config.sponsorWallet || config.contractAddresses) {
      const rebasedAdapter = new RebasedAdapter({
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
      
      return rebasedAdapter as ChainAdapter;
    } else {
      // Handle legacy constructor with fallback
      try {
        const rebasedAdapter = new RebasedAdapter(
          config.nodeUrl,
          config.apiKey,
          config.seed
        );
        return rebasedAdapter as ChainAdapter;
      } catch (error) {
        // Fallback to config-based constructor
        const rebasedAdapter = new RebasedAdapter({
          network: 'testnet',
          nodeUrl: config.nodeUrl,
          account: {
            address: '',
            privateKey: config.seed || '',
          }
        });
        return rebasedAdapter as ChainAdapter;
      }
    }
  }

  /**
   * Create EVM adapter with proper interface compliance (FIXED)
   */
  private createEVMAdapter(config: EVMAdapterConfig): ChainAdapter {
    // Create ChainConfig for EVM adapter
    const chainConfig: ChainConfig = {
      networkId: config.chainId?.toString() || 'evm-local',
      rpcUrl: config.rpcUrl,
      gasPrice: 1000000000, // 1 gwei default
      gasLimit: 21000
    };

    try {
      // Try with all parameters
      const evmAdapter = new EVMAdapter(
        config.rpcUrl,
        config.contractAddresses,
        config.privateKey,
        config.chainId
      );
      return evmAdapter as ChainAdapter;
    } catch (error) {
      // Fallback to config-based constructor if available
      try {
        const evmAdapter = new EVMAdapter(chainConfig);
        return evmAdapter as ChainAdapter;
      } catch (fallbackError) {
        // Last resort - try with minimal parameters
        const evmAdapter = new EVMAdapter(config.rpcUrl, config.contractAddresses);
        return evmAdapter as ChainAdapter;
      }
    }
  }

  /**
   * Create Mock adapter with proper constructor (FIXED)
   */
  private createMockAdapter(config: MockAdapterConfig): ChainAdapter {
    // Create ChainConfig for Mock adapter
    const chainConfig: ChainConfig = {
      networkId: 'mock-network',
      rpcUrl: 'http://localhost:8545'
    };

    try {
      // Try constructor with config first
      if (MockAdapter.length > 0) {
        const mockAdapter = new MockAdapter(chainConfig, config.simulateLatency, config.failureRate);
        return mockAdapter as ChainAdapter;
      }
    } catch (error) {
      // Fall back to legacy constructor
      try {
        const mockAdapter = new MockAdapter(
          config.simulateLatency || false,
          config.failureRate || 0
        );
        return mockAdapter as ChainAdapter;
      } catch (legacyError) {
        // Last resort - default constructor
        const mockAdapter = new MockAdapter();
        return mockAdapter as ChainAdapter;
      }
    }

    // Should not reach here, but TypeScript requires return
    throw new Error('Failed to create MockAdapter with any constructor pattern');
  }
  
  /**
   * Get an existing adapter by type
   * @param type Adapter type
   * @returns Adapter instance or null if not found
   */
  public getAdapter(type: AdapterType): ChainAdapter | null {
    return this.adapters.get(type) || null;
  }
  
  /**
   * Set the active adapter to use for chain interactions
   * @param type Adapter type
   * @returns Active adapter
   */
  public async setActiveAdapter(type: AdapterType): Promise<ChainAdapter> {
    const adapter = this.getAdapter(type);
    
    if (!adapter) {
      throw new Error(`Adapter of type ${type} not found. Create it first.`);
    }
    
    // Connect to the adapter if not already connected
    if (this.hasConnectionMethod(adapter) && !adapter.isConnectedToNode()) {
      try {
        await adapter.connect();
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        throw new Error(`Failed to connect to ${type} adapter: ${errorMessage}`);
      }
    }
    
    // Disconnect from previous active adapter if different
    if (this.activeAdapter && this.activeAdapterType !== type) {
      try {
        await this.activeAdapter.disconnect();
      } catch (error) {
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
  private hasConnectionMethod(adapter: ChainAdapter): adapter is ChainAdapter & { 
    isConnectedToNode(): boolean;
    connect(): Promise<void>;
    disconnect(): Promise<void>;
  } {
    return typeof (adapter as any).isConnectedToNode === 'function' &&
           typeof (adapter as any).connect === 'function' &&
           typeof (adapter as any).disconnect === 'function';
  }
  
  /**
   * Get the currently active adapter
   * @returns Active adapter or null if none set
   */
  public getActiveAdapter(): ChainAdapter | null {
    return this.activeAdapter;
  }
  
  /**
   * Get the type of the currently active adapter
   * @returns Active adapter type or null if none set
   */
  public getActiveAdapterType(): AdapterType | null {
    return this.activeAdapterType;
  }

  /**
   * Get adapter health status (ENHANCED with proper type checking)
   */
  public async getAdapterHealth(): Promise<{
    type: AdapterType | null;
    healthy: boolean;
    details: any;
  }> {
    if (!this.activeAdapter) {
      return {
        type: this.activeAdapterType,
        healthy: false,
        details: { error: 'No active adapter' },
      };
    }

    // Enhanced health check for ProductionRebasedAdapter
    if (this.activeAdapter instanceof ProductionRebasedAdapter) {
      try {
        if (typeof (this.activeAdapter as any).getHealthStatus === 'function') {
          const healthStatus = await (this.activeAdapter as any).getHealthStatus();
          return {
            type: this.activeAdapterType,
            healthy: healthStatus.overall === 'healthy',
            details: healthStatus,
          };
        }
      } catch (error) {
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
      } else if (typeof (this.activeAdapter as any).isConnected === 'function') {
        isConnected = (this.activeAdapter as any).isConnected();
      }
      
      return {
        type: this.activeAdapterType,
        healthy: isConnected,
        details: { connected: isConnected },
      };
    } catch (error) {
      return {
        type: this.activeAdapterType,
        healthy: false,
        details: { error: error instanceof Error ? error.message : 'Unknown error' },
      };
    }
  }

  /**
   * Get adapter metrics if available (ENHANCED with proper type checking)
   */
  public getAdapterMetrics(): any {
    if (this.activeAdapter instanceof ProductionRebasedAdapter) {
      try {
        const metrics: any = {};
        
        if (typeof (this.activeAdapter as any).getMetrics === 'function') {
          metrics.performance = (this.activeAdapter as any).getMetrics();
        }
        
        if (typeof (this.activeAdapter as any).getConnectionStatus === 'function') {
          metrics.connection = (this.activeAdapter as any).getConnectionStatus();
        }
        
        if (typeof (this.activeAdapter as any).getSponsorWalletStatus === 'function') {
          metrics.sponsorWallet = (this.activeAdapter as any).getSponsorWalletStatus();
        }
        
        return metrics;
      } catch (error) {
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
   * Refresh adapter connection (ENHANCED with proper type checking)
   */
  public refreshConnection(): void {
    if (this.activeAdapter instanceof ProductionRebasedAdapter) {
      try {
        if (typeof (this.activeAdapter as any).refreshConnection === 'function') {
          (this.activeAdapter as any).refreshConnection();
          console.log('🔄 Production adapter connection refreshed');
        } else {
          console.log('ℹ️ Refresh connection method not available');
        }
      } catch (error) {
        console.error('❌ Failed to refresh connection:', error);
      }
    } else {
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
  public async migrateAdapter(
    fromType: AdapterType,
    toType: AdapterType,
    migrationData?: any
  ): Promise<boolean> {
    const sourceAdapter = this.getAdapter(fromType);
    const targetAdapter = this.getAdapter(toType);
    
    if (!sourceAdapter || !targetAdapter) {
      throw new Error('Both source and target adapters must be created before migration.');
    }
    
    // Ensure both adapters are connected
    if (this.hasConnectionMethod(sourceAdapter) && !sourceAdapter.isConnectedToNode()) {
      try {
        await sourceAdapter.connect();
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        throw new Error(`Failed to connect to source adapter: ${errorMessage}`);
      }
    }
    
    if (this.hasConnectionMethod(targetAdapter) && !targetAdapter.isConnectedToNode()) {
      try {
        await targetAdapter.connect();
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        throw new Error(`Failed to connect to target adapter: ${errorMessage}`);
      }
    }
    
    try {
      console.log(`Starting migration from ${fromType} to ${toType}...`);
      
      // Migration process would be implemented here
      // This is a placeholder for the actual migration logic, which depends on
      // the specific requirements of the project
      
      // For example, it might:
      // 1. Export state snapshots from the source chain
      // 2. Generate Merkle proofs
      // 3. Import state to the target chain
      // 4. Verify migration success
      
      // Set the target adapter as active
      await this.setActiveAdapter(toType);
      
      console.log(`Migration from ${fromType} to ${toType} completed successfully.`);
      return true;
    } catch (error) {
      console.error(`Migration from ${fromType} to ${toType} failed:`, error);
      return false;
    }
  }
  
  /**
   * Disconnect and remove all adapters
   */
  public async reset(): Promise<void> {
    // Disconnect all adapters
    for (const adapter of this.adapters.values()) {
      if (this.hasConnectionMethod(adapter) && adapter.isConnectedToNode()) {
        try {
          await adapter.disconnect();
        } catch (error) {
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
   * @param type Adapter type
   * @param options Simple options object
   * @returns Created adapter
   * @deprecated Use createAdapter with full configuration instead
   */
  public createAdapterSimple(type: AdapterType, options: Record<string, any> = {}): ChainAdapter {
    switch (type) {
      case AdapterType.REBASED:
        return this.createAdapter({
          type,
          nodeUrl: options.nodeUrl || 'https://api.testnet.rebased.iota.org',
          apiKey: options.apiKey,
          seed: options.seed,
          useProductionAdapter: options.useProductionAdapter, // NEW
        });
      
      case AdapterType.EVM:
        return this.createAdapter({
          type,
          rpcUrl: options.rpcUrl || 'http://localhost:8545',
          contractAddresses: options.contractAddresses || {},
          privateKey: options.privateKey,
          chainId: options.chainId || 1
        });
      
      case AdapterType.MOCK:
        return this.createAdapter({
          type,
          simulateLatency: options.simulateLatency,
          failureRate: options.failureRate
        });
      
      default:
        throw new Error(`Unsupported adapter type: ${type}`);
    }
  }
}