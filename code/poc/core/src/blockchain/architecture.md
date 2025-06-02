# Phase 4: Blockchain Integration Guide

## 🎯 Overview

Phase 4 brings **true decentralization** to OmeoneChain by integrating IOTA Rebased blockchain infrastructure. This phase maintains all existing functionality while adding blockchain-based verification, transparency, and token economics.

## 🏗️ Architecture

### Hybrid Architecture
```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend (React)                         │
└─────────────────────┬───────────────────────────────────────┘
                      │
┌─────────────────────┴───────────────────────────────────────┐
│                   API Layer (Express)                       │
└─────────────────────┬───────────────────────────────────────┘
                      │
┌─────────────────────┴───────────────────────────────────────┐
│           Blockchain Integration Service                     │
│  ┌─────────────────┬─────────────────┬─────────────────┐    │
│  │  MockAdapter    │  RebasedAdapter │  Future Adapters│    │
│  └─────────────────┴─────────────────┴─────────────────┘    │
└─────────────────────┬───────────────────────────────────────┘
                      │
     ┌────────────────┼────────────────┐
     │                │                │
┌────▼────┐     ┌─────▼──────┐    ┌───▼────┐
│ In-Memory│     │IOTA Rebased│    │  IPFS  │
│   Cache  │     │(Move VM)   │    │Storage │
└─────────┘     └────────────┘    └────────┘
```

### Smart Contract Architecture
```
IOTA Rebased Blockchain
├── Token Contract (omeone_token)
│   ├── User wallets and balances
│   ├── Staking mechanisms
│   ├── Reward distribution
│   └── Halving logic
├── Reward Distribution (reward_distribution)
│   ├── Action submission
│   ├── Social endorsements
│   ├── Trust score calculation
│   └── Reward claiming
├── Governance Contract (governance)
│   ├── Proposal creation
│   ├── Voting mechanisms
│   └── Treasury management
└── Reputation Contract (reputation)
    ├── Trust score tracking
    ├── Social graph weights
    └── Reputation history
```

## 🚀 Getting Started

### 1. Prerequisites
- Node.js 18+ and npm
- Sui CLI tools (for Move development)
- Git and basic command line knowledge

### 2. Setup Phase 4
```bash
# Run the Phase 4 setup script
./setup-phase4-blockchain.sh

# Check setup status
./scripts/check-phase4-status.sh

# Start local development environment
./scripts/blockchain/start-local-env.sh
```

### 3. Development Workflow
```bash
# 1. Compile Move contracts
./scripts/blockchain/compile-contracts.sh

# 2. Test contracts
./scripts/blockchain/test-contracts.sh

# 3. Run integration tests
./scripts/testing/test-blockchain-integration.sh

# 4. Start the full system
./start-dev.sh
```

## 🔧 Key Components

### 1. Move Smart Contracts

#### Token Contract (`omeone_token`)
- **Purpose**: Manages TOK tokens, staking, and rewards
- **Key Functions**:
  - `create_user_wallet()` - Create new user wallet
  - `stake_tokens()` - Stake tokens for governance rights
  - `distribute_reward()` - Distribute rewards based on trust scores
  - `claim_rewards()` - Claim pending rewards

#### Reward Distribution (`reward_distribution`)
- **Purpose**: Handles recommendation rewards and social endorsements  
- **Key Functions**:
  - `submit_action_for_reward()` - Submit recommendation for potential reward
  - `add_social_endorsement()` - Add upvote/save from social graph
  - `claim_reward()` - Claim reward when trust threshold met

### 2. TypeScript Integration

#### RebasedAdapter
- **Purpose**: Connects TypeScript code to Move contracts
- **Key Features**:
  - Transaction submission and querying
  - Event monitoring and parsing
  - Gas management and fee estimation
  - Error handling and retry logic

#### BlockchainIntegrationService
- **Purpose**: Orchestrates between existing engines and blockchain
- **Key Features**:
  - Seamless mode switching (Mock ↔ Rebased)
  - Data synchronization between on-chain and off-chain
  - Unified API for all blockchain operations

## 📊 Token Economics Implementation

### Reward Distribution Flow
```
1. User submits recommendation
   ↓
2. Action registered on-chain (no tokens minted yet)
   ↓
3. Social endorsements added (upvotes, saves)
   ↓
4. Trust score calculated: Σ(endorser_trust × social_distance_weight)
   ↓
5. When Trust Score ≥ 0.25: Tokens minted
   ↓
6. Final reward = Base Reward × Trust Multiplier (capped at 3×)
```

### Staking Tiers
| Tier | Minimum | Lock Period | Benefits |
|------|---------|-------------|----------|
| Explorer | 25 TOK | 1 month | Submit governance comments |
| Curator | 100 TOK | 3 months | Create proposals, 25% list royalty |
| Passport | 50 TOK | 6 months | 50% AI discount |
| Validator | 1000 TOK | 12 months | Run indexer, 1.5× vote weight |

### Halving Schedule
- **Trigger**: Every 10% of rewards pool distributed (520M TOK)
- **Effect**: Base reward rate cuts by 50%
- **Total Periods**: 10 halving events over network lifetime
- **Immutable**: Cannot be changed by governance

## 🔐 Security & Testing

### Smart Contract Security
- **Formal Verification**: Critical contracts undergo formal verification
- **Access Control**: Role-based permissions for admin functions
- **Reentrancy Protection**: Guards against common attack vectors
- **Rate Limiting**: Prevention of spam and DoS attacks

### Testing Strategy
```bash
# Unit tests for individual contracts
sui move test

# Integration tests for TypeScript ↔ Move interaction
npm test -- --testPathPattern=blockchain

# End-to-end tests for complete user flows
npm run test:e2e
```

