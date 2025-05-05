/**
 * Chain Adapter Interface
 * 
 * Provides a common interface for different blockchain implementations
 * Based on Technical Specifications A.1.3 (Blockchain Abstraction Layer)
 */

/**
 * Generic transaction type for cross-chain compatibility
 */
export interface Transaction {
  /**
   * ID of the transaction
   */
  id?: string;
  
  /**
   * Sender address/public key
   */
  sender: string;
  
  /**
   * Transaction payload (implementation-specific)
   */
  payload: any;
  
  /**
   * Gas/fee options (if applicable)
   */
  feeOptions?: {
    maxFee?: number;
    sponsorWallet?: string;
  };
  
  /**
   * Chain-specific options
   */
  options?: Record<string, any>;
}

/**
 * Result of a transaction submission
 */
export interface TransactionResult {
  /**
   * Transaction ID
   */
  id: string;
  
  /**
   * Status of the transaction
   */
  status: 'pending' | 'confirmed' | 'failed';
  
  /**
   * Timestamp when the transaction was submitted
   */
  timestamp: string;
  
  /**
   * Block/commit number where the transaction was included
   */
  commitNumber?: number;
  
  /**
   * Object ID created (if applicable)
   */
  objectId?: string;
  
  /**
   * Error message (if status is 'failed')
   */
  error?: string;
  
  /**
   * Additional chain-specific details
   */
  details?: Record<string, any>;
}

/**
 * Query parameters for state lookups
 */
export interface StateQuery {
  /**
   * Type of object to query
   */
  objectType: string;
  
  /**
   * Filter criteria
   */
  filter?: Record<string, any>;
  
  /**
   * Sorting options
   */
  sort?: {
    field: string;
    direction: 'asc' | 'desc';
  };
  
  /**
   * Pagination parameters
   */
  pagination?: {
    offset: number;
    limit: number;
  };
}

/**
 * Filter for blockchain events
 */
export interface EventFilter {
  /**
   * Types of events to listen for
   */
  eventTypes: string[];
  
  /**
   * Optional address/object to filter by
   */
  address?: string;
  
  /**
   * Additional filter criteria
   */
  filter?: Record<string, any>;
  
  /**
   * Starting block/commit number
   */
  fromCommit?: number;
}

/**
 * Blockchain event structure
 */
export interface Event {
  /**
   * Type of event
   */
  type: string;
  
  /**
   * Block/commit number where the event occurred
   */
  commitNumber: number;
  
  /**
   * Timestamp of the event
   */
  timestamp: string;
  
  /**
   * Address/object that emitted the event
   */
  address: string;
  
  /**
   * Event data payload
   */
  data: any;
}

/**
 * Chain Adapter interface
 * Provides a common interface for interacting with different blockchain implementations
 */
export interface ChainAdapter {
  /**
   * Get the chain ID
   */
  getChainId(): Promise<string>;
  
  /**
   * Submit a transaction to the blockchain
   * 
   * @param tx Transaction to submit
   * @returns Transaction result
   */
  submitTx(tx: Transaction): Promise<TransactionResult>;
  
  /**
   * Query the current state
   * 
   * @param query Query parameters
   * @returns Query results
   */
  queryState<T>(query: StateQuery): Promise<{
    results: T[];
    total: number;
    pagination?: {
      offset: number;
      limit: number;
      hasMore: boolean;
    };
  }>;
  
  /**
   * Watch for events on the blockchain
   * 
   * @param filter Event filter
   * @returns Async iterator of events
   */
  watchEvents(filter: EventFilter): AsyncIterator<Event>;
  
  /**
   * Get the current commit/block number
   * 
   * @returns Current commit number
   */
  getCurrentCommit(): Promise<number>;
  
  /**
   * Calculate the estimated fee for a transaction
   * 
   * @param tx Transaction to estimate fee for
   * @returns Estimated fee in smallest units (e.g., µIOTA)
   */
  estimateFee(tx: Transaction): Promise<number>;
  
  /**
   * Connect to the blockchain network
   * 
   * @param options Connection options
   * @returns Promise resolving when connected
   */
  connect(options?: Record<string, any>): Promise<void>;
  
  /**
   * Disconnect from the blockchain network
   * 
   * @returns Promise resolving when disconnected
   */
  disconnect(): Promise<void>;
}
