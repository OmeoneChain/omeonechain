# OmeoneChain Move Contracts

This directory contains the Move smart contracts for the OmeoneChain platform, which run on the IOTA Rebased blockchain.

## Overview

OmeoneChain Move contracts implement the core on-chain functionality for the personal recommendations network, including:

- Recommendation storage and verification
- Token operations and reward distribution
- Reputation and Trust Score calculation
- Governance mechanisms

## Modules

The contracts are organized into the following modules:

- **recommendation**: Core recommendation functionality and trust scoring
- **token**: Implementation of the TOK token, including halving and reward mechanisms
- **reputation**: User reputation tracking and social graph relationships
- **governance**: Proposal creation, voting and parameter management
- **shared**: Common utilities and types used across modules

## Development

### Prerequisites

- Move compiler compatible with IOTA Rebased
- IOTA Rebased CLI tools
- Move analyzer and testing tools

### Building

To build all modules:

```bash
cd contracts/move
find . -name "Move.toml" -exec dirname {} \; | xargs -I{} sh -c "cd {} && move build"
```

### Testing

Run tests for all modules:

```bash
cd contracts/move
find . -name "Move.toml" -exec dirname {} \; | xargs -I{} sh -c "cd {} && move test"
```

## Deployment

Deployment scripts are located in the `scripts` directory. To deploy to the IOTA Rebased testnet:

```bash
cd scripts
./deploy_testnet.sh
```

## Security

These contracts have been audited for security issues. Audit reports can be found in the `docs/audits` directory.

## Contingency Plan

In accordance with the OmeoneChain white paper, these contracts have been designed to allow for a fallback migration to EVM chains if necessary. The migration procedure is documented in `docs/migration.md`.
