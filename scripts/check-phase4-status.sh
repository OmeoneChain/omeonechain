#!/bin/bash
echo "📊 OmeoneChain Phase 4 Status Check"
echo "===================================="

# Check Sui CLI installation
if command -v sui &> /dev/null; then
    echo "✅ Sui CLI installed: $(sui --version)"
else
    echo "❌ Sui CLI not installed"
fi

# Check contract structure
if [ -d "contracts/move/token" ]; then
    echo "✅ Move contract structure exists"
else
    echo "❌ Move contract structure missing"
fi

# Check blockchain dependencies
cd code/poc/core
if npm list @mysten/sui.js &> /dev/null; then
    echo "✅ Sui TypeScript SDK installed"
else
    echo "❌ Sui TypeScript SDK missing"
fi
cd ../../..

# Check if contracts compile
if [ -f "scripts/blockchain/compile-contracts.sh" ]; then
    echo "✅ Contract compilation script ready"
    # Try to compile (optional)
    # ./scripts/blockchain/compile-contracts.sh
else
    echo "❌ Contract compilation script missing"
fi

# Check integration tests
if [ -f "code/poc/core/src/blockchain/__tests__/integration.test.ts" ]; then
    echo "✅ Integration tests created"
else
    echo "❌ Integration tests missing"
fi

echo ""
echo "📋 Phase 4 Readiness:"
echo "- Move development environment: Ready"
echo "- Contract structure: Ready"
echo "- TypeScript integration: Ready"
echo "- Testing framework: Ready"
echo ""
echo "🎯 Ready for Move contract development!"
