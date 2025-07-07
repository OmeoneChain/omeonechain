import { ChainConfig, StateQuery, StateQueryResult, Transaction, TransactionResult, Event, EventFilter, BaseChainAdapter } from './chain-adapter';
import { ChainEvent, ChainTransaction, ChainState } from '../type/chain';
/**
 * MockAdapter (Version 2) - Implementation of ChainAdapter for testing and development
 *
 * This adapter simulates a blockchain environment for local testing without
 * requiring an actual blockchain connection.
 *
 * This is the updated version that integrates with the existing project structure
 * and implements the ChainAdapter interface properly.
 */
export declare class MockAdapterV2 extends BaseChainAdapter {
    private isConnected;
    private eventSubscribers;
    private simulateLatency;
    private failureRate;
    private mockWalletAddress;
    private recommendations;
    private reputations;
    private tokens;
    private governance;
    private transactions;
    private commitNumber;
    /**
     * Constructor
     * @param config Chain configuration
     * @param simulateLatency Whether to simulate network latency
     * @param failureRate Percentage chance (0-100) of random failures
     */
    constructor(config: ChainConfig, simulateLatency?: boolean, failureRate?: number);
    /**
     * Simulate async delay if enabled
     */
    private simulateDelay;
    /**
     * Simulate random failures if enabled
     */
    private simulateFailure;
    /**
     * Generate a random object ID
     * @param prefix Object type prefix
     * @returns Random object ID
     */
    private generateObjectId;
    /**
     * Get the chain ID
     */
    getChainId(): Promise<string>;
    /**
     * Submit a transaction to the mock chain (ChainAdapter interface)
     * @param tx Transaction to submit
     * @returns Transaction result
     */
    submitTx(tx: Transaction): Promise<TransactionResult>;
    /**
     * Query the current state (ChainAdapter interface)
     * @param query Query parameters
     * @returns Query results
     */
    queryState<T>(query: StateQuery): Promise<StateQueryResult<T>>;
    /**
     * Watch for events on the blockchain (ChainAdapter interface)
     * @param filter Event filter
     * @returns Async iterator of events
     */
    watchEvents(filter: EventFilter): AsyncIterator<Event>;
    /**
     * Get the current commit/block number
     */
    getCurrentCommit(): Promise<number>;
    /**
     * Calculate the estimated fee for a transaction
     */
    estimateFee(tx: Transaction): Promise<number>;
    /**
     * Connect to the blockchain network
     */
    connect(options?: Record<string, any>): Promise<void>;
    /**
     * Disconnect from the blockchain network
     */
    disconnect(): Promise<void>;
    /**
     * Submit a transaction to the mock chain (legacy method)
     * @param transaction Transaction data to submit
     * @returns Transaction ID and metadata
     */
    submitTransaction(transaction: ChainTransaction): Promise<any>;
    /**
     * Process a recommendation transaction
     * @param transaction Transaction data
     * @param transactionId Transaction ID
     * @returns Object ID
     */
    private processRecommendationTransaction;
    /**
     * Process a reputation transaction
     * @param transaction Transaction data
     * @param transactionId Transaction ID
     * @returns Object ID
     */
    private processReputationTransaction;
    /**
     * Process a token transaction
     * @param transaction Transaction data
     * @param transactionId Transaction ID
     * @returns Object ID
     */
    private processTokenTransaction;
    /**
     * Process a governance transaction
     * @param transaction Transaction data
     * @param transactionId Transaction ID
     * @returns Object ID
     */
    private processGovernanceTransaction;
    /**
     * Query the current state for a given object type and ID (legacy method)
     * @param objectType Type of object to query
     * @param objectId ID of the object
     * @returns Current state of the object
     */
    queryStateById(objectType: string, objectId: string): Promise<ChainState>;
    /**
     * Query objects by type with optional filters (legacy method)
     * @param objectType Type of objects to query
     * @param filters Optional filters to apply
     * @param pagination Pagination options
     * @returns Array of matching objects
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
     * Emit an event to subscribers
     * @param event Event to emit
     */
    private emitEvent;
    /**
     * Check if connected to the chain
     * @returns Connection status
     */
    isConnectedToNode(): boolean;
    /**
     * Get the wallet address
     * @returns Mock wallet address
     */
    getWalletAddress(): Promise<string>;
    /**
     * Generate mock data for testing
     * @param count Number of objects to generate
     */
    generateMockData(count?: number): void;
    /**
     * Clear all mock data
     */
    clearMockData(): void;
    setMockData(key: string, value: any): void;
    getMockData(key: string): any;
}
