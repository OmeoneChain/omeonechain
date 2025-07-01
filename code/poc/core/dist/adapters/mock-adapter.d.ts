/**
 * Simplified Mock Chain Adapter
 *
 * In-memory simulation without database dependencies for testing
 */
import { ChainAdapter, ChainTransaction } from '../types/chain';
/**
 * Mock adapter configuration
 */
export interface MockAdapterConfig {
    /**
     * Chain ID for the mock network
     */
    chainId?: string;
    /**
     * Simulated transaction time in ms (default: 10)
     */
    txTime?: number;
    /**
     * Simulated fee in µIOTA (default: 0.05)
     */
    mockFee?: number;
}
/**
 * Simplified Mock implementation of the Chain Adapter interface
 * Stores everything in memory for testing - no database required
 */
export declare class MockAdapter implements ChainAdapter {
    private config;
    private connected;
    private chainTransactions;
    private objects;
    private events;
    private state;
    /**
     * Create a new MockAdapter instance
     */
    constructor(config?: MockAdapterConfig);
    /**
     * Connect to the mock blockchain
     */
    connect(): Promise<boolean>;
    /**
     * Disconnect from the mock blockchain
     */
    disconnect(): Promise<void>;
    /**
     * Submit a transaction (NEW FORMAT - used by GovernanceEngine)
     */
    submitTransaction(transaction: Partial<ChainTransaction>): Promise<string>;
    /**
     * Query the current state of an object
     */
    queryState(objectType: string, objectId: string): Promise<any>;
    /**
     * Query objects by type with optional filters
     */
    queryObjects(objectType: string, filters?: any, pagination?: {
        limit: number;
        offset: number;
    }): Promise<any[]>;
    /**
     * Subscribe to events of a specific type
     */
    subscribeToEvents(eventType: string, callback: (event: any) => void): string;
    /**
     * Unsubscribe from events
     */
    unsubscribeFromEvents(subscriptionId: string): void;
    /**
     * Check connection status
     */
    isConnectedToNode(): boolean;
    /**
     * Get the wallet address
     */
    getWalletAddress(): Promise<string>;
    /**
     * Get all chain transactions (for testing)
     */
    getChainTransactions(): ChainTransaction[];
    /**
     * Get transactions by type (for testing)
     */
    getTransactionsByType(type: string): ChainTransaction[];
    /**
     * Clear all transactions (for testing)
     */
    clearChainTransactions(): void;
    /**
     * Get all events (for testing)
     */
    getEvents(): any[];
    /**
     * Get state value (for testing)
     */
    getState(key: string): any;
    /**
     * Set state value (for testing)
     */
    setState(key: string, value: any): void;
    /**
     * Get current commit number
     */
    getCurrentCommit(): number;
    /**
     * Reset all data (for testing)
     */
    reset(): void;
    /**
     * Ensure the adapter is connected
     */
    private ensureConnected;
}
