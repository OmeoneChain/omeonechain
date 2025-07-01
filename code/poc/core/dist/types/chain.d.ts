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
 * Legacy Transaction type (used by existing MockAdapter)
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
 * Legacy TransactionResult type
 */
export interface TransactionResult {
    id: string;
    status: string;
    timestamp: string;
    commitNumber: number;
    objectId?: string;
    details?: any;
}
/**
 * Legacy StateQuery type
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
 * Legacy EventFilter type
 */
export interface EventFilter {
    eventTypes: string[];
    address?: string;
    fromCommit?: number;
}
/**
 * Legacy Event type
 */
export interface Event {
    type: string;
    commitNumber: number;
    timestamp: string;
    address: string;
    data: any;
}
/**
 * ChainAdapter interface defines methods for interacting with a chain
 * Implementations include RebasedAdapter, EVMAdapter, and MockAdapter
 */
export interface ChainAdapter {
    /**
     * Connect to the chain
     * @returns Success status (updated to return boolean for compatibility)
     */
    connect(): Promise<boolean | void>;
    /**
     * Disconnect from the chain
     */
    disconnect(): Promise<void>;
    /**
     * Submit a transaction to the chain (NEW FORMAT - used by GovernanceEngine)
     * @param transaction Transaction to submit
     * @returns Transaction ID
     */
    submitTransaction(transaction: Partial<ChainTransaction>): Promise<string>;
    /**
     * Query the current state of an object
     * @param objectType Type of object to query
     * @param objectId ID of the object
     * @returns Current state of the object
     */
    queryState(objectType: string, objectId: string): Promise<ChainState>;
    /**
     * Query objects by type with optional filters (OVERLOADED for compatibility)
     */
    queryObjects(objectType: string, filters?: any, pagination?: {
        limit: number;
        offset: number;
    }): Promise<ChainState[]>;
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
    /**
     * Legacy: Get chain ID
     */
    getChainId?(): Promise<string>;
    /**
     * Legacy: Submit transaction (old format)
     */
    submitTx?(tx: Transaction): Promise<TransactionResult>;
    /**
     * Legacy: Query state with different signature
     */
    queryState?<T>(query: StateQuery): Promise<{
        results: T[];
        total: number;
        pagination?: {
            offset: number;
            limit: number;
            hasMore: boolean;
        };
    }>;
    /**
     * Legacy: Watch events
     */
    watchEvents?(filter: EventFilter): AsyncIterator<Event>;
    /**
     * Legacy: Get current commit
     */
    getCurrentCommit?(): Promise<number>;
    /**
     * Legacy: Estimate fee
     */
    estimateFee?(tx: Transaction): Promise<number>;
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
