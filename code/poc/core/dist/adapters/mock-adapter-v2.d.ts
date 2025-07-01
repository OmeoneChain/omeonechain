import { ChainAdapter, ChainEvent, ChainTransaction, ChainState } from '../types/chain';
/**
 * MockAdapter (Version 2) - Implementation of ChainAdapter for testing and development
 *
 * This adapter simulates a blockchain environment for local testing without
 * requiring an actual blockchain connection.
 *
 * This is the updated version that integrates with the existing project structure.
 */
export declare class MockAdapterV2 implements ChainAdapter {
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
     * @param simulateLatency Whether to simulate network latency
     * @param failureRate Percentage chance (0-100) of random failures
     */
    constructor(simulateLatency?: boolean, failureRate?: number);
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
     * Initialize and connect to the mock chain
     */
    connect(): Promise<boolean>;
    /**
     * Disconnect from the mock chain
     */
    disconnect(): Promise<void>;
    /**
     * Submit a transaction to the mock chain
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
     * Query the current state for a given object type and ID
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
}
