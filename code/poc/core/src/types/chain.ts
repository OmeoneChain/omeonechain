/**
 * Chain-related types for OmeoneChain
 * These types define the interface between the core business logic and blockchain adapters
 */

/**
 * ChainTransaction represents a transaction to be submitted to the chain
 */
export interface ChainTransaction {
  /**
   * Type of transaction (recommendation, token, reputation, governance)
   */
  type: string;
  
  /**
   * Specific action to perform (create, vote, transfer, etc.)
   */
  action: string;
  
  /**
   * Additional action details (upvote, downvote, etc.)
   */
  actionDetail?: string;
  
  /**
   * Transaction data - specific to the transaction type
   */
  data: any;
  
  /**
   * Whether the transaction requires a signature
   */
  requiresSignature: boolean;
}

/**
 * ChainState represents the current state of an object on the chain
 */
export interface ChainState {
  /**
   * Object ID
   */
  objectId: string;
  
  /**
   * Object type
   */
  objectType: string;
  
  /**
   * Object data - specific to the object type
   */
  data: any;
  
  /**
   * Commit number / block height when this state was recorded
   */
  commitNumber: number;
  
  /**
   * Timestamp when this state was recorded
   */
  timestamp: string;
}

/**
 * ChainEvent represents an event emitted by the chain
 */
export interface ChainEvent {
  /**
   * Event ID
   */
  eventId: string;
  
  /**
   * Event type
   */
  eventType: string;
  
  /**
   * ID of the object related to this event
   */
  objectId: string;
  
  /**
   * Type of the object related to this event
   */
  objectType: string;
  
  /**
   * Event data - specific to the event type
   */
  data: any;
  
  /**
   * Commit number / block height when this event was emitted
   */
  commitNumber: number;
  
  /**
   * Timestamp when this event was emitted
   */
  timestamp: string;
}

/**
 * ChainAdapter interface defines methods for interacting with a chain
 * Implementations include RebasedAdapter, EVMAdapter, and MockAdapter
 */
export interface ChainAdapter {
  /**
   * Connect to the chain
   * @returns Success status
   */
  connect(): Promise<boolean>;
  
  /**
   * Disconnect from the chain
   */
  disconnect(): Promise<void>;
  
  /**
   * Submit a transaction to the chain
   * @param transaction Transaction to submit
   * @returns Transaction result
   */
  submitTransaction(transaction: ChainTransaction): Promise<any>;
  
  /**
   * Query the current state of an object
   * @param objectType Type of object to query
   * @param objectId ID of the object
   * @returns Current state of the object
   */
  queryState(objectType: string, objectId: string): Promise<ChainState>;
  
  /**
   * Query objects by type with optional filters
   * @param objectType Type of objects to query
   * @param filters Optional filters to apply
   * @param pagination Pagination options
   * @returns Array of matching objects
   */
  queryObjects(
    objectType: string, 
    filters?: any, 
    pagination?: { limit: number; offset: number }
  ): Promise<ChainState[]>;
  
  /**
   * Subscribe to events of a specific type
   * @param eventType Type of events to subscribe to
   * @param callback Function to call when events occur
   * @returns Subscription ID
   */
  subscribeToEvents(eventType: string, callback: (event: ChainEvent) => void): string;
  
  /**
   * Unsubscribe from events
   * @param subscriptionId ID of the subscription to cancel
   */
  unsubscribeFromEvents(subscriptionId: string): void;
  
  /**
   * Check connection status
   * @returns Whether connected to the chain
   */
  isConnectedToNode(): boolean;
  
  /**
   * Get the wallet address
   * @returns Wallet address
   */
  getWalletAddress(): Promise<string>;
}
