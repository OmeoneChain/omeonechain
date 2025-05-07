/**
 * Example usage of the OmeoneChain adapters (v2 - Updated with adapter-specific types)
 * 
 * This file demonstrates how to use the adapter factory and different adapters
 * to interact with different blockchain networks.
 */

import { 
  AdapterFactory, 
  AdapterType
} from '../adapters';

// Import adapter-specific types
import { ChainTransaction } from '../types/chain';
import { RecommendationData } from '../types/recommendation-adapters';
import { AdapterConnectionOptions } from '../types/chain';

// Example async function to demonstrate adapter usage
async function adapterUsageExample() {
  try {
    // Get the adapter factory instance
    const adapterFactory = AdapterFactory.getInstance();
    
    // Create and initialize adapters
    
    // 1. For development and testing, use the MockAdapter
    adapterFactory.createAdapter(AdapterType.MOCK, {
      simulateLatency: true,
      failureRate: 5 // 5% chance of random failures
    } as AdapterConnectionOptions);
    
    // 2. For production with IOTA Rebased
    adapterFactory.createAdapter(AdapterType.REBASED, {
      nodeUrl: 'https://api.rebased.iota.org',
      apiKey: 'your-api-key',
      seed: 'your-seed-phrase' // In production, this would be securely stored
    } as AdapterConnectionOptions);
    
    // 3. For fallback with EVM (e.g., Fantom Sonic)
    adapterFactory.createAdapter(AdapterType.EVM, {
      rpcUrl: 'https://rpc.fantom.network',
      contractAddresses: {
        recommendation: '0x4f6d656f6e654368e4b8bce8a18de6bd8a8e5ddb',
        token: '0x4f6d656f6e6554e4b8bce8a18de6bd8a8e5dcc1',
        governance: '0x4f6d656f6e65476f7665726e616e63655ddc7'
      },
      privateKey: 'your-private-key', // In production, this would be securely stored
      chainId: 250 // Fantom chain ID
    } as AdapterConnectionOptions);
    
    // Set the active adapter to REBASED for this example
    console.log('Setting active adapter to REBASED...');
    await adapterFactory.setActiveAdapter(AdapterType.REBASED);
    
    // Get the active adapter
    const adapter = adapterFactory.getActiveAdapter();
    
    if (!adapter) {
      throw new Error('Failed to get active adapter');
    }
    
    // Submit a recommendation
    console.log('Submitting a recommendation...');
    const recommendationData: RecommendationData = {
      author: await adapter.getWalletAddress(),
      serviceId: 'restaurant-123',
      category: 'restaurant',
      location: {
        latitude: 37.7749,
        longitude: -122.4194,
        address: '123 Main St, San Francisco, CA'
      },
      rating: 5,
      contentHash: 'QmXzHzUqgDZBfqVqy7Bwx5Qbtpw7ZKu8Z8UTMJ2Fvhd2Cz',
      tags: ['italian', 'pasta', 'romantic']
    };
    
    const recommendationTransaction: ChainTransaction = {
      type: 'recommendation',
      action: 'create',
      requiresSignature: true,
      data: recommendationData
    };
    
    const result = await adapter.submitTransaction(recommendationTransaction);
    console.log('Recommendation submitted:', result);
    
    // Query recommendations
    console.log('Querying recommendations...');
    const recommendations = await adapter.queryObjects('recommendation', { category: 'restaurant' }, { limit: 10, offset: 0 });
    console.log(`Found ${recommendations.length} recommendations`);
    
    // Subscribe to events
    console.log('Subscribing to recommendation events...');
    const subscriptionId = adapter.subscribeToEvents('RecommendationCreated', (event) => {
      console.log('New recommendation created:', event);
    });
    
    // Example of adapter migration (fallback scenario)
    console.log('Simulating a fallback scenario...');
    try {
      // Simulate a network issue with the primary adapter
      await adapter.disconnect();
      
      // Initiate migration to EVM adapter
      console.log('Migrating to EVM adapter...');
      await adapterFactory.migrateAdapter(AdapterType.REBASED, AdapterType.EVM);
      
      // Get the new active adapter
      const fallbackAdapter = adapterFactory.getActiveAdapter();
      
      if (!fallbackAdapter) {
        throw new Error('Failed to get fallback adapter');
      }
      
      // Verify we can still query the data
      console.log('Querying recommendations using fallback adapter...');
      const fallbackRecommendations = await fallbackAdapter.queryObjects('recommendation', { category: 'restaurant' }, { limit: 10, offset: 0 });
      console.log(`Found ${fallbackRecommendations.length} recommendations on fallback chain`);
      
      // Unsubscribe from events
      fallbackAdapter.unsubscribeFromEvents(subscriptionId);
    } catch (error) {
      console.error('Error during fallback scenario:', error);
    }
    
    // Clean up
    await adapterFactory.reset();
    console.log('Adapters reset');
    
  } catch (error) {
    console.error('Error in adapter usage example:', error);
  }
}

