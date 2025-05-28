# Getting Started with OmeoneChain Development

Welcome to OmeoneChain! This guide will get you up and running with the development environment in minutes. By the end, you'll have a fully functional governance system running locally with live data.

## 🎯 What You'll Have Running

- **Democratic Governance System** - Create proposals, vote, stake tokens
- **Trust Score Engine** - Social graph weighted reputation system  
- **Token Economics** - Reward distribution and staking mechanisms
- **Full-Stack Integration** - React frontend + Express API + Core engines
- **100% Test Coverage** - Validated API endpoints and business logic

---

## ⚡ Quick Start (5 Minutes)

### Prerequisites
- **Node.js 18+** ([Download here](https://nodejs.org/))
- **Git** ([Download here](https://git-scm.com/))
- **Terminal/Command Line** access

### 1. Clone and Setup
```bash
# Clone the repository
git clone https://github.com/OmeoneChain/omeonechain.git
cd omeonechain

# One-command setup (installs dependencies, creates test data)
./setup-api.sh
```

### 2. Start Development Environment
```bash
# Start all services (API server + Frontend)
./start-dev.sh
```

### 3. Verify Everything Works
```bash
# Run comprehensive test suite (in another terminal)
./test-api.sh
```

**🎉 Success!** You should see:
- ✅ All 16 API endpoints tested and passing
- ✅ Frontend running at `http://localhost:3000`
- ✅ API server running at `http://localhost:3001`
- ✅ Mock governance data loaded

---

## 🎮 Try the Live Demo

### Open the Frontend Dashboard
1. **Navigate to**: `http://localhost:3000`
2. **See Live Data**:
   - Trust Score: **8.6/10** (with social graph breakdown)
   - Token Balance: **1,250 TOK** (500 staked, 750 available)
   - Active Proposals: **3 governance proposals** ready for voting
   - Staking Tier: **"Curator"** (100+ TOK staked)

### Test Core Features

#### 🏛️ **Governance System**
```bash
# Create a new proposal
curl -X POST http://localhost:3001/api/v1/governance/proposals \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Increase Base Reward Rate",
    "description": "Proposal to increase base reward from 1 TOK to 1.5 TOK",
    "type": "parameter_change",
    "data": {"parameter": "baseReward", "value": 1.5}
  }'

# Vote on a proposal
curl -X POST http://localhost:3001/api/v1/governance/proposals/prop_1/vote \
  -H "Content-Type: application/json" \
  -d '{"vote": "yes", "weight": 150}'
```

#### ⭐ **Trust Score System**
```bash
# Get trust score breakdown
curl http://localhost:3001/api/v1/users/user_alice/reputation

# Expected response:
# {
#   "trustScore": 8.6,
#   "breakdown": {
#     "directEndorsements": 23,
#     "socialGraphWeight": 0.75,
#     "reputationHistory": 890
#   }
# }
```

#### 🪙 **Token Operations**
```bash
# Check token balance
curl http://localhost:3001/api/v1/tokens/balance

# Transfer tokens
curl -X POST http://localhost:3001/api/v1/tokens/transfer \
  -H "Content-Type: application/json" \
  -d '{
    "recipientId": "user_bob",
    "amount": 50,
    "note": "Thanks for the recommendation!"
  }'
```

---

## 🏗️ Project Structure

Understanding the codebase organization:

```
omeonechain/
├── code/poc/                    # Proof of concept code
│   ├── core/                    # ✅ Core business logic
│   │   ├── src/
│   │   │   ├── governance/      # Democratic governance engine
│   │   │   ├── reputation/      # Trust score calculator
│   │   │   ├── token/          # Token economics & rewards
│   │   │   ├── recommendation/  # Recommendation engine
│   │   │   └── adapters/       # Blockchain adapters (Mock/EVM/Rebased)
│   │   └── __tests__/          # Unit tests (all passing)
│   │
│   ├── api/                    # ✅ Express API server
│   │   ├── routes/             # 16 REST endpoints
│   │   ├── middleware/         # Auth, CORS, rate limiting
│   │   └── server.ts           # Main API server
│   │
│   └── frontend/               # ✅ React dashboard
│       ├── src/
│       │   ├── TrustScoreDashboard.tsx  # Main UI component
│       │   └── components/     # UI components
│       └── public/             # Static assets
│
├── docs/                       # 📚 Documentation (you are here!)
├── contracts/                  # 📋 Smart contracts (Phase 4)
└── scripts/                    # 🛠️ Utility scripts
```

### **Core Components**

| Component | Purpose | Status |
|-----------|---------|--------|
| **Governance Engine** | Democratic proposals and voting | ✅ Complete |
| **Trust Score Engine** | Social graph weighted reputation | ✅ Complete |
| **Token Engine** | Rewards, staking, transfers | ✅ Complete |
| **Reputation Engine** | User reputation calculation | ✅ Complete |
| **MockAdapter** | Simulates blockchain operations | ✅ Complete |
| **API Layer** | 16 REST endpoints | ✅ Complete |
| **React Frontend** | Live dashboard interface | ✅ Complete |

---

## 🧪 Development Workflow

### Daily Development Process

```bash
# 1. Start your development session
./start-dev.sh

# 2. Make your changes
# Edit files in code/poc/core/, code/poc/api/, or code/poc/frontend/

# 3. Test your changes
./test-api.sh                    # Run API tests
cd code/poc/core && npm test     # Run unit tests
cd code/poc/frontend && npm test # Run frontend tests

# 4. See changes live
# Frontend: http://localhost:3000 (auto-reloads)
# API: http://localhost:3001 (restart with ./start-dev.sh)
```

### **Development Commands**

```bash
# Setup and Installation
./setup-api.sh                  # Initial setup
npm install                     # Install dependencies

# Running Services
./start-dev.sh                  # Start all services
./test-api.sh                   # Run comprehensive tests

# Individual Components
cd code/poc/api && npm start    # API server only
cd code/poc/frontend && npm start # Frontend only
cd code/poc/core && npm test    # Core logic tests

# Debugging
npm run debug                   # Debug mode with logging
curl http://localhost:3001/health # API health check
```

### **Making Changes**

#### 1. **Backend Logic Changes** (`code/poc/core/`)
```bash
# Edit business logic
vim code/poc/core/src/governance/engine.ts

# Test your changes
cd code/poc/core
npm test

# Restart API to see changes
./start-dev.sh
```

#### 2. **API Endpoint Changes** (`code/poc/api/`)
```bash
# Edit API routes
vim code/poc/api/routes/governance.ts

# Test the API
./test-api.sh

# Check specific endpoint
curl http://localhost:3001/api/v1/governance/proposals
```

#### 3. **Frontend Changes** (`code/poc/frontend/`)
```bash
# Edit React components
vim code/poc/frontend/src/TrustScoreDashboard.tsx

# Frontend auto-reloads, just refresh browser
# Visit: http://localhost:3000
```

---

## 🧪 Testing Guide

### **Running Tests**

```bash
# Run all tests
./test-api.sh                           # API integration tests (16 endpoints)
cd code/poc/core && npm test            # Unit tests (governance, trust, token)
cd code/poc/frontend && npm test        # Frontend component tests

# Expected Results:
# ✅ API Tests: 16/16 endpoints passing
# ✅ Unit Tests: 14/14 governance tests passing
# ✅ Frontend Tests: 4/4 component tests passing
```

### **Test Coverage**

Our current test coverage:

| Component | Tests | Coverage |
|-----------|-------|----------|
| Governance Engine | 14 tests | 100% |
| Trust Score Engine | 8 tests | 100% |
| Token Engine | 10 tests | 100% |
| Reputation Engine | 6 tests | 100% |
| API Endpoints | 16 tests | 100% |
| Frontend Components | 4 tests | 95% |

### **Writing New Tests**

#### Unit Test Example (Core Logic)
```javascript
// code/poc/core/src/governance/__tests__/engine.test.ts
import { GovernanceEngine } from '../engine';

describe('GovernanceEngine', () => {
  test('should create proposal with valid data', async () => {
    const engine = new GovernanceEngine();
    
    const proposal = await engine.createProposal({
      title: 'Test Proposal',
      description: 'A test proposal for development',
      type: 'parameter_change',
      authorId: 'user_alice'
    });
    
    expect(proposal.id).toBeDefined();
    expect(proposal.status).toBe('active');
    expect(proposal.title).toBe('Test Proposal');
  });
});
```

#### API Integration Test Example
```javascript
// code/poc/api/__tests__/governance.test.ts
import request from 'supertest';
import { app } from '../server';

describe('Governance API', () => {
  test('POST /governance/proposals should create proposal', async () => {
    const response = await request(app)
      .post('/api/v1/governance/proposals')
      .send({
        title: 'API Test Proposal',
        description: 'Testing proposal creation via API',
        type: 'parameter_change'
      });
    
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.id).toBeDefined();
  });
});
```

---

## 🎯 Common Tasks

### **1. Add a New API Endpoint**

```bash
# 1. Add route in API layer
vim code/poc/api/routes/governance.ts

# Add new route:
router.get('/stats', async (req, res) => {
  const stats = await governanceEngine.getStatistics();
  res.json({ success: true, data: stats });
});

# 2. Add method in core engine
vim code/poc/core/src/governance/engine.ts

# Add new method:
async getStatistics() {
  return {
    totalProposals: this.proposals.length,
    activeProposals: this.proposals.filter(p => p.status === 'active').length,
    totalVotes: this.calculateTotalVotes()
  };
}

# 3. Test the new endpoint
curl http://localhost:3001/api/v1/governance/stats
```

### **2. Modify Trust Score Calculation**

```bash
# Edit the trust score algorithm
vim code/poc/core/src/reputation/engine.ts

# Find calculateTrustScore method and modify:
calculateTrustScore(userId: string): number {
  // Your custom trust score logic here
  // Current: social graph weighting (1-hop: 0.75, 2-hop: 0.25)
  
  return finalScore;
}

# Test your changes
cd code/poc/core && npm test
./test-api.sh
```

### **3. Add New Governance Features**

```bash
# 1. Add to governance engine
vim code/poc/core/src/governance/engine.ts

# 2. Add API endpoints
vim code/poc/api/routes/governance.ts

# 3. Update frontend to show new features
vim code/poc/frontend/src/TrustScoreDashboard.tsx

# 4. Add tests
vim code/poc/core/src/governance/__tests__/engine.test.ts
```

---

## 🔧 Troubleshooting

### **Common Issues**

#### **Port Already in Use**
```bash
# Error: Port 3001 already in use
# Solution: Kill existing processes
lsof -ti:3001 | xargs kill -9
lsof -ti:3000 | xargs kill -9

# Then restart
./start-dev.sh
```

#### **Dependencies Not Found**
```bash
# Error: Cannot find module 'express'
# Solution: Reinstall dependencies
rm -rf node_modules package-lock.json
./setup-api.sh
```

#### **Tests Failing**
```bash
# Check specific test failures
cd code/poc/core && npm test -- --verbose
cd code/poc/api && npm test -- --verbose

# Common fix: Clear test cache
npm test -- --clearCache
```

#### **Frontend Not Loading**
```bash
# Check if API is running
curl http://localhost:3001/health

# Check frontend build
cd code/poc/frontend
npm run build
npm start
```

### **Getting Help**

1. **Check logs**: All services log to console
2. **API health check**: `curl http://localhost:3001/health`
3. **GitHub Issues**: [Report problems](https://github.com/OmeoneChain/omeonechain/issues)
4. **Test individual components**: Use the component-specific test commands

---

## 🚀 Next Steps

### **Once You're Set Up**

1. **Explore the Live System**
   - Try creating proposals in the frontend
   - Test the API endpoints with curl
   - Examine the trust score calculations

2. **Read the Documentation**
   - **[API Integration Guide](../api/integration-guide.md)** - Learn how to build with OmeoneChain
   - **[API Reference](../api/endpoints.md)** - Complete endpoint documentation
   - **[Contributing Guidelines](contributing.md)** - How to contribute to the project

3. **Pick Your Focus Area**
   - **Frontend Development**: Improve the React dashboard
   - **Backend Development**: Enhance governance or trust score algorithms  
   - **API Development**: Add new endpoints or improve existing ones
   - **Testing**: Improve test coverage or add integration tests
   - **Documentation**: Help improve guides and tutorials

### **Phase 4 Preview (Coming Next)**

- **IOTA Rebased Integration**: Replace MockAdapter with real blockchain
- **Smart Contracts**: Move VM contracts for token operations
- **Enhanced Security**: JWT authentication and advanced validation
- **Performance Optimization**: Caching and database integration

---

## 🏆 You're Ready!

Congratulations! You now have:
- ✅ **Fully functional governance system** running locally
- ✅ **Complete development environment** with tests
- ✅ **Understanding of project structure** and workflow
- ✅ **Knowledge of common tasks** and troubleshooting

**Ready to contribute?** Check out [Contributing Guidelines](contributing.md) and the [GitHub Issues](https://github.com/OmeoneChain/omeonechain/issues) for areas where you can help!

**Questions?** Open an issue or start a discussion in the repository.

---

*Welcome to the OmeoneChain development community! 🎉*