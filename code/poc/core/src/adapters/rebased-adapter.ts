// code/poc/core/src/adapters/rebased-adapter.ts

import { ChainAdapter, Transaction, TransactionResult, StateQuery, EventFilter, Event } from '../types/chain';
import axios from 'axios';
import { IotaWallet } from '@iota/wallet';
import { Ed25519Seed } from '@iota/crypto.js';
import * as crypto from 'crypto';

/**
 * Configuration interface for the RebasedAdapter
 */
export interface RebasedConfig {
  network: 'testnet' | 'mainnet' | 'local';
  nodeUrl: string;
  account: {
    address: string;
    privateKey: string;
  };
  sponsorWallet?: {
    address: string;
    privateKey: string;
  };
  contractAddresses: {
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
 * RebasedAdapter - Implementation of the ChainAdapter interface for IOTA Rebased
 * 
 * This adapter connects the OmeoneChain core to the IOTA Rebased DAG, handling:
 * - Transaction submissions
 * - State queries
 * - Event monitoring
 * - Smart contract interactions
 */
export class RebasedAdapter implements ChainAdapter {
  private nodeUrl: string;
  private apiKey: string;
  private wallet: any; // IotaWallet instance
  private isConnected: boolean = false;
  private eventSubscribers: Map<string, Function[]> = new Map();
  private lastCommitNumber: number = 0;
  private config: RebasedConfig;
  private client: any; // API client
  private currentChainId: string = '';
  private eventIterator: AsyncIterator<Event> | null = null;
  
  private readonly DEFAULT_OPTIONS = {
    retryAttempts: 3,
    maxFeePerTransaction: 50, // in μMIOTA (0.00005 MIOTA)
    timeoutMs: 30000,
  };
  
  /**
   * Constructor
   * @param configOrNodeUrl Configuration for the adapter or nodeUrl
   * @param apiKey Optional API key for authenticated access
   * @param seed Optional seed for wallet initialization
   */
  constructor(configOrNodeUrl: RebasedConfig | string, apiKey?: string, seed?: string) {
    if (typeof configOrNodeUrl === 'string') {
      // Legacy constructor
      this.nodeUrl = configOrNodeUrl;
      this.apiKey = apiKey || '';
      
      // Initialize wallet if seed is provided
      if (seed) {
        this.initializeWallet(seed);
      }
      
      // Set default config
      this.config = {
        network: 'testnet',
        nodeUrl: this.nodeUrl,
        account: {
          address: '',
          privateKey: '',
        },
        contractAddresses: {
          recommendation: '0x4f6d656f6e654368e4b8bce8a18de6bd8a8e5ddb',
          reputation: '0x4f6d656f6e655265e4b8bce8a18de6bd8a8e5dda',
          token: '0x4f6d656f6e6554e4b8bce8a18de6bd8a8e5dcc1',
          governance: '0x4f6d656f6e65476f7665726e616e63655ddc7',
          service: '0x4f6d656f6e65536572766963655ddc8',
        },
        options: this.DEFAULT_OPTIONS
      };
    } else {
      // New constructor with config object
      this.config = {
        ...configOrNodeUrl,
        options: {
          ...this.DEFAULT_OPTIONS,
          ...configOrNodeUrl.options,
        },
      };
      
      this.nodeUrl = this.config.nodeUrl;
      this.apiKey = '';
      
      // Initialize wallet if account is provided
      if (this.config.account.privateKey) {
        this.initializeWallet(this.config.account.privateKey);
      }
    }
    
    // Initialize the client
    this.initializeClient();
  }

  /**
   * Initialize the IOTA Rebased client
   * This method sets up the connection to the Rebased node
   */
  private async initializeClient(): Promise<void> {
    try {
      // For a real implementation, this would use the IOTA Rebased SDK
      // For now, we'll use a simple axios-based client for HTTP requests
      this.client = {
        api: axios.create({
          baseURL: this.nodeUrl,
          timeout: this.config.options?.timeoutMs,
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            ...(this.apiKey ? { 'X-API-Key': this.apiKey } : {})
          },
        }),
        async getNodeInfo() {
          const response = await this.api.get('/api/v1/info');
          return response.data;
        },
        async getAccount(address: string) {
          const response = await this.api.get(`/api/v1/accounts/${address}`);
          return response.data;
        },
        async submitTransaction(tx: any) {
          const response = await this.api.post('/api/v1/transactions', tx);
          return response.data;
        },
        async getTransactionStatus(txId: string) {
          const response = await this.api.get(`/api/v1/transactions/${txId}/status`);
          return response.data;
        },
        async queryContract(address: string, method: string, args: any[]) {
          const response = await this.api.post(`/api/v1/contracts/${address}/call`, {
            method,
            args,
          });
          return response.data;
        },
        async watchEvents(contractAddress: string, eventName: string, callback: Function) {
          // In a real implementation, this would set up a WebSocket connection
          // For now, we'll simulate it with polling
          const interval = setInterval(async () => {
            try {
              const response = await this.api.get(`/api/v1/contracts/${contractAddress}/events?name=${eventName}`);
              if (response.data.events && response.data.events.length > 0) {
                response.data.events.forEach((event: any) => {
                  callback(event);
                });
              }
            } catch (error) {
              console.error('Error watching events:', error);
            }
          }, 5000); // Poll every 5 seconds
          
          // Return a function to cancel the polling
          return () => clearInterval(interval);
        }
      };
    } catch (error) {
      console.error('Failed to initialize IOTA Rebased client:', error);
      throw new Error(`RebasedAdapter initialization failed: ${error.message}`);
    }
  }

  /**
   * Get the chain ID
   */
  async getChainId(): Promise<string> {
    if (!this.isConnected) {
      await this.connect();
    }
    
    if (!this.currentChainId) {
      try {
        const info = await this.client.getNodeInfo();
        this.currentChainId = info.network || `rebased-${this.config.network}`;
      } catch (error) {
        console.error('Failed to get chain ID:', error);
        throw new Error('Could not retrieve chain ID');
      }
    }
    
    return this.currentChainId;
  }

  /**
   * Submit a transaction to the blockchain
   * 
   * @param tx Transaction to submit
   * @returns Transaction result
   */
  async submitTx(tx: Transaction): Promise<TransactionResult> {
    if (!this.isConnected) {
      await this.connect();
    }
    
    const retryAttempts = this.config.options?.retryAttempts || 3;
    
    for (let attempt = 1; attempt <= retryAttempts; attempt++) {
      try {
        // Determine which contract to call based on tx payload type
        const contractType = this.getContractTypeFromPayload(tx.payload);
        const contractAddress = this.config.contractAddresses[contractType];
        
        // Build the transaction
        const builtTx = await this.buildNativeTransaction(tx, contractAddress);
        
        // Sign the transaction
        const signedTx = await this.signTransaction(builtTx, tx.sender);
        
        // Submit the transaction
        const result = await this.client.submitTransaction(signedTx);
        
        // Check if we need to wait for confirmation
        if (result.status === 'pending') {
          await this.waitForTransactionConfirmation(result.id);
          result.status = 'confirmed';
        }
        
        return {
          id: result.id,
          status: result.status as 'pending' | 'confirmed' | 'failed',
          timestamp: result.timestamp || new Date().toISOString(),
          commitNumber: result.commitNumber,
          objectId: result.objectId,
          details: result
        };
      } catch (error) {
        if (attempt === retryAttempts) {
          console.error(`Failed to submit transaction after ${retryAttempts} attempts:`, error);
          return {
            id: '',
            status: 'failed',
            timestamp: new Date().toISOString(),
            error: error.message
          };
        }
        
        // Exponential backoff before retry
        const backoffMs = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
        console.warn(`Attempt ${attempt} failed, retrying in ${backoffMs}ms:`, error.message);
        await new Promise(resolve => setTimeout(resolve, backoffMs));
      }
    }
    
    // This should never be reached due to the return in the loop
    return {
      id: '',
      status: 'failed',
      timestamp: new Date().toISOString(),
      error: 'Failed to submit transaction after exhausting retry attempts'
    };
  }

  /**
   * Query the current state
   * 
   * @param query Query parameters
   * @returns Query results
   */
  async queryState<T>(query: StateQuery): Promise<{
    results: T[];
    total: number;
    pagination?: {
      offset: number;
      limit: number;
      hasMore: boolean;
    };
  }> {
    if (!this.isConnected) {
      await this.connect();
    }
    
    try {
      // Determine which contract to query based on objectType
      const contractType = this.getContractTypeFromObjectType(query.objectType);
      const contractAddress = this.config.contractAddresses[contractType];
      
      // Determine the method to call
      let method = 'get';
      if (query.filter && query.filter.id) {
        method = `get_${query.objectType}`;
      } else {
        method = `list_${query.objectType}s`;
      }
      
      // Format arguments based on the query
      const args = this.formatQueryArgs(query);
      
      // Execute the query
      const result = await this.client.queryContract(contractAddress, method, args);
      
      // Process the result
      const items = Array.isArray(result) ? result : [result];
      const deserializedItems = items.map(item => this.deserializeFromMoveVM(item)) as T[];
      
      // Calculate pagination if provided
      const pagination = query.pagination ? {
        offset: query.pagination.offset,
        limit: query.pagination.limit,
        hasMore: deserializedItems.length >= query.pagination.limit
      } : undefined;
      
      return {
        results: deserializedItems,
        total: pagination ? items.length + pagination.offset : items.length,
        pagination
      };
    } catch (error) {
      console.error('Failed to query state:', error);
      throw new Error(`State query failed: ${error.message}`);
    }
  }

  /**
   * Watch for events on the blockchain
   * 
   * @param filter Event filter
   * @returns Async iterator of events
   */
  async *watchEvents(filter: EventFilter): AsyncIterator<Event> {
    if (!this.isConnected) {
      await this.connect();
    }
    
    // If an existing iterator is active, close it
    if (this.eventIterator) {
      try {
        await this.eventIterator.return?.();
      } catch (error) {
        console.warn('Error closing previous event iterator:', error);
      }
    }
    
    // Create a new event queue and promise resolver mechanism
    const eventQueue: Event[] = [];
    let resolveNext: ((value: IteratorResult<Event>) => void) | null = null;
    let isActive = true;
    
    // Set up event handlers for each type
    const unsubscribeFunctions: (() => void)[] = [];
    
    for (const eventType of filter.eventTypes) {
      try {
        // Determine which contract to watch based on eventType
        const contractType = this.getContractTypeFromEventType(eventType);
        const contractAddress = this.config.contractAddresses[contractType];
        
        // Set up the event subscription
        const unsubscribe = await this.client.watchEvents(
          contractAddress,
          eventType,
          (eventData: any) => {
            if (!isActive) return;
            
            // Skip events before the fromCommit if specified
            if (filter.fromCommit && eventData.commitNumber < filter.fromCommit) {
              return;
            }
            
            // Skip events not matching the address filter if specified
            if (filter.address && eventData.address !== filter.address) {
              return;
            }
            
            // Apply additional filters if specified
            if (filter.filter) {
              for (const key in filter.filter) {
                if (eventData.data[key] !== filter.filter[key]) {
                  return;
                }
              }
            }
            
            // Create event object
            const event: Event = {
              type: eventType,
              commitNumber: eventData.commitNumber,
              timestamp: eventData.timestamp,
              address: eventData.address || contractAddress,
              data: this.deserializeFromMoveVM(eventData.data)
            };
            
            // Add to queue or resolve immediately
            if (resolveNext) {
              const resolver = resolveNext;
              resolveNext = null;
              resolver({
                done: false,
                value: event
              });
            } else {
              eventQueue.push(event);
            }
          }
        );
        
        unsubscribeFunctions.push(unsubscribe);
      } catch (error) {
        console.error(`Failed to watch events for type ${eventType}:`, error);
      }
    }
    
    // Create the async iterator
    this.eventIterator = {
      next: async (): Promise<IteratorResult<Event>> => {
        if (!isActive) {
          return { done: true, value: undefined };
        }
        
        if (eventQueue.length > 0) {
          return {
            done: false,
            value: eventQueue.shift()!
          };
        }
        
        // No events in queue, wait for the next one
        return new Promise<IteratorResult<Event>>(resolve => {
          resolveNext = resolve;
        });
      },
      
      return: async (): Promise<IteratorResult<Event>> => {
        // Clean up resources
        isActive = false;
        
        // Unsubscribe from all event subscriptions
        for (const unsubscribe of unsubscribeFunctions) {
          unsubscribe();
        }
        
        // Resolve any pending next() calls
        if (resolveNext) {
          resolveNext({ done: true, value: undefined });
          resolveNext = null;
        }
        
        return { done: true, value: undefined };
      }
    };
    
    // Return the iterator
    return this.eventIterator;
  }

  /**
   * Get the current commit/block number
   * 
   * @returns Current commit number
   */
  async getCurrentCommit(): Promise<number> {
    if (!this.isConnected) {
      await this.connect();
    }
    
    try {
      const info = await this.client.getNodeInfo();
      return info.latestCommitNumber || 0;
    } catch (error) {
      console.error('Failed to get current commit number:', error);
      throw new Error('Could not retrieve current commit number');
    }
  }

  /**
   * Calculate the estimated fee for a transaction
   * 
   * @param tx Transaction to estimate fee for
   * @returns Estimated fee in smallest units (e.g., µIOTA)
   */
  async estimateFee(tx: Transaction): Promise<number> {
    // In a real implementation, this would use the IOTA Rebased SDK
    // to estimate the fee based on the transaction size and gas cost
    
    // For now, we'll use a simple estimation based on transaction type
    const baseFee = 5; // 5 μMIOTA
    
    let complexityMultiplier = 1;
    
    // Determine transaction type from payload
    const txType = this.getTxTypeFromPayload(tx.payload);
    
    // Adjust based on transaction type
    switch (txType) {
      case 'createRecommendation':
        // More complex due to media handling
        complexityMultiplier = 2;
        break;
      case 'submitProposal':
        // Governance transactions are more expensive
        complexityMultiplier = 3;
        break;
      case 'registerService':
        // Service registration is also more complex
        complexityMultiplier = 2;
        break;
      default:
        complexityMultiplier = 1;
    }
    
    // Additional adjustment based on payload size
    const payloadSize = JSON.stringify(tx.payload).length;
    const sizeMultiplier = Math.ceil(payloadSize / 1024); // Per KB
    
    // Calculate the estimated fee
    let estimatedFee = baseFee * complexityMultiplier * sizeMultiplier;
    
    // Ensure the fee doesn't exceed the maximum
    const maxFee = this.config.options?.maxFeePerTransaction || 50;
    estimatedFee = Math.min(estimatedFee, maxFee);
    
    return estimatedFee;
  }

  /**
   * Connect to the blockchain network
   * 
   * @param options Connection options
   * @returns Promise resolving when connected
   */
  async connect(options?: Record<string, any>): Promise<void> {
    try {
      // Test connection to node
      const nodeInfo = await this.client.getNodeInfo();
      
      console.log(`Connected to IOTA Rebased ${this.config.network} node:`, nodeInfo.version);
      console.log(`Network: ${nodeInfo.network}`);
      
      // Set chain ID
      this.currentChainId = nodeInfo.network || `rebased-${this.config.network}`;
      
      // Start event listener
      this.pollForEvents();
      
      this.isConnected = true;
    } catch (error) {
      console.error('Failed to connect to IOTA Rebased node:', error);
      this.isConnected = false;
      throw new Error(`Connection failed: ${error.message}`);
    }
  }

  /**
   * Disconnect from the blockchain network
   * 
   * @returns Promise resolving when disconnected
   */
  async disconnect(): Promise<void> {
    // Close any event subscriptions
    if (this.eventIterator) {
      try {
        await this.eventIterator.return?.();
      } catch (error) {
        console.warn('Error closing event iterator:', error);
      }
      this.eventIterator = null;
    }
    
    this.isConnected = false;
    console.log('Disconnected from IOTA Rebased node');
  }

  // Legacy methods and helper functions

  /**
   * Initialize wallet with seed
   * @param seed Seed for wallet initialization
   */
  private async initializeWallet(seed: string): Promise<void> {
    try {
      // Create wallet using the provided seed
      const seedBytes = Ed25519Seed.fromMnemonic(seed);
      
      // Initialize wallet with the seed
      this.wallet = new IotaWallet({
        storagePath: './wallet-database',
        clientOptions: {
          nodes: [this.nodeUrl],
          localPow: true,
        },
        secretManager: {
          stronghold: {
            password: crypto.randomBytes(32).toString('hex'),
            snapshotPath: './wallet.stronghold',
          },
        },
      });
      
      // Create account if it doesn't exist
      const account = await this.wallet.createAccount({
        alias: 'OmeoneChain',
      });
      
      console.log('Wallet initialized successfully');
      console.log(`Address: ${(await account.addresses())[0].address}`);
    } catch (error) {
      console.error('Failed to initialize wallet:', error);
      throw new Error('Wallet initialization failed');
    }
  }

  /**
   * Legacy method for submitting transactions
   * @param transaction Transaction data to submit
   * @returns Transaction ID and metadata
   */
  public async submitTransaction(transaction: any): Promise<any> {
    if (!this.isConnected) {
      await this.connect();
    }
    
    try {
      // Convert to Transaction format
      const tx: Transaction = {
        sender: transaction.sender,
        payload: {
          type: transaction.type,
          action: transaction.action,
          actionDetail: transaction.actionDetail,
          data: transaction.data
        },
        feeOptions: {
          maxFee: transaction.fee
        }
      };
      
      // Use the standard submitTx method
      const result = await this.submitTx(tx);
      
      // Convert back to legacy format
      return {
        transactionId: result.id,
        objectId: result.objectId,
        commitNumber: result.commitNumber,
        timestamp: result.timestamp
      };
    } catch (error) {
      console.error('Transaction submission failed:', error);
      throw new Error(`Failed to submit transaction: ${error.message}`);
    }
  }

  /**
   * Legacy method to query the current state for a given object type and ID
   * @param objectType Type of object to query
   * @param objectId ID of the object
   * @returns Current state of the object
   */
  public async queryObjectState(objectType: string, objectId: string): Promise<any> {
    if (!this.isConnected) {
      await this.connect();
    }
    
    try {
      // Use standard queryState method
      const result = await this.queryState<any>({
        objectType,
        filter: { id: objectId }
      });
      
      if (result.results.length === 0) {
        throw new Error(`Object ${objectId} of type ${objectType} not found`);
      }
      
      // Convert to legacy format
      return {
        objectId,
        objectType,
        data: result.results[0],
        commitNumber: result.results[0].tangle?.commitNumber,
        timestamp: result.results[0].timestamp
      };
    } catch (error) {
      console.error('State query failed:', error);
      throw new Error(`Failed to query state: ${error.message}`);
    }
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
  ): Promise<any[]> {
    if (!this.isConnected) {
      await this.connect();
    }
    
    try {
      // Use standard queryState method
      const result = await this.queryState<any>({
        objectType,
        filter: filters,
        pagination
      });
      
      // Convert to legacy format
      return result.results.map(item => ({
        objectId: item.id,
        objectType,
        data: item,
        commitNumber: item.tangle?.commitNumber,
        timestamp: item.timestamp
      }));
    } catch (error) {
      console.error('Objects query failed:', error);
      throw new Error(`Failed to query objects: ${error.message}`);
    }
  }

  /**
   * Legacy method to subscribe to events
   * @param eventType Type of events to subscribe to
   * @param callback Function to call when events occur
   * @returns Subscription ID
   */
  public subscribeToEvents(eventType: string, callback: (event: any) => void): string {
    const subscriptionId = crypto.randomUUID();
    
    if (!this.eventSubscribers.has(eventType)) {
      this.eventSubscribers.set(eventType, []);
    }
    
    this.eventSubscribers.get(eventType).push(callback);
    
    // Start event polling if not already started
    if (this.isConnected && this.eventSubscribers.size === 1) {
      this.pollForEvents();
    }
    
    return subscriptionId;
  }
  
  /**
   * Unsubscribe from events
   * @param subscriptionId ID of the subscription to cancel
   */
  public unsubscribeFromEvents(subscriptionId: string): void {
    // Implementation would remove the specific callback
    console.log(`Unsubscribed from events with ID: ${subscriptionId}`);
  }
  
  /**
   * Poll for new events on the DAG
   */
  private async pollForEvents(): Promise<void> {
    if (!this.isConnected || this.eventSubscribers.size === 0) {
      return;
    }
    
    try {
      const response = await axios.get(
        `${this.nodeUrl}/api/v1/events`,
        { 
          params: { since: this.lastCommitNumber },
          headers: this.apiKey ? { 'X-API-Key': this.apiKey } : {} 
        }
      );
      
      const events = response.data.events;
      
      if (events && events.length > 0) {
        // Update the last processed commit number
        this.lastCommitNumber = Math.max(
          ...events.map(event => event.commitNumber)
        );
        
        // Process each event
        events.forEach(event => {
          const chainEvent = {
            eventId: event.eventId,
            eventType: event.eventType,
            objectId: event.objectId,
            objectType: event.objectType,
            data: event.data,
            commitNumber: event.commitNumber,
            timestamp: event.timestamp
          };
          
          // Notify subscribers
          if (this.eventSubscribers.has(event.eventType)) {
            this.eventSubscribers.get(event.eventType).forEach(callback => {
              callback(chainEvent);
            });
          }
          
          // Notify subscribers to 'all' events
          if (this.eventSubscribers.has('all')) {
            this.eventSubscribers.get('all').forEach(callback => {
              callback(chainEvent);
            });
          }
        });
      }
      
      // Schedule next poll
      setTimeout(() => this.pollForEvents(), 5000); // Poll every 5 seconds
    } catch (error) {
      console.error('Event polling failed:', error);
      // Retry after a delay
      setTimeout(() => this.pollForEvents(), 10000); // Retry after 10 seconds
    }
  }
  
  /**
   * Call a Move smart contract function
   * @param contractAddress Address of the contract
   * @param functionName Name of the function to call
   * @param args Arguments for the function
   * @returns Result of the function call
   */
  public async callContractFunction(
    contractAddress: string,
    functionName: string,
    args: any[]
  ): Promise<any> {
    if (!this.isConnected) {
      await this.connect();
    }
    
    try {
      const response = await this.client.queryContract(contractAddress, functionName, args);
      return this.deserializeFromMoveVM(response);
    } catch (error) {
      console.error('Contract function call failed:', error);
      throw new Error(`Failed to call contract function: ${error.message}`);
    }
  }
  
  /**
   * Get the address of the wallet account
   * @returns Wallet address
   */
  public async getWalletAddress(): Promise<string> {
    if (!this.wallet) {
      throw new Error('Wallet is not initialized');
    }
    
    try {
      const account = await this.wallet.getAccount('OmeoneChain');
      const addresses = await account.addresses();
      
      return addresses[0].address;
    } catch (error) {
      console.error('Failed to get wallet address:', error);
      throw new Error('Could not retrieve wallet address');
    }
  }
  
  /**
   * Check the connection status
   * @returns Connection status
   */
  public isConnectedToNode(): boolean {
    return this.isConnected;
  }

  // Helper methods for the new implementation

  /**
   * Get the contract type from the payload
   * @param payload Transaction payload
   * @returns Contract type key
   */
  private getContractTypeFromPayload(payload: any): keyof RebasedConfig['contractAddresses'] {
    // Determine the contract based on payload fields
    if (payload.recommendation || payload.type === 'recommendation') {
      return 'recommendation';
    } else if (payload.reputation || payload.type === 'reputation') {
      return 'reputation';
    } else if (payload.token || payload.type === 'token') {
      return 'token';
    } else if (payload.governance || payload.type === 'governance') {
      return 'governance';
    } else if (payload.service || payload.type === 'service') {
      return 'service';
    }
    
    // Default to recommendation if unknown
    return 'recommendation';
  }

  /**
   * Get the contract type from an object type
   * @param objectType Object type
   * @returns Contract type key
   */
  private getContractTypeFromObjectType(objectType: string): keyof RebasedConfig['contractAddresses'] {
    switch (objectType.toLowerCase()) {
      case 'recommendation':
        return 'recommendation';
      case 'reputation':
      case 'user':
      case 'profile':
        return 'reputation';
      case 'token':
      case 'transaction':
        return 'token';
      case 'governance':
      case 'proposal':
        return 'governance';
      case 'service':
        return 'service';
      default:
        throw new Error(`Unknown object type: ${objectType}`);
    }
  }

  /**
   * Get the contract type from an event type
   * @param eventType Event type
   * @returns Contract type key
   */
  private getContractTypeFromEventType(eventType: string): keyof RebasedConfig['contractAddresses'] {
    if (eventType.includes('recommendation')) {
      return 'recommendation';
    } else if (eventType.includes('reputation') || eventType.includes('user')) {
      return 'reputation';
    } else if (eventType.includes('token') || eventType.includes('transfer')) {
      return 'token';
    } else if (eventType.includes('governance') || eventType.includes('proposal')) {
      return 'governance';
    } else if (eventType.includes('service')) {
      return 'service';
    } else {
      throw new Error(`Unknown event type: ${eventType}`);
    }
  }

  /**
   * Format query arguments based on the query
   * @param query State query
   * @returns Formatted arguments
   */
  private formatQueryArgs(query: StateQuery): any[] {
    const args: any[] = [];
    
    // Add ID if specified
    if (query.filter && query.filter.id) {
      args.push(query.filter.id);
    }
    
    // Add other filters
    if (query.filter) {
      const filterObj = { ...query.filter };
      delete filterObj.id; // Remove ID since it's already handled
      
      if (Object.keys(filterObj).length > 0) {
        args.push(JSON.stringify(filterObj));
      }
    }
    
    // Add pagination
    if (query.pagination) {
      args.push(query.pagination.limit);
      args.push(query.pagination.offset);
    }
    
    // Add sorting
    if (query.sort) {
      args.push(JSON.stringify({
        field: query.sort.field,
        direction: query.sort.direction
      }));
    }
    
    return args;
  }

  /**
   * Get transaction type from payload
   * @param payload Transaction payload
   * @returns Transaction type
   */
  private getTxTypeFromPayload(payload: any): string {
    if (payload.type) {
      return payload.type;
    }
    
    // Infer type from payload structure
    if (payload.recommendation || payload.serviceId) {
      return 'createRecommendation';
    } else if (payload.reputationScore || payload.userId) {
      return 'updateReputation';
    } else if (payload.amount || payload.recipient) {
      return 'transferTokens';
    } else if (payload.title || payload.proposalId) {
      return 'submitProposal';
    } else if (payload.name && payload.category) {
      return 'registerService';
    }
    
    // Default
    return 'unknown';
  }

  /**
   * Build a native transaction for the IOTA Rebased blockchain
   * @param tx Transaction in standard format
   * @param contractAddress The contract address to call
   * @returns The built transaction in native format
   */
  private async buildNativeTransaction(tx: Transaction, contractAddress: string): Promise<any> {
    // Get the tx type
    const txType = this.getTxTypeFromPayload(tx.payload);
    
    // Get the method name based on txType
    const method = this.getTxMethodName(txType);
    
    // Format the arguments
    const args = this.formatTxArgs(txType, tx.payload);
    
    // Estimate the fee
    const fee = await this.estimateFee(tx);
    
    // Use sponsor wallet if available and requested
    const sender = (tx.feeOptions?.sponsorWallet && this.config.sponsorWallet?.address) ? 
                  this.config.sponsorWallet.address : 
                  tx.sender || this.config.account.address;
    
    // Build the transaction
    return {
      id: crypto.randomBytes(32).toString('hex'),
      type: 'contract_call',
      sender,
      contract: contractAddress,
      method,
      args,
      fee,
      timestamp: new Date().toISOString(),
      payload: tx.payload
    };
  }

  /**
   * Get the method name for a transaction type
   * @param txType The transaction type
   * @returns The method name
   */
  private getTxMethodName(txType: string): string {
    // Map transaction type to method name
    const txTypeToMethodMap: Record<string, string> = {
      'createRecommendation': 'post_recommendation',
      'updateRecommendation': 'update_recommendation',
      'deleteRecommendation': 'delete_recommendation',
      'updateReputation': 'update_reputation',
      'transferTokens': 'transfer',
      'claimReward': 'claim_reward',
      'submitProposal': 'create_proposal',
      'voteOnProposal': 'cast_vote',
      'registerService': 'register_service',
      'updateService': 'update_service',
    };
    
    return txTypeToMethodMap[txType] || txType;
  }

  /**
   * Format transaction arguments based on type
   * @param txType Transaction type
   * @param payload Transaction payload
   * @returns Formatted arguments
   */
  private formatTxArgs(txType: string, payload: any): any[] {
    // Extract the actual data from the payload
    const data = payload.data || payload;
    
    switch (txType) {
      case 'createRecommendation':
        return [
          data.author,
          data.serviceId,
          data.category,
          data.rating,
          JSON.stringify(data.location),
          data.content?.title || '',
          data.content?.body || '',
          JSON.stringify(data.content?.media || []),
          data.tags || [],
        ];
      
      case 'updateReputation':
        return [
          data.userId,
          data.reputationScore.toString(),
          data.verificationLevel || 'basic',
          JSON.stringify(data.specializations || []),
        ];
      
      case 'transferTokens':
        return [
          data.recipient,
          data.amount.toString(),
          data.type || 'transfer',
          data.actionReference || '',
        ];
      
      case 'submitProposal':
        return [
          data.title,
          data.description,
          data.type,
          JSON.stringify(data.params),
          data.votingEndTime ? new Date(data.votingEndTime).toISOString() : '',
        ];
      
      case 'voteOnProposal':
        return [
          data.proposalId,
          data.vote,
        ];
      
      case 'registerService':
        return [
          data.name,
          data.category,
          JSON.stringify(data.subcategories || []),
          JSON.stringify(data.location),
          data.website || '',
          data.contact || '',
        ];
      
      default:
        return Object.values(data);
    }
  }

  /**
   * Sign a transaction
   * @param transaction The transaction to sign
   * @param senderOverride Override the sender address
   * @returns The signed transaction
   */
  private async signTransaction(transaction: any, senderOverride?: string): Promise<any> {
    // Determine which private key to use
    const sender = senderOverride || transaction.sender;
    const privateKey = sender === this.config.sponsorWallet?.address
      ? this.config.sponsorWallet.privateKey
      : this.config.account.privateKey;
    
    // For now, we'll just simulate a signature
    const signatureData = JSON.stringify(transaction);
    const signature = crypto.createHash('sha256')
      .update(signatureData)
      .update(privateKey)
      .digest('hex');
    
    // Add the signature to the transaction
    return {
      ...transaction,
      signature,
    };
  }

  /**
   * Wait for a transaction to be confirmed
   * @param txId The transaction ID
   * @returns Promise that resolves when the transaction is confirmed
   */
  private async waitForTransactionConfirmation(txId: string): Promise<void> {
    const maxAttempts = 10;
    const interval = 2000; // 2 seconds
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const status = await this.client.getTransactionStatus(txId);
        
        if (status.status === 'confirmed') {
          return;
        }
        
        if (status.status === 'failed') {
          throw new Error(`Transaction failed: ${status.error || 'Unknown error'}`);
        }
        
        // Transaction is still pending, wait and try again
        await new Promise(resolve => setTimeout(resolve, interval));
      } catch (error) {
        if (attempt === maxAttempts) {
          throw new Error(`Failed to confirm transaction after ${maxAttempts} attempts: ${error.message}`);
        }
        
        // Wait and try again
        await new Promise(resolve => setTimeout(resolve, interval));
      }
    }
    
    throw new Error(`Transaction confirmation timeout: ${txId}`);
  }

  /**
   * Deserialize data from Move VM
   * @param data The data to deserialize
   * @returns Deserialized data
   */
  private deserializeFromMoveVM(data: any): any {
    if (typeof data === 'string') {
      // Try to parse as JSON if it looks like JSON
      if (data.startsWith('{') || data.startsWith('[')) {
        try {
          return JSON.parse(data);
        } catch {
          return data;
        }
      }
      
      // Try to parse as date if it looks like a date
      if (data.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/)) {
        return new Date(data);
      }
      
      // Try to parse as a number if it's numeric
      if (data.match(/^\d+$/)) {
        const num = parseInt(data, 10);
        if (!isNaN(num)) {
          return num;
        }
      }
      
      return data;
    } else if (Array.isArray(data)) {
      return data.map(item => this.deserializeFromMoveVM(item));
    } else if (data !== null && typeof data === 'object') {
      const result: Record<string, any> = {};
      for (const key in data) {
        result[key] = this.deserializeFromMoveVM(data[key]);
      }
      return result;
    } else {
      return data;
    }
  }
}
    }
  }
}
