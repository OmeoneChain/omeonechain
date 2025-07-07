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
