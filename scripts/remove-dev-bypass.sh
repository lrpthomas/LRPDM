#!/bin/bash
# Script to remove development bypass button for production deployment

echo "🚀 Removing development bypass button for production..."

AUTH_COMPONENT="apps/web-app/src/components/Auth/AuthComponent.tsx"

if [ ! -f "$AUTH_COMPONENT" ]; then
    echo "❌ Error: AuthComponent.tsx not found at $AUTH_COMPONENT"
    exit 1
fi

# Create backup
cp "$AUTH_COMPONENT" "$AUTH_COMPONENT.backup.$(date +%Y%m%d-%H%M%S)"
echo "📋 Backup created: $AUTH_COMPONENT.backup.$(date +%Y%m%d-%H%M%S)"

# Remove the dev bypass function
sed -i '/const handleDevBypass = () => {/,/};/d' "$AUTH_COMPONENT"

# Remove the dev bypass button JSX
sed -i '/\/\* DEV BYPASS BUTTON - REMOVE IN PRODUCTION \*\//,/})/d' "$AUTH_COMPONENT"

# Remove dev user detection
sed -i 's/const isDevUser = user\.id === '\''dev-user-123'\'';//' "$AUTH_COMPONENT"
sed -i 's/{isDevUser && '\''🚀'\''}//g' "$AUTH_COMPONENT"
sed -i 's/{isDevUser && '\''(DEV MODE)'\''}//g' "$AUTH_COMPONENT"

# Remove dev bypass styles
sed -i '/devBypassButton:/,/elevation: 3/d' "$AUTH_COMPONENT"
sed -i '/devBypassText:/,/letterSpacing: 0\.5/d' "$AUTH_COMPONENT"

# Clean up any trailing commas
sed -i 's/,\s*}/}/g' "$AUTH_COMPONENT"

echo "✅ Development bypass button removed successfully!"
echo "📝 Changes made to: $AUTH_COMPONENT"
echo "🔄 Please restart the frontend development server to see changes"
echo ""
echo "To restore the dev bypass, use the backup file:"
echo "   cp $AUTH_COMPONENT.backup.* $AUTH_COMPONENT"