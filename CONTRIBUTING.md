# Contributing to OmeoneChain

Thank you for your interest in contributing to OmeoneChain! We're building the future of decentralized recommendations and would love your help.

## 🎯 **Current Status: Phase 3 Complete**

**What's Working Now:**
- ✅ **Full-Stack Governance System** (16 API endpoints, 100% test coverage)
- ✅ **Democratic Voting** with whale-resistant mechanisms
- ✅ **Trust Score Engine** with social graph weighting
- ✅ **Token Economics** with staking and rewards

**Phase 4 Focus:** IOTA Rebased blockchain integration and smart contracts

## Table of Contents

- [Quick Start](#quick-start)
- [Ways to Contribute](#ways-to-contribute)
- [Development Workflow](#development-workflow)
- [Coding Standards](#coding-standards)
- [Pull Request Process](#pull-request-process)
- [Testing Guidelines](#testing-guidelines)
- [Getting Help](#getting-help)
- [Detailed Contribution Guide](#detailed-contribution-guide)

## Quick Start

### Prerequisites

- **Node.js 18+**
- **Git**
- **Basic familiarity with TypeScript/React** (helpful but not required)

### 5-Minute Setup

```bash
# Fork the repository on GitHub, then:
git clone https://github.com/YOUR_USERNAME/omeonechain.git
cd omeonechain

# One-command setup
./setup-api.sh

# Start development environment
./start-dev.sh

# Verify everything works
./test-api.sh
```

**🎉 Success!** You should now have:
- API server running at `http://localhost:3001`
- Frontend dashboard at `http://localhost:3000`
- All 16 API endpoints tested and passing

## Ways to Contribute

### 🔥 **High Priority (Phase 4)**

#### **Blockchain Integration** ⛓️
- **IOTA Rebased Adapter** - Replace MockAdapter with real blockchain
- **Move Smart Contracts** - Token, governance, and reputation contracts
- **Wallet Integration** - Web3 authentication and transaction signing

#### **Security & Production** 🔒
- **JWT Authentication** - Replace mock auth with real security
- **Input Validation** - Enhanced security for all API endpoints
- **Performance Optimization** - Database integration, caching

### 🌟 **Always Welcome**

#### **For New Contributors**
- **Documentation improvements** - Fix typos, add examples
- **Bug fixes** - Small issues, error message improvements
- **Test additions** - Increase coverage, add edge cases

#### **For Experienced Developers**
- **New API endpoints** - Expand functionality
- **Frontend enhancements** - UI improvements, mobile responsiveness
- **Integration examples** - Real-world usage demos

### 📚 **Non-Code Contributions**
- **Technical writing** - Tutorials, concept explanations
- **Community building** - Share project, answer questions
- **Testing** - Try features, report bugs
- **Design** - UI/UX improvements, graphics

## Development Workflow

### 1. **Create Your Branch**
```bash
git checkout -b feature/your-feature-name
# or
git checkout -b fix/issue-description
```

### 2. **Make Your Changes**
```bash
# Edit code, add tests, update documentation

# Test your changes
./test-api.sh                     # API integration tests
cd code/poc/core && npm test      # Unit tests
cd code/poc/frontend && npm test  # Frontend tests
```

### 3. **Commit with Clear Messages**
```bash
git add .
git commit -m "feat: add new governance endpoint for proposal analytics

- Add GET /governance/proposals/:id/analytics endpoint
- Include vote breakdown and participation metrics
- Add comprehensive test coverage
- Update API documentation

Fixes #123"
```

### 4. **Submit Pull Request**
```bash
git push origin feature/your-feature-name
# Create PR on GitHub with description
```

## Coding Standards

### **Commit Message Format**
```
type(scope): brief description

- Detailed explanation of changes
- Why this change was needed
- Any breaking changes

Fixes #issue_number
```

**Types:** `feat:`, `fix:`, `docs:`, `test:`, `refactor:`, `perf:`, `chore:`

### **Code Quality**
- **TypeScript** for new code
- **Clear function names** and documentation
- **Comprehensive tests** for new features
- **Error handling** for edge cases
- **Security considerations** for all inputs

### **API Design Standards**
```javascript
// Consistent response format
res.json({
  success: true,
  data: result
});

// Error responses
res.status(400).json({
  success: false,
  error: {
    code: 'VALIDATION_ERROR',
    message: 'Invalid input',
    details: { field: 'title', issue: 'Too short' }
  }
});
```

## Pull Request Process

### **Before Submitting**
- [ ] All tests pass locally (`./test-api.sh`)
- [ ] New features include tests
- [ ] Documentation updated if needed
- [ ] Code follows our standards
- [ ] No console.log statements left in code

### **PR Requirements**
1. **Clear description** of what was changed and why
2. **Reference related issues** with `Fixes #123`
3. **Include screenshots** for UI changes
4. **List breaking changes** if any
5. **Request review** from maintainers

### **Review Process**
- Maintainers will review within 2-3 days
- Address feedback promptly
- Once approved, maintainers will merge
- PRs require passing CI checks

## Testing Guidelines

### **Current Test Status: 100% Coverage ✅**
- **API Integration Tests:** 16/16 endpoints passing
- **Core Logic Tests:** 38/38 unit tests passing
- **Frontend Tests:** 4/4 component tests passing

### **Writing Tests**
```javascript
// Unit test example
test('should calculate trust score correctly', () => {
  const score = engine.calculateTrustScore('user_alice', mockData);
  expect(score).toBeCloseTo(8.6, 1);
});

// API test example
test('should create governance proposal', async () => {
  const response = await request(app)
    .post('/api/v1/governance/proposals')
    .send(validProposal);
  
  expect(response.status).toBe(200);
  expect(response.body.success).toBe(true);
});
```

### **Test Commands**
```bash
# Run all tests
./test-api.sh && cd code/poc/core && npm test && cd ../frontend && npm test

# Watch mode for development
cd code/poc/core && npm test -- --watch
```

## Getting Help

### **Resources**
- **[Getting Started Guide](docs/development/getting-started.md)** - Detailed setup instructions
- **[API Documentation](docs/api/integration-guide.md)** - Complete API reference
- **[Detailed Contributing Guide](docs/development/contributing.md)** - Comprehensive contribution opportunities

### **Community Support**
- **GitHub Issues** - [Report bugs or ask questions](https://github.com/OmeoneChain/omeonechain/issues)
- **GitHub Discussions** - [Community Q&A and ideas](https://github.com/OmeoneChain/omeonechain/discussions)
- **Good First Issues** - [Perfect for newcomers](https://github.com/OmeoneChain/omeonechain/labels/good%20first%20issue)

### **Common Questions**
- **"How do I get started?"** → Follow the 5-minute setup above
- **"What should I work on?"** → Check [Good First Issues](https://github.com/OmeoneChain/omeonechain/labels/good%20first%20issue)
- **"Tests are failing"** → See [Testing Guide](docs/development/testing.md)
- **"Need more context?"** → Read [Detailed Contributing Guide](docs/development/contributing.md)

## Detailed Contribution Guide

For comprehensive information about:
- **Phase 4 opportunities** and blockchain integration tasks
- **Contributor recognition** and token allocation
- **Specific technical requirements** for different contribution types
- **Project roadmap** and long-term vision

**👉 See our [Detailed Contributing Guide](docs/development/contributing.md)**

---

## Code of Conduct

By participating in this project, you agree to abide by our Code of Conduct. We're committed to fostering a welcoming, inclusive community where all contributors feel valued and respected.

## Architecture Overview

OmeoneChain is organized in five layers:

1. **Base Layer**: IOTA Rebased object-DAG for settlement & metadata
2. **Storage Layer**: Hybrid on-chain/off-chain model (IPFS + Aleph.im)
3. **Protocol Layer**: Core business logic (recommendations, tokens, governance)
4. **API/Adapter Layer**: Chain abstraction (RebasedAdapter, EVMAdapter, MockAdapter)
5. **Application Layer**: End-user interfaces and dApp integration

When contributing, consider which layer your changes affect and ensure proper integration.

---

**🎉 Thank you for contributing to OmeoneChain!** 

Together, we're building a platform where trust, transparency, and authentic recommendations create real value. Your contribution, no matter how small, helps create a better internet for everyone. 🚀

**Ready to start?** Try the [5-minute setup](#quick-start) and explore our [Good First Issues](https://github.com/OmeoneChain/omeonechain/labels/good%20first%20issue)!
