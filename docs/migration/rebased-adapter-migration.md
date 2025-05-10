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
