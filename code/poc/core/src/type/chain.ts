/**
 * Chain-related types for OmeoneChain
 * These types define the interface between the core business logic and blockchain adapters
 */

/**
 * ChainTransaction represents a transaction to be submitted to the chain
 */
export interface ChainTransaction {
  /**
   * Unique transaction ID (optional for submission, generated if not provided)
   */
  id?: string;
  
  /**
   * Type of transaction (recommendation, token, reputation, governance)
   */
  type: string;
  
  /**
   * Specific action to perform (create, vote, transfer, etc.)
   */
  action?: string;
  
  /**
   * Additional action details (upvote, downvote, etc.)
   */
  actionDetail?: string;
  
  /**
   * Transaction data - specific to the transaction type
   */
  data: any;
  
  /**
   * Transaction timestamp
   */
  timestamp?: Date;
  
  /**
   * Transaction status
   */
  status?: 'pending' | 'confirmed' | 'failed';
  
  /**
   * Whether the transaction requires a signature
   */
  requiresSignature?: boolean;
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
 * FIXED: Enhanced to match adapter expectations
 */
export interface ChainEvent {
  /**
   * Event ID (optional)
   */
  eventId?: string;
  
  /**
   * Event type
   */
  type: string;
  
  /**
   * Alternative event type field for compatibility
   */
  eventType?: string;
  
  /**
   * ID of the object related to this event
   */
  objectId?: string;
  
  /**
   * Type of the object related to this event
   */
  objectType?: string;
  
  /**
   * Event data - specific to the event type
   */
  data: any;
  
  /**
   * Commit number / block height when this event was emitted
   */
  commitNumber: number;
  
  /**
   * Block height (alternative to commitNumber)
   */
  blockHeight?: number;
  
  /**
   * Timestamp when this event was emitted
   */
  timestamp: string;
  
  /**
   * Address that emitted the event
   */
  address: string;
  
  /**
   * Transaction ID that generated this event
   */
  transactionId?: string;
}

/**
 * Transaction for submission to chain
 */
export interface Transaction {
  id?: string;
  sender: string;
  payload?: {
    objectType?: string;
    data?: any;
    [key: string]: any;
  };
  feeOptions?: {
    maxFee?: number;
  };
  options?: any;
}

/**
 * Result of transaction submission
 * FIXED: Added missing properties that adapters expect
 */
export interface TransactionResult {
  id?: string;
  status: string;
  timestamp: string;
  commitNumber?: number;
  objectId?: string;
  details?: any;
  success?: boolean;
  
  /**
   * ADDED: Gas used for transaction (expected by adapters)
   */
  gasUsed?: number;
  
  /**
   * ADDED: Error message if transaction failed (expected by adapters)
   */
  error?: string;
  
  /**
   * ADDED: Events emitted by the transaction (expected by adapters)
   */
  events?: any[];
  
  data?: {
    hash?: string;
    transactionHash?: string;
    [key: string]: any;
  };
}

/**
 * Query for blockchain state
 */
export interface StateQuery {
  objectType: string;
  filter?: Record<string, any>;
  sort?: {
    field: string;
    direction: 'asc' | 'desc';
  };
  pagination?: {
    offset: number;
    limit: number;
  };
}

/**
 * Query result structure
 */
export interface QueryResult<T = any> {
  results: T[];
  total: number;
  pagination?: {
    offset: number;
    limit: number;
    hasMore: boolean;
  };
}

/**
 * Filter for blockchain events
 * FIXED: Enhanced to match adapter usage
 */
export interface EventFilter {
  eventTypes: string[];
  address?: string;
  fromCommit?: number;
  
  /**
   * ADDED: Generic filter property for adapter compatibility
   */
  filter?: Record<string, any>;
}

/**
 * Blockchain event (legacy interface for compatibility)
 */
export interface Event {
  type: string;
  commitNumber: number;
  timestamp: string;
  address: string;
  data: any;
}

/**
 * Network information
 * FIXED: Enhanced to match adapter expectations
 */
export interface NetworkInfo {
  chainId: string;
  networkName: string;
  
  /**
   * Network type (testnet, mainnet, etc.)
   */
  networkType?: string;
  
  blockHeight: number;
  
  /**
   * Latest checkpoint (alternative to blockHeight)
   */
  latestCheckpoint?: string;
  
  isHealthy: boolean;
}

/**
 * Token balance information
 * FIXED: Enhanced to match adapter expectations
 */
export interface TokenBalance {
  /**
   * Confirmed balance amount (as string for precision)
   */
  confirmed: string;
  
  /**
   * Pending balance amount (as string for precision)
   */
  pending: string;
  
  /**
   * Total value (as string for precision)
   */
  value?: string;
  
  /**
   * Token decimals
   */
  decimals?: number;
  
  /**
   * Token symbol
   */
  symbol?: string;
}

/**
 * Object query for chain operations
 */
export interface ObjectQuery {
  objectType: string;
  filters?: any;
  pagination?: {
    limit: number;
    offset: number;
  };
}

// ============================================================================
// MAIN CHAIN ADAPTER INTERFACE - PHASE 2C ALIGNED VERSION
// ============================================================================

/**
 * ChainAdapter interface defines methods for interacting with a chain
 * FIXED: Unified interface that engines expect with consistent method signatures
 */
export interface ChainAdapter {
  // ============================================================================
  // CONNECTION MANAGEMENT
  // ============================================================================
  
  /**
   * Connect to the chain
   * FIXED: Should return Promise<boolean> not Promise<void>
   */
  connect(): Promise<boolean>;
  
  /**
   * Disconnect from the chain
   */
  disconnect(): Promise<void>;
  
