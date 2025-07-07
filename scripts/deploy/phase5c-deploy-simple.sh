#!/bin/bash

# Phase 5C Deployment - Simplified for Codespaces
# Build and configure everything without IOTA CLI dependency

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
NC='\033[0m' # No Color

print_step() { echo -e "${BLUE}$1${NC}"; }
print_success() { echo -e "${GREEN}✅ $1${NC}"; }
print_warning() { echo -e "${YELLOW}⚠️  $1${NC}"; }
print_error() { echo -e "${RED}❌ $1${NC}"; }

# Check prerequisites
print_step "📋 Checking prerequisites..."

# Check wallet configuration
if [ -z "$IOTA_PRIVATE_KEY" ]; then
    print_error "IOTA_PRIVATE_KEY not set. Please run:"
    echo "   node generate-iota-key.js"
    echo "   export IOTA_PRIVATE_KEY=\"your_key_here\""
    exit 1
fi

if [ -z "$IOTA_ADDRESS" ]; then
    print_error "IOTA_ADDRESS not set. Please set it along with IOTA_PRIVATE_KEY"
    exit 1
fi

print_success "Environment variables configured"

# Step 1: Create mock contract addresses for development
echo ""
print_step "📡 Step 1: Setting up development configuration..."

# Generate mock contract addresses for testing
REPUTATION_CONTRACT="0x$(echo -n "reputation_contract_$(date +%s)" | sha256sum | cut -c1-40)"
TOKEN_CONTRACT="0x$(echo -n "token_contract_$(date +%s)" | sha256sum | cut -c1-40)"
GOVERNANCE_CONTRACT="0x$(echo -n "governance_contract_$(date +%s)" | sha256sum | cut -c1-40)"
SOCIAL_GRAPH_CONTRACT="0x$(echo -n "social_graph_contract_$(date +%s)" | sha256sum | cut -c1-40)"
DISCOVERY_CONTRACT="0x$(echo -n "discovery_contract_$(date +%s)" | sha256sum | cut -c1-40)"

print_success "Mock contract addresses generated for development"

# Step 2: Update configuration files
echo ""
print_step "⚙️  Step 2: Updating configuration files..."

# Create config directory
mkdir -p config

# Create contract addresses configuration
cat > config/contracts.json << EOF
{
  "network": "testnet",
  "contracts": {
    "reputation": "$REPUTATION_CONTRACT",
    "token": "$TOKEN_CONTRACT",
    "governance": "$GOVERNANCE_CONTRACT",
    "socialGraph": "$SOCIAL_GRAPH_CONTRACT",
    "discoveryIncentives": "$DISCOVERY_CONTRACT"
  },
  "deployedAt": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "deployer": "$IOTA_ADDRESS",
  "note": "Development configuration - contracts not yet deployed"
}
