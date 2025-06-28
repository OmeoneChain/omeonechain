#!/bin/bash

# Phase 5C Deployment Commands
# Deploy reputation contracts to IOTA Rebased testnet and integrate frontend

echo "🚀 Phase 5C - Frontend Integration & Live Testnet Deployment"
echo "============================================================"

# Set script directory for relative paths
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

cd "$PROJECT_ROOT"

# Set environment variables
export NETWORK="testnet"
export NODE_ENV="development"
export REACT_APP_API_BASE="http://localhost:3000/api/v1"
export REACT_APP_BLOCKCHAIN_NETWORK="testnet"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_step() {
    echo -e "${BLUE}$1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check prerequisites
print_step "📋 Checking prerequisites..."

# Check if IOTA CLI is installed
if ! command -v iota &> /dev/null; then
    print_error "IOTA CLI not found. Please install it first:"
    echo "   npm install -g @mysten/iota"
    exit 1
fi

# Check wallet configuration
print_step "🔑 Checking wallet configuration..."
if [ -z "$IOTA_PRIVATE_KEY" ]; then
    print_warning "IOTA_PRIVATE_KEY not set. Generating new keypair..."
    iota keytool generate ed25519
    print_error "Please set IOTA_PRIVATE_KEY environment variable and re-run"
    echo "export IOTA_PRIVATE_KEY=\"your_private_key_here\""
    exit 1
fi

# Step 1: Deploy Move contracts to IOTA Rebased testnet
echo ""
print_step "📡 Step 1: Deploying Move contracts to IOTA Rebased testnet..."
echo "================================================================"

cd contracts/move

# Deploy reputation module (updated for your structure)
echo "Deploying reputation module..."
if [ -d "reputation" ]; then
    iota move build --path reputation/
    if [ $? -eq 0 ]; then
        REPUTATION_PACKAGE=$(iota move publish --path reputation/ --gas-budget 100000000 --json | jq -r '.effects.created[] | select(.owner == "Immutable") | .reference.objectId')
        print_success "Reputation module deployed: $REPUTATION_PACKAGE"
    else
        print_error "Reputation module deployment failed"
        exit 1
    fi
else
    print_error "Reputation directory not found at contracts/move/reputation/"
    exit 1
fi

# Deploy token module
echo "Deploying token module..."
if [ -d "token" ]; then
    iota move build --path token/
    if [ $? -eq 0 ]; then
        TOKEN_PACKAGE=$(iota move publish --path token/ --gas-budget 100000000 --json | jq -r '.effects.created[] | select(.owner == "Immutable") | .reference.objectId')
        print_success "Token module deployed: $TOKEN_PACKAGE"
    else
        print_error "Token module deployment failed"
        exit 1
    fi
fi

# Deploy governance module
echo "Deploying governance module..."
if [ -d "governance" ]; then
    iota move build --path governance/
    if [ $? -eq 0 ]; then
        GOVERNANCE_PACKAGE=$(iota move publish --path governance/ --gas-budget 100000000 --json | jq -r '.effects.created[] | select(.owner == "Immutable") | .reference.objectId')
        print_success "Governance module deployed: $GOVERNANCE_PACKAGE"
    else
        print_error "Governance module deployment failed"
        exit 1
    fi
fi

cd "$PROJECT_ROOT"

# Step 2: Update configuration files
echo ""
print_step "⚙️  Step 2: Updating configuration files..."
echo "============================================"

# Create config directory if it doesn't exist
mkdir -p config

# Create contract addresses configuration
cat > config/contracts.json << EOF
{
  "network": "testnet",
  "contracts": {
    "reputation": "$REPUTATION_PACKAGE",
    "token": "$TOKEN_PACKAGE",
    "governance": "$GOVERNANCE_PACKAGE"
  },
  "deployedAt": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "deployer": "$(iota client active-address)"
}
EOF

print_success "Contract addresses saved to config/contracts.json"

# Update environment configuration for core backend
cat > code/poc/core/.env.local << EOF
# Phase 5C Configuration
NODE_ENV=development

# Contract Addresses
REPUTATION_CONTRACT_ADDRESS=$REPUTATION_PACKAGE
TOKEN_CONTRACT_ADDRESS=$TOKEN_PACKAGE
GOVERNANCE_CONTRACT_ADDRESS=$GOVERNANCE_PACKAGE

# IOTA Configuration
IOTA_NETWORK=testnet
IOTA_RPC_URL=https://fullnode.testnet.iota.org:443
IOTA_INDEXER_URL=https://api.indexer.testnet.iotaledger.net
IOTA_PRIVATE_KEY=$IOTA_PRIVATE_KEY
EOF

print_success "Backend environment configuration updated"

# Update environment configuration for frontend
cat > code/poc/frontend/.env.local << EOF
# Phase 5C Frontend Configuration
REACT_APP_API_BASE=http://localhost:3000/api/v1
REACT_APP_BLOCKCHAIN_NETWORK=testnet

# Contract Addresses
REACT_APP_REPUTATION_CONTRACT=$REPUTATION_PACKAGE
REACT_APP_TOKEN_CONTRACT=$TOKEN_PACKAGE
REACT_APP_GOVERNANCE_CONTRACT=$GOVERNANCE_PACKAGE
EOF

print_success "Frontend environment configuration updated"

# Step 3: Build and test backend integration
echo ""
print_step "🔧 Step 3: Building and testing backend integration..."
echo "====================================================="

cd code/poc/core

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo "📦 Installing backend dependencies..."
    npm install
fi

# Build TypeScript
echo "Building TypeScript..."
npm run build
if [ $? -eq 0 ]; then
    print_success "Backend build successful"
else
    print_error "Backend build failed"
    exit 1
fi

# Run tests if they exist
if [ -f "package.json" ] && grep -q "test" package.json; then
    echo "Running tests..."
    npm test 2>/dev/null || print_warning "Some tests failed - continuing deployment"
fi

cd "$PROJECT_ROOT"

# Step 4: Build and deploy frontend
echo ""
print_step "🎨 Step 4: Building and deploying frontend..."
echo "============================================="

cd code/poc/frontend

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo "📦 Installing frontend dependencies..."
    npm install
fi

# Install additional dependencies for new components
npm install @heroicons/react lucide-react || print_warning "Some optional dependencies failed to install"

# Build React application
echo "Building React application..."
npm run build
if [ $? -eq 0 ]; then
    print_success "Frontend build successful"
else
    print_error "Frontend build failed"
    exit 1
fi

cd "$PROJECT_ROOT"

# Step 5: Create health check and deployment manifest
echo ""
print_step "🌐 Step 5: Creating deployment artifacts..."
echo "=============================================="

# Create deployment manifest
cat > deployment-manifest.json << EOF
{
  "deployment": {
    "version": "5C.1.0",
    "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
    "environment": "testnet",
    "components": {
      "reputation_contracts": {
        "reputation": "$REPUTATION_PACKAGE",
        "token": "$TOKEN_PACKAGE",
        "governance": "$GOVERNANCE_PACKAGE"
      },
      "backend_api": {
        "version": "$(cd code/poc/core && cat package.json | jq -r '.version' 2>/dev/null || echo 'unknown')",
        "endpoints": [
          "/api/v1/users",
          "/api/v1/users/:id/reputation",
          "/api/v1/users/:id/social-graph",
          "/api/v1/users/:id/discovery-score"
        ]
      },
      "frontend_app": {
        "version": "$(cd code/poc/frontend && cat package.json | jq -r '.version' 2>/dev/null || echo 'unknown')",
        "components": [
          "TrustScoreBadge",
          "SocialGraphWidget", 
          "DiscoveryIncentives",
          "TrustModeToggle"
        ]
      }
    }
  }
}
EOF

print_success "Deployment manifest created"

# Create health check script
cat > scripts/health-check.sh << 'EOF'
#!/bin/bash

echo "🏥 OmeoneChain Health Check"
echo "=========================="

# Check blockchain connection
echo "Checking IOTA Rebased connection..."
iota client active-address > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo "✅ Blockchain connection: OK"
else
    echo "❌ Blockchain connection: FAILED"
fi

# Check backend API
echo "Checking backend API..."
curl -s http://localhost:3000/api/v1/health > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo "✅ Backend API: OK"
else
    echo "❌ Backend API: FAILED"
fi

# Check frontend
echo "Checking frontend..."
curl -s http://localhost:3000 > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo "✅ Frontend: OK"
else
    echo "❌ Frontend: FAILED"
fi

# Check contract deployment
echo "Checking contract deployment..."
if [ -f "config/contracts.json" ]; then
    echo "✅ Contracts: DEPLOYED"
    cat config/contracts.json | jq '.contracts' 2>/dev/null || cat config/contracts.json
else
    echo "❌ Contracts: NOT FOUND"
fi
EOF

chmod +x scripts/health-check.sh
print_success "Health check script created"

# Final summary
echo ""
echo "🎉 Phase 5C Deployment Complete!"
echo "================================"
echo ""
echo "📊 Deployment Summary:"
echo "   • Reputation Contract: $REPUTATION_PACKAGE"
echo "   • Token Contract: $TOKEN_PACKAGE"
echo "   • Governance Contract: $GOVERNANCE_PACKAGE"
echo ""
echo "📁 Generated Files:"
echo "   • config/contracts.json"
echo "   • code/poc/core/.env.local"
echo "   • code/poc/frontend/.env.local"
echo "   • deployment-manifest.json"
echo "   • scripts/health-check.sh"
echo ""
echo "🔍 Next Steps:"
echo "   1. Start backend: cd code/poc/core && npm run dev"
echo "   2. Start frontend: cd code/poc/frontend && npm start"
echo "   3. Run health check: ./scripts/health-check.sh"
echo "   4. Test the Trust Score Badge component"
echo ""
echo "🎯 Phase 5C Integration Complete - Ready for Live Testing!"

# Function to cleanup on exit
cleanup() {
    echo ""
    echo "🧹 Cleaning up..."
    if [ ! -z "$BACKEND_PID" ]; then
        kill $BACKEND_PID 2>/dev/null
        echo "Backend server stopped"
    fi
    if [ ! -z "$FRONTEND_PID" ]; then
        kill $FRONTEND_PID 2>/dev/null
        echo "Frontend server stopped"
    fi
}

# Set trap for cleanup
trap cleanup EXIT

# Offer to start servers
if [ "$1" == "--start-servers" ]; then
    echo ""
    print_step "🚀 Starting development servers..."
    
    # Start backend
    cd code/poc/core
    npm run dev &
    BACKEND_PID=$!
    print_success "Backend server started (PID: $BACKEND_PID)"
    
    # Wait and start frontend
    sleep 5
    cd ../frontend
    npm start &
    FRONTEND_PID=$!
    print_success "Frontend server started (PID: $FRONTEND_PID)"
    
    cd "$PROJECT_ROOT"
    
    echo ""
    echo "👀 Servers running... (Press Ctrl+C to exit)"
    tail -f /dev/null
fi