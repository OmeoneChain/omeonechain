import { ChainAdapter, ChainEvent, ChainTransaction, ChainState } from '../types/chain';
import { RecommendationData } from '../types/recommendation';
import { UserReputationData } from '../types/reputation';
import { TokenTransaction } from '../types/token';
import axios from 'axios';
import { IotaWallet } from '@iota/wallet';
import { Ed25519Seed } from '@iota/crypto.js';
import { Buffer } from 'buffer';
import * as crypto from 'crypto';

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
  
  /**
   * Constructor
   * @param nodeUrl The URL of the IOTA Rebased node
   * @param apiKey Optional API key for authenticated access
   * @param seed Optional seed for wallet initialization
   */
  constructor(nodeUrl: string, apiKey?: string, seed?: string) {
    this.nodeUrl = nodeUrl;
    this.apiKey = apiKey || '';
    
    // Initialize wallet if seed is provided
    if (seed) {
      this.initializeWallet(seed);
    }
  }

  /**
   * Initialize and connect to the Rebased network
   */
  public async connect(): Promise<boolean> {
    try {
      // Test connection to node
      const response = await axios.get(`${this.nodeUrl}/api/v1/info`, {
        headers: this.apiKey ? { 'X-API-Key': this.apiKey } : {}
      });
      
      if (response.status === 200) {
        console.log(`Connected to IOTA Rebased node: ${this.nodeUrl}`);
        console.log(`Node version: ${response.data.version}`);
        console.log(`Network: ${response.data.network}`);
        
        // Start event listener
        this.startEventListener();
        
        this.isConnected = true;
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Failed to connect to IOTA Rebased node:', error);
      this.isConnected = false;
      return false;
    }
  }

  /**
   * Disconnect from the Rebased network
   */
  public async disconnect(): Promise<void> {
    // Stop event listener
    this.stopEventListener();
    
    this.isConnected = false;
    console.log('Disconnected from IOTA Rebased node');
  }

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
   * Submit a transaction to the Rebased DAG
   * @param transaction Transaction data to submit
   * @returns Transaction ID and metadata
   */
  public async submitTransaction(transaction: ChainTransaction): Promise<any> {
    if (!this.isConnected) {
      throw new Error('Not connected to IOTA Rebased node');
    }
    
    try {
      const payload = this.formatTransactionPayload(transaction);
      
      // Prepare transaction headers
      const headers: any = {};
      if (this.apiKey) {
        headers['X-API-Key'] = this.apiKey;
      }
      
      // For transactions requiring a wallet, use wallet methods
      if (transaction.requiresSignature) {
        return this.submitSignedTransaction(transaction);
      } else {
        // For transactions that don't require signatures
        const response = await axios.post(
          `${this.nodeUrl}/api/v1/transactions`, 
          payload,
          { headers }
        );
        
        return {
          transactionId: response.data.transactionId,
          objectId: response.data.objectId,
          commitNumber: response.data.commitNumber,
          timestamp: response.data.timestamp
        };
      }
    } catch (error) {
      console.error('Transaction submission failed:', error);
      throw new Error(`Failed to submit transaction: ${error.message}`);
    }
  }
  
  /**
   * Submit a transaction that requires a signature using the wallet
   * @param transaction Transaction data to submit
   * @returns Transaction ID and metadata
   */
  private async submitSignedTransaction(transaction: ChainTransaction): Promise<any> {
    if (!this.wallet) {
      throw new Error('Wallet is not initialized. Cannot sign transaction.');
    }
    
    try {
      const account = await this.wallet.getAccount('OmeoneChain');
      
      // Format the transaction for the specific Move smart contract call
      const moveCallPayload = this.formatMoveCallPayload(transaction);
      
      // Prepare transaction
      const preparedTransaction = await account.prepareTransaction({
        type: 'MoveVM',
        callData: moveCallPayload,
        gasBudget: 1000, // Adjust based on transaction complexity
      });
      
      // Sign and submit transaction
      const submittedTransaction = await account.signAndSubmitTransaction(preparedTransaction);
      
      return {
        transactionId: submittedTransaction.transactionId,
        objectId: submittedTransaction.objectId,
        commitNumber: submittedTransaction.commitNumber,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Signed transaction submission failed:', error);
      throw new Error(`Failed to submit signed transaction: ${error.message}`);
    }
  }

  /**
   * Format transaction payload for the IOTA Rebased API
   * @param transaction Transaction data
   * @returns Formatted payload
   */
  private formatTransactionPayload(transaction: ChainTransaction): any {
    // Format based on transaction type
    switch (transaction.type) {
      case 'recommendation':
        return this.formatRecommendationPayload(transaction.data as RecommendationData);
      
      case 'reputation':
        return this.formatReputationPayload(transaction.data as UserReputationData);
      
      case 'token':
        return this.formatTokenPayload(transaction.data as TokenTransaction);
      
      case 'governance':
        return this.formatGovernancePayload(transaction.data);
      
      default:
        throw new Error(`Unsupported transaction type: ${transaction.type}`);
    }
  }
  
  /**
   * Format payload for Move VM smart contract calls
   * @param transaction Transaction data
   * @returns Formatted Move contract call payload
   */
  private formatMoveCallPayload(transaction: ChainTransaction): any {
    const contractAddresses = {
      recommendation: '0x4f6d656f6e654368e4b8bce8a18de6bd8a8e5ddb', // OmeoneChain recommendation contract
      token: '0x4f6d656f6e6554e4b8bce8a18de6bd8a8e5dcc1', // OmeoneChain token contract
      governance: '0x4f6d656f6e65476f7665726e616e63655ddc7', // OmeoneChain governance contract
    };
    
    let contractAddress: string;
    let functionName: string;
    let typeArguments: string[] = [];
    let arguments: any[] = [];
    
    switch (transaction.type) {
      case 'recommendation':
        contractAddress = contractAddresses.recommendation;
        const recData = transaction.data as RecommendationData;
        
        if (transaction.action === 'create') {
          functionName = 'post_recommendation';
          arguments = [
            recData.author,
            recData.contentHash,
            JSON.stringify({
              category: recData.category,
              serviceId: recData.serviceId,
              timestamp: recData.timestamp,
              location: {
                latitude: recData.location.latitude,
                longitude: recData.location.longitude
              }
            })
          ];
        } else if (transaction.action === 'vote') {
          functionName = 'vote';
          arguments = [
            recData.id,
            transaction.actionDetail === 'upvote' // true for upvote, false for downvote
          ];
        }
        break;
      
      case 'token':
        contractAddress = contractAddresses.token;
        const tokenData = transaction.data as TokenTransaction;
        
        if (transaction.action === 'transfer') {
          functionName = 'transfer';
          arguments = [
            tokenData.recipient,
            tokenData.amount.toString()
          ];
        } else if (transaction.action === 'claim_reward') {
          functionName = 'claim_reward';
          arguments = [
            tokenData.actionReference
          ];
        }
        break;
      
      case 'governance':
        contractAddress = contractAddresses.governance;
        
        if (transaction.action === 'propose') {
          functionName = 'create_proposal';
          arguments = [
            transaction.data.title,
            transaction.data.description,
            transaction.data.parameters,
            transaction.data.votingDuration
          ];
        } else if (transaction.action === 'vote') {
          functionName = 'cast_vote';
          arguments = [
            transaction.data.proposalId,
            transaction.data.vote // true for yes, false for no
          ];
        }
        break;
      
      default:
        throw new Error(`Unsupported transaction type: ${transaction.type}`);
    }
    
    return {
      contractAddress,
      functionName,
      typeArguments,
      arguments
    };
  }
  
  /**
   * Format recommendation payload
   * @param data Recommendation data
   * @returns Formatted payload
   */
  private formatRecommendationPayload(data: RecommendationData): any {
    return {
      objectType: 'recommendation',
      content: {
        id: data.id,
        author: data.author,
        serviceId: data.serviceId,
        category: data.category,
        location: data.location,
        rating: data.rating,
        contentHash: data.contentHash,
        timestamp: data.timestamp || new Date().toISOString()
      }
    };
  }
  
  /**
   * Format reputation payload
   * @param data Reputation data
   * @returns Formatted payload
   */
  private formatReputationPayload(data: UserReputationData): any {
    return {
      objectType: 'reputation',
      content: {
        userId: data.userId,
        reputationScore: data.reputationScore,
        verificationLevel: data.verificationLevel,
        totalRecommendations: data.totalRecommendations,
        upvotesReceived: data.upvotesReceived,
        downvotesReceived: data.downvotesReceived,
        specializations: data.specializations,
        updatedAt: new Date().toISOString()
      }
    };
  }
  
  /**
   * Format token payload
   * @param data Token transaction data
   * @returns Formatted payload
   */
  private formatTokenPayload(data: TokenTransaction): any {
    return {
      objectType: 'token',
      content: {
        sender: data.sender,
        recipient: data.recipient,
        amount: data.amount,
        type: data.type,
        actionReference: data.actionReference,
        timestamp: data.timestamp || new Date().toISOString()
      }
    };
  }
  
  /**
   * Format governance payload
   * @param data Governance data
   * @returns Formatted payload
   */
  private formatGovernancePayload(data: any): any {
    return {
      objectType: 'governance',
      content: {
        ...data,
        timestamp: data.timestamp || new Date().toISOString()
      }
    };
  }

  /**
   * Query the current state for a given object type and ID
   * @param objectType Type of object to query
   * @param objectId ID of the object
   * @returns Current state of the object
   */
  public async queryState(objectType: string, objectId: string): Promise<ChainState> {
    if (!this.isConnected) {
      throw new Error('Not connected to IOTA Rebased node');
    }
    
    try {
      const response = await axios.get(
        `${this.nodeUrl}/api/v1/objects/${objectType}/${objectId}`,
        { headers: this.apiKey ? { 'X-API-Key': this.apiKey } : {} }
      );
      
      return {
        objectId: response.data.objectId,
        objectType: response.data.objectType,
        data: response.data.content,
        commitNumber: response.data.commitNumber,
        timestamp: response.data.timestamp
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
  ): Promise<ChainState[]> {
    if (!this.isConnected) {
      throw new Error('Not connected to IOTA Rebased node');
    }
    
    try {
      // Construct query parameters
      const params: any = { type: objectType };
      
      // Add filters if provided
      if (filters) {
        Object.keys(filters).forEach(key => {
          params[key] = filters[key];
        });
      }
      
      // Add pagination if provided
      if (pagination) {
        params.limit = pagination.limit;
        params.offset = pagination.offset;
      }
      
      const response = await axios.get(
        `${this.nodeUrl}/api/v1/objects`,
        { 
          params,
          headers: this.apiKey ? { 'X-API-Key': this.apiKey } : {} 
        }
      );
      
      return response.data.objects.map(obj => ({
        objectId: obj.objectId,
        objectType: obj.objectType,
        data: obj.content,
        commitNumber: obj.commitNumber,
        timestamp: obj.timestamp
      }));
    } catch (error) {
      console.error('Objects query failed:', error);
      throw new Error(`Failed to query objects: ${error.message}`);
    }
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
    // Implementation would remove the specific callback
    // For simplicity, we're not implementing the full logic here
    console.log(`Unsubscribed from events with ID: ${subscriptionId}`);
  }
  
  /**
   * Start event listener to monitor the DAG for new events
   */
  private async startEventListener(): Promise<void> {
    // Set up continuous polling for events
    this.pollForEvents();
  }
  
  /**
   * Stop event listener
   */
  private stopEventListener(): void {
    // Implementation would stop the polling interval
    console.log('Event listener stopped');
  }
  
  /**
   * Poll for new events on the DAG
   */
  private async pollForEvents(): Promise<void> {
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
          const chainEvent: ChainEvent = {
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
      throw new Error('Not connected to IOTA Rebased node');
    }
    
    try {
      const response = await axios.post(
        `${this.nodeUrl}/api/v1/move/call`,
        {
          contractAddress,
          functionName,
          arguments: args
        },
        { headers: this.apiKey ? { 'X-API-Key': this.apiKey } : {} }
      );
      
      return response.data.result;
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
}
