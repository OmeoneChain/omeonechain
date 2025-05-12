# RebasedAdapter Usage Examples

This document provides examples for using the RebasedAdapter to interact with the IOTA Rebased blockchain.

## Table of Contents

- [Basic Setup](#basic-setup)
- [Connecting and Disconnecting](#connecting-and-disconnecting)
- [Submitting Transactions](#submitting-transactions)
- [Querying State](#querying-state)
- [Working with Events](#working-with-events)
- [Advanced Usage](#advanced-usage)

## Basic Setup

### Using the Modern Constructor

```typescript
import { RebasedAdapter } from '../adapters/rebased-adapter';

// Create adapter with configuration object
const adapter = new RebasedAdapter({
  network: 'testnet',
  nodeUrl: 'https://api.testnet.rebased.iota.org',
  account: {
    address: 'your-address',
    privateKey: 'your-private-key',
  },
  contractAddresses: {
    recommendation: '0x4f6d656f6e654368e4b8bce8a18de6bd8a8e5ddb',
    reputation: '0x4f6d656f6e655265e4b8bce8a18de6bd8a8e5dda',
    token: '0x4f6d656f6e6554e4b8bce8a18de6bd8a8e5dcc1',
    governance: '0x4f6d656f6e65476f7665726e616e63655ddc7',
    service: '0x4f6d656f6e65536572766963655ddc8',
  },
  options: {
    retryAttempts: 3,
    maxFeePerTransaction: 50,
    timeoutMs: 30000
  }
});

### Using the Legacy Constructor

import { RebasedAdapter } from '../adapters/rebased-adapter';

// Create adapter with simple parameters (legacy)
const adapter = new RebasedAdapter(
  'https://api.testnet.rebased.iota.org',
  'your-api-key', // optional
  'your-seed' // optional
);

### Using the Adapter Factory

import { AdapterFactory, AdapterType } from '../adapters/adapter-factory';

// Get the singleton instance
const factory = AdapterFactory.getInstance();

// Create a RebasedAdapter
const adapter = factory.createAdapter({
  type: AdapterType.REBASED,
  nodeUrl: 'https://api.testnet.rebased.iota.org',
  account: {
    address: 'your-address',
    privateKey: 'your-private-key',
  }
});

// Set as active adapter
await factory.setActiveAdapter(AdapterType.REBASED);

### Connecting and Disconnecting

Always connect before using the adapter:

// Connect to the blockchain
await adapter.connect();

// Check connection status
const isConnected = adapter.isConnectedToNode();
console.log('Connected:', isConnected);

// Get chain ID
const chainId = await adapter.getChainId();
console.log('Chain ID:', chainId);

// When done, disconnect
await adapter.disconnect();

### Submitting Transactions

##Submitting a Recommendation

const result = await adapter.submitTx({
  sender: 'your-address',
  payload: {
    type: 'recommendation',
    data: {
      author: 'user123',
      serviceId: 'restaurant456',
      category: 'restaurant',
      rating: 5,
      location: {
        latitude: 40.7128,
        longitude: -74.006,
        address: 'New York, NY'
      },
      content: {
        title: 'Great Italian Restaurant',
        body: 'The pasta was amazing, and the service was excellent.',
        media: [{
          type: 'image',
          ipfsHash: 'Qm...',
          caption: 'Delicious pasta dish'
        }]
      },
      tags: ['italian', 'pasta', 'nyc']
    }
  },
  feeOptions: {
    maxFee: 50, // µMIOTA
    sponsorWallet: 'sponsor-address' // optional
  }
});

console.log('Transaction submitted:', result.id);
console.log('Status:', result.status);

## Transferring Tokens

const result = await adapter.submitTx({
  sender: 'your-address',
  payload: {
    type: 'token',
    data: {
      recipient: 'recipient-address',
      amount: 100,
      type: 'transfer',
      actionReference: 'recommendation123' // optional
    }
  }
});

console.log('Token transfer:', result.id);

## Submitting a Governance Proposal

const result = await adapter.submitTx({
  sender: 'your-address',
  payload: {
    type: 'governance',
    data: {
      title: 'Increase Recommendation Rewards',
      description: 'This proposal aims to increase the reward for high-quality recommendations.',
      type: 'parameter_change',
      params: {
        recommendationReward: 2.0,
        implementationDate: '2025-06-01'
      },
      votingEndTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days from now
    }
  }
});

console.log('Proposal submitted:', result.id);

### Querying State

## Querying Recommendations

// Query recommendations by category
const restaurantRecommendations = await adapter.queryState({
  objectType: 'recommendation',
  filter: {
    category: 'restaurant'
  },
  pagination: {
    offset: 0,
    limit: 10
  },
  sort: {
    field: 'rating',
    direction: 'desc'
  }
});

console.log(`Found ${restaurantRecommendations.total} restaurant recommendations:`);
console.log(restaurantRecommendations.results);

## Querying User Reputation

// Query a specific user's reputation
const userReputation = await adapter.queryState({
  objectType: 'reputation',
  filter: {
    userId: 'user123'
  }
});

if (userReputation.results.length > 0) {
  console.log('User reputation:', userReputation.results[0]);
} else {
  console.log('User not found');
}

## Getting Current Commit

const currentCommit = await adapter.getCurrentCommit();
console.log('Current commit number:', currentCommit);

### Working with Events

## Watching for Events with Async Iterator

// Watch for recommendation creation events
const eventIterator = await adapter.watchEvents({
  eventTypes: ['recommendation_created'],
  fromCommit: 12345 // optional, start from specific commit
});

// Set up an async function to process events
async function processEvents() {
  try {
    for await (const event of eventIterator) {
      console.log('New event at commit', event.commitNumber);
      console.log('Event type:', event.type);
      console.log('Event data:', event.data);
      
      // Process the event based on its type
      if (event.type === 'recommendation_created') {
        // Handle new recommendation
      }
    }
  } catch (error) {
    console.error('Error processing events:', error);
  } finally {
    // Clean up when done
    await eventIterator.return?.();
  }
}

// Start processing events
processEvents();

// Later, when you want to stop watching events
await eventIterator.return?.();

## Legacy Event Subscription

// Subscribe to recommendation creation events (legacy method)
const subscriptionId = adapter.subscribeToEvents('recommendation_created', (event) => {
  console.log('Event received:', event);
});

// Later, unsubscribe
adapter.unsubscribeFromEvents(subscriptionId);

### Advanced Usage

## Esimating Transaction Fees

const tx = {
  sender: 'your-address',
  payload: {
    type: 'recommendation',
    data: {
      // ... recommendation data
    }
  }
};

const estimatedFee = await adapter.estimateFee(tx);
console.log('Estimated fee:', estimatedFee, 'µMIOTA');

## Calling Contract Functions Directly

const result = await adapter.callContractFunction(
  '0x4f6d656f6e654368e4b8bce8a18de6bd8a8e5ddb', // contract address
  'get_recommendation_count',                    // function name
  ['restaurant']                                 // arguments (category)
);

console.log('Restaurant recommendation count:', result);

## Using Sponsor Wallet for Fee Subsidization

// Create adapter with sponsor wallet configuration
const adapter = new RebasedAdapter({
  // ... other config
  account: {
    address: 'your-address',
    privateKey: 'your-private-key',
  },
  sponsorWallet: {
    address: 'sponsor-address',
    privateKey: 'sponsor-private-key',
  }
});

// Submit transaction with sponsorship
const result = await adapter.submitTx({
  sender: 'your-address',
  payload: {
    // ... transaction payload
  },
  feeOptions: {
    maxFee: 50,
    sponsorWallet: 'sponsor-address' // This will trigger use of the sponsor wallet
  }
});

## Error Handling

try {
  const result = await adapter.submitTx({
    // ... transaction data
  });
  
  if (result.status === 'failed') {
    console.error('Transaction failed:', result.error);
    // Implement retry logic or fallback
  } else {
    console.log('Transaction confirmed:', result.id);
  }
} catch (error) {
  console.error('Error submitting transaction:', error);
  // Handle unexpected errors
}
