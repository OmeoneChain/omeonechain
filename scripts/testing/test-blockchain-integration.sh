#!/bin/bash
echo "🧪 Running blockchain integration tests..."

cd code/poc/core

# Run blockchain-specific tests
echo "Running integration tests..."
npm test -- --testPathPattern=blockchain

echo "Running contract compilation tests..."
cd ../../../
./scripts/blockchain/compile-contracts.sh

echo "✅ All blockchain integration tests completed"
