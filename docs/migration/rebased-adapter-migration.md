# Migration Guide: RebasedAdapter

This guide explains how to migrate to the RebasedAdapter from other adapters in the OmeoneChain system.

## Table of Contents

- [Migration Overview](#migration-overview)
- [Migrating from MockAdapter](#migrating-from-mockadapter)
- [Migrating from EVMAdapter](#migrating-from-evmadapter)
- [Using the AdapterFactory for Migration](#using-the-adapterfactory-for-migration)
- [Data Migration Considerations](#data-migration-considerations)
- [Troubleshooting](#troubleshooting)

## Migration Overview

The RebasedAdapter implements the ChainAdapter interface, making it compatible with the rest of the OmeoneChain codebase. Migration involves:

1. Creating a RebasedAdapter instance
2. Configuring it with the appropriate settings
3. Updating any code that interacts with the adapter
4. If necessary, migrating data from the previous adapter

## Migrating from MockAdapter

The MockAdapter is typically used for development and testing. When migrating to the RebasedAdapter for production, you'll need to:

### 1. Update Dependencies

Ensure you have the required IOTA Rebased dependencies:

```bash
npm install @iota/wallet @iota/crypto.js axios

### 2. Replace Adapter Instance

// Before: Using MockAdapter
import { MockAdapter } from '../adapters/mock-adapter';
const adapter = new MockAdapter();

// After: Using RebasedAdapter
import { RebasedAdapter } from '../adapters/rebased-adapter';
const adapter = new RebasedAdapter({
  network: 'testnet', // or 'mainnet' for production
  nodeUrl: 'https://api.testnet.rebased.iota.org',
  account: {
    address: process.env.REBASED_ADDRESS,
    privateKey: process.env.REBASED_PRIVATE_KEY,
  },
  contractAddresses: {
    recommendation: process.env.RECOMMENDATION_CONTRACT,
    reputation: process.env.REPUTATION_CONTRACT,
    token: process.env.TOKEN_CONTRACT,
    governance: process.env.GOVERNANCE_CONTRACT,
    service: process.env.SERVICE_CONTRACT,
  }
});

### 3. Update Config for Environment Variables

Create or update your environment variables:

# .env file
REBASED_ADDRESS=0xYourAddress
REBASED_PRIVATE_KEY=0xYourPrivateKey
RECOMMENDATION_CONTRACT=0x4f6d656f6e654368e4b8bce8a18de6bd8a8e5ddb
REPUTATION_CONTRACT=0x4f6d656f6e655265e4b8bce8a18de6bd8a8e5dda
TOKEN_CONTRACT=0x4f6d656f6e6554e4b8bce8a18de6bd8a8e5dcc1
GOVERNANCE_CONTRACT=0x4f6d656f6e65476f7665726e616e63655ddc7
SERVICE_CONTRACT=0x4f6d656f6e65536572766963655ddc8

### 4. Adjust for Real-World Network Conditions

The MockAdapter simulates perfect network conditions. When moving to the RebasedAdapter, consider:

// Add error handling
try {
  await adapter.connect();
  const result = await adapter.submitTx(tx);
  
  if (result.status === 'failed') {
    // Handle transaction failure
    console.error(`Transaction failed: ${result.error}`);
  }
} catch (error) {
  // Handle connection or other errors
  console.error(`Error: ${error.message}`);
}
## Migrating from EVMAdapter

Moving from EVM-based chains to IOTA Rebased requires understanding the differences in transaction models and state handling.
1. Contract Address Mapping
Map your EVM contract addresses to the equivalent Rebased contracts:

// EVM contract addresses
const evmContracts = {
  recommendation: '0x1234...',
  reputation: '0x5678...',
  token: '0xabcd...',
  governance: '0xef01...',
  service: '0x2345...'
};

// Corresponding Rebased contract addresses
const rebasedContracts = {
  recommendation: '0x4f6d656f6e654368e4b8bce8a18de6bd8a8e5ddb',
  reputation: '0x4f6d656f6e655265e4b8bce8a18de6bd8a8e5dda',
  token: '0x4f6d656f6e6554e4b8bce8a18de6bd8a8e5dcc1',
  governance: '0x4f6d656f6e65476f7665726e616e63655ddc7',
  service: '0x4f6d656f6e65536572766963655ddc8'
};
2. Transaction Format Differences
Update your transaction format to match the RebasedAdapter requirements:

// EVM transaction format
const evmTx = {
  to: evmContracts.recommendation,
  method: 'createRecommendation',
  params: [
    authorAddress,
    serviceId,
    category,
    rating,
    JSON.stringify(location)
  ],
  gas: 200000
};

// Rebased transaction format
const rebasedTx = {
  sender: authorAddress,
  payload: {
    type: 'recommendation',
    data: {
      author: authorAddress,
      serviceId: serviceId,
      category: category,
      rating: rating,
      location: location
    }
  }
};
3. Update Event Handling
EVM events are typically handled with event listeners, while RebasedAdapter uses an async iterator:

// EVM event handling
evmAdapter.on('RecommendationCreated', (event) => {
  console.log('New recommendation:', event.returnValues);
});

// Rebased event handling
const eventIterator = await rebasedAdapter.watchEvents({
  eventTypes: ['recommendation_created']
});

// Process events
for await (const event of eventIterator) {
  console.log('New recommendation:', event.data);
}
Using the AdapterFactory for Migration
The AdapterFactory provides a structured way to handle adapter migration:

import { AdapterFactory, AdapterType } from '../adapters/adapter-factory';

// Get the factory instance
const factory = AdapterFactory.getInstance();

// Create both adapters
const evmAdapter = factory.createAdapter({
  type: AdapterType.EVM,
  rpcUrl: 'https://ethereum-rpc.example.com',
  contractAddresses: { /* EVM contract addresses */ },
  privateKey: process.env.EVM_PRIVATE_KEY
});

const rebasedAdapter = factory.createAdapter({
  type: AdapterType.REBASED,
  nodeUrl: 'https://api.testnet.rebased.iota.org',
  account: {
    address: process.env.REBASED_ADDRESS,
    privateKey: process.env.REBASED_PRIVATE_KEY
  },
  contractAddresses: { /* Rebased contract addresses */ }
});

// Migrate from EVM to Rebased
const migrationSuccess = await factory.migrateAdapter(
  AdapterType.EVM,
  AdapterType.REBASED,
  {
    // Optional migration data
    migrationTimestamp: Date.now(),
    preserveHistory: true
  }
);

if (migrationSuccess) {
  console.log('Migration successful!');
  
  // Use the Rebased adapter as active adapter
  const activeAdapter = factory.getActiveAdapter();
  
  // Continue with operations using the active adapter
  const chainId = await activeAdapter.getChainId();
  console.log('Active chain ID:', chainId);
} else {
  console.error('Migration failed');
}

### Data Migration Considerations

When migrating between adapters, consider how to handle existing data:

1. State Snapshot
Create a snapshot of the current state from the source adapter:

// Capture state from EVM adapter
const recommendations = await evmAdapter.queryState({
  objectType: 'recommendation'
});

const reputations = await evmAdapter.queryState({
  objectType: 'reputation'
});

// Store snapshots
const stateSnapshot = {
  timestamp: Date.now(),
  recommendations: recommendations.results,
  reputations: reputations.results
};

// Optionally, export to file
const fs = require('fs');
fs.writeFileSync(
  'state_snapshot.json',
  JSON.stringify(stateSnapshot, null, 2)
);

2. Merkle Proofs
For verifiable migrations, consider creating Merkle proofs of the state:

import { MerkleTree } from 'merkletreejs';
import { keccak256 } from 'ethereumjs-util';

// Create leaves from recommendation IDs and hashes
const leaves = recommendations.results.map(rec => 
  keccak256(Buffer.from(rec.id + rec.contentHash))
);

// Create Merkle tree
const tree = new MerkleTree(leaves, keccak256, { sortPairs: true });
const root = tree.getHexRoot();

console.log('State Merkle root:', root);

3. Progressive Migration
Consider a phased migration approach:

Deploy contracts on both chains
Run both adapters in parallel
Write to both chains during a transition period
Validate state consistency between chains
Switch reading from old to new chain
Complete the migration by stopping writes to the old chain

### Troubleshooting
##Connection Issues
If you encounter connection problems:

try {
  await adapter.connect();
} catch (error) {
  console.error('Connection error:', error.message);
  
  // Check node URL
  console.log('Using node URL:', adapter.nodeUrl);
  
  // Try alternative node
  adapter = new RebasedAdapter({
    ...config,
    nodeUrl: 'https://alternative-node.rebased.iota.org'
  });
  
  await adapter.connect();
}
## Transaction Failures
For transaction failures:
const result = await adapter.submitTx(tx);

if (result.status === 'failed') {
  console.error('Transaction failed:', result.error);
  
  // Retry with higher fee if appropriate
  if (result.error.includes('insufficient fee')) {
    const newTx = {
      ...tx,
      feeOptions: {
        maxFee: tx.feeOptions?.maxFee * 2 || 100
      }
    };
    
    const retryResult = await adapter.submitTx(newTx);
    console.log('Retry result:', retryResult.status);
  }
}
## Event Handling Issues
For event subscription issues:

// If the event iterator is not receiving events
const eventIterator = await adapter.watchEvents({
  eventTypes: ['recommendation_created']
});

// Create a timeout for event checking
let eventReceived = false;
setTimeout(() => {
  if (!eventReceived) {
    console.warn('No events received after 60 seconds');
    
    // Check current commit
    adapter.getCurrentCommit().then(commit => {
      console.log('Current commit:', commit);
      
      // Adjust event filter to start from earlier commit
      adapter.watchEvents({
        eventTypes: ['recommendation_created'],
        fromCommit: Math.max(0, commit - 100) // Go back 100 commits
      });
    });
  }
}, 60000);

// Process events
for await (const event of eventIterator) {
  eventReceived = true;
  console.log('Event received:', event);
}

For more assistance with migration issues, please contact the development team or refer to the IOTA Rebased documentation.

