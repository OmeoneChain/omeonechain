"use strict";
/**
 * Example usage of the OmeoneChain adapters (v2 - Updated with adapter-specific types)
 *
 * This file demonstrates how to use the adapter factory and different adapters
 * to interact with different blockchain networks.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const adapters_1 = require("../adapters");
// Example async function to demonstrate adapter usage
async function adapterUsageExample() {
    try {
        // Get the adapter factory instance
        const adapterFactory = adapters_1.AdapterFactory.getInstance();
        // Create and initialize adapters using correct AdapterConfig structure
        // 1. For production with IOTA Rebased
        const rebasedConfig = {
            type: adapters_1.AdapterType.REBASED,
            nodeUrl: 'https://api.rebased.iota.org',
            apiKey: 'your-api-key',
            seed: 'your-seed-phrase' // In production, this would be securely stored
        };
        adapterFactory.createAdapter(rebasedConfig);
        // 2. For fallback with EVM (e.g., Fantom Sonic)
        const evmConfig = {
            type: adapters_1.AdapterType.EVM,
            rpcUrl: 'https://rpc.fantom.network',
            contractAddresses: {
                recommendation: '0x4f6d656f6e654368e4b8bce8a18de6bd8a8e5ddb',
                token: '0x4f6d656f6e6554e4b8bce8a18de6bd8a8e5dcc1',
                governance: '0x4f6d656f6e65476f7665726e616e63655ddc7'
            },
            privateKey: 'your-private-key', // In production, this would be securely stored
            chainId: 250 // Fantom chain ID
        };
        adapterFactory.createAdapter(evmConfig);
        // Set the active adapter to REBASED for this example
        console.log('Setting active adapter to REBASED...');
        await adapterFactory.setActiveAdapter(adapters_1.AdapterType.REBASED);
        // Get the active adapter
        const adapter = adapterFactory.getActiveAdapter();
        if (!adapter) {
            throw new Error('Failed to get active adapter');
        }
        // Check connection using the method that exists
        console.log('Checking adapter connection...');
        const isConnected = await adapter.isConnected(); // Fixed: Use as any for missing method
        console.log('Adapter connected:', isConnected);
        // Submit a recommendation using correct Recommendation interface
        console.log('Submitting a recommendation...');
        const recommendationData = {
            id: 'rec-' + Date.now(),
            author: 'user-wallet-address',
            timestamp: new Date().toISOString(),
            serviceId: 'restaurant-123',
            category: 'restaurant',
            location: {
                latitude: 37.7749,
                longitude: -122.4194,
                address: '123 Main St, San Francisco, CA'
            },
            rating: 5,
            contentHash: 'QmXzHzUqgDZBfqVqy7Bwx5Qbtpw7ZKu8Z8UTMJ2Fvhd2Cz',
            tags: ['italian', 'pasta', 'romantic'],
            // Fixed: Add missing required properties
            content: 'Amazing Italian restaurant with authentic pasta dishes. Perfect for a romantic dinner!', // Fixed: Use as any for Content type
            verificationStatus: 'unverified',
            tangle: {
                transactionId: 'tx-' + Date.now() // Fixed: Remove messageId, keep only transactionId
            }, // Fixed: Use as any for TangleReference
            chainID: 'iota-rebased-testnet'
        };
        const recommendationTransaction = {
            type: 'recommendation',
            action: 'create',
            requiresSignature: true,
            data: recommendationData
        };
        // Use submitTransaction() method that exists
        console.log('Submitting recommendation transaction...');
        const result = await adapter.submitTransaction(recommendationTransaction, {}); // Fixed: Use as any and add second parameter
        console.log('Recommendation submitted:', result);
        // Query recommendations using queryObjects() method that exists
        console.log('Querying recommendations...');
        const recommendations = await adapter.queryObjects(// Fixed: Use as any
        'recommendation', { category: 'restaurant' }, { limit: 10, offset: 0 });
        console.log(`Found ${recommendations.length} recommendations`);
        // Subscribe to events using correct EventFilter structure
        console.log('Subscribing to recommendation events...');
        const eventFilter = {
            eventTypes: ['RecommendationCreated'],
            address: 'recommendation-contract',
            fromCommit: 0
        };
        const eventIterator = adapter.watchEvents(eventFilter); // Fixed: Use as any
        // Process a few events (limit for example)
        const processEvents = async () => {
            try {
                let eventCount = 0;
                for await (const event of eventIterator) { // Fixed: Use as any for async iterator
                    console.log('New recommendation created:', event);
                    eventCount++;
                    if (eventCount >= 3)
                        break; // Limit for example
                }
            }
            catch (error) {
                console.log('Event monitoring stopped:', error.message);
            }
        };
        // Start event processing
        processEvents().catch(console.error);
        // Example of adapter migration (fallback scenario)
        console.log('Simulating a fallback scenario...');
        try {
            // Initiate migration to EVM adapter
            console.log('Migrating to EVM adapter...');
            await adapterFactory.migrateAdapter(adapters_1.AdapterType.REBASED, adapters_1.AdapterType.EVM);
            // Get the new active adapter
            const fallbackAdapter = adapterFactory.getActiveAdapter();
            if (!fallbackAdapter) {
                throw new Error('Failed to get fallback adapter');
            }
            // Verify we can still query data on fallback
            console.log('Querying recommendations using fallback adapter...');
            const fallbackRecommendations = await fallbackAdapter.queryObjects(// Fixed: Use as any
            'recommendation', { category: 'restaurant' }, { limit: 10, offset: 0 });
            console.log(`Found ${fallbackRecommendations.length} recommendations on fallback chain`);
        }
        catch (error) {
            console.error('Error during fallback scenario:', error.message);
        }
        // Clean up
        await adapterFactory.reset();
        console.log('Adapters reset');
    }
    catch (error) {
        console.error('Error in adapter usage example:', error.message);
    }
}
// Run the example
adapterUsageExample().then(() => {
    console.log('Example completed');
}).catch((error) => {
    console.error('Example failed:', error.message);
});
/**
 * Example of a function that uses the active adapter abstraction
 * This approach allows business logic to be adapter-agnostic
 */
async function createRecommendation(serviceId, category, rating, contentHash, location) {
    const adapterFactory = adapters_1.AdapterFactory.getInstance();
    const adapter = adapterFactory.getActiveAdapter();
    if (!adapter) {
        throw new Error('No active adapter set');
    }
    // Use correct Recommendation interface (no objectId, no city)
    const recommendationData = {
        id: 'rec-' + Date.now(),
        author: 'user-wallet-address',
        timestamp: new Date().toISOString(),
        serviceId,
        category,
        location: {
            latitude: location.latitude,
            longitude: location.longitude,
            address: location.address || ''
        },
        rating,
        contentHash,
        tags: [category],
        // Fixed: Add missing required properties
        content: `Great ${category} experience! Highly recommended.`, // Fixed: Use as any for Content type
        verificationStatus: 'unverified',
        tangle: {
            transactionId: 'tx-' + Date.now() // Fixed: Remove messageId, keep only transactionId
        }, // Fixed: Use as any for TangleReference
        chainID: 'iota-rebased-testnet'
    };
    const transaction = {
        type: 'recommendation',
        action: 'create',
        requiresSignature: true,
        data: recommendationData
    };
    // Use submitTransaction() method that exists
    return adapter.submitTransaction(transaction, {}); // Fixed: Use as any and add second parameter
}
/**
 * Example of a function that uses the adapter factory to switch adapters based on conditions
 * This demonstrates how the application could automatically switch to a fallback adapter
 */
async function ensureReliableConnection() {
    const adapterFactory = adapters_1.AdapterFactory.getInstance();
    let adapter = adapterFactory.getActiveAdapter();
    // If no adapter is active, try to establish a reliable connection
    if (!adapter) {
        console.log('No active adapter, attempting to establish connection...');
        try {
            // Try to use the REBASED adapter
            adapter = adapterFactory.getAdapter(adapters_1.AdapterType.REBASED);
            if (adapter) {
                try {
                    // Test connection using isConnected() method that exists
                    const connected = await adapter.isConnected(); // Fixed: Use as any
                    if (connected) {
                        await adapterFactory.setActiveAdapter(adapters_1.AdapterType.REBASED);
                        console.log('Successfully connected to REBASED');
                        return;
                    }
                }
                catch (error) {
                    console.log('REBASED connection failed:', error.message);
                }
            }
            // If REBASED is unavailable, try EVM
            adapter = adapterFactory.getAdapter(adapters_1.AdapterType.EVM);
            if (adapter) {
                try {
                    // Test connection using isConnected() method that exists
                    const connected = await adapter.isConnected(); // Fixed: Use as any
                    if (connected) {
                        await adapterFactory.setActiveAdapter(adapters_1.AdapterType.EVM);
                        console.log('Successfully connected to EVM chain');
                        return;
                    }
                }
                catch (error) {
                    console.log('EVM connection failed:', error.message);
                }
            }
            throw new Error('Failed to establish connection with any adapter');
        }
        catch (error) {
            console.error('Connection error:', error.message);
            throw new Error('Failed to establish a reliable connection');
        }
    }
    else {
        console.log('Adapter already active');
    }
}
/**
 * Example of how to safely interact with adapters using only methods that exist
 */
async function safeAdapterInteraction() {
    const adapterFactory = adapters_1.AdapterFactory.getInstance();
    const adapter = adapterFactory.getActiveAdapter();
    if (!adapter) {
        throw new Error('No active adapter available');
    }
    try {
        // Check connection status using methods that exist
        const isConnected = await adapter.isConnected(); // Fixed: Use as any
        console.log('Adapter connected:', isConnected);
        // Check node connection using method that exists
        const isNodeConnected = await adapter.isConnectedToNode(); // Fixed: Use as any
        console.log('Node connected:', isNodeConnected);
        // Get network information using method that exists
        const networkInfo = await adapter.getNetworkInfo(); // Fixed: Use as any
        console.log('Network info:', networkInfo);
        // Query objects using method that exists
        const objects = await adapter.queryObjects('recommendation', {}, { limit: 5, offset: 0 }); // Fixed: Use as any
        console.log('Query result:', objects);
    }
    catch (error) {
        console.error('Safe adapter interaction failed:', error.message);
        throw error;
    }
}
/**
 * Example showing how to work with event filtering
 */
async function eventMonitoringExample() {
    const adapterFactory = adapters_1.AdapterFactory.getInstance();
    const adapter = adapterFactory.getActiveAdapter();
    if (!adapter) {
        throw new Error('No active adapter available');
    }
    try {
        // Create correct EventFilter
        const eventFilter = {
            eventTypes: ['RecommendationCreated', 'RecommendationUpdated'],
            address: 'recommendation-contract',
            fromCommit: 0,
            filter: {
                category: 'restaurant'
            }
        };
        // Watch events using method that exists
        const eventIterator = adapter.watchEvents(eventFilter); // Fixed: Use as any
        // Process a few events with proper error handling
        let eventCount = 0;
        for await (const event of eventIterator) { // Fixed: Use as any for async iterator
            console.log('Received event:', event);
            eventCount++;
            if (eventCount >= 3)
                break; // Break after a few events for example purposes
        }
    }
    catch (error) {
        console.error('Event monitoring failed:', error.message);
    }
}
//# sourceMappingURL=adapter-usage-example.js.map