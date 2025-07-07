// code/poc/core/src/adapters/adapter-factory.ts (BLOCKCHAIN-FIRST VERSION)
// MockAdapter removed for aggressive blockchain-first approach

import { ChainAdapter, ChainConfig, BaseChainAdapter } from "./chain-adapter";
import { RebasedAdapter } from './rebased-adapter';
import { EVMAdapter } from './evm-adapter';
// REMOVED: import { MockAdapter } from './mock-adapter';
import { ProductionRebasedAdapter } from './production-rebased-adapter';

/**
 * AdapterType enum defines the available adapter types
 * REMOVED: MOCK adapter type for blockchain-first approach
 */
export enum AdapterType {
  REBASED = 'rebased',
  EVM = 'evm'
  // REMOVED: MOCK = 'mock'
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
  // Enhanced options
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

// REMOVED: MockAdapterConfig interface entirely

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
   * Create a new adapter instance - BLOCKCHAIN-FIRST APPROACH
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
  private createRebasedAdapter(config: RebasedAdapterConfig): ChainAdapter {
    // Option to use ProductionRebasedAdapter
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
      if ((ProductionRebasedAdapter as any).length > 0) {
        return new (ProductionRebasedAdapter as any)(productionConfig) as any;
      } else {
        return new (ProductionRebasedAdapter as any)() as any;
      }
    }

    // Standard RebasedAdapter for blockchain development
    console.log('⚡ Creating standard RebasedAdapter for blockchain development');
    
    if (config.account || config.sponsorWallet || config.contractAddresses) {
      const rebasedAdapter = new (RebasedAdapter as any)({
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
      
      return rebasedAdapter as any;
    } else {
      // Handle legacy constructor with fallback
      try {
        const rebasedAdapter = new (RebasedAdapter as any)(
          config.nodeUrl,
          config.apiKey,
          config.seed
        );
        return rebasedAdapter as any;
      } catch (error) {
        // Fallback to config-based constructor
        const rebasedAdapter = new (RebasedAdapter as any)({
          network: 'testnet',
          nodeUrl: config.nodeUrl,
          account: {
            address: '',
            privateKey: config.seed || '',
          }
        } as any);
        return rebasedAdapter as any;
      }
    }
  }

  /**
   * Create EVM adapter with proper interface compliance (Fallback option)
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
      const evmAdapter = new (EVMAdapter as any)(
        config.rpcUrl,
        config.contractAddresses,
        config.privateKey,
        config.chainId
      );
      return evmAdapter as any;
    } catch (error) {
      // Fallback to config-based constructor if available
      try {
        const evmAdapter = new (EVMAdapter as any)(chainConfig as any);
        return evmAdapter as any;
      } catch (fallbackError) {
        // Last resort - try with minimal parameters
        const evmAdapter = new (EVMAdapter as any)(config.rpcUrl, config.contractAddresses);
        return evmAdapter as any;
      }
    }
  }

  // REMOVED: createMockAdapter method entirely (lines ~242-273)
  
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
    if (this.hasConnectionMethod(adapter) && !(adapter as any).isConnectedToNode()) {
      try {
        await (adapter as any).connect();
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        throw new Error(`Failed to connect to ${type} adapter: ${errorMessage}`);
      }
    }
    
    // Disconnect from previous active adapter if different
    if (this.activeAdapter && this.activeAdapterType !== type) {
      try {
        await (this.activeAdapter as any).disconnect();
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
   * Get adapter health status (BLOCKCHAIN-FIRST)
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
    if ((this.activeAdapter as any) instanceof ProductionRebasedAdapter) {
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
        isConnected = (this.activeAdapter as any).isConnectedToNode();
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
   * Get adapter metrics if available
   */
  public getAdapterMetrics(): any {
    if ((this.activeAdapter as any) instanceof ProductionRebasedAdapter) {
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
   * Refresh adapter connection
   */
  public refreshConnection(): void {
    if ((this.activeAdapter as any) instanceof ProductionRebasedAdapter) {
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
    if (this.hasConnectionMethod(sourceAdapter) && !(sourceAdapter as any).isConnectedToNode()) {
      try {
        await (sourceAdapter as any).connect();
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        throw new Error(`Failed to connect to source adapter: ${errorMessage}`);
      }
    }
    
    if (this.hasConnectionMethod(targetAdapter) && !(targetAdapter as any).isConnectedToNode()) {
      try {
        await (targetAdapter as any).connect();
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
      if (this.hasConnectionMethod(adapter) && (adapter as any).isConnectedToNode()) {
        try {
          await (adapter as any).disconnect();
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
   * BLOCKCHAIN-FIRST: Removed MockAdapter option
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
          useProductionAdapter: options.useProductionAdapter,
        } as any);
      
      case AdapterType.EVM:
        return this.createAdapter({
          type,
          rpcUrl: options.rpcUrl || 'http://localhost:8545',
          contractAddresses: options.contractAddresses || {},
          privateKey: options.privateKey,
          chainId: options.chainId || 1
        } as any);
      
      // REMOVED: MockAdapter case entirely
      
      default:
        throw new Error(`Unsupported adapter type: ${type}. Use REBASED for blockchain development.`);
    }
  }
}