# Contributing to OmeoneChain

First off, thank you for considering contributing to OmeoneChain! It's people like you that will help build a more transparent, fair, and user-driven recommendation ecosystem.

Following these guidelines helps to communicate that you respect the time of the developers managing and developing this open source project. In return, they should reciprocate that respect in addressing your issue, assessing changes, and helping you finalize your pull requests.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
  - [Issues](#issues)
  - [Pull Requests](#pull-requests)
- [Development Process](#development-process)
  - [Branching Strategy](#branching-strategy)
  - [Commit Guidelines](#commit-guidelines)
- [Coding Standards](#coding-standards)
  - [Code Style](#code-style)
  - [Documentation](#documentation)
  - [Testing](#testing)
- [Review Process](#review-process)
- [Community](#community)

## Code of Conduct

This project and everyone participating in it is governed by the OmeoneChain Code of Conduct. By participating, you are expected to uphold this code. Please report unacceptable behavior to [conduct@omeonechain.org](mailto:conduct@omeonechain.org).

## Getting Started

### Issues

Issues are a great way to contribute to OmeoneChain without writing code. We use GitHub issues to track public bugs, feature requests, and tasks. If you're reporting a bug, please follow the bug report template when opening an issue. Similarly, use the feature request template for new feature ideas.

#### Good Bug Reports

- **Use a clear and descriptive title** for the issue to identify the problem
- **Describe the exact steps which reproduce the problem** in as much detail as possible
- **Provide specific examples** to demonstrate the steps
- **Describe the behavior you observed** after following the steps
- **Explain which behavior you expected to see** instead and why
- **Include screenshots or animated GIFs** if they help illustrate the issue
- **Include your environment details** (OS, browser, Node.js version, etc.)

#### Good Feature Requests

- **Use a clear and descriptive title** for the issue
- **Provide a detailed description** of the suggested enhancement
- **Explain why this enhancement would be useful** to OmeoneChain users
- **List some other applications where this enhancement exists**, if applicable
- **Specify which version of OmeoneChain you're using**
- **Specify the name and version of the OS you're using**

### Pull Requests

If you want to contribute code directly, you can do so through Pull Requests:

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes following our [commit guidelines](#commit-guidelines)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request against the `develop` branch

#### Pull Request Template

When you open a pull request, please use the provided template which asks for:

- A reference to a related issue
- A description of the changes proposed
- Any breaking changes
- Screenshots or examples (if applicable)
- Checklist of tasks completed

## Development Process

We follow a streamlined development process to ensure quality and consistency.

### Branching Strategy

We follow a modified Git Flow workflow:

- `main` - Production-ready code that has been released
- `develop` - Integration branch for features that are ready for testing
- `feature/*` - New features or enhancements (branched from and merged back into `develop`)
- `bugfix/*` - Bug fixes for issues in `develop`
- `hotfix/*` - Critical fixes for production issues (branched from `main`, merged to both `main` and `develop`)
- `release/*` - Preparation for a new production release

### Commit Guidelines

We follow the [Conventional Commits](https://www.conventionalcommits.org/) specification for commit messages:

```
<type>(<scope>): <subject>

<body>

<footer>
```

Types include:
- `feat`: A new feature
- `fix`: A bug fix
- `docs`: Documentation only changes
- `style`: Changes that do not affect the meaning of the code (white-space, formatting, etc)
- `refactor`: A code change that neither fixes a bug nor adds a feature
- `perf`: A code change that improves performance
- `test`: Adding missing or correcting existing tests
- `chore`: Changes to the build process or auxiliary tools and libraries

Example:
```
feat(recommendation): add upvote functionality

- Add API endpoint for upvoting
- Implement token reward for upvotes
- Update reputation calculation

Closes #123
```

### Pull Request Merge Strategies

OmeoneChain supports multiple merge strategies to accommodate different types of contributions. When submitting or reviewing pull requests, please follow these guidelines:

1. **Merge Commits** (default): Use for significant feature additions or changes that represent a distinct development effort. This preserves the full history of the feature branch.
   - Example: New component implementations, major feature additions

2. **Squash Merging**: Use for bug fixes, small enhancements, or pull requests with multiple small commits. This combines all changes into a single, clean commit.
   - Example: Bug fixes, documentation updates, minor enhancements

3. **Rebase Merging**: Use for changes where preserving the detailed commit history is important, but a linear project history is desired.
   - Example: Complex refactoring with multiple logical steps

When submitting your pull request, please indicate your preferred merge strategy in the description if you have a preference. Otherwise, maintainers will use their judgment based on these guidelines.

## Coding Standards

### Code Style

We use automated tools to enforce code style:

- **JavaScript/TypeScript**: ESLint and Prettier
- **Python**: Black and Flake8
- **Go**: gofmt and golint

To ensure your code meets our style requirements, run:

```bash
npm run lint
```

The CI pipeline will also check these standards automatically.

### Documentation

All code should be documented:

- **Functions/Methods**: Document parameters, return values, and behavior
- **Classes**: Document purpose, usage, and public API
- **Modules**: Document purpose and usage examples
- **API Endpoints**: Document request/response formats and status codes

We use JSDoc for JavaScript/TypeScript code:

```javascript
/**
 * Calculates the reputation score based on user activity
 * @param {string} userId - The user's unique identifier
 * @param {Object} activities - User activities to consider in calculation
 * @param {number} activities.recommendations - Number of recommendations created
 * @param {number} activities.upvotesReceived - Number of upvotes received
 * @returns {number} The calculated reputation score
 */
function calculateReputationScore(userId, activities) {
  // Implementation
}
```

### Testing

All new code should include appropriate tests:

- **Unit Tests**: For individual functions and components
- **Integration Tests**: For interactions between components
- **API Tests**: For testing API endpoints
- **End-to-End Tests**: For critical user flows

We use:
- Jest for JavaScript/TypeScript testing
- Pytest for Python testing
- Standard testing packages for other languages

Tests should be located in a `tests` or `__tests__` directory close to the code they test.

Code coverage should be maintained or improved with each pull request. Our target coverage is 80% at minimum.

## Review Process

All contributions go through a review process:

1. **Automated Checks**: CI pipeline verifies that tests pass, code meets style guidelines, and coverage thresholds are met
2. **Peer Review**: At least one team member reviews the changes for quality, correctness, and adherence to project standards
3. **Maintainer Review**: A project maintainer performs final review and merges the contribution

Reviewers will look for:
- Correct and efficient implementation
- Comprehensive test coverage
- Clear documentation
- Adherence to coding standards
- Potential security issues
- Performance implications

## Community

We encourage active participation in the OmeoneChain community through asynchronous communication channels:

- **GitHub Discussions**: Use [GitHub Discussions](https://github.com/omeonechain/omeonechain/discussions) for questions, ideas, and community interaction
- **Discord**: Join our [developer Discord server](https://discord.gg/omeonechain) for real-time chat and collaboration
- **Developer Forum**: Participate in our [developer forum](https://forum.omeonechain.org) for longer technical discussions and proposals
- **Issue Comments**: Engage directly on GitHub issues to discuss specific features or bugs

As the project grows, community members may organize additional events or communication channels. We believe in community-driven collaboration where anyone can step up to help coordinate and grow the project.

## Recognition

We believe in recognizing contributions. All contributors will be:
- Listed in our [CONTRIBUTORS.md](CONTRIBUTORS.md) file
- Eligible to receive token rewards for significant contributions (subject to governance approval)
- Considered for maintainer roles based on consistent quality contributions

Thank you for contributing to OmeoneChain and helping us build a more transparent recommendation ecosystem!
