"use strict";
/**
 * Simplified Mock Chain Adapter
 *
 * In-memory simulation without database dependencies for testing
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.MockAdapter = void 0;
/**
 * Default configuration
 */
const DEFAULT_CONFIG = {
    chainId: 'mock-chain-001',
    txTime: 10, // Faster for tests
    mockFee: 0.05
};
/**
 * Simplified Mock implementation of the Chain Adapter interface
 * Stores everything in memory for testing - no database required
 */
class MockAdapter {
    /**
     * Create a new MockAdapter instance
     */
    constructor(config = {}) {
        this.connected = false;
        // In-memory storage
        this.chainTransactions = [];
        this.objects = [];
        this.events = [];
        this.state = new Map();
        this.config = { ...DEFAULT_CONFIG, ...config };
        // Initialize state
        this.state.set('chain_id', this.config.chainId);
        this.state.set('current_commit', 1);
    }
    /**
     * Connect to the mock blockchain
     */
    async connect() {
        await new Promise(resolve => setTimeout(resolve, 10)); // Simulate connection time
        this.connected = true;
        return true;
    }
    /**
     * Disconnect from the mock blockchain
     */
    async disconnect() {
        this.connected = false;
    }
    /**
     * Submit a transaction (NEW FORMAT - used by GovernanceEngine)
     */
    async submitTransaction(transaction) {
        this.ensureConnected();
        // Simulate processing time
        await new Promise(resolve => setTimeout(resolve, this.config.txTime));
        // Generate complete transaction
        const fullTransaction = {
            id: transaction.id || `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            type: transaction.type || 'unknown',
            data: transaction.data || {},
            timestamp: transaction.timestamp || new Date(),
            status: 'confirmed'
        };
        // Store transaction
        this.chainTransactions.push(fullTransaction);
        // Create event
        const event = {
            id: `event_${Date.now()}`,
            type: `transaction_${fullTransaction.type}`,
            timestamp: fullTransaction.timestamp.toISOString(),
            data: fullTransaction.data
        };
        this.events.push(event);
        // Update commit number
        const currentCommit = this.state.get('current_commit') || 1;
        this.state.set('current_commit', currentCommit + 1);
        return fullTransaction.id;
    }
    /**
     * Query the current state of an object
     */
    async queryState(objectType, objectId) {
        this.ensureConnected();
        const obj = this.objects.find(o => o.type === objectType && o.id === objectId);
        if (!obj) {
            throw new Error(`Object not found: ${objectType}/${objectId}`);
        }
        return {
            objectId: obj.id,
            objectType: obj.type,
            data: obj.data,
            commitNumber: obj.commitNumber || 1,
            timestamp: obj.timestamp || new Date().toISOString()
        };
    }
    /**
     * Query objects by type with optional filters
     */
    async queryObjects(objectType, filters, pagination) {
        this.ensureConnected();
        let results = this.objects.filter(obj => obj.type === objectType);
        // Apply filters if provided
        if (filters) {
            results = results.filter(obj => {
                for (const [key, value] of Object.entries(filters)) {
                    if (obj.data[key] !== value) {
                        return false;
                    }
                }
                return true;
            });
        }
        // Apply pagination if provided
        if (pagination) {
            const start = pagination.offset || 0;
            const end = start + (pagination.limit || 10);
            results = results.slice(start, end);
        }
        return results.map(obj => ({
            objectId: obj.id,
            objectType: obj.type,
            data: obj.data,
            commitNumber: obj.commitNumber || 1,
            timestamp: obj.timestamp || new Date().toISOString()
        }));
    }
    /**
     * Subscribe to events of a specific type
     */
    subscribeToEvents(eventType, callback) {
        // For simplicity, just return a subscription ID
        // In a real implementation, this would set up event listeners
        return `sub_${Date.now()}_${eventType}`;
    }
    /**
     * Unsubscribe from events
     */
    unsubscribeFromEvents(subscriptionId) {
        // No-op for simplified implementation
    }
    /**
     * Check connection status
     */
    isConnectedToNode() {
        return this.connected;
    }
    /**
     * Get the wallet address
     */
    async getWalletAddress() {
        return 'mock_wallet_address_123';
    }
    // ============================================================================
    // TESTING HELPER METHODS
    // ============================================================================
    /**
     * Get all chain transactions (for testing)
     */
    getChainTransactions() {
        return [...this.chainTransactions];
    }
    /**
     * Get transactions by type (for testing)
     */
    getTransactionsByType(type) {
        return this.chainTransactions.filter(tx => tx.type === type);
    }
    /**
     * Clear all transactions (for testing)
     */
    clearChainTransactions() {
        this.chainTransactions = [];
        this.events = [];
    }
    /**
     * Get all events (for testing)
     */
    getEvents() {
        return [...this.events];
    }
    /**
     * Get state value (for testing)
     */
    getState(key) {
        return this.state.get(key);
    }
    /**
     * Set state value (for testing)
     */
    setState(key, value) {
        this.state.set(key, value);
    }
    /**
     * Get current commit number
     */
    getCurrentCommit() {
        return this.state.get('current_commit') || 1;
    }
    /**
     * Reset all data (for testing)
     */
    reset() {
        this.chainTransactions = [];
        this.objects = [];
        this.events = [];
        this.state.clear();
        this.state.set('chain_id', this.config.chainId);
        this.state.set('current_commit', 1);
    }
    /**
     * Ensure the adapter is connected
     */
    ensureConnected() {
        if (!this.connected) {
            throw new Error('MockAdapter is not connected. Call connect() first.');
        }
    }
}
exports.MockAdapter = MockAdapter;
//# sourceMappingURL=mock-adapter.js.map