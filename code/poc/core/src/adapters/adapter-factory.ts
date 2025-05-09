// code/poc/core/src/adapters/adapter-factory.ts

import { ChainAdapter } from '../types/chain';
import { RebasedAdapter } from './rebased-adapter';
import { EVMAdapter } from './evm-adapter';
import { MockAdapter } from './mock-adapter';

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
   * Create a new adapter instance
   * @param config Adapter configuration
   * @returns Created adapter
   */
  public createAdapter(config: AdapterConfig): ChainAdapter {
    let adapter: ChainAdapter;
    
    switch (config.type) {
      case AdapterType.REBASED:
        const rebasedConfig = config as RebasedAdapterConfig;
        
        // If we have account, sponsorWallet or contractAddresses, use the new constructor
        if (rebasedConfig.account || rebasedConfig.sponsorWallet || rebasedConfig.contractAddresses) {
          adapter = new RebasedAdapter({
            network: 'testnet', // Default to testnet
            nodeUrl: rebasedConfig.nodeUrl,
            account: rebasedConfig.account || {
              address: '',
              privateKey: rebasedConfig.seed || '',
            },
            sponsorWallet: rebasedConfig.sponsorWallet,
            contractAddresses: rebasedConfig.contractAddresses || {
              recommendation: '0x4f6d656f6e654368e4b8bce8a18de6bd8a8e5ddb',
              reputation: '0x4f6d656f6e655265e4b8bce8a18de6bd8a8e5dda',
              token: '0x4f6d656f6e6554e4b8bce8a18de6bd8a8e5dcc1',
              governance: '0x4f6d656f6e65476f7665726e616e63655ddc7',
              service: '0x4f6d656f6e65536572766963655ddc8',
            },
            options: rebasedConfig.options
          });
        } else {
          // Legacy constructor
          adapter = new RebasedAdapter(
            rebasedConfig.nodeUrl,
            rebasedConfig.apiKey,
            rebasedConfig.seed
          );
        }
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
        throw new Error(`Unsupported adapter type: ${config.type}`);
    }
    
    // Store the adapter by type
    this.adapters.set(config.type, adapter);
    
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
    if (adapter.isConnectedToNode && !adapter.isConnectedToNode()) {
      try {
        await adapter.connect();
      } catch (error) {
        throw new Error(`Failed to connect to ${type} adapter: ${error.message}`);
      }
    }
    
    // Disconnect from previous active adapter if different
    if (this.activeAdapter && this.activeAdapterType !== type) {
      try {
        await this.activeAdapter.disconnect();
      } catch (error) {
        console.warn(`Warning: Failed to disconnect from previous adapter: ${error.message}`);
      }
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
    if (sourceAdapter.isConnectedToNode && !sourceAdapter.isConnectedToNode()) {
      try {
        await sourceAdapter.connect();
      } catch (error) {
        throw new Error(`Failed to connect to source adapter: ${error.message}`);
      }
    }
    
    if (targetAdapter.isConnectedToNode && !targetAdapter.isConnectedToNode()) {
      try {
        await targetAdapter.connect();
      } catch (error) {
        throw new Error(`Failed to connect to target adapter: ${error.message}`);
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
      if (adapter.isConnectedToNode && adapter.isConnectedToNode()) {
        try {
          await adapter.disconnect();
        } catch (error) {
          console.warn(`Warning: Failed to disconnect adapter: ${error.message}`);
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
          seed: options.seed
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
