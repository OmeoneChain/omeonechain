import { ChainAdapter, ChainEvent, ChainTransaction, ChainState, NetworkInfo, TransactionResult } from '../type/chain';
/**
 * EVMAdapter - Fallback implementation of ChainAdapter interface for EVM chains
 *
 * This adapter connects OmeoneChain to Ethereum-compatible chains like Fantom Sonic
 * or Arbitrum, serving as a fallback when IOTA Rebased is unavailable.
 */
export declare class EVMAdapter implements ChainAdapter {
    private web3;
    isConnected: any;
    private eventSubscribers;
    private contracts;
    private accountAddress;
    private privateKey;
    private chainId;
    private eventPollingInterval;
    private contractAddresses;
    private contractAbis;
    /**
     * Constructor
     * @param rpcUrl RPC URL for the EVM chain
     * @param contractAddresses Addresses of deployed contracts
     * @param privateKey Private key for transaction signing
     * @param chainId Chain ID (e.g., 250 for Fantom)
     */
    constructor(rpcUrl: string, contractAddresses: Record<string, string>, privateKey?: string, chainId?: number);
    /**
     * Initialize and connect to the EVM chain
     */
    connect(): Promise<boolean>;
    /**
     * Disconnect from the EVM chain
     */
    disconnect(): Promise<void>;
    /**
     * Load contract ABIs from JSON files or hardcoded values
     * In a production environment, these would be loaded from actual JSON files
     */
    private loadContractAbis;
    /**
     * Initialize contract instances
     */
    private initializeContracts;
    /**
     * Submit a transaction to the EVM chain
     * @param transaction Transaction data to submit
     * @returns Transaction result with proper typing
     */
    submitTransaction(transaction: ChainTransaction): Promise<TransactionResult>;
    /**
     * Execute a contract method based on transaction type
     * @param transaction Transaction data
     * @returns Transaction receipt
     */
    private executeContractMethod;
    /**
     * Generate a consistent object ID from transaction hash and type
     * @param txHash Transaction hash
     * @param type Object type
     * @returns Object ID
     */
    private generateObjectId;
    /**
     * Query the current state for a given object type and ID
     * @param query Query parameters with object type and ID
     * @returns Current state of the object
     */
    queryState(query: any): Promise<any>;
    /**
     * Parse proposal status enum from contract
     * @param statusCode Status code from contract
     * @returns Status string
     */
    private parseProposalStatus;
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
     * Store data (for engines that expect this method)
     * @param key Storage key
     * @param value Data to store
     * @returns Success status
     */
    store(key: any, value: any): Promise<any>;
    /**
     * Retrieve data (for engines that expect this method)
     * @param key Storage key
     * @returns Retrieved data or null
     */
    retrieve(key: string): Promise<any | null>;
    /**
     * Get network information
     * @returns Network information
     */
    getNetworkInfo(): Promise<NetworkInfo>;
    /**
     * Get token balance for an address
     * @param address Wallet address
     * @returns Token balance information
     */
    getBalance(address: any): Promise<any>;
    /**
     * Subscribe to events of a specific type
     * @param eventType Type of events to subscribe to
     * @param callback Function to call when events occur
     * @returns Subscription ID
     */
    subscribeToEvents(eventType: string, callback: (event: ChainEvent) => void): string;
    subscribeToEvents(filter: any): any;
    /**
     * Unsubscribe from events
     * @param subscriptionId ID of the subscription to cancel
     */
    unsubscribeFromEvents(subscriptionId: any): any;
    /**
     * Start event listener to monitor the chain for new events
     */
    private startEventListener;
    /**
     * Stop event listener
     */
    private stopEventListener;
    /**
     * Poll for new events on the chain
     */
    private pollForEvents;
    /**
     * Process events from a specific block
     * @param blockNumber Block number to process
     */
    private processBlockEvents;
    /**
     * Map contract event to ChainEvent format
     * @param contractType Contract type
     * @param eventName Event name
     * @param event Contract event
     * @returns Chain event
     */
    private mapContractEventToChainEvent;
    /**
     * Notify subscribers of an event
     * @param eventType Event type
     * @param event Chain event
     */
    private notifyEventSubscribers;
    /**
     * Check if connected to the chain
     * @returns Connection status
     */
    isConnectedToNode(): any;
    /**
     * Get the wallet address
     * @returns Wallet address
     */
    getWalletAddress(): Promise<string>;
    /**
     * Watch events with an async iterator
     */
    watchEvents(filter?: any): AsyncIterator<ChainEvent>;
    /**
     * Get user trust score
     */
    getUserTrustScore(userAddress: string): Promise<number>;
    /**
     * Get user reputation score
     */
    getUserReputationScore(userAddress: string): Promise<any>;
    /**
     * Submit action for reward
     */
    submitActionForReward(action: any): Promise<any>;
    /**
     * Get chain ID
     */
    getChainId(): Promise<string>;
    /**
     * Submit transaction (alias for submitTransaction)
     */
    submitTx(transaction: any): Promise<any>;
    /**
     * Get current commit number
     */
    getCurrentCommit(): Promise<number>;
    /**
     * Estimate transaction fee
     */
    estimateFee(transaction: any): Promise<any>;
    /**
     * Claim user rewards - CONSERVATIVE FIX: Added missing ChainAdapter method
     */
    claimUserRewards(userAddress: string): Promise<any>;
}
