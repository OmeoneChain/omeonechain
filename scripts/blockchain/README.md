# Blockchain Development Scripts

## Setup Scripts

- `compile-contracts.sh` - Compile all Move contracts
- `test-contracts.sh` - Run Move contract tests  
- `start-local-env.sh` - Start local Sui development network

## Usage

### 1. Start Local Development Environment
```bash
./scripts/blockchain/start-local-env.sh
```

### 2. Compile Contracts
```bash
./scripts/blockchain/compile-contracts.sh
```

### 3. Test Contracts
```bash
./scripts/blockchain/test-contracts.sh
```

### 4. Run Integration Tests
```bash
./scripts/testing/test-blockchain-integration.sh
```

## Development Workflow

1. Start local Sui network
2. Make changes to Move contracts
3. Compile and test contracts
4. Update TypeScript integration layer
5. Run integration tests
6. Deploy to testnet when ready

## Environment Variables

Set these in your `.env` file:

```
BLOCKCHAIN_MODE=mock|rebased
SUI_NETWORK=localnet|testnet|mainnet
SUI_PRIVATE_KEY=your_private_key
CONTRACT_PACKAGE_ID=deployed_package_id
```
