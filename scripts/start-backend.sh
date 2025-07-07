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
