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
    options?: any;
}
/**
 * Result of transaction submission
 */
export interface TransactionResult {
    id?: string;
    status: string;
    timestamp: string;
    commitNumber?: number;
    objectId?: string;
    details?: any;
    success: boolean;
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
 */
export interface EventFilter {
    eventTypes: string[];
    address?: string;
    fromCommit?: number;
}
/**
 * Blockchain event
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
 */
export interface NetworkInfo {
    chainId: string;
    networkName: string;
    blockHeight: number;
    isHealthy: boolean;
}
/**
 * Token balance information
 */
export interface TokenBalance {
    confirmed: number;
    pending: number;
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
/**
 * ChainAdapter interface defines methods for interacting with a chain
 * FIXED: Unified interface that engines expect with consistent method signatures
 */
export interface ChainAdapter {
    /**
     * Connect to the chain
     */
    connect(): Promise<boolean>;
    /**
     * Disconnect from the chain
     */
    disconnect(): Promise<void>;
    /**
     * Check if connected to chain
     */
    isConnected(): Promise<boolean>;
    /**
     * Check connection to node
     */
    isConnectedToNode(): Promise<boolean>;
    /**
     * Submit a transaction to the chain
     * FIXED: Single signature that engines expect
     */
    submitTransaction(transaction: ChainTransaction | Transaction | Partial<ChainTransaction>): Promise<TransactionResult>;
    /**
     * Query objects by type with filters
     * FIXED: Method signature that engines expect
     */
    queryObjects(objectType: string, filters?: any, pagination?: {
        limit: number;
        offset: number;
    }): Promise<ChainState[]>;
    /**
     * Query state with structured query
     * FIXED: Single signature with generic support
     */
    queryState<T = any>(query: StateQuery): Promise<QueryResult<T>>;
    /**
     * Store data on chain
     * FIXED: Added method that engines expect
     */
    store(key: string, value: any): Promise<string>;
    /**
     * Retrieve data from chain
     * FIXED: Added method that engines expect
     */
    retrieve(key: string): Promise<any>;
    /**
     * Watch for events matching filter
     */
    watchEvents(filter: EventFilter): AsyncIterator<ChainEvent>;
    /**
     * Subscribe to events (legacy compatibility)
     */
    subscribeToEvents(eventType: string, callback: (event: ChainEvent) => void): string;
    subscribeToEvents(filter: EventFilter): AsyncIterator<ChainEvent>;
    /**
     * Unsubscribe from events
     */
    unsubscribeFromEvents(subscriptionId: string): void;
    /**
     * Get wallet address
     */
    getWalletAddress(): Promise<string>;
    /**
     * Get user balance
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
    /**
     * Submit action for reward
     */
    submitActionForReward(userId: string, action: string, metadata?: any): Promise<TransactionResult>;
    /**
     * Claim user rewards
     */
    claimUserRewards(userId: string): Promise<TransactionResult>;
    /**
     * Get network information
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
}
/**
 * Transaction types used throughout the system
 */
export type TransactionType = 'recommendation' | 'vote' | 'reputation_update' | 'token_transfer' | 'token_reward' | 'governance_stake' | 'governance_proposal' | 'governance_vote' | 'governance_execute' | 'governance_milestone';
/**
 * Object types stored on chain
 */
export type ObjectType = 'recommendation' | 'user_profile' | 'service' | 'governance_proposal' | 'governance_stake';
/**
 * Event types emitted by the chain
 */
export type EventType = 'recommendation_created' | 'vote_cast' | 'reputation_updated' | 'token_transferred' | 'governance_stake_created' | 'governance_proposal_created' | 'governance_vote_cast';
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
export declare enum AdapterType {
    REBASED = "rebased",
    EVM = "evm"
}
/**
 * Union type for adapter configurations
 */
export type AdapterConfig = RebasedConfig | EVMConfig;
