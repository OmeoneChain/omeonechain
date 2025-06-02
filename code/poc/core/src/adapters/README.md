# RebasedAdapter - Quick Reference

## 🎯 Overview

The RebasedAdapter provides seamless integration between OmeoneChain and IOTA Rebased blockchain, supporting both legacy compatibility and enhanced Move contract features.

## 🚀 Quick Start

```typescript
import { RebasedAdapter } from './rebased-adapter';

// Enhanced configuration
const config = {
  network: 'testnet',
  nodeUrl: 'https://testnet.rebased.iota.org',
  account: { address: userAddress, privateKey: userPrivateKey },
  contractAddresses: {
    token: '0x...',
    governance: '0x...',
    reputation: '0x...',
    rewards: '0x...',
  },
  packageId: '0x...',
  options: { enableSponsorWallet: true }
};

const adapter = new RebasedAdapter(config);
await adapter.connect();
```

## 🔧 Core Operations

### **Token Operations**
```typescript
// Create user wallet
await adapter.createUserWallet(userAddress);

// Stake tokens (amount, type, lock period)
await adapter.stakeTokens(userAddress, 100, 2, 3);

// Get balance
const balance = await adapter.getUserBalance(userAddress);
console.log(`Balance: ${balance.liquid / 1000000} TOK`);

// Get trust/reputation scores
const trustScore = await adapter.getUserTrustScore(userAddress);      // 0.0-1.0
const reputation = await adapter.getUserReputationScore(userAddress); // integer
```

### **Reward Distribution**
```typescript
// Submit recommendation for reward
await adapter.submitRecommendationForReward(userAddress, actionId, 1);

// Add social endorsement
await adapter.addSocialEndorsement(endorserAddress, actionId, 1);

// Check eligibility and claim
const eligibility = await adapter.checkRewardEligibility(actionId);
if (eligibility.isEligible) {
  await adapter.claimRecommendationReward(userAddress, actionId);
}
```

### **Governance**
```typescript
// Create proposal
await adapter.createGovernanceProposal(
  proposerAddress, 
  'Proposal Title', 
  'Description', 
  'parameter_change'
);

// Vote on proposal
await adapter.voteOnProposal(voterAddress, proposalId, true);
```

## 📊 System Monitoring

```typescript
// Get system statistics
const stats = await adapter.getSystemStats();
console.log('Reward rate:', stats.currentRewardRate);
console.log('Total distributed:', stats.totalDistributed);

// Health check
const health = await adapter.healthCheck();
console.log('Connected:', health.isConnected);
```

## 🔄 Legacy Compatibility

All existing methods continue to work:

```typescript
// Legacy transaction submission
await adapter.submitTransaction(legacyTx);

// Legacy state queries  
await adapter.queryObjectState('recommendation', 'id');
await adapter.queryObjects('recommendation', filters, pagination);

// Legacy event subscription
adapter.subscribeToEvents('recommendation_created', callback);
```

## 📚 Documentation

- **[Complete Integration Guide](../../docs/blockchain/enhanced-adapter-guide.md)** - Comprehensive usage guide
- **[Architecture Overview](../../docs/blockchain/architecture.md)** - System design and strategy  
- **[API Reference](../../docs/api/)** - REST API documentation

## 🧪 Testing

```bash
# Run adapter tests
npm test -- --testPathPattern=rebased-adapter.test.ts

# Test blockchain integration
./scripts/testing/test-blockchain-integration.sh
```

## 🔧 Configuration

### **Environment Variables**
```bash
BLOCKCHAIN_MODE=rebased
IOTA_NETWORK=testnet
IOTA_NODE_URL=https://testnet.rebased.iota.org
IOTA_PRIVATE_KEY=your_private_key
PACKAGE_ID=0x...
TOKEN_CONTRACT_ADDRESS=0x...
```

### **Sponsor Wallet (Optional)**
```bash
SPONSOR_WALLET_ADDRESS=0x...
SPONSOR_WALLET_PRIVATE_KEY=your_sponsor_key
```

## 🚨 Common Issues

- **Contract not found**: Verify contract addresses in config
- **Transaction failed**: Check user balance and permissions
- **Connection issues**: Verify node URL and network settings

---

For detailed examples and advanced usage, see the [Complete Integration Guide](../../docs/blockchain/enhanced-adapter-guide.md).