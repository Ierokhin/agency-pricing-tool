#!/bin/bash
echo "Starting Brandon Archibald Pricing Tool..."
echo ""
echo "Backend: http://localhost:3001"
echo ""
cd "$(dirname "$0")/backend"
node server.js