  /**
   * Check if connected to chain
   * FIXED: Should return Promise<boolean> not boolean
   */
  isConnected(): Promise<boolean>;
  
  /**
   * Check connection to node
   */
  isConnectedToNode(): Promise<boolean>;
  
  // ============================================================================
  // CORE TRANSACTION AND QUERY METHODS - ENGINES EXPECT THESE
  // ============================================================================
  
  /**
   * Submit a transaction to the chain
   * FIXED: Single signature that engines expect
   */
  submitTransaction(transaction: ChainTransaction | Transaction | Partial<ChainTransaction>): Promise<TransactionResult>;
  
  /**
   * Query objects by type with filters
   * FIXED: Method signature that engines expect
   */
  queryObjects(
    objectType: string, 
    filters?: any, 
    pagination?: { limit: number; offset: number }
  ): Promise<ChainState[]>;
  
  /**
   * ALTERNATIVE: Query objects with filter object (adapter compatibility)
   */
  queryObjects(filter: any): Promise<any[]>;
  
  /**
   * Query state with structured query
   * FIXED: Single signature with generic support
   */
  queryState<T = any>(query: StateQuery): Promise<QueryResult<T>>;
  
  // ============================================================================
  // STORAGE METHODS - ENGINES EXPECT THESE
  // ============================================================================
  
  /**
   * Store data on chain
   * FIXED: Added method that engines expect
   */
  store(key: string, value: any): Promise<void>;
  
  /**
   * Retrieve data from chain
   * FIXED: Added method that engines expect  
   */
  retrieve(key: string): Promise<any>;
  
  // ============================================================================
  // EVENT HANDLING
  // ============================================================================
  
  /**
   * Watch for events matching filter
   * FIXED: Should return AsyncIterator<ChainEvent> not AsyncIterator<Event>
   */
  watchEvents(filter: EventFilter): AsyncIterator<ChainEvent>;
  
  /**
   * Subscribe to events (legacy compatibility)
   * FIXED: Multiple overloads for different use cases
   */
  subscribeToEvents(eventType: string, callback: (event: ChainEvent) => void): string;
  subscribeToEvents(filter: EventFilter): AsyncIterator<ChainEvent>;
  
  /**
   * Unsubscribe from events
   */
  unsubscribeFromEvents(subscriptionId: string): Promise<void>;
  
  // ============================================================================
  // USER AND WALLET OPERATIONS
  // ============================================================================
  
  /**
   * Get wallet address
   * FIXED: Added optional publicKey parameter for adapter compatibility
   */
  getWalletAddress(publicKey?: string): Promise<string>;
  
  /**
   * Get user balance
   * FIXED: Enhanced to match adapter expectations
   */
  getBalance(address: string): Promise<TokenBalance>;
  
  /**
   * Get user trust score
   */
  getUserTrustScore(address: string): Promise<number>;
  
  /**
   * Get user reputation score
   */
  getUserReputationScore(address: string): Promise<any>;
  
  // ============================================================================
  // REWARD AND ACTION METHODS
  // ============================================================================
  
  /**
   * Submit action for reward
   * FIXED: Updated signature to match adapter implementations
   */
  submitActionForReward(userId: string, actionData: any): Promise<TransactionResult>;
  
  /**
   * Claim user rewards
   */
  claimUserRewards(userId: string): Promise<TransactionResult>;
  
  // ============================================================================
  // NETWORK INFORMATION
  // ============================================================================
  
  /**
   * Get network information
   * FIXED: Enhanced to match adapter expectations
   */
  getNetworkInfo(): Promise<NetworkInfo>;
  
  /**
   * Get chain ID
   */
  getChainId(): Promise<string>;
  
  /**
   * Get current commit number
   */
  getCurrentCommit(): Promise<number>;
  
  /**
   * Estimate transaction fee
   */
  estimateFee(tx: Transaction): Promise<number>;
  
  /**
   * ADDED: Health check method that adapters implement
   */
  healthCheck?(): Promise<{ healthy: boolean; details: any }>;
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

/**
 * Transaction types used throughout the system
 */
export type TransactionType = 
  | 'recommendation' 
  | 'vote' 
  | 'reputation_update' 
  | 'token_transfer' 
  | 'token_reward' 
  | 'governance_stake' 
  | 'governance_proposal' 
  | 'governance_vote' 
  | 'governance_execute' 
  | 'governance_milestone';

/**
 * Object types stored on chain
 */
export type ObjectType = 
  | 'recommendation' 
  | 'user_profile' 
  | 'service' 
  | 'governance_proposal' 
  | 'governance_stake';

/**
 * Event types emitted by the chain
 */
export type EventType = 
  | 'recommendation_created' 
  | 'vote_cast' 
  | 'reputation_updated' 
  | 'token_transferred' 
  | 'governance_stake_created' 
  | 'governance_proposal_created' 
  | 'governance_vote_cast';

// ============================================================================
// ADAPTER CONFIGURATION TYPES
// ============================================================================

/**
 * IOTA Rebased adapter configuration
 */
export interface RebasedConfig {
  network: 'mainnet' | 'testnet' | 'devnet';
  nodeUrl?: string;
  account?: {
    address: string;
    privateKey: string;
  };
}

/**
 * EVM adapter configuration
 */
export interface EVMConfig {
  chainId: number;
  rpcUrl: string;
  contractAddresses: {
    recommendation: string;
    reputation: string;
    token: string;
    governance: string;
  };
  account: {
    address: string;
    privateKey: string;
  };
}

/**
 * Chain adapter types
 */
export enum AdapterType {
  REBASED = 'rebased',
  EVM = 'evm'
}

/**
 * Union type for adapter configurations
 */
export type AdapterConfig = RebasedConfig | EVMConfig;