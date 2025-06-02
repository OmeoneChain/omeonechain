# OmeoneChain Blockchain Integration Documentation

## 🎯 Overview

This folder contains comprehensive documentation for OmeoneChain's blockchain integration using IOTA Rebased and Move smart contracts.

## 📚 Documentation Structure

### **Getting Started**
- **[Architecture Guide](architecture.md)** - High-level blockchain integration strategy and system design
- **[Enhanced Adapter Guide](enhanced-adapter-guide.md)** - Detailed developer guide for using the RebasedAdapter

### **Implementation Guides**
- **[Smart Contracts](contracts.md)** - Move contract documentation and API reference
- **[Deployment Guide](deployment.md)** - How to deploy contracts and configure the system
- **[Migration Strategy](migration.md)** - Roadmap for transitioning from mock to blockchain

## 🚀 Quick Start

### **For Developers Using the Adapter**
Start with the **[Enhanced Adapter Guide](enhanced-adapter-guide.md)** for practical code examples and implementation patterns.

### **For System Architects** 
Begin with the **[Architecture Guide](architecture.md)** to understand the overall blockchain integration strategy.

### **For DevOps/Deployment**
See the **[Deployment Guide](deployment.md)** for production setup and configuration.

## 🔧 Key Components

### **RebasedAdapter Enhanced Features**
```typescript
// Token operations
await adapter.stakeTokens(userAddress, 100, 2, 3);
await adapter.getUserBalance(userAddress);

// Reward distribution  
await adapter.submitRecommendationForReward(userAddress, actionId, 1);
await adapter.checkRewardEligibility(actionId);

// Governance
await adapter.createGovernanceProposal(proposer, title, description, type);
await adapter.voteOnProposal(voter, proposalId, support);
```

### **Move Smart Contracts**
- **Token Contract**: TOK token economics, staking, rewards
- **Reward Distribution**: Social-weighted reward system
- **Governance**: DAO proposals and voting
- **Reputation**: Trust scores and social graph

### **Hybrid Architecture**
- **On-chain**: Critical data (tokens, governance, trust scores)
- **Off-chain**: Performance data (caching, activity logs)  
- **IPFS**: Content storage with on-chain verification hashes

## 📊 Current Status

- ✅ **Move Contracts**: Token, rewards, governance contracts implemented
- ✅ **Enhanced Adapter**: Full IOTA Rebased integration with type-safe methods
- ✅ **Testing Suite**: Comprehensive test coverage for all blockchain features
- 🔄 **Deployment**: Ready for IOTA Rebased testnet deployment
- 📋 **Production**: Pending IOTA testnet access and contract deployment

## 🔗 Related Documentation

- **[Main Project README](../README.md)** - Overall project documentation
- **[API Documentation](../api/)** - REST API reference  
- **[Development Guide](../development/)** - Contributing and development setup

## 🆘 Need Help?

- **Implementation Questions**: See [Enhanced Adapter Guide](enhanced-adapter-guide.md)
- **Architecture Questions**: See [Architecture Guide](architecture.md)
- **Deployment Issues**: See [Deployment Guide](deployment.md)
- **Contract Questions**: See [Smart Contracts](contracts.md)

---

**Ready to build the future of decentralized recommendations! 🚀⛓️**