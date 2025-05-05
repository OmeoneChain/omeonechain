# Contributing to OmeoneChain

Thank you for your interest in contributing to OmeoneChain! This document provides guidelines and instructions for contributing to our project.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Coding Standards](#coding-standards)
- [Submitting Changes](#submitting-changes)
- [Pull Request Process](#pull-request-process)
- [Testing Guidelines](#testing-guidelines)
- [Documentation](#documentation)
- [Community](#community)

## Code of Conduct

By participating in this project, you agree to abide by our [Code of Conduct](CODE_OF_CONDUCT.md). Please read it before contributing.

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm
- Rust toolchain (for Move development)
- Docker (optional, for local development)
- Access to IOTA Rebased testnet (for blockchain integration)

### Setting Up Your Development Environment

1. Fork the repository on GitHub
2. Clone your fork locally:
   ```bash
   git clone https://github.com/YOUR_USERNAME/omeonechain.git
   cd omeonechain
   ```
3. Add the original repository as a remote:
   ```bash
   git remote add upstream https://github.com/ORIGINAL_OWNER/omeonechain.git
   ```
4. Install dependencies:
   ```bash
   pnpm install
   ```
5. Set up environment variables:
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your configuration
   ```
6. Start the development server:
   ```bash
   pnpm dev
   ```

## Development Workflow

We use a simplified Git workflow:

1. Create a new branch for your feature or bugfix:
   ```bash
   git checkout -b feature/your-feature-name
   ```
   or
   ```bash
   git checkout -b fix/issue-description
   ```

2. Make your changes, following our coding standards

3. Commit your changes with clear, descriptive messages:
   ```bash
   git commit -m "Add feature: detailed description of what was added"
   ```

4. Push your branch to your fork:
   ```bash
   git push origin feature/your-feature-name
   ```

5. Create a Pull Request against the `main` branch of the original repository

## Coding Standards

### General Guidelines

- Write clean, readable, and maintainable code
- Follow existing patterns and conventions
- Include appropriate comments and documentation
- Keep functions small and focused
- Use meaningful variable and function names
- Ensure proper error handling

### Language-Specific Standards

#### JavaScript/TypeScript
- Follow the [JavaScript Standard Style](https://standardjs.com/)
- Use TypeScript for all new code
- Use async/await instead of Promises where possible
- Use ES6+ features

#### Move/Rust
- Follow [Rust formatting conventions](https://doc.rust-lang.org/beta/style-guide/)
- Document all public functions with appropriate comments
- Follow Move best practices for memory safety and resource handling

### Commit Messages

- Use the present tense ("Add feature" not "Added feature")
- Use the imperative mood ("Move cursor to..." not "Moves cursor to...")
- Reference issues and pull requests where appropriate
- Keep first line under 72 characters
- Describe what was changed and why

## Submitting Changes

### Before Submitting

- Make sure your code builds without errors or warnings
- Run the test suite and ensure all tests pass
- Update documentation if necessary
- Add tests for new functionality
- Ensure your code adheres to our coding standards

### Pull Request Process

1. Create a pull request (PR) from your branch to the main repository's `main` branch
2. Fill out the PR template with all required information
3. Request review from maintainers
4. Address any feedback from code reviews
5. Once approved, a maintainer will merge your changes

## Testing Guidelines

### Writing Tests

- All new features should include tests
- Update existing tests when modifying features
- Write unit tests for individual functions
- Write integration tests for interactions between components
- End-to-end tests for user workflows are appreciated

### Running Tests

```bash
# Run all tests
pnpm test

# Run specific test suites
pnpm test:unit
pnpm test:integration

# Run tests with coverage
pnpm test:coverage
```

## Documentation

### Code Documentation

- Document all public APIs, classes, and functions
- Use JSDoc, TSDoc, or Rustdoc as appropriate
- Explain the purpose, parameters, and return values

### Project Documentation

- Update README.md with new features or changes in usage
- Add examples for significant new functionality
- Update API documentation when endpoints change
- Maintain comprehensive documentation in the `/docs` directory

## Community

We're building a community around OmeoneChain and appreciate all forms of contribution:

- Answer questions in issues
- Review pull requests
- Improve documentation
- Share your experiences using the project
- Spread the word about OmeoneChain

## Architecture Overview

OmeoneChain is organized in five distinct layers:

1. **Base Layer**: IOTA Rebased object-DAG (MoveVM) with Mysticeti DPoS
2. **Storage Layer**: Hybrid on-chain/off-chain model (IPFS + Aleph.im)
3. **Protocol Layer**: Core business logic for recommendations, rewards, and reputation
4. **API/Adapter Layer**: Chain abstraction (RebasedAdapter, EVMAdapter, MockAdapter)
5. **Application Layer**: End-user interfaces and dApp integration points

When contributing, please consider which layer your changes affect and ensure they integrate properly with adjacent layers.

---

Thank you for contributing to OmeoneChain! Your efforts help us build a more transparent, fair recommendation ecosystem.