## 🌐 Network Deployment

### Local Development
```bash
# Start local Sui network
./scripts/blockchain/start-local-env.sh

# Deploy contracts locally
./scripts/blockchain/deploy-local.sh

# Configure integration service for local mode
export BLOCKCHAIN_MODE=rebased
export SUI_NETWORK=localnet
```

### Testnet Deployment
```bash
# Configure for testnet
export SUI_NETWORK=testnet
export SUI_PRIVATE_KEY=your_testnet_key

# Deploy to testnet
./scripts/blockchain/deploy-testnet.sh

# Verify deployment
./scripts/blockchain/verify-deployment.sh
```

### Mainnet Deployment
```bash
# Production deployment (when ready)
export SUI_NETWORK=mainnet
export SUI_PRIVATE_KEY=your_mainnet_key

# Deploy with multi-sig
./scripts/blockchain/deploy-mainnet.sh
```

## 🔄 Migration Strategy

### Phase 4A: Dual Mode Operation
- **MockAdapter**: Continues existing functionality
- **RebasedAdapter**: New blockchain operations
- **Gradual Migration**: Move features incrementally to blockchain

### Phase 4B: Hybrid Data Storage
- **Critical Data**: Governance votes, token balances → On-chain
- **Performance Data**: User activity, caching → Off-chain database
- **Content Data**: Recommendations, media → IPFS with on-chain hashes

### Phase 4C: Full Decentralization
- **Complete Migration**: All core functions on blockchain
- **Emergency Fallback**: EVM adapter for contingency
- **Community Governance**: DAO controls all parameters

## 🎛️ Configuration

### Environment Variables
```bash
# Blockchain mode
BLOCKCHAIN_MODE=mock|rebased

# Network configuration
SUI_NETWORK=localnet|testnet|mainnet
SUI_NODE_URL=custom_node_url
SUI_PRIVATE_KEY=your_private_key

# Contract addresses (after deployment)
CONTRACT_PACKAGE_ID=0x...
TOKEN_CONTRACT_ID=0x...
GOVERNANCE_CONTRACT_ID=0x...
REPUTATION_CONTRACT_ID=0x...
REWARDS_CONTRACT_ID=0x...

# IPFS configuration
IPFS_NODE_URL=https://ipfs.io
IPFS_PIN_SERVICE=pinata|infura
```

### Runtime Configuration
```typescript
const blockchainService = new BlockchainIntegrationService({
  mode: 'rebased', // or 'mock'
  rebased: {
    network: 'testnet',
    privateKey: process.env.SUI_PRIVATE_KEY,
    packageId: process.env.CONTRACT_PACKAGE_ID,
    contracts: {
      token: process.env.TOKEN_CONTRACT_ID,
      governance: process.env.GOVERNANCE_CONTRACT_ID,
      reputation: process.env.REPUTATION_CONTRACT_ID,
      rewards: process.env.REWARDS_CONTRACT_ID,
    }
  },
  autoSync: true,
  syncInterval: 30000, // 30 seconds
}, engines);
```

## 📈 Monitoring & Analytics

### Health Checks
```typescript
// System health monitoring
const health = await blockchainService.getSystemHealth();
// Returns: { adapter, connected, latestBlock, syncStatus }

// System statistics
const stats = await blockchainService.getSystemStats();
// Returns: { currentRewardRate, totalDistributed, halvingPeriod, activeUsers }
```

### Event Monitoring
```typescript
// Subscribe to blockchain events
await blockchainService.subscribeToEvents('RewardDistributed', (event) => {
  console.log('Reward distributed:', event);
});

// Transaction history
const history = await blockchainService.getTransactionHistory(userAddress);
```

## 🚨 Troubleshooting

### Common Issues

#### 1. Sui CLI Installation Problems
```bash
# macOS
brew install sui

# Linux/Manual installation
curl -fsSL https://sui.io/install.sh | sh
export PATH="$HOME/.sui/bin:$PATH"
```

#### 2. Contract Compilation Errors
```bash
# Update Sui framework dependencies
cd contracts/move/token
sui move build --force

# Clean and rebuild
rm -rf build/
sui move build
```

#### 3. TypeScript Integration Issues
```bash
# Reinstall blockchain dependencies
cd code/poc/core
rm -rf node_modules package-lock.json
npm install
```

#### 4. Local Network Connection Problems
```bash
# Reset local Sui network
sui start --with-faucet --force-regenesis

# Check network status
sui client active-env
sui client gas
```

### Debug Mode
```bash
# Enable debug logging
export DEBUG=omeone:blockchain*
export SUI_LOG_LEVEL=debug

# Run with verbose output
npm run dev -- --verbose
```

## 🔮 Future Enhancements

### Phase 5 Roadmap
- **Multi-chain Support**: Deploy on additional blockchains
- **Layer 2 Integration**: Optimize for high-frequency interactions
- **Advanced Privacy**: Zero-knowledge proofs for sensitive operations
- **Cross-chain Governance**: Multi-network token and voting

### Community Features
- **Developer SDK**: Easy integration for third-party apps
- **Plugin System**: Extensible architecture for custom features
- **Mobile Wallet**: Native mobile app with wallet integration
- **DeFi Integration**: Yield farming and liquidity mining

## 📚 Additional Resources

- **Move Language Guide**: [https://move-language.github.io/move/](https://move-language.github.io/move/)
- **Sui Documentation**: [https://docs.sui.io/](https://docs.sui.io/)
- **IOTA Rebased**: [https://wiki.iota.org/iota-2.0/](https://wiki.iota.org/iota-2.0/)
- **OmeoneChain Whitepaper**: `docs/OmeoneChain_White Paper_v0.2.pdf`

---

**Ready to build the future of decentralized recommendations! 🚀**