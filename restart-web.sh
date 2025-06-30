#!/bin/bash

echo "🔄 Restarting Web App..."

# Kill any existing webpack processes on port 3001
lsof -ti:3001 | xargs kill -9 2>/dev/null

# Start the web app
echo "🚀 Starting web app on http://localhost:3001"
pnpm run web:serve