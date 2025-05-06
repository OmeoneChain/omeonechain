import { ChainAdapter, ChainEvent, ChainTransaction, ChainState } from '../types/chain';
import * as crypto from 'crypto';
import { RecommendationTransactionData } from './types/recommendation-adapters';
import { ReputationTransactionData } from './types/reputation-adapters';
import { TokenTransactionData } from './types/token-adapters';

/**
 * MockAdapter (Version 2) - Implementation of ChainAdapter for testing and development
 * 
 * This adapter simulates a blockchain environment for local testing without
 * requiring an actual blockchain connection.
 * 
 * This is the updated version that integrates with the existing project structure.
 */
export class MockAdapterV2 implements ChainAdapter {
  private isConnected: boolean = false;
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
   * @param simulateLatency Whether to simulate network latency
   * @param failureRate Percentage chance (0-100) of random failures
   */
  constructor(simulateLatency: boolean = false, failureRate: number = 0) {
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

  /**
   * Initialize and connect to the mock chain
   */
  public async connect(): Promise<boolean> {
    await this.simulateDelay();
    this.simulateFailure();
    
    console.log('Connected to mock adapter v2');
    this.isConnected = true;
    return true;
  }

  /**
   * Disconnect from the mock chain
   */
  public async disconnect(): Promise<void> {
    await this.simulateDelay();
    this.simulateFailure();
    
    this.isConnected = false;
    console.log('Disconnected from mock adapter v2');
  }

  /**
   * Submit a transaction to the mock chain
   * @param transaction Transaction data to submit
   * @returns Transaction ID and metadata
   */
  public async submitTransaction(transaction: ChainTransaction): Promise<any> {
    if (!this.isConnected) {
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
    
    // Emit event for the transaction
    this.emitEvent({
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
    const objectId = data.id || this.generateObjectId('recommendation');
    
    if (transaction.action === 'create') {
      this.recommendations.set(objectId, {
        ...data,
        id: objectId,
        upvotes: 0,
        downvotes: 0,
        timestamp: data.timestamp || new Date().toISOString(),
        tangle: {
          objectId,
          commitNumber: this.commitNumber
        }
      });
    } else if (transaction.action === 'vote') {
      const rec = this.recommendations.get(data.id);
      
      if (!rec) {
        throw new Error(`Recommendation ${data.id} not found`);
      }
      
      if (transaction.actionDetail === 'upvote') {
        rec.upvotes++;
      } else {
        rec.downvotes++;
      }
      
      this.recommendations.set(data.id, rec);
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
    
    // Store the token transaction
    this.tokens.set(transactionId, {
      ...data,
      transactionId,
      timestamp: data.timestamp || new Date().toISOString(),
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
      const proposalId = data.id || objectId;
      
      this.governance.set(proposalId, {
        ...data,
        id: proposalId,
        proposer: data.proposer,
        timestamp: data.timestamp || new Date().toISOString(),
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
      const proposal = this.governance.get(data.proposalId);
      
      if (!proposal) {
        throw new Error(`Proposal ${data.proposalId} not found`);
      }
      
      if (data.vote) {
        proposal.yesVotes++;
      } else {
        proposal.noVotes++;
      }
      
      this.governance.set(data.proposalId, proposal);
      return data.proposalId;
    }
    
    return objectId;
  }

  /**
   * Query the current state for a given object type and ID
   * @param objectType Type of object to query
   * @param objectId ID of the object
   * @returns Current state of the object
   */
  public async queryState(objectType: string, objectId: string): Promise<ChainState> {
    if (!this.isConnected) {
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
   * Query objects by type with optional filters
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
    if (!this.isConnected) {
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
    
    this.eventSubscribers.get(eventType).push(callback);
    
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
    // Notify subscribers for this event type
    if (this.eventSubscribers.has(event.eventType)) {
      for (const callback of this.eventSubscribers.get(event.eventType)) {
        callback(event);
      }
    }
    
    // Notify subscribers to 'all' events
    if (this.eventSubscribers.has('all')) {
      for (const callback of this.eventSubscribers.get('all')) {
        callback(event);
      }
    }
  }
  
  /**
   * Check if connected to the chain
   * @returns Connection status
   */
  public isConnectedToNode(): boolean {
    return this.isConnected;
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
        timestamp: new Date().toISOString(),
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
        activeSince: new Date().toISOString(),
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
        timestamp: new Date().toISOString(),
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
        timestamp: new Date().toISOString(),
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
}
