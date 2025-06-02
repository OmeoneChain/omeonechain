#!/bin/bash
echo "🏃 Starting local Sui development environment..."

# Check if sui is installed
if ! command -v sui &> /dev/null; then
    echo "❌ Sui CLI not found. Please install it first."
    exit 1
fi

# Start local Sui network
echo "Starting local Sui network..."
sui start --with-faucet --force-regenesis

echo "✅ Local Sui network started"
echo "📋 Network info:"
echo "  - RPC URL: http://127.0.0.1:9000"
echo "  - Faucet URL: http://127.0.0.1:9123/gas"
echo "  - Explorer: http://127.0.0.1:9001"
