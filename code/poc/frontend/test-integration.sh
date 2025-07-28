# File path: /code/poc/frontend/test-integration.sh

#!/bin/bash

echo "🚀 OmeoneChain Integration Testing Script"
echo "========================================"

# 1. Navigate to frontend directory
cd /workspaces/omeonechain/code/poc/frontend || { echo "❌ Frontend directory not found"; exit 1; }

echo "📁 Current directory: $(pwd)"

# 2. Install dependencies if needed
echo "📦 Checking dependencies..."
if [ ! -d "node_modules" ]; then
    echo "📥 Installing dependencies..."
    npm install
else
    echo "✅ Dependencies already installed"
fi

# 3. Check environment variables
echo "🔧 Checking environment configuration..."
if [ -f ".env.local" ]; then
    echo "✅ .env.local found"
    echo "📋 Environment variables:"
    grep -E "REACT_APP_(IOTA|API)" .env.local | sed 's/=.*/=***/' || echo "⚠️  No IOTA/API variables found"
else
    echo "⚠️  .env.local not found - creating basic configuration..."
    cat > .env.local << EOF
# IOTA Rebased Configuration
REACT_APP_IOTA_NETWORK=testnet
REACT_APP_IOTA_RPC_URL=https://fullnode.testnet.iota.org:443

# API Configuration  
REACT_APP_API_URL=http://localhost:3001/api/v1
REACT_APP_WS_URL=ws://localhost:3001
REACT_APP_ENV=development
EOF
    echo "✅ Created .env.local with default configuration"
fi

# 4. Test TypeScript compilation
echo "🔍 Testing TypeScript compilation..."
npx tsc --noEmit --skipLibCheck
if [ $? -eq 0 ]; then
    echo "✅ TypeScript compilation successful"
else
    echo "❌ TypeScript compilation failed - check for type errors"
    exit 1
fi

# 5. Test IOTA connection
echo "🌐 Testing IOTA Rebased testnet connection..."
curl -s -X POST https://fullnode.testnet.iota.org:443 \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"sui_getLatestCheckpointSequenceNumber","params":[]}' \
  --max-time 10 > /tmp/iota_test.json

if [ $? -eq 0 ] && grep -q "result" /tmp/iota_test.json; then
    echo "✅ IOTA Rebased testnet connection successful"
    echo "📊 Latest checkpoint: $(cat /tmp/iota_test.json | grep -o '"result":"[^"]*"' | cut -d'"' -f4)"
else
    echo "⚠️  IOTA Rebased testnet connection failed or slow"
    echo "   This is expected during development - will use mock data"
fi

# 6. Start development server
echo "🚀 Starting development server..."
echo "   Dashboard will be available at: http://localhost:3000"
echo "   Press Ctrl+C to stop the server"
echo ""
echo "🔍 Watch for:"
echo "   - IOTA connection status in browser console"
echo "   - Trust score calculations in Network tab"
echo "   - Mock data fallback if testnet unavailable"
echo ""

# Start the dev server
npm run dev