# omeonechain

> The Personal Recommendations Network. Powered by a Decentralized DAG

OmeoneChain is an open-source platform that leverages IOTA's Rebased technology to transform word-of-mouth recommendations into a verifiable, searchable social network. OmeoneChain is a social network for personal recommendations, not another review site. Built on a high‑throughput DAG ledger, it turns every recommendation from a friend, or a friend-of-a-friend, into a verifiable on-chain event. A Trust Score replaces the blunt five-star average, while a token-reward loop pays contributors in proportion to the real impact their advice has along the social graph.

[![License: Apache 2.0](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)
![Status: In Development](https://img.shields.io/badge/Status-In%20Development-yellow)

## 🌟 Project Overview

OmeoneChain reimagines online recommendations by connecting trusted word-of-mouth directly to a social graph, making every recommendation verifiable and searchable on-chain. Unlike traditional review platforms plagued by paid placements and AI-generated content, OmeoneChain employs a Trust Score system based on your social connections, ensuring recommendations come from people you actually trust.

OmeoneChain's key features include:

- **Verifiable Social Graph**: Every recommendation is time-stamped on the IOTA Rebased DAG and ranked by personal Trust Score
- **Impact-First Rewards**: Contributors earn tokens (TOK) proportional to the actual impact their recommendations have within their social network  
- **No Pay-to-Play**: Rankings are determined by trust and quality, not advertising budgets
- **High-Performance DAG**: Near-instantaneous confirmations with micro-fees to enable real-time social interactions
- **Hybrid Storage**: On-chain metadata with off-chain content storage (IPFS/Arweave) for scalability
- **NFT Experiences**: Service providers can offer tokenized experiences and loyalty programs
- **Open dApp Ecosystem**: Developers can build specialized recommendation engines on top of the open API

### Token Economics

- Fixed supply: 10 billion TOK
- Distribution: 52% community rewards, 20% development, 16% ecosystem, 12% team
- Halving mechanism ensures long-term sustainability
- Multiple token sinks including service provider fees, NFT minting, and governance staking

## 🏗️ System Architecture

OmeoneChain is organized in five distinct layers:

| Layer | Purpose | Key Technology |
|-------|---------|----------------|
| **Base** | Settlement & metadata | IOTA Rebased object-DAG (MoveVM) with Mysticeti DPoS & fee-burn mechanism |
| **Storage** | Persistent content | Hybrid on-chain/off-chain model: IPFS + optional Aleph.im pin-service |
| **Protocol** | Core business logic | Recommendations, token rewards, reputation, governance |
| **API/Adapter** | Chain abstraction | RebasedAdapter, EVMAdapter, MockAdapter |
| **Application** | End-user & dApp UX | Web, mobile, Move-script entry points, third-party dApps |

![Architecture Diagram](./docs/images/architecture.png)
<!-- Note: This is a placeholder for future diagram -->

### Core Components

- **Recommendation Engine**: Processes submissions, handles search/retrieval, manages voting
- **Token Reward System**: Calculates and distributes rewards based on trust-weighted impact
- **Reputation System**: Assigns trust levels based on contribution quality and history
- **Hybrid Storage**: On-chain metadata with off-chain content storage

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ and pnpm
- Rust toolchain (for Move development)
- Docker (optional, for local development)
- Access to IOTA Rebased testnet

### Development Environment Setup

1. **Clone the repository**

```bash
git clone https://github.com/omeonechain/omeonechain.git
cd omeonechain
```

2. **Install dependencies**

```bash
pnpm install
```

3. **Set-up environment variables**

```bash
cp .env.example .env
# Edit .env. Local with your configuration
```

4. **Start the development environment**

```bash
pnpm dev
```
For detailed setup instructions, see docs/development-setup.md. 

## 📚 Documentation

Technical Specifications - Detailed architecture and data models
API Documentation - REST and WebSocket APIs
Smart Contract Documentation - Move contracts reference
Integration Guide - Building dApps on OmeoneChain

## 🛣️ Roadmap

Phase 1: Core Protocol Development (Q1-Q2 2025)

RebasedAdapter integration
Core data structures and validation
Basic recommendation submission/retrieval

Phase 2: MVP & Testing (Q3-Q4 2025)

Token reward system implementation
Reputation system core functionality
Web interface for testing
Private testnet deployment

Phase 3: Beta Release (Q1-Q2 2026)

Complete API implementation
Mobile app development
Security audits
Public testnet launch

Phase 4: Mainnet & Ecosystem (Q3 2026+)

Production deployment on Rebased mainnet
Developer tools and documentation
Third-party integration support
dApp ecosystem development

For full roadmap details, see ROADMAP.md.

## 📜 Code of Conduct

We are committed to providing a welcoming and inclusive environment. Please read our Code of Conduct before participating.
Key principles:

Be respectful and inclusive
Welcome newcomers and help them get started
Focus on constructive criticism
Report unacceptable behavior to the project maintainers

## 🤝 Contributing

We welcome contributions! Please see our Contributing Guidelines for details.

How to Contribute

Fork the repository
Create your feature branch (git checkout -b feature/amazing-feature)
Commit your changes (git commit -m 'Add some amazing feature')
Push to the branch (git push origin feature/amazing-feature)
Open a Pull Request

### Coding Standards

Follow the JavaScript Standard Style for JavaScript/TypeScript
Use Rust formatting conventions for Move/Rust code
Write meaningful commit messages
Include tests for new functionality
Update documentation as needed

See CODING_STANDARDS.md for detailed guidelines.

## 🧪 Testing

Running Tests

# Run all tests
pnpm test

# Run specific test suites
pnpm test:unit
pnpm test:integration
pnpm test:e2e

# Run tests with coverage
pnpm test:coverage

Test Categories

Unit Tests: Test individual functions and components
Integration Tests: Test interactions between modules
E2E Tests: Test complete user workflows
Smart Contract Tests: Test Move contracts

## 🔒 Security

Security is our top priority. If you discover a security vulnerability, please follow our Security Policy.
Reporting Security Issues

DO NOT create public GitHub issues for security vulnerabilities
Email security@omeonechain.net with:

Description of the vulnerability
Steps to reproduce
Possible impact
Suggested fix (if any)

Security Measures

Regular smart contract audits
Bug bounty program (coming soon)
Secure development practices
Encrypted communications

## 🌐 Community

Join our growing community:

Discord - For developers and community discussions
Twitter - Latest updates and announcements
Forum - Long-form discussions and proposals
Blog - Technical deep-dives and updates

Developer Resources

Developer Portal
API Reference
Example dApps
SDK Documentation
---

## 📊 Project Status

Product Status
Current Status: White Paper Published / Early Development

 White Paper (✓ Complete)
 Technical Specifications (✓ Complete)
 Core Protocol Development (In Progress)
 MVP Launch (Q3 2025)
 Beta Release (Q1 2026)
 Mainnet Launch (Q3 2026)

## 📄 License

OmeoneChain is released under the [Apache 2.0 License](./LICENSE).

Copyright 2025 OmeoneChain Contributors

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.

Join us in creating a more transparent, fair, and rewarding recommendation ecosystem!

Built with ❤️ by the OmeoneChain community

This README provides a comprehensive overview of your project while maintaining a professional and welcoming tone. It includes all the sections you requested and draws directly from your White Paper and Technical Specifications to ensure accuracy. The structure makes it easy for developers to understand the project, get started with development, and find the resources they need.
