import { ChainAdapter, ChainConfig, StateQuery, StateQueryResult, Transaction, TransactionResult, Event, EventFilter, BaseChainAdapter } from './chain-adapter';
import { ChainEvent, ChainTransaction, ChainState } from '../type/chain';
import * as crypto from 'crypto';
import { RecommendationTransactionData } from '../type/recommendation-adapters';
import { ReputationTransactionData, TokenTransactionData } from '../type/reputation-adapters';

/**
 * MockAdapter (Version 2) - Implementation of ChainAdapter for testing and development
 * 
 * This adapter simulates a blockchain environment for local testing without
 * requiring an actual blockchain connection.
 * 
 * This is the updated version that integrates with the existing project structure
 * and implements the ChainAdapter interface properly.
 */
export class MockAdapterV2 extends BaseChainAdapter {
  private isConnectedPrivate: boolean = false; // FIX 1: Renamed to avoid base class conflict
  private eventSubscribers: Map<string, Function[]> = new Map();
  private simulateLatency: boolean;
  private failureRate: number;
  private mockWalletAddress: string;
  
  // Mock data storage
  private recommendations: Map<string, any> = new Map();
  private reputations: Map<string, any> = new Map();
  private tokens: Map<string, any> = new Map();
  private governance: Map<string, any> = new Map();
  private transactions: any[] = [];
  private commitNumber: number = 0;
  
  /**
   * Constructor
   * @param config Chain configuration
   * @param simulateLatency Whether to simulate network latency
   * @param failureRate Percentage chance (0-100) of random failures
   */
  constructor(config: ChainConfig, simulateLatency: boolean = false, failureRate: number = 0) {
    super(config);
    this.simulateLatency = simulateLatency;
    this.failureRate = Math.min(Math.max(failureRate, 0), 100);
    this.mockWalletAddress = `0x${crypto.randomBytes(20).toString('hex')}`;
  }

  /**
   * Simulate async delay if enabled
   */
  private async simulateDelay(): Promise<void> {
    if (this.simulateLatency) {
      // Random delay between 100ms and 1000ms
      const delay = Math.floor(Math.random() * 900) + 100;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  /**
   * Simulate random failures if enabled
   */
  private simulateFailure(): boolean {
    if (this.failureRate > 0) {
      const random = Math.random() * 100;
      if (random < this.failureRate) {
        throw new Error('Simulated random failure');
      }
    }
    return true;
  }

  /**
   * Generate a random object ID
   * @param prefix Object type prefix
   * @returns Random object ID
   */
  private generateObjectId(prefix: string): string {
    return `${prefix}-${crypto.randomBytes(8).toString('hex')}`;
  }

  // ChainAdapter interface implementation

  /**
   * Get the chain ID
   */
  async getChainId(): Promise<string> {
    return this.config.networkId;
  }

  /**
   * Submit a transaction to the mock chain (ChainAdapter interface)
   * @param tx Transaction to submit
   * @returns Transaction result
   */
  async submitTx(tx: Transaction): Promise<TransactionResult> {
    if (!this.isConnectedPrivate) {
      throw new Error('Not connected to mock adapter');
    }
    
    await this.simulateDelay();
    this.simulateFailure();
    
    this.commitNumber++;
    const timestamp = new Date().toISOString();
    
    // Generate a transaction ID
    const transactionId = `tx-${crypto.randomBytes(16).toString('hex')}`;
    
    // Create a mock object ID
    const objectId = this.generateObjectId('mock');
    
    // Store the transaction
    const storedTransaction = {
      transactionId,
      sender: tx.sender,
      payload: tx.payload,
      feeOptions: tx.feeOptions,
      options: tx.options,
      commitNumber: this.commitNumber,
      timestamp
    };
    
    this.transactions.push(storedTransaction);
    
    return {
      id: transactionId,
      status: 'confirmed',
      timestamp,
      commitNumber: this.commitNumber,
      objectId,
      details: {
        gasUsed: 1000,
        fee: 0.001
      }
    };
  }

  /**
   * Query the current state (ChainAdapter interface)
   * @param query Query parameters
   * @returns Query results
   */
  async queryState<T>(query: StateQuery): Promise<StateQueryResult<T>> {
    if (!this.isConnectedPrivate) {
      throw new Error('Not connected to mock adapter');
    }
    
    await this.simulateDelay();
    this.simulateFailure();
    
    const { objectType, filter = {}, sort, pagination } = query;
    
    let objects: Map<string, any>;
    
    // Select object collection based on type
    switch (objectType) {
      case 'recommendation':
        objects = this.recommendations;
        break;
      case 'reputation':
        objects = this.reputations;
        break;
      case 'token':
        objects = this.tokens;
        break;
      case 'governance':
        objects = this.governance;
        break;
      default:
        objects = new Map();
    }
    
    // Convert map to array and apply filters
    let results = Array.from(objects.entries()).map(([id, data]) => ({
      id,
      type: objectType,
      data,
      commitNumber: data.tangle?.commitNumber || this.commitNumber,
      timestamp: data.timestamp || new Date().toISOString()
    }));
    
    // Apply filters
    if (filter && Object.keys(filter).length > 0) {
      results = results.filter((item: any) => {
        return Object.entries(filter).every(([key, value]) => {
          if (key in item.data) {
            return item.data[key] === value;
          }
          return item[key] === value;
        });
      });
    }
    
    // Apply sorting
    if (sort) {
      results.sort((a: any, b: any) => {
        const aVal = a.data[sort.field] || a[sort.field];
        const bVal = b.data[sort.field] || b[sort.field];
        if (sort.direction === 'desc') {
          return bVal > aVal ? 1 : -1;
        }
        return aVal > bVal ? 1 : -1;
      });
    }
    
    // Apply pagination
    const offset = pagination?.offset || 0;
    const limit = pagination?.limit || 100;
    const paginatedResults = results.slice(offset, offset + limit);
    
    return {
      results: paginatedResults as T[],
      total: results.length,
      pagination: {
        offset,
        limit,
        hasMore: offset + limit < results.length
      }
    };
  }

  /**
   * Watch for events on the blockchain (ChainAdapter interface)
   * @param filter Event filter
   * @returns Async iterator of events
   */
  async *watchEvents(filter: EventFilter): AsyncIterator<Event> {
    let eventCounter = 0;
    const maxEvents = 10; // Limit for testing
    
    while (eventCounter < maxEvents && this.isConnectedPrivate) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const eventType = filter.eventTypes[0] || 'test_event';
      
      yield {
        type: eventType,
        commitNumber: this.commitNumber + eventCounter,
        timestamp: new Date().toISOString(),
        address: filter.address || this.mockWalletAddress,
        data: {
          eventId: eventCounter,
          mockData: true,
          filter: filter
        }
      };
      
      eventCounter++;
    }
  }

  /**
   * Get the current commit/block number
   */
  async getCurrentCommit(): Promise<number> {
    await this.simulateDelay();
    return this.commitNumber;
  }

  /**
   * Calculate the estimated fee for a transaction
   */
  async estimateFee(tx: Transaction): Promise<number> {
    await this.simulateDelay();
    return 1000; // Mock fee in smallest units
  }

  /**
   * Connect to the blockchain network
   */
  async connect(options?: Record<string, any>): Promise<void> {
    await this.simulateDelay();
    this.simulateFailure();
    
    console.log('Connected to mock adapter v2');
    this.connected = true;
    this.isConnectedPrivate = true;
  }

  /**
   * Disconnect from the blockchain network
   */
  async disconnect(): Promise<void> {
    await this.simulateDelay();
    this.simulateFailure();
    
    this.connected = false;
    this.isConnectedPrivate = false;
    console.log('Disconnected from mock adapter v2');
  }

  // Legacy methods for backward compatibility

  /**
   * Submit a transaction to the mock chain (legacy method)
   * @param transaction Transaction data to submit
   * @returns Transaction ID and metadata
   */
  public async submitTransaction(transaction: ChainTransaction): Promise<any> {
    if (!this.isConnectedPrivate) {
      throw new Error('Not connected to mock adapter');
    }
    
    await this.simulateDelay();
    this.simulateFailure();
    
    this.commitNumber++;
    const timestamp = new Date().toISOString();
    
    // Generate a transaction ID
    const transactionId = `tx-${crypto.randomBytes(16).toString('hex')}`;
    
    // Store the transaction
    const storedTransaction = {
      transactionId,
      type: transaction.type,
      action: transaction.action,
      actionDetail: transaction.actionDetail,
      data: transaction.data,
      commitNumber: this.commitNumber,
      timestamp
    };
    
    this.transactions.push(storedTransaction);
    
    // Process the transaction based on type
    let objectId: string;
    
    switch (transaction.type) {
      case 'recommendation':
        objectId = this.processRecommendationTransaction(transaction, transactionId);
        break;
      
      case 'reputation':
        objectId = this.processReputationTransaction(transaction, transactionId);
        break;
      
      case 'token':
        objectId = this.processTokenTransaction(transaction, transactionId);
        break;
      
      case 'governance':
        objectId = this.processGovernanceTransaction(transaction, transactionId);
        break;
      
      default:
        objectId = this.generateObjectId(transaction.type);
    }
    
    // Emit event for the transaction - FIX 2: Using type assertion
    (this.emitEvent as any)({
      eventId: `event-${crypto.randomBytes(8).toString('hex')}`,
      eventType: `${transaction.type}_${transaction.action}`,
      objectId,
      objectType: transaction.type,
      data: transaction.data,
      commitNumber: this.commitNumber,
      timestamp
    });
    
    return {
      transactionId,
      objectId,
      commitNumber: this.commitNumber,
      timestamp
    };
  }
  
  /**
   * Process a recommendation transaction
   * @param transaction Transaction data
   * @param transactionId Transaction ID
   * @returns Object ID
   */
  private processRecommendationTransaction(transaction: ChainTransaction, transactionId: string): string {
    const data = transaction.data as RecommendationTransactionData;
    const objectId = (data as any).id || this.generateObjectId('recommendation');
    
    if (transaction.action === 'create') {
      this.recommendations.set(objectId, {
        ...data,
        id: objectId,
        upvotes: 0,
        downvotes: 0,
        timestamp: data.timestamp || Date.now(),
        tangle: {
          objectId,
          commitNumber: this.commitNumber
        }
      });
    } else if (transaction.action === 'vote') {
      const rec = this.recommendations.get((data as any).id);
      
      if (!rec) {
        throw new Error(`Recommendation ${(data as any).id} not found`);
      }
      
      if (transaction.actionDetail === 'upvote') {
        rec.upvotes++;
      } else {
        rec.downvotes++;
      }
      
      this.recommendations.set((data as any).id, rec);
    }
    
    return objectId;
  }
  
  /**
   * Process a reputation transaction
   * @param transaction Transaction data
   * @param transactionId Transaction ID
   * @returns Object ID
   */
  private processReputationTransaction(transaction: ChainTransaction, transactionId: string): string {
    const data = transaction.data as ReputationTransactionData;
    const objectId = this.generateObjectId('reputation');
    
    if (transaction.action === 'update') {
      this.reputations.set(data.userId, {
        ...data,
        ledger: {
          objectID: objectId,
          commitNumber: this.commitNumber
        }
      });
    }
    
    return objectId;
  }
  
  /**
   * Process a token transaction
   * @param transaction Transaction data
   * @param transactionId Transaction ID
   * @returns Object ID
   */
  private processTokenTransaction(transaction: ChainTransaction, transactionId: string): string {
    const data = transaction.data as TokenTransactionData;
    const objectId = this.generateObjectId('token');
    
    // Ensure timestamp exists (fix for line 250 error)
    const processedData = {
      ...data,
      timestamp: data.timestamp || Date.now()
    };
    
    // Store the token transaction
    this.tokens.set(transactionId, {
      ...processedData,
      transactionId,
      tangle: {
        objectId,
        commitNumber: this.commitNumber
      }
    });
    
    return objectId;
  }
  
  /**
   * Process a governance transaction
   * @param transaction Transaction data
   * @param transactionId Transaction ID
   * @returns Object ID
   */
  private processGovernanceTransaction(transaction: ChainTransaction, transactionId: string): string {
    const data = transaction.data;
    const objectId = this.generateObjectId('governance');
    
    if (transaction.action === 'propose') {
      const proposalId = (data as any).id || objectId;
      
      this.governance.set(proposalId, {
        ...data,
        id: proposalId,
        proposer: (data as any).proposer,
        timestamp: (data as any).timestamp || Date.now(),
        yesVotes: 0,
        noVotes: 0,
        status: 'Active',
        tangle: {
          objectId: proposalId,
          commitNumber: this.commitNumber
        }
      });
      
      return proposalId;
    } else if (transaction.action === 'vote') {
      const proposal = this.governance.get((data as any).proposalId);
      
      if (!proposal) {
        throw new Error(`Proposal ${(data as any).proposalId} not found`);
      }
      
      if ((data as any).vote) {
        proposal.yesVotes++;
      } else {
        proposal.noVotes++;
      }
      
      this.governance.set((data as any).proposalId, proposal);
      return (data as any).proposalId;
    }
    
    return objectId;
  }

  /**
   * Query the current state for a given object type and ID (legacy method)
   * @param objectType Type of object to query
   * @param objectId ID of the object
   * @returns Current state of the object
   */
  public async queryStateById(objectType: string, objectId: string): Promise<ChainState> {
    if (!this.isConnectedPrivate) {
      throw new Error('Not connected to mock adapter');
    }
    
    await this.simulateDelay();
    this.simulateFailure();
    
    let data: any;
    
    // Retrieve object based on type
    switch (objectType) {
      case 'recommendation':
        data = this.recommendations.get(objectId);
        break;
      
      case 'reputation':
        data = this.reputations.get(objectId);
        break;
      
      case 'token':
        data = this.tokens.get(objectId);
        break;
      
      case 'governance':
        data = this.governance.get(objectId);
        break;
      
      default:
        throw new Error(`Unsupported object type: ${objectType}`);
    }
    
    if (!data) {
      throw new Error(`Object ${objectId} of type ${objectType} not found`);
    }
    
    return {
      objectId,
      objectType,
      data,
      commitNumber: data.tangle?.commitNumber || this.commitNumber,
      timestamp: data.timestamp || new Date().toISOString()
    };
  }
  
  /**
   * Query objects by type with optional filters (legacy method)
   * @param objectType Type of objects to query
   * @param filters Optional filters to apply
   * @param pagination Pagination options
   * @returns Array of matching objects
   */
  public async queryObjects(
    objectType: string, 
    filters?: any, 
    pagination?: { limit: number; offset: number }
  ): Promise<ChainState[]> {
    if (!this.isConnectedPrivate) {
      throw new Error('Not connected to mock adapter');
    }
    
    await this.simulateDelay();
    this.simulateFailure();
    
    let objects: Map<string, any>;
    
    // Select object collection based on type
    switch (objectType) {
      case 'recommendation':
        objects = this.recommendations;
        break;
      
      case 'reputation':
        objects = this.reputations;
        break;
      
      case 'token':
        objects = this.tokens;
        break;
      
      case 'governance':
        objects = this.governance;
        break;
      
      default:
        throw new Error(`Unsupported object type: ${objectType}`);
    }
    
    // Convert map to array
    let results = Array.from(objects.entries()).map(([id, data]) => ({
      objectId: id,
      objectType,
      data,
      commitNumber: data.tangle?.commitNumber || this.commitNumber,
      timestamp: data.timestamp || new Date().toISOString()
    }));
    
    // Apply filters if provided
    if (filters) {
      results = results.filter(item => {
        for (const key in filters) {
          if (key in item.data) {
            if (item.data[key] !== filters[key]) {
              return false;
            }
          } else {
            return false;
          }
        }
        return true;
      });
    }
    
    // Apply pagination if provided
    if (pagination) {
      const start = pagination.offset || 0;
      const end = pagination.limit ? start + pagination.limit : results.length;
      results = results.slice(start, end);
    }
    
    return results;
  }

  /**
   * Subscribe to events of a specific type
   * @param eventType Type of events to subscribe to
   * @param callback Function to call when events occur
   * @returns Subscription ID
   */
  public subscribeToEvents(eventType: string, callback: (event: ChainEvent) => void): string {
    const subscriptionId = crypto.randomUUID();
    
    if (!this.eventSubscribers.has(eventType)) {
      this.eventSubscribers.set(eventType, []);
    }
    
    this.eventSubscribers.get(eventType)!.push(callback);
    
    return subscriptionId;
  }
  
  /**
   * Unsubscribe from events
   * @param subscriptionId ID of the subscription to cancel
   */
  public unsubscribeFromEvents(subscriptionId: string): void {
    // In a real implementation, this would remove the specific callback
    // For simplicity, we're not implementing the full logic here
    console.log(`Unsubscribed from events with ID: ${subscriptionId}`);
  }
  
  /**
   * Emit an event to subscribers
   * @param event Event to emit
   */
  private emitEvent(event: ChainEvent): void {
    // Notify subscribers for this event type - FIX: Type assertion for optional eventType
    if (this.eventSubscribers.has((event.eventType as any))) {
      for (const callback of this.eventSubscribers.get((event.eventType as any))!) {
        callback(event);
      }
    }
    
    // Notify subscribers to 'all' events
    if (this.eventSubscribers.has('all')) {
      for (const callback of this.eventSubscribers.get('all')!) {
        callback(event);
      }
    }
  }
  
  /**
   * Check if connected to the chain
   * @returns Connection status
   */
  public isConnectedToNode(): boolean {
    return this.isConnectedPrivate;
  }
  
  /**
   * Get the wallet address
   * @returns Mock wallet address
   */
  public async getWalletAddress(): Promise<string> {
    return this.mockWalletAddress;
  }
  
  /**
   * Generate mock data for testing
   * @param count Number of objects to generate
   */
  public generateMockData(count: number = 10): void {
    // Generate mock recommendations
    for (let i = 0; i < count; i++) {
      const id = this.generateObjectId('recommendation');
      this.recommendations.set(id, {
        id,
        author: `user-${i % 5}`,
        serviceId: `service-${i % 3}`,
        category: i % 2 === 0 ? 'restaurant' : 'hotel',
        location: {
          latitude: 37.7749 + (Math.random() * 0.1 - 0.05),
          longitude: -122.4194 + (Math.random() * 0.1 - 0.05),
          address: `${i} Mock Street, MockCity`
        },
        rating: Math.floor(Math.random() * 5) + 1,
        contentHash: `hash-${crypto.randomBytes(16).toString('hex')}`,
        upvotes: Math.floor(Math.random() * 50),
        downvotes: Math.floor(Math.random() * 10),
        timestamp: Date.now(),
        tangle: {
          objectId: id,
          commitNumber: this.commitNumber
        }
      });
    }
    
    // Generate mock user reputations
    for (let i = 0; i < 5; i++) {
      const userId = `user-${i}`;
      this.reputations.set(userId, {
        userId,
        totalRecommendations: Math.floor(Math.random() * 20),
        upvotesReceived: Math.floor(Math.random() * 100),
        downvotesReceived: Math.floor(Math.random() * 20),
        reputationScore: Math.random() * 0.9 + 0.1,
        verificationLevel: i % 3 === 0 ? 'expert' : i % 2 === 0 ? 'verified' : 'basic',
        specializations: ['restaurant', 'hotel', 'bar'].slice(0, i % 3 + 1),
        activeSince: Date.now(),
        followers: Math.floor(Math.random() * 50),
        following: Math.floor(Math.random() * 30),
        ledger: {
          objectID: this.generateObjectId('reputation'),
          commitNumber: this.commitNumber
        }
      });
    }
    
    // Generate mock token transactions
    for (let i = 0; i < count; i++) {
      const transactionId = `tx-${crypto.randomBytes(16).toString('hex')}`;
      this.tokens.set(transactionId, {
        transactionId,
        sender: i % 3 === 0 ? 'SYSTEM' : `user-${i % 5}`,
        recipient: `user-${(i + 1) % 5}`,
        amount: Math.random() * 100,
        timestamp: Date.now(),
        type: i % 4 === 0 ? 'reward' : i % 3 === 0 ? 'transfer' : i % 2 === 0 ? 'stake' : 'unstake',
        actionReference: i % 3 === 0 ? `recommendation-${i % count}` : undefined,
        tangle: {
          objectId: this.generateObjectId('token'),
          commitNumber: this.commitNumber
        }
      });
    }
    
    // Generate mock governance proposals
    for (let i = 0; i < Math.ceil(count / 3); i++) {
      const id = this.generateObjectId('governance');
      this.governance.set(id, {
        id,
        proposer: `user-${i % 5}`,
        title: `Proposal ${i}`,
        description: `Description for proposal ${i}`,
        parameters: JSON.stringify({ param1: i, param2: `value-${i}` }),
        timestamp: Date.now(),
        yesVotes: Math.floor(Math.random() * 30),
        noVotes: Math.floor(Math.random() * 20),
        status: ['Active', 'Succeeded', 'Defeated'][i % 3],
        tangle: {
          objectId: id,
          commitNumber: this.commitNumber
        }
      });
    }
    
    console.log(`Generated mock data: ${count} recommendations, 5 users, ${count} transactions, ${Math.ceil(count / 3)} proposals`);
  }
  
  /**
   * Clear all mock data
   */
  public clearMockData(): void {
    this.recommendations.clear();
    this.reputations.clear();
    this.tokens.clear();
    this.governance.clear();
    this.transactions = [];
    this.commitNumber = 0;
    
    console.log('Cleared all mock data');
  }

  // Helper methods for mock data
  setMockData(key: string, value: any): void {
    this.recommendations.set(key, value);
  }

  getMockData(key: string): any {
    return this.recommendations.get(key);
  }
}