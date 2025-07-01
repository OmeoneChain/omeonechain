/**
 * Chain Adapter Interface
 *
 * Provides a common interface for different blockchain implementations
 * Based on Technical Specifications A.1.3 (Blockchain Abstraction Layer)
 * Updated to fix TypeScript compatibility issues
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
 * Query result structure for state queries
 */
export interface StateQueryResult<T = any> {
    results: T[];
    total: number;
    pagination?: {
        offset: number;
        limit: number;
        hasMore: boolean;
    };
}
/**
 * Chain configuration interface
 */
export interface ChainConfig {
    networkId: string;
    rpcUrl: string;
    indexerUrl?: string;
    explorerUrl?: string;
    gasPrice?: number;
    gasLimit?: number;
    sponsorWallet?: string;
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
    queryState<T>(query: StateQuery): Promise<StateQueryResult<T>>;
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
    /**
     * Health check for circuit breaker pattern
     *
     * @returns Promise resolving to true if healthy
     */
    healthCheck(): Promise<boolean>;
    /**
     * Get current network status
     *
     * @returns Network information and health status
     */
    getNetworkInfo(): Promise<{
        chainId: string;
        currentCommit: number;
        networkStatus: 'healthy' | 'degraded' | 'down';
        lastUpdate: string;
    }>;
}
/**
 * Abstract base class for chain adapters
 * Provides common functionality and structure
 */
export declare abstract class BaseChainAdapter implements ChainAdapter {
    protected config: ChainConfig;
    protected connected: boolean;
    constructor(config: ChainConfig);
    abstract getChainId(): Promise<string>;
    abstract submitTx(tx: Transaction): Promise<TransactionResult>;
    abstract queryState<T>(query: StateQuery): Promise<StateQueryResult<T>>;
    abstract watchEvents(filter: EventFilter): AsyncIterator<Event>;
    abstract getCurrentCommit(): Promise<number>;
    abstract estimateFee(tx: Transaction): Promise<number>;
    abstract connect(options?: Record<string, any>): Promise<void>;
    abstract disconnect(): Promise<void>;
    /**
     * Default health check implementation
     */
    healthCheck(): Promise<boolean>;
    /**
     * Default network info implementation
     */
    getNetworkInfo(): Promise<{
        chainId: string;
        currentCommit: number;
        networkStatus: 'healthy' | 'degraded' | 'down';
        lastUpdate: string;
    }>;
    /**
     * Check if adapter is connected
     */
    isConnected(): boolean;
    /**
     * Get adapter configuration
     */
    getConfig(): ChainConfig;
}
