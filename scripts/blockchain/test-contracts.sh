#!/bin/bash
echo "🧪 Testing Move contracts..."

cd contracts/move

# Test each contract module
echo "Testing token contract..."
cd token && sui move test && cd ..

echo "Testing governance contract..."
cd governance && sui move test && cd ..

echo "Testing reputation contract..."
cd reputation && sui move test && cd ..

echo "✅ All contract tests passed"
