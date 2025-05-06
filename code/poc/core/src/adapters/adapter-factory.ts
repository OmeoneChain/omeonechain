import { ChainAdapter } from '../types/chain';
import { RebasedAdapter } from './rebased-adapter';
import { EVMAdapter } from './evm-adapter';
import { MockAdapter } from './mock-adapter'; // Assuming this exists for testing

/**
 * AdapterType enum defines the available adapter types
 */
export enum AdapterType {
  REBASED = 'rebased',
  EVM = 'evm',
  MOCK = 'mock'
}

/**
 * Configuration for the Rebased adapter
 */
export interface RebasedAdapterConfig {
  nodeUrl: string;
  apiKey?: string;
  seed?: string;
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
export type AdapterConfig = RebasedAdapterConfig | EVMAdapterConfig | MockAdapterConfig;

/**
 * AdapterFactory class provides methods to create and manage chain adapters
 */
export class AdapterFactory {
  private static instance: AdapterFactory;
  private adapters: Map<string, ChainAdapter> = new Map();
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
   * Create a new adapter instance
   * @param type Adapter type
   * @param config Adapter configuration
   * @returns Created adapter
   */
  public createAdapter(type: AdapterType, config: AdapterConfig): ChainAdapter {
    let adapter: ChainAdapter;
    
    switch (type) {
      case AdapterType.REBASED:
        const rebasedConfig = config as RebasedAdapterConfig;
        adapter = new RebasedAdapter(
          rebasedConfig.nodeUrl,
          rebasedConfig.apiKey,
          rebasedConfig.seed
        );
        break;
      
      case AdapterType.EVM:
        const evmConfig = config as EVMAdapterConfig;
        adapter = new EVMAdapter(
          evmConfig.rpcUrl,
          evmConfig.contractAddresses,
          evmConfig.privateKey,
          evmConfig.chainId
        );
        break;
      
      case AdapterType.MOCK:
        const mockConfig = config as MockAdapterConfig;
        adapter = new MockAdapter(
          mockConfig.simulateLatency || false,
          mockConfig.failureRate || 0
        );
        break;
      
      default:
        throw new Error(`Unsupported adapter type: ${type}`);
    }
    
    // Store the adapter by type
    this.adapters.set(type, adapter);
    
    return adapter;
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
    if (!adapter.isConnectedToNode()) {
      const connected = await adapter.connect();
      
      if (!connected) {
        throw new Error(`Failed to connect to ${type} adapter.`);
      }
    }
    
    // Disconnect from previous active adapter if different
    if (this.activeAdapter && this.activeAdapterType !== type) {
      await this.activeAdapter.disconnect();
    }
    
    this.activeAdapter = adapter;
    this.activeAdapterType = type;
    
    return adapter;
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
    if (!sourceAdapter.isConnectedToNode()) {
      await sourceAdapter.connect();
    }
    
    if (!targetAdapter.isConnectedToNode()) {
      await targetAdapter.connect();
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
      if (adapter.isConnectedToNode()) {
        await adapter.disconnect();
      }
    }
    
    // Clear the adapters map
    this.adapters.clear();
    this.activeAdapter = null;
    this.activeAdapterType = null;
  }
}
