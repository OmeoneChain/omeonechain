# Enhanced RebasedAdapter Integration Guide

## 🎯 Overview

The enhanced RebasedAdapter builds on your existing solid foundation to add **direct Move contract integration** with OmeoneChain's tokenomics. This guide shows how to integrate the enhanced adapter with your current system.

## 🔧 Key Enhancements

### **1. Move Contract Function Mappings**
Direct integration with your Move smart contracts:

```typescript
// Before: Generic contract calls
await adapter.callContractFunction(contractAddress, 'some_function', args);

// After: Type-safe Move contract calls
await adapter.stakeTokens(userAddress, 100, 2, 3); // 100 TOK, Curator tier, 3 months
await adapter.getUserBalance(userAddress);
await adapter.submitRecommendationForReward(userAddress, actionId, 1);
```

### **2. OmeoneChain-Specific Transaction Types**
Enhanced transaction routing with automatic contract selection:

```typescript
// Token transaction
const tokenTx: OmeoneTransaction = {
  sender: userAddress,
  payload: {
    type: 'token',
    action: 'stake',
    data: { amount: 100, stakeType: 2, lockPeriod: 3 }
  }
};

// Reward transaction  
const rewardTx: OmeoneTransaction = {
  sender: userAddress,
  payload: {
    type: 'reward',
    action: 'submit_recommendation',
    data: { actionId: 'rec_123', actionType: 1 }
  }
};

// Automatic routing to correct Move contract
await adapter.submitTx(tokenTx);
await adapter.submitTx(rewardTx);
```

### **3. Sponsor Wallet Integration**
Automatic fee sponsoring for seamless user experience:

```typescript
const config: RebasedConfig = {
  network: 'testnet',
  nodeUrl: 'https://testnet.rebased.iota.org',
  account: { address: userAddress, privateKey: userPrivateKey },
  sponsorWallet: { 
    address: sponsorAddress, 
    privateKey: sponsorPrivateKey 
  },
  options: { 
    enableSponsorWallet: true  // Users experience feeless transactions
  }
};
```

## 📚 Usage Examples

### **Token Operations**

#### Create User Wallet
```typescript
const result = await adapter.createUserWallet(userAddress);
if (result.success) {
  console.log('Wallet created successfully');
}
```

#### Stake Tokens
```typescript
// Stake 100 TOK as Curator (type 2) for 3 months
const stakeResult = await adapter.stakeTokens(userAddress, 100, 2, 3);

if (stakeResult.success) {
  console.log('Tokens staked successfully');
  console.log('Gas used:', stakeResult.gasUsed);
}
```

#### Get User Balance
```typescript
const balance = await adapter.getUserBalance(userAddress);
console.log(`Liquid: ${balance.liquid / 1000000} TOK`); // Convert from micro-tokens
console.log(`Staked: ${balance.staked / 1000000} TOK`);
console.log(`Pending rewards: ${balance.pendingRewards / 1000000} TOK`);
```

#### Get Trust and Reputation Scores
```typescript
const trustScore = await adapter.getUserTrustScore(userAddress);    // 0.0 - 1.0
const reputationScore = await adapter.getUserReputationScore(userAddress); // Integer
```

### **Reward Distribution Operations**

#### Complete Recommendation Reward Flow
```typescript
// 1. Submit recommendation for potential reward
const submitResult = await adapter.submitRecommendationForReward(
  userAddress,
  'recommendation_123',
  1 // Recommendation type
);

// 2. Add social endorsements (upvotes, saves)
const endorseResult = await adapter.addSocialEndorsement(
  endorserAddress,
  'recommendation_123',
  1 // Social distance (1 hop = direct follower)
);

// 3. Check if reward is eligible for claiming
const eligibility = await adapter.checkRewardEligibility('recommendation_123');
console.log('Trust score:', eligibility.trustScore);
console.log('Endorsements:', eligibility.endorsements);
console.log('Potential reward:', eligibility.potentialReward, 'TOK');
console.log('Is eligible:', eligibility.isEligible);

// 4. Claim reward if eligible (trust score >= 0.25)
if (eligibility.isEligible) {
  const claimResult = await adapter.claimRecommendationReward(
    userAddress,
    'recommendation_123'
  );
  
  if (claimResult.success) {
    console.log('Reward claimed successfully!');
  }
}
```

#### Onboarding Rewards
```typescript
// Milestone 1: Follow 3 accounts (0.5 TOK)
await adapter.distributeOnboardingReward(userAddress, 1);

// Milestone 2: Submit 5 recommendations (2.5 TOK)
await adapter.distributeOnboardingReward(userAddress, 2);

// Milestone 3: 10 interactions (2 TOK)
await adapter.distributeOnboardingReward(userAddress, 3);
```

#### Leaderboard Rewards
```typescript
// Distribute weekly leaderboard rewards
await adapter.distributeLeaderboardReward(winnerAddress, 1); // 1st place: 20 TOK
await adapter.distributeLeaderboardReward(runnerUpAddress, 2); // 2nd place: 12 TOK
```

### **Governance Operations**

#### Create and Vote on Proposals
```typescript
// Create governance proposal
const proposalResult = await adapter.createGovernanceProposal(
  proposerAddress,
  'Improve Reward Distribution',
  'Proposal to enhance the token reward mechanism for better fairness',
  'parameter_change'
);

// Vote on proposal
const voteResult = await adapter.voteOnProposal(
  voterAddress,
  'proposal_456',
  true // Support the proposal
);
```

### **System Monitoring**

#### Get System Statistics
```typescript
const stats = await adapter.getSystemStats();
console.log('Current reward rate:', stats.currentRewardRate);
console.log('Total distributed:', stats.totalDistributed / 1000000, 'TOK');
console.log('Active users:', stats.activeUsers);

// Individual metrics
const rewardRate = await adapter.getCurrentRewardRate();
const totalDistributed = await adapter.getTotalRewardsDistributed();
```

## 🔄 Migration from Existing Code

### **Step 1: Update Configuration**
Add the new configuration options to your existing setup:

```typescript
// Before
const adapter = new RebasedAdapter(nodeUrl, apiKey, seed);

// After - Enhanced with Move contracts
const config: RebasedConfig = {
  network: 'testnet',
  nodeUrl: nodeUrl,
  account: { address: userAddress, privateKey: userPrivateKey },
  contractAddresses: {
    recommendation: '0x4f6d656f6e654368e4b8bce8a18de6bd8a8e5ddb',
    reputation: '0x4f6d656f6e655265e4b8bce8a18de6bd8a8e5dda',
    token: '0x4f6d656f6e6554e4b8bce8a18de6bd8a8e5dcc1',
    governance: '0x4f6d656f6e65476f7665726e616e63655ddc7',
    service: '0x4f6d656f6e65536572766963655ddc8',
    rewards: '0x4f6d656f6e6552657761726473655ddc9', // New
  },
  packageId: '0x4f6d656f6e65506163a6167655ddc0', // After deployment
  options: {
    enableSponsorWallet: true,
    retryAttempts: 3,
    maxFeePerTransaction: 50,
  }
};

const adapter = new RebasedAdapter(config);
```

### **Step 2: Replace Generic Calls with Typed Methods**
```typescript
// Before: Generic contract calls
const result = await adapter.callContractFunction(
  tokenContractAddress,
  'get_balance',
  [userAddress]
);

// After: Type-safe method calls
const balance = await adapter.getUserBalance(userAddress);
```

### **Step 3: Update Transaction Submission**
```typescript
// Before: Legacy transaction format
const legacyTx = {
  sender: userAddress,
  type: 'token',
  action: 'stake',
  data: { amount: 100 }
};

// After: Enhanced transaction format
const enhancedTx: OmeoneTransaction = {
  sender: userAddress,
  payload: {
    type: 'token',
    action: 'stake',
    data: { amount: 100, stakeType: 2, lockPeriod: 3 }
  }
};

await adapter.submitTx(enhancedTx);
```

## 🧪 Testing Integration

### **Unit Tests**
```typescript
import { RebasedAdapter } from '../adapters/rebased-adapter';

describe('Enhanced Adapter Integration', () => {
  let adapter: RebasedAdapter;
  
  beforeEach(() => {
    adapter = new RebasedAdapter(mockConfig);
  });
  
  it('should integrate with existing token engine', async () => {
    const balance = await adapter.getUserBalance('0x123');
    expect(balance.liquid).toBeGreaterThanOrEqual(0);
  });
  
  it('should handle reward distribution flow', async () => {
    // Submit recommendation
    const submitResult = await adapter.submitRecommendationForReward(
      '0x123', 'rec_456', 1
    );
    expect(submitResult.success).toBe(true);
    
    // Add endorsement
    const endorseResult = await adapter.addSocialEndorsement(
      '0x456', 'rec_456', 1
    );
    expect(endorseResult.success).toBe(true);
    
    // Check eligibility
    const eligibility = await adapter.checkRewardEligibility('rec_456');
    expect(eligibility.trustScore).toBeGreaterThanOrEqual(0);
  });
});
```

### **Integration Tests**
```typescript
describe('Full System Integration', () => {
  it('should work with existing governance engine', async () => {
    // Test governance proposal creation
    const result = await adapter.createGovernanceProposal(
      proposerAddress,
      'Test Proposal',
      'Integration test',
      'parameter_change'
    );
    
    expect(result.success).toBe(true);
  });
  
  it('should maintain backwards compatibility', async () => {
    // Test legacy methods still work
    const legacyResult = await adapter.submitTransaction({
      sender: '0x123',
      type: 'token',
      action: 'stake',
      data: { amount: 100 }
    });
    
    expect(legacyResult.transactionId).toBeDefined();
  });
});
```

## 🚀 Deployment Integration

### **Environment Configuration**
```bash
# .env file
BLOCKCHAIN_MODE=rebased
IOTA_NETWORK=testnet
IOTA_NODE_URL=https://testnet.rebased.iota.org
IOTA_PRIVATE_KEY=your_private_key
SPONSOR_WALLET_ADDRESS=0x...
SPONSOR_WALLET_PRIVATE_KEY=your_sponsor_key

# Contract addresses (after deployment)
TOKEN_CONTRACT_ADDRESS=0x4f6d656f6e6554e4b8bce8a18de6bd8a8e5dcc1
GOVERNANCE_CONTRACT_ADDRESS=0x4f6d656f6e65476f7665726e616e63655ddc7
REPUTATION_CONTRACT_ADDRESS=0x4f6d656f6e655265e4b8bce8a18de6bd8a8e5dda
REWARDS_CONTRACT_ADDRESS=0x4f6d656f6e6552657761726473655ddc9
PACKAGE_ID=0x4f6d656f6e65506163a6167655ddc0
```

### **Production Initialization**
```typescript
// production-adapter.ts
import { RebasedAdapter } from './adapters/rebased-adapter';

export function createProductionAdapter(): RebasedAdapter {
  const config = {
    network: process.env.IOTA_NETWORK as 'testnet' | 'mainnet',
    nodeUrl: process.env.IOTA_NODE_URL!,
    account: {
      address: process.env.IOTA_ADDRESS!,
      privateKey: process.env.IOTA_PRIVATE_KEY!,
    },
    sponsorWallet: {
      address: process.env.SPONSOR_WALLET_ADDRESS!,
      privateKey: process.env.SPONSOR_WALLET_PRIVATE_KEY!,
    },
    contractAddresses: {
      token: process.env.TOKEN_CONTRACT_ADDRESS!,
      governance: process.env.GOVERNANCE_CONTRACT_ADDRESS!,
      reputation: process.env.REPUTATION_CONTRACT_ADDRESS!,
      rewards: process.env.REWARDS_CONTRACT_ADDRESS!,
      recommendation: process.env.TOKEN_CONTRACT_ADDRESS!, // Same as token
      service: process.env.TOKEN_CONTRACT_ADDRESS!, // Same as token
    },
    packageId: process.env.PACKAGE_ID!,
    options: {
      enableSponsorWallet: true,
      retryAttempts: 3,
      maxFeePerTransaction: 50,
      timeoutMs: 30000,
    },
  };
  
  return new RebasedAdapter(config);
}
```

## 🔧 Troubleshooting

### **Common Issues**

#### **1. Contract Address Errors**
```typescript
// Error: Contract not found
// Solution: Verify contract addresses are correct
const health = await adapter.getSystemStats();
console.log('Connected to:', health.networkInfo);
```

#### **2. Transaction Failures**
```typescript
// Error: Insufficient balance
// Solution: Check user balance before operations
const balance = await adapter.getUserBalance(userAddress);
if (balance.liquid < requiredAmount) {
  throw new Error('Insufficient balance for operation');
}
```

#### **3. Sponsor Wallet Issues**
```typescript
// Error: Sponsor wallet not working
// Solution: Verify sponsor wallet configuration
const config = {
  // ...
  sponsorWallet: {
    address: process.env.SPONSOR_WALLET_ADDRESS,
    privateKey: process.env.SPONSOR_WALLET_PRIVATE_KEY,
  },
  options: {
    enableSponsorWallet: true, // Must be enabled
  }
};
```

### **Debug Mode**
```typescript
// Enable detailed logging
const adapter = new RebasedAdapter({
  ...config,
  options: {
    ...config.options,
    debugMode: true, // Add this for debugging
  }
});

// Monitor all Move function calls
adapter.onMoveCall = (contractType, functionName, args) => {
  console.log(`Move call: ${contractType}::${functionName}`, args);
};
```

## 📈 Performance Optimization

### **Batch Operations**
```typescript
// Batch multiple operations
const operations = [
  adapter.getUserBalance(user1),
  adapter.getUserBalance(user2),
  adapter.getUserBalance(user3),
];

const results = await Promise.all(operations);
```

### **Caching Strategies**
```typescript
// Cache frequently accessed data
const cache = new Map();

async function getCachedBalance(userAddress: string) {
  const cacheKey = `balance_${userAddress}`;
  
  if (cache.has(cacheKey)) {
    const cached = cache.get(cacheKey);
    if (Date.now() - cached.timestamp < 30000) { // 30 second cache
      return cached.data;
    }
  }
  
  const balance = await adapter.getUserBalance(userAddress);
  cache.set(cacheKey, { data: balance, timestamp: Date.now() });
  
  return balance;
}
```

## 🎯 Next Steps

1. **Test Integration**: Run the enhanced adapter against your existing test suite
2. **Deploy Contracts**: Deploy Move contracts to IOTA Rebased testnet
3. **Update Configuration**: Add contract addresses and package ID
4. **Gradual Migration**: Replace generic calls with typed methods incrementally
5. **Monitor Performance**: Track gas usage and transaction success rates

The enhanced adapter maintains **100% backward compatibility** while adding powerful new Move contract integration capabilities. You can migrate gradually while keeping your existing functionality intact! 🚀