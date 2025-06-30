#!/bin/bash

echo "🚀 Starting GIS Platform Web App..."
echo "================================"
echo ""

# Check if backend is running
if lsof -Pi :8000 -sTCP:LISTEN -t >/dev/null ; then
    echo "✅ Backend API is running on port 8000"
else
    echo "⚠️  Backend API is not running on port 8000"
    echo "   Run 'pnpm run dev' in another terminal to start it"
fi

echo ""
echo "📦 Starting webpack dev server..."
echo "   URL: http://localhost:3001"
echo "   Press Ctrl+C to stop"
echo ""

# Start webpack with better error handling
exec pnpm run web:serve