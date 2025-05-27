/**
 * Simplified Mock Chain Adapter
 * 
 * In-memory simulation without database dependencies for testing
 */

import { ChainAdapter, ChainTransaction } from '../types/chain';

/**
 * Mock adapter configuration
 */
export interface MockAdapterConfig {
  /**
   * Chain ID for the mock network
   */
  chainId?: string;
  
  /**
   * Simulated transaction time in ms (default: 10)
   */
  txTime?: number;
  
  /**
   * Simulated fee in µIOTA (default: 0.05)
   */
  mockFee?: number;
}

/**
 * Default configuration
 */
const DEFAULT_CONFIG: MockAdapterConfig = {
  chainId: 'mock-chain-001',
  txTime: 10, // Faster for tests
  mockFee: 0.05
};

/**
 * Simplified Mock implementation of the Chain Adapter interface
 * Stores everything in memory for testing - no database required
 */
export class MockAdapter implements ChainAdapter {
  private config: MockAdapterConfig;
  private connected: boolean = false;
  
  // In-memory storage
  private chainTransactions: ChainTransaction[] = [];
  private objects: any[] = [];
  private events: any[] = [];
  private state: Map<string, any> = new Map();
  
  /**
   * Create a new MockAdapter instance
   */
  constructor(config: MockAdapterConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    
    // Initialize state
    this.state.set('chain_id', this.config.chainId);
    this.state.set('current_commit', 1);
  }
  
  /**
   * Connect to the mock blockchain
   */
  async connect(): Promise<boolean> {
    await new Promise(resolve => setTimeout(resolve, 10)); // Simulate connection time
    this.connected = true;
    return true;
  }
  
  /**
   * Disconnect from the mock blockchain
   */
  async disconnect(): Promise<void> {
    this.connected = false;
  }
  
  /**
   * Submit a transaction (NEW FORMAT - used by GovernanceEngine)
   */
  async submitTransaction(transaction: Partial<ChainTransaction>): Promise<string> {
    this.ensureConnected();
    
    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, this.config.txTime));
    
    // Generate complete transaction
    const fullTransaction: ChainTransaction = {
      id: transaction.id || `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: transaction.type || 'unknown',
      data: transaction.data || {},
      timestamp: transaction.timestamp || new Date(),
      status: 'confirmed'
    };

    // Store transaction
    this.chainTransactions.push(fullTransaction);
    
    // Create event
    const event = {
      id: `event_${Date.now()}`,
      type: `transaction_${fullTransaction.type}`,
      timestamp: fullTransaction.timestamp.toISOString(),
      data: fullTransaction.data
    };
    
    this.events.push(event);
    
    // Update commit number
    const currentCommit = this.state.get('current_commit') || 1;
    this.state.set('current_commit', currentCommit + 1);

    return fullTransaction.id;
  }
  
  /**
   * Query the current state of an object
   */
  async queryState(objectType: string, objectId: string): Promise<any> {
    this.ensureConnected();
    
    const obj = this.objects.find(o => o.type === objectType && o.id === objectId);
    if (!obj) {
      throw new Error(`Object not found: ${objectType}/${objectId}`);
    }
    
    return {
      objectId: obj.id,
      objectType: obj.type,
      data: obj.data,
      commitNumber: obj.commitNumber || 1,
      timestamp: obj.timestamp || new Date().toISOString()
    };
  }
  
  /**
   * Query objects by type with optional filters
   */
  async queryObjects(
    objectType: string, 
    filters?: any, 
    pagination?: { limit: number; offset: number }
  ): Promise<any[]> {
    this.ensureConnected();
    
    let results = this.objects.filter(obj => obj.type === objectType);
    
    // Apply filters if provided
    if (filters) {
      results = results.filter(obj => {
        for (const [key, value] of Object.entries(filters)) {
          if (obj.data[key] !== value) {
            return false;
          }
        }
        return true;
      });
    }
    
    // Apply pagination if provided
    if (pagination) {
      const start = pagination.offset || 0;
      const end = start + (pagination.limit || 10);
      results = results.slice(start, end);
    }
    
    return results.map(obj => ({
      objectId: obj.id,
      objectType: obj.type,
      data: obj.data,
      commitNumber: obj.commitNumber || 1,
      timestamp: obj.timestamp || new Date().toISOString()
    }));
  }
  
  /**
   * Subscribe to events of a specific type
   */
  subscribeToEvents(eventType: string, callback: (event: any) => void): string {
    // For simplicity, just return a subscription ID
    // In a real implementation, this would set up event listeners
    return `sub_${Date.now()}_${eventType}`;
  }
  
  /**
   * Unsubscribe from events
   */
  unsubscribeFromEvents(subscriptionId: string): void {
    // No-op for simplified implementation
  }
  
  /**
   * Check connection status
   */
  isConnectedToNode(): boolean {
    return this.connected;
  }
  
  /**
   * Get the wallet address
   */
  async getWalletAddress(): Promise<string> {
    return 'mock_wallet_address_123';
  }
  
  // ============================================================================
  // TESTING HELPER METHODS
  // ============================================================================
  
  /**
   * Get all chain transactions (for testing)
   */
  getChainTransactions(): ChainTransaction[] {
    return [...this.chainTransactions];
  }
  
  /**
   * Get transactions by type (for testing)
   */
  getTransactionsByType(type: string): ChainTransaction[] {
    return this.chainTransactions.filter(tx => tx.type === type);
  }
  
  /**
   * Clear all transactions (for testing)
   */
  clearChainTransactions(): void {
    this.chainTransactions = [];
    this.events = [];
  }
  
  /**
   * Get all events (for testing)
   */
  getEvents(): any[] {
    return [...this.events];
  }
  
  /**
   * Get state value (for testing)
   */
  getState(key: string): any {
    return this.state.get(key);
  }
  
  /**
   * Set state value (for testing)
   */
  setState(key: string, value: any): void {
    this.state.set(key, value);
  }
  
  /**
   * Get current commit number
   */
  getCurrentCommit(): number {
    return this.state.get('current_commit') || 1;
  }
  
  /**
   * Reset all data (for testing)
   */
  reset(): void {
    this.chainTransactions = [];
    this.objects = [];
    this.events = [];
    this.state.clear();
    this.state.set('chain_id', this.config.chainId);
    this.state.set('current_commit', 1);
  }
  
  /**
   * Ensure the adapter is connected
   */
  private ensureConnected(): void {
    if (!this.connected) {
      throw new Error('MockAdapter is not connected. Call connect() first.');
    }
  }
}
