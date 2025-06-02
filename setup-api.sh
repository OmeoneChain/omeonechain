#!/bin/bash

# API Server Setup Script for OmeoneChain
# This script sets up the API server to connect your React frontend to the core backend engines

echo "🚀 Setting up OmeoneChain API Server..."

# Check if we're in the right directory
if [ ! -d "code/poc" ]; then
    echo "❌ Error: Please run this script from the omeonechain root directory"
    exit 1
fi

# Create API directory structure
echo "📁 Creating API directory structure..."
mkdir -p code/poc/api
cd code/poc/api

# Initialize package.json if it doesn't exist
if [ ! -f "package.json" ]; then
    echo "📦 Initializing package.json..."
    cat > package.json << 'EOF'
{
  "name": "omeonechain-api",
  "version": "1.0.0",
  "description": "OmeoneChain API Server - Connects frontend to core governance and trust systems",
  "main": "dist/server.js",
  "scripts": {
    "dev": "tsx watch server.ts",
    "build": "tsc",
    "start": "node dist/server.js",
    "test": "jest",
    "test:watch": "jest --watch",
    "lint": "eslint . --ext .ts",
    "clean": "rm -rf dist"
  },
  "dependencies": {
    "express": "^4.18.2",
    "cors": "^2.8.5",
    "helmet": "^7.0.0",
    "express-rate-limit": "^6.10.0",
    "dotenv": "^16.3.1",
    "ws": "^8.14.2"
  },
  "devDependencies": {
    "@types/express": "^4.17.17",
    "@types/cors": "^2.8.13",
    "@types/ws": "^8.5.5",
    "@types/node": "^20.5.0",
    "typescript": "^5.1.6",
    "tsx": "^3.12.7",
    "jest": "^29.6.2",
    "@types/jest": "^29.5.4",
    "ts-jest": "^29.1.1",
    "eslint": "^8.47.0",
    "@typescript-eslint/eslint-plugin": "^6.4.0",
    "@typescript-eslint/parser": "^6.4.0"
  },
  "keywords": [
    "blockchain",
    "governance",
    "trust-score",
    "recommendations",
    "decentralized",
    "api"
  ],
  "author": "OmeoneChain Team",
  "license": "Apache-2.0"
}
EOF
fi

# Install dependencies
echo "📦 Installing API dependencies..."
npm install

# Create TypeScript configuration
if [ ! -f "tsconfig.json" ]; then
    echo "⚙️ Creating TypeScript configuration..."
    cat > tsconfig.json << 'EOF'
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  },
  "include": ["src/**/*", "*.ts"],
  "exclude": ["node_modules", "dist", "**/*.test.ts"]
}
EOF
fi

# Create environment file
if [ ! -f ".env" ]; then
    echo "🔧 Creating environment configuration..."
    cat > .env << 'EOF'
# API Server Configuration
PORT=3001
NODE_ENV=development

# CORS Configuration
CORS_ORIGIN=http://localhost:3000,http://localhost:5173

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Database (if needed later)
# DATABASE_URL=

# Logging
LOG_LEVEL=info
EOF
fi

# Set up frontend API service directory
echo "🌐 Setting up frontend API integration..."
cd ../frontend

# Create services directory if it doesn't exist
mkdir -p src/services
mkdir -p src/hooks

# Update frontend package.json to include API URL
echo "📱 Configuring frontend for API integration..."

# Create or update .env file in frontend
if [ ! -f ".env" ]; then
    cat > .env << 'EOF'
# Frontend Configuration
REACT_APP_API_URL=http://localhost:3001/api/v1
REACT_APP_WS_URL=ws://localhost:3001
REACT_APP_ENV=development
EOF
fi

# Go back to root directory
cd ../../..

echo "✅ API Server setup complete!"
echo ""
echo "🎯 Next Steps:"
echo "1. Start the API server:"
echo "   cd code/poc/api && npm run dev"
echo ""
echo "2. Start the frontend:"
echo "   cd code/poc/frontend && npm run dev"
echo ""
echo "3. Your API will be running on: http://localhost:3001"
echo "4. Your frontend will be running on: http://localhost:3000"
echo ""
echo "🔗 API Endpoints Available:"
echo "   • GET  /health - Health check"
echo "   • GET  /api/v1/governance/proposals - List proposals"
echo "   • POST /api/v1/governance/proposals - Create proposal"
echo "   • POST /api/v1/governance/proposals/:id/vote - Vote on proposal"
echo "   • GET  /api/v1/users/me - Current user info"
echo "   • GET  /api/v1/tokens/balance/:userId - Token balance"
echo "   • POST /api/v1/governance/stake - Stake tokens"
echo ""
echo "🧪 Test the API:"
echo "   curl http://localhost:3001/health"
echo ""
echo "Ready to connect your sophisticated governance system to the frontend! 🚀"
echo ""
echo "🚀 Phase 4: Blockchain Integration"
echo "=================================="

# Install blockchain dependencies
cd code/poc/core
npm install --save @mysten/sui.js @mysten/bcs @noble/hashes @noble/secp256k1
cd ../../..

# Make blockchain scripts executable
chmod +x scripts/blockchain/*.sh
chmod +x scripts/testing/*.sh

echo "✅ Blockchain integration setup complete"
echo ""
echo "📋 Next steps:"
echo "1. Run: ./scripts/blockchain/start-local-env.sh"
echo "2. Run: ./scripts/blockchain/compile-contracts.sh" 
echo "3. Run: ./scripts/testing/test-blockchain-integration.sh"
echo ""
