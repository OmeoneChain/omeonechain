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
