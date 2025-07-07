#!/bin/bash

echo "🚀 Phase 5C - Frontend Integration & Configuration"
echo "=================================================="

# Set script directory for relative paths
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

cd "$PROJECT_ROOT"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_step() { echo -e "${BLUE}$1${NC}"; }
print_success() { echo -e "${GREEN}✅ $1${NC}"; }
print_warning() { echo -e "${YELLOW}⚠️  $1${NC}"; }
print_error() { echo -e "${RED}❌ $1${NC}"; }

# Check prerequisites
print_step "📋 Checking prerequisites..."

if [ -z "$IOTA_PRIVATE_KEY" ]; then
    print_error "IOTA_PRIVATE_KEY not set"
    exit 1
fi

if [ -z "$IOTA_ADDRESS" ]; then
    print_error "IOTA_ADDRESS not set"
    exit 1
fi

print_success "Environment variables configured"

# Generate mock contract addresses
print_step "📡 Setting up development configuration..."

REPUTATION_CONTRACT="0x$(echo -n "reputation_$(date +%s)" | sha256sum | cut -c1-40)"
TOKEN_CONTRACT="0x$(echo -n "token_$(date +%s)" | sha256sum | cut -c1-40)"
GOVERNANCE_CONTRACT="0x$(echo -n "governance_$(date +%s)" | sha256sum | cut -c1-40)"
SOCIAL_GRAPH_CONTRACT="0x$(echo -n "social_$(date +%s)" | sha256sum | cut -c1-40)"
DISCOVERY_CONTRACT="0x$(echo -n "discovery_$(date +%s)" | sha256sum | cut -c1-40)"

print_success "Mock contract addresses generated"

# Create config directory and files
print_step "⚙️  Creating configuration files..."

mkdir -p config

# Create contracts config
cat > config/contracts.json << 'JSON_END'
{
  "network": "testnet",
  "contracts": {
    "reputation": "REPUTATION_PLACEHOLDER",
    "token": "TOKEN_PLACEHOLDER", 
    "governance": "GOVERNANCE_PLACEHOLDER",
    "socialGraph": "SOCIAL_PLACEHOLDER",
    "discoveryIncentives": "DISCOVERY_PLACEHOLDER"
  },
  "deployedAt": "TIMESTAMP_PLACEHOLDER",
  "deployer": "ADDRESS_PLACEHOLDER",
  "note": "Development configuration - contracts not yet deployed"
}
JSON_END

# Replace placeholders
sed -i "s/REPUTATION_PLACEHOLDER/$REPUTATION_CONTRACT/g" config/contracts.json
sed -i "s/TOKEN_PLACEHOLDER/$TOKEN_CONTRACT/g" config/contracts.json
sed -i "s/GOVERNANCE_PLACEHOLDER/$GOVERNANCE_CONTRACT/g" config/contracts.json
sed -i "s/SOCIAL_PLACEHOLDER/$SOCIAL_GRAPH_CONTRACT/g" config/contracts.json
sed -i "s/DISCOVERY_PLACEHOLDER/$DISCOVERY_CONTRACT/g" config/contracts.json
sed -i "s/TIMESTAMP_PLACEHOLDER/$(date -u +%Y-%m-%dT%H:%M:%SZ)/g" config/contracts.json
sed -i "s/ADDRESS_PLACEHOLDER/$IOTA_ADDRESS/g" config/contracts.json

print_success "Contract configuration created"

# Create backend .env
mkdir -p code/poc/core
cat > code/poc/core/.env.local << 'BACKEND_END'
NODE_ENV=development
REPUTATION_CONTRACT_ADDRESS=REPUTATION_PLACEHOLDER
TOKEN_CONTRACT_ADDRESS=TOKEN_PLACEHOLDER
GOVERNANCE_CONTRACT_ADDRESS=GOVERNANCE_PLACEHOLDER
SOCIAL_GRAPH_CONTRACT_ADDRESS=SOCIAL_PLACEHOLDER
DISCOVERY_INCENTIVES_CONTRACT_ADDRESS=DISCOVERY_PLACEHOLDER
IOTA_NETWORK=testnet
IOTA_RPC_URL=https://fullnode.testnet.iota.org:443
IOTA_INDEXER_URL=https://api.indexer.testnet.iotaledger.net
IOTA_PRIVATE_KEY=PRIVATE_KEY_PLACEHOLDER
IOTA_ADDRESS=ADDRESS_PLACEHOLDER
PORT=3001
DATABASE_URL=sqlite:./dev.db
BACKEND_END

# Replace backend placeholders
sed -i "s/REPUTATION_PLACEHOLDER/$REPUTATION_CONTRACT/g" code/poc/core/.env.local
sed -i "s/TOKEN_PLACEHOLDER/$TOKEN_CONTRACT/g" code/poc/core/.env.local
sed -i "s/GOVERNANCE_PLACEHOLDER/$GOVERNANCE_CONTRACT/g" code/poc/core/.env.local
sed -i "s/SOCIAL_PLACEHOLDER/$SOCIAL_GRAPH_CONTRACT/g" code/poc/core/.env.local
sed -i "s/DISCOVERY_PLACEHOLDER/$DISCOVERY_CONTRACT/g" code/poc/core/.env.local
sed -i "s/PRIVATE_KEY_PLACEHOLDER/$IOTA_PRIVATE_KEY/g" code/poc/core/.env.local
sed -i "s/ADDRESS_PLACEHOLDER/$IOTA_ADDRESS/g" code/poc/core/.env.local

print_success "Backend environment configured"

# Create frontend .env  
mkdir -p code/poc/frontend
cat > code/poc/frontend/.env.local << 'FRONTEND_END'
REACT_APP_API_BASE=http://localhost:3001/api/v1
REACT_APP_BLOCKCHAIN_NETWORK=testnet
REACT_APP_REPUTATION_CONTRACT=REPUTATION_PLACEHOLDER
REACT_APP_TOKEN_CONTRACT=TOKEN_PLACEHOLDER
REACT_APP_GOVERNANCE_CONTRACT=GOVERNANCE_PLACEHOLDER
REACT_APP_SOCIAL_GRAPH_CONTRACT=SOCIAL_PLACEHOLDER
REACT_APP_DISCOVERY_CONTRACT=DISCOVERY_PLACEHOLDER
REACT_APP_IOTA_NETWORK=testnet
REACT_APP_IOTA_RPC_URL=https://fullnode.testnet.iota.org:443
FRONTEND_END

# Replace frontend placeholders
sed -i "s/REPUTATION_PLACEHOLDER/$REPUTATION_CONTRACT/g" code/poc/frontend/.env.local
sed -i "s/TOKEN_PLACEHOLDER/$TOKEN_CONTRACT/g" code/poc/frontend/.env.local
sed -i "s/GOVERNANCE_PLACEHOLDER/$GOVERNANCE_CONTRACT/g" code/poc/frontend/.env.local
sed -i "s/SOCIAL_PLACEHOLDER/$SOCIAL_GRAPH_CONTRACT/g" code/poc/frontend/.env.local
sed -i "s/DISCOVERY_PLACEHOLDER/$DISCOVERY_CONTRACT/g" code/poc/frontend/.env.local

print_success "Frontend environment configured"

# Skip the build steps that are causing TypeScript errors for now
print_step "🔧 Skipping builds due to TypeScript errors (will fix separately)..."
print_warning "TypeScript compilation errors detected - focusing on configuration first"

# Create helper scripts
print_step "🛠️  Creating development scripts..."

cat > scripts/start-backend.sh << 'BACKEND_SCRIPT'
#!/bin/bash
echo "Starting backend server..."
cd code/poc/core
if [ -f "package.json" ] && grep -q '"dev"' package.json; then
    npm run dev
elif [ -f "package.json" ] && grep -q '"start"' package.json; then
    npm start
else
    echo "No start script found. Please check package.json"
    exit 1
fi
BACKEND_SCRIPT

cat > scripts/start-frontend.sh << 'FRONTEND_SCRIPT'
#!/bin/bash
echo "Starting frontend server..."
cd code/poc/frontend
if [ -f "package.json" ] && grep -q '"start"' package.json; then
    npm start
else
    echo "No start script found in frontend package.json"
    exit 1
fi
FRONTEND_SCRIPT

cat > scripts/health-check.sh << 'HEALTH_SCRIPT'
#!/bin/bash
echo "🏥 OmeoneChain Health Check"
echo "=========================="

echo "Checking configuration..."
if [ -f "config/contracts.json" ]; then
    echo "✅ Configuration: FOUND"
else
    echo "❌ Configuration: NOT FOUND"
fi

if [ -n "$IOTA_PRIVATE_KEY" ]; then
    echo "✅ IOTA_PRIVATE_KEY: SET"
else
    echo "❌ IOTA_PRIVATE_KEY: NOT SET"
fi

echo "Checking backend API..."
curl -s http://localhost:3001/api/v1/health > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo "✅ Backend API: OK"
else
    echo "❌ Backend API: FAILED (may not be running)"
fi

echo "Checking frontend..."
curl -s http://localhost:3000 > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo "✅ Frontend: OK"  
else
    echo "❌ Frontend: FAILED (may not be running)"
fi
HEALTH_SCRIPT

chmod +x scripts/start-backend.sh scripts/start-frontend.sh scripts/health-check.sh

print_success "Development scripts created"

echo ""
echo "🎉 Phase 5C Configuration Complete!"
echo "==================================="
echo ""
echo "📊 Development Setup:"
echo "   • Mock contracts configured for testing"
echo "   • Environment variables set for both frontend and backend"
echo "   • Development scripts created"
echo ""
echo "📁 Generated Files:"
echo "   • config/contracts.json"
echo "   • code/poc/core/.env.local"
echo "   • code/poc/frontend/.env.local"
echo "   • scripts/start-backend.sh"
echo "   • scripts/start-frontend.sh"
echo "   • scripts/health-check.sh"
echo ""
echo "🚀 Next Steps:"
echo "   1. Fix TypeScript errors: we'll do this next"
echo "   2. Start backend: ./scripts/start-backend.sh"
echo "   3. Start frontend: ./scripts/start-frontend.sh"
echo "   4. Run health check: ./scripts/health-check.sh"
echo ""
echo "💡 Note: Using mock contract addresses for development"
echo "🎯 Configuration Complete - TypeScript fixes needed next!"