// Run the example
adapterUsageExample().then(() => {
  console.log('Example completed');
}).catch((error) => {
  console.error('Example failed:', error);
});

/**
 * Example of a function that uses the active adapter abstraction
 * This approach allows business logic to be adapter-agnostic
 */
async function createRecommendation(
  serviceId: string,
  category: string,
  rating: number,
  contentHash: string,
  location: { latitude: number; longitude: number; address?: string }
) {
  const adapterFactory = AdapterFactory.getInstance();
  const adapter = adapterFactory.getActiveAdapter();
  
  if (!adapter) {
    throw new Error('No active adapter set');
  }
  
  const authorAddress = await adapter.getWalletAddress();
  
  // Use adapter-specific types for recommendation data
  const recommendationData: RecommendationData = {
    author: authorAddress,
    serviceId,
    category,
    location,
    rating,
    contentHash,
    timestamp: new Date().toISOString()
  };
  
  const transaction: ChainTransaction = {
    type: 'recommendation',
    action: 'create',
    requiresSignature: true,
    data: recommendationData
  };
  
  return adapter.submitTransaction(transaction);
}

/**
 * Example of a function that uses the adapter factory to switch adapters based on conditions
 * This demonstrates how the application could automatically switch to a fallback adapter
 */
async function ensureReliableConnection() {
  const adapterFactory = AdapterFactory.getInstance();
  let adapter = adapterFactory.getActiveAdapter();
  
  // If no adapter is active or the current one is disconnected, try to establish a reliable connection
  if (!adapter || !adapter.isConnectedToNode()) {
    console.log('Primary adapter unavailable, attempting to use fallback...');
    
    try {
      // Try to use the Rebased adapter
      adapter = adapterFactory.getAdapter(AdapterType.REBASED);
      
      if (adapter && await adapter.connect()) {
        await adapterFactory.setActiveAdapter(AdapterType.REBASED);
        console.log('Successfully connected to Rebased');
        return;
      }
      
      // If Rebased is unavailable, try EVM
      adapter = adapterFactory.getAdapter(AdapterType.EVM);
      
      if (adapter && await adapter.connect()) {
        await adapterFactory.setActiveAdapter(AdapterType.EVM);
        console.log('Successfully connected to EVM chain');
        return;
      }
      
      // Last resort: use mock adapter for offline development
      adapter = adapterFactory.getAdapter(AdapterType.MOCK);
      
      if (adapter && await adapter.connect()) {
        await adapterFactory.setActiveAdapter(AdapterType.MOCK);
        console.log('Using mock adapter as fallback');
        return;
      }
      
      throw new Error('Failed to establish connection with any adapter');
    } catch (error) {
      console.error('Connection error:', error);
      throw new Error('Failed to establish a reliable connection');
    }
  }
}
