#!/bin/bash
echo "Starting frontend server..."
cd code/poc/frontend
if [ -f "package.json" ] && grep -q '"start"' package.json; then
    npm start
else
    echo "No start script found in frontend package.json"
    exit 1
fi
