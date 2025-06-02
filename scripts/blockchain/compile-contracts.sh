#!/bin/bash
echo "🔨 Compiling Move contracts..."

cd contracts/move

# Compile each contract module
echo "Compiling token contract..."
cd token && sui move build && cd ..

echo "Compiling governance contract..."
cd governance && sui move build && cd ..

echo "Compiling reputation contract..."
cd reputation && sui move build && cd ..

echo "✅ All contracts compiled successfully"
