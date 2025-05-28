# Contributing to OmeoneChain

Thank you for your interest in contributing to OmeoneChain! We're building the future of decentralized recommendations, and we'd love your help. This guide will help you get started contributing effectively.

## 🎯 Current Status: Phase 3 Complete

**What's Working Now:**
- ✅ **Full-Stack Governance System** (16 API endpoints, 100% test coverage)
- ✅ **Democratic Voting** with whale-resistant mechanisms
- ✅ **Trust Score Engine** with social graph weighting
- ✅ **Token Economics** with staking and rewards
- ✅ **React Frontend** with live data integration

**Phase 4 Focus:** IOTA Rebased blockchain integration and smart contracts

---

## 🚀 Quick Start for Contributors

### 1. Fork and Setup
```bash
# Fork the repository on GitHub, then:
git clone https://github.com/YOUR_USERNAME/omeonechain.git
cd omeonechain

# Setup development environment
./setup-api.sh
./start-dev.sh

# Verify everything works
./test-api.sh
```

### 2. Find Your First Contribution
- **Browse [Good First Issues](https://github.com/OmeoneChain/omeonechain/labels/good%20first%20issue)**
- **Check [Phase 4 Opportunities](#phase-4-opportunities)**
- **Review [Areas We Need Help](#areas-we-need-help)**

### 3. Make Your Impact
- **Small Changes**: Documentation, bug fixes, test improvements
- **Medium Changes**: New API endpoints, UI enhancements
- **Large Changes**: Blockchain integration, new core features

---

## 🎯 Areas We Need Help

### **🔥 High Priority (Phase 4)**

#### **Blockchain Integration**
- **IOTA Rebased Adapter** - Replace MockAdapter with real blockchain
- **Move Smart Contracts** - Token, governance, and reputation contracts
- **Wallet Integration** - Web3 authentication and transaction signing
- **Testnet Deployment** - Deploy and test on IOTA Rebased testnet

**Skills Needed:** Blockchain development, Move language, IOTA experience
**Impact:** Transform demo into real decentralized application

#### **Security & Production**
- **JWT Authentication** - Replace mock auth with real security
- **Input Validation** - Enhanced security for all API endpoints
- **Rate Limiting** - Advanced rate limiting and DDoS protection
- **Security Audits** - Review and harden codebase

**Skills Needed:** Security, Node.js, authentication systems
**Impact:** Production-ready security for real users

#### **Performance Optimization**
- **Database Integration** - PostgreSQL for persistent data
- **Caching Layer** - Redis for improved response times
- **API Optimization** - Response compression, query optimization
- **Real-time Features** - WebSocket integration for live updates

**Skills Needed:** Database design, performance optimization, real-time systems
**Impact:** Scalable system for thousands of users

### **🌟 Medium Priority**

#### **Frontend Enhancement**
- **Mobile Responsiveness** - Improve mobile experience
- **New UI Components** - Enhanced governance and trust score displays
- **Real-time Updates** - Live proposal voting and balance updates
- **Accessibility** - WCAG compliance and screen reader support

**Skills Needed:** React, TypeScript, UI/UX design, accessibility
**Impact:** Better user experience and broader accessibility

#### **API Development**
- **New Endpoints** - Service provider tools, analytics APIs
- **API Documentation** - Interactive Swagger/OpenAPI docs
- **SDK Development** - JavaScript SDK for easier integration
- **Webhook System** - Real-time notifications for events

**Skills Needed:** Node.js, API design, documentation
**Impact:** Easier integration for third-party developers

#### **Testing & Quality**
- **Integration Tests** - End-to-end testing scenarios
- **Load Testing** - Performance testing for scale
- **Test Automation** - CI/CD improvements
- **Code Coverage** - Increase coverage in untested areas

**Skills Needed:** Testing frameworks, automation, CI/CD
**Impact:** Reliable, high-quality codebase

### **📚 Always Welcome**

#### **Documentation**
- **Tutorial Videos** - Screen recordings of system features
- **Integration Examples** - Real-world usage examples
- **Concept Explanations** - Trust scores, governance, tokenomics
- **Translation** - Documentation in other languages

**Skills Needed:** Technical writing, video creation, design
**Impact:** Lower barrier to entry for new developers

#### **Community Building**
- **Developer Outreach** - Share project in dev communities
- **Blog Posts** - Technical articles about innovations
- **Conference Talks** - Present at blockchain/dev conferences
- **Hackathon Organization** - Organize community hackathons

**Skills Needed:** Communication, community management, public speaking
**Impact:** Grow contributor base and project awareness

---

## 🔧 Development Process

### **Contribution Workflow**

```bash
# 1. Create feature branch
git checkout -b feature/your-feature-name

# 2. Make your changes
# Edit code, add tests, update documentation

# 3. Test your changes
./test-api.sh                     # API integration tests
cd code/poc/core && npm test      # Unit tests
cd code/poc/frontend && npm test  # Frontend tests

# 4. Commit with clear messages
git add .
git commit -m "feat: add new governance endpoint for proposal analytics

- Add GET /governance/proposals/:id/analytics endpoint
- Include vote breakdown and participation metrics
- Add comprehensive test coverage
- Update API documentation

Fixes #123"

# 5. Push and create pull request
git push origin feature/your-feature-name
# Create PR on GitHub with description
```

### **Commit Message Format**

We use conventional commits for clear history:

```
type(scope): brief description

- Detailed explanation of changes
- Why this change was needed
- Any breaking changes or migration notes

Fixes #issue_number
```

**Types:**
- `feat:` New features
- `fix:` Bug fixes
- `docs:` Documentation changes
- `test:` Test additions/improvements
- `refactor:` Code refactoring
- `perf:` Performance improvements
- `chore:` Maintenance tasks

**Examples:**
```bash
feat(governance): add proposal analytics endpoint
fix(trust-score): correct social graph weighting calculation
docs(api): update integration guide with new endpoints
test(token): add comprehensive reward distribution tests
```

### **Code Standards**

#### **TypeScript/JavaScript**
```javascript
// Use TypeScript for new code
interface ProposalAnalytics {
  proposalId: string;
  totalVotes: number;
  participationRate: number;
  voteBreakdown: {
    yes: number;
    no: number;
    abstain: number;
  };
}

// Clear function names and documentation
/**
 * Calculate proposal analytics including participation metrics
 * @param proposalId - Unique proposal identifier
 * @returns Analytics data for the proposal
 */
async function getProposalAnalytics(proposalId: string): Promise<ProposalAnalytics> {
  // Implementation with error handling
}
```

#### **Testing Standards**
```javascript
// Comprehensive test coverage
describe('ProposalAnalytics', () => {
  test('should calculate correct participation rate', async () => {
    // Setup test data
    const proposal = await createTestProposal();
    await addTestVotes(proposal.id, { yes: 75, no: 25 });
    
    // Execute test
    const analytics = await getProposalAnalytics(proposal.id);
    
    // Verify results
    expect(analytics.participationRate).toBe(0.75);
    expect(analytics.voteBreakdown.yes).toBe(75);
    expect(analytics.totalVotes).toBe(100);
  });

  test('should handle proposal with no votes', async () => {
    const proposal = await createTestProposal();
    const analytics = await getProposalAnalytics(proposal.id);
    
    expect(analytics.participationRate).toBe(0);
    expect(analytics.totalVotes).toBe(0);
  });
});
```

#### **API Design Standards**
```javascript
// Consistent response format
app.get('/api/v1/governance/proposals/:id/analytics', async (req, res) => {
  try {
    const analytics = await governanceEngine.getProposalAnalytics(req.params.id);
    
    res.json({
      success: true,
      data: analytics
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: {
        code: 'PROPOSAL_NOT_FOUND',
        message: 'Proposal not found',
        details: { proposalId: req.params.id }
      }
    });
  }
});
```

---

## 🎯 Phase 4 Opportunities

### **Blockchain Developer Track**

#### **IOTA Rebased Integration**
**Current:** MockAdapter simulates blockchain operations
**Needed:** Real blockchain integration

```typescript
// Replace this MockAdapter implementation:
class MockAdapter implements ChainAdapter {
  async submitTransaction(tx: Transaction): Promise<string> {
    // Mock implementation
    return `mock_tx_${Date.now()}`;
  }
}

// With RebasedAdapter implementation:
class RebasedAdapter implements ChainAdapter {
  async submitTransaction(tx: Transaction): Promise<string> {
    // Real IOTA Rebased integration
    const client = new IOTAClient(this.nodeUrl);
    const result = await client.submitBlock(tx);
    return result.blockId;
  }
}
```

**Skills:** IOTA development, Move VM, blockchain architecture
**Impact:** Enable real decentralized functionality

#### **Move Smart Contracts**
**Current:** JavaScript business logic
**Needed:** On-chain smart contracts

```move
// Token contract needed:
module omeonechain::token {
    use std::signer;
    
    struct TokenAccount has key {
        balance: u64,
        staked: u64,
    }
    
    public fun transfer(
        from: &signer,
        to: address,
        amount: u64
    ) {
        // Token transfer logic
    }
    
    public fun stake_tokens(
        account: &signer,
        amount: u64,
        duration: u64
    ) {
        // Staking logic
    }
}
```

**Skills:** Move language, smart contract development
**Impact:** True token functionality on blockchain

### **Full-Stack Developer Track**

#### **Production Security**
```typescript
// Current: No authentication
app.post('/api/v1/governance/proposals', async (req, res) => {
  // Anyone can create proposals
});

// Needed: JWT authentication
app.post('/api/v1/governance/proposals', 
  authenticateJWT,
  validateStakeRequirement(100), // Requires 100 TOK staked
  async (req, res) => {
    // Authenticated and authorized proposal creation
  }
);
```

#### **Database Integration**
```typescript
// Current: In-memory data storage
class MockAdapter {
  private proposals: Proposal[] = [];
  
  async getProposals(): Promise<Proposal[]> {
    return this.proposals;
  }
}

// Needed: PostgreSQL integration
class DatabaseAdapter {
  async getProposals(): Promise<Proposal[]> {
    const result = await this.db.query(
      'SELECT * FROM proposals ORDER BY created_at DESC'
    );
    return result.rows;
  }
}
```

### **Frontend Developer Track**

#### **Enhanced User Experience**
```tsx
// Current: Basic dashboard
function TrustScoreDashboard() {
  return <div>Trust Score: {score}</div>;
}

// Needed: Rich interactive components
function TrustScoreDashboard() {
  return (
    <div className="trust-dashboard">
      <TrustScoreVisualization score={score} breakdown={breakdown} />
      <SocialGraphMap connections={connections} />
      <ReputationHistory history={history} />
      <InteractiveStaking currentStake={stake} tiers={tiers} />
    </div>
  );
}
```

#### **Mobile Application**
```typescript
// React Native app needed
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

function OmeoneChainApp() {
  return (
    <NavigationContainer>
      <Tab.Navigator>
        <Tab.Screen name="Governance" component={GovernanceScreen} />
        <Tab.Screen name="Recommendations" component={RecommendationsScreen} />
        <Tab.Screen name="Profile" component={ProfileScreen} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}
```

---

## 🏆 Recognition & Rewards

### **Contributor Levels**

#### **🌟 Community Contributor**
- **Requirements:** 1+ merged PR, active in discussions
- **Benefits:** Listed in contributors, early access to features
- **Examples:** Documentation improvements, bug fixes, test additions

#### **🚀 Core Contributor**
- **Requirements:** 5+ meaningful PRs, consistent involvement
- **Benefits:** Maintainer privileges, token allocation consideration
- **Examples:** New features, architectural improvements, major integrations

#### **💎 Founding Contributor**
- **Requirements:** Major technical contributions, leadership
- **Benefits:** Equity consideration, conference opportunities, tech lead roles
- **Examples:** Blockchain integration, security architecture, mobile app

### **Token Allocation for Contributors**

Once tokenomics are live (Phase 4+):
- **Contributors Pool:** 2% of total token supply reserved
- **Distribution:** Based on contribution impact and consistency
- **Vesting:** 6-month cliff, 2-year vesting for major contributors

### **Other Recognition**
- **GitHub Achievements:** Custom achievement badges
- **Conference Speaking:** Opportunities to present OmeoneChain
- **Blog Features:** Technical posts on project blog
- **Mentorship:** One-on-one guidance from core team

---

## 📋 Issue Labels & Project Boards

### **Issue Labels**

| Label | Description | Good For |
|-------|-------------|----------|
| `good first issue` | Perfect for newcomers | New contributors |
| `help wanted` | Community help needed | All skill levels |
| `bug` | Something isn't working | Bug fixes |
| `enhancement` | New feature or improvement | Feature development |
| `documentation` | Documentation improvements | Technical writers |
| `blockchain` | Blockchain-related work | Blockchain developers |
| `frontend` | UI/UX related | Frontend developers |
| `api` | Backend API work | Backend developers |
| `testing` | Testing related | QA engineers |
| `phase-4` | Phase 4 priorities | All contributors |

### **Project Boards**

- **[Phase 4 Roadmap](https://github.com/OmeoneChain/omeonechain/projects/1)** - Main development board
- **[Good First Issues](https://github.com/OmeoneChain/omeonechain/projects/2)** - Newcomer-friendly tasks
- **[Documentation Improvements](https://github.com/OmeoneChain/omeonechain/projects/3)** - Doc tasks

---

## 🤝 Community Guidelines

### **Code of Conduct**

We are committed to fostering a welcoming, inclusive community:

1. **Be respectful** - Treat all community members with respect
2. **Be constructive** - Provide helpful feedback and suggestions  
3. **Be collaborative** - Work together towards common goals
4. **Be inclusive** - Welcome contributors of all backgrounds and skill levels

### **Communication Channels**

- **GitHub Issues** - Bug reports, feature requests, technical discussions
- **GitHub Discussions** - General questions, ideas, community chat
- **Pull Request Reviews** - Code feedback and collaboration
- **Project Boards** - Track progress and coordinate work

### **Getting Help**

1. **Check Documentation** - Most questions are answered in docs
2. **Search Issues** - Someone may have asked the same question
3. **Ask in Discussions** - Community Q&A forum
4. **Open an Issue** - For bugs or specific technical questions

---

## 🎯 Specific Contribution Ideas

### **For New Contributors (1-5 hours)**

1. **Fix Typos in Documentation** - Easy way to get started
2. **Add API Response Examples** - Improve API documentation
3. **Write Unit Tests** - Increase test coverage
4. **Improve Error Messages** - Make errors more user-friendly
5. **Add Input Validation** - Strengthen API security

### **For Experienced Developers (1-2 weeks)**

1. **Implement New API Endpoints** - Add missing functionality
2. **Create React Components** - Enhance frontend interface
3. **Add Database Schema** - Design PostgreSQL integration
4. **Implement JWT Authentication** - Add real security
5. **Create Mobile App Components** - Start React Native app

### **For Blockchain Experts (2-8 weeks)**

1. **IOTA Rebased Integration** - Core blockchain functionality
2. **Move Smart Contracts** - On-chain logic implementation
3. **Wallet Integration** - Web3 authentication system
4. **Testnet Deployment** - Deploy to IOTA testnet
5. **Security Audits** - Review and harden blockchain code

---

## 🏁 Ready to Contribute?

### **Next Steps:**

1. **[Set up your development environment](getting-started.md)**
2. **[Browse good first issues](https://github.com/OmeoneChain/omeonechain/labels/good%20first%20issue)**
3. **[Join the community discussions](https://github.com/OmeoneChain/omeonechain/discussions)**
4. **[Check the Phase 4 roadmap](https://github.com/OmeoneChain/omeonechain/projects/1)**

### **Questions?**
- **Open a Discussion** - [Ask the community](https://github.com/OmeoneChain/omeonechain/discussions)
- **Create an Issue** - [Get specific help](https://github.com/OmeoneChain/omeonechain/issues/new)
- **Read the Docs** - [Complete documentation](../README.md)

---

**Thank you for contributing to the future of decentralized recommendations! 🎉**

Together, we're building a platform where trust, transparency, and authentic word-of-mouth recommendations create real value for users and businesses alike.