#!/bin/bash

# OmeoneChain Development Startup Script
# Starts both API server and frontend simultaneously

echo "🚀 Starting OmeoneChain Development Environment..."

# Check if we're in the right directory
if [ ! -d "code/poc" ]; then
    echo "❌ Error: Please run this script from the omeonechain root directory"
    exit 1
fi

# Function to check if port is available
check_port() {
    local port=$1
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null ; then
        echo "⚠️  Port $port is already in use"
        return 1
    else
        return 0
    fi
}

# Function to start API server
start_api() {
    echo "🔧 Starting API Server on port 3001..."
    cd code/poc/api
    
    # Check if dependencies are installed
    if [ ! -d "node_modules" ]; then
        echo "📦 Installing API dependencies..."
        npm install
    fi
    
    # Start API server in background
    npm run dev &
    API_PID=$!
    echo "API Server PID: $API_PID"
    cd ../../..
}

# Function to start frontend
start_frontend() {
    echo "🌐 Starting Frontend on port 3000..."
    cd code/poc/frontend
    
    # Check if dependencies are installed  
    if [ ! -d "node_modules" ]; then
        echo "📦 Installing Frontend dependencies..."
        npm install
    fi
    
    # Start frontend in background
    npm run dev &
    FRONTEND_PID=$!
    echo "Frontend PID: $FRONTEND_PID"
    cd ../../..
}

# Function to cleanup processes on exit
cleanup() {
    echo ""
    echo "🛑 Shutting down development environment..."
    
    if [ ! -z "$API_PID" ]; then
        echo "Stopping API Server (PID: $API_PID)..."
        kill $API_PID 2>/dev/null
    fi
    
    if [ ! -z "$FRONTEND_PID" ]; then
        echo "Stopping Frontend (PID: $FRONTEND_PID)..."
        kill $FRONTEND_PID 2>/dev/null
    fi
    
    # Kill any remaining processes on our ports
    lsof -ti:3001 | xargs kill -9 2>/dev/null
    lsof -ti:3000 | xargs kill -9 2>/dev/null
    
    echo "✅ Cleanup complete"
    exit 0
}

# Set up signal handlers
trap cleanup SIGINT SIGTERM

# Check if ports are available
if ! check_port 3001; then
    echo "API port 3001 is busy. Kill existing process? (y/n)"
    read -r response
    if [[ "$response" =~ ^[Yy]$ ]]; then
        lsof -ti:3001 | xargs kill -9 2>/dev/null
        echo "✅ Port 3001 cleared"
    else
        echo "❌ Cannot start API server on port 3001"
        exit 1
    fi
fi

if ! check_port 3000; then
    echo "Frontend port 3000 is busy. Kill existing process? (y/n)"
    read -r response
    if [[ "$response" =~ ^[Yy]$ ]]; then
        lsof -ti:3000 | xargs kill -9 2>/dev/null
        echo "✅ Port 3000 cleared"
    else
        echo "❌ Cannot start frontend on port 3000"
        exit 1
    fi
fi

# Start services
start_api
sleep 3  # Give API server time to start

start_frontend
sleep 3  # Give frontend time to start

echo ""
echo "🎉 OmeoneChain Development Environment Started!"
echo ""
echo "📊 Services Running:"
echo "   • API Server:    http://localhost:3001"
echo "   • Frontend:      http://localhost:3000"
echo "   • Health Check:  http://localhost:3001/health"
echo ""
echo "🧪 Quick API Tests:"
echo "   curl http://localhost:3001/health"
echo "   curl http://localhost:3001/api/governance/proposals"
echo "   curl http://localhost:3001/api/users/me"
echo ""
echo "📖 Available Endpoints:"
echo "   • GET    /api/governance/proposals     - List all proposals"
echo "   • POST   /api/governance/proposals     - Create new proposal"
echo "   • POST   /api/governance/proposals/:id/vote - Vote on proposal"
echo "   • GET    /api/users/me                 - Current user data"
echo "   • GET    /api/tokens/balance/:userId   - Token balance"
echo "   • POST   /api/governance/stake         - Stake tokens"
echo "   • GET    /api/governance/staking/:userId - Staking info"
echo ""
echo "🎯 Your Trust Score Dashboard should now show LIVE data!"
echo ""
echo "Press Ctrl+C to stop both services"

# Wait for processes to finish
wait