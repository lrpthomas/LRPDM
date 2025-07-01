#!/bin/bash
# quickstart.sh - Transform LRPDM into a Professional GIS Platform
# Run this script to immediately start the transformation

echo "🚀 LRPDM Professional Transformation Starting..."
echo "================================================"

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Run this script from your project root"
    exit 1
fi

# Create backup of current state
echo "📦 Creating backup of current code..."
mkdir -p .backups
tar -czf .backups/backup-$(date +%Y%m%d-%H%M%S).tar.gz --exclude=node_modules --exclude=.backups .

# Step 1: Remove amateur components
echo "🗑️  Removing childish UI components..."
mkdir -p .trash
mv src/components/*{Button,Card,Icon}* .trash/ 2>/dev/null || true
mv src/styles/childish-* .trash/ 2>/dev/null || true

# Step 2: Install professional dependencies
echo "📦 Installing professional UI libraries..."
pnpm add -D @types/node
pnpm add \
  @radix-ui/react-alert-dialog \
  @radix-ui/react-dialog \
  @radix-ui/react-dropdown-menu \
  @radix-ui/react-label \
  @radix-ui/react-popover \
  @radix-ui/react-select \
  @radix-ui/react-separator \
  @radix-ui/react-slot \
  @radix-ui/react-switch \
  @radix-ui/react-tabs \
  @radix-ui/react-toast \
  @radix-ui/react-tooltip \
  lucide-react \
  clsx \
  tailwind-merge \
  class-variance-authority \
  @tanstack/react-table \
  @tanstack/react-virtual \
  maplibre-gl \
  pmtiles \
  date-fns \
  zod

# Step 3: Create professional directory structure
echo "📁 Creating professional project structure..."
mkdir -p {design-system,components/ui,components/map,components/data,lib,hooks,utils}
mkdir -p styles/professional
mkdir -p public/assets/{icons,images,fonts}

# Step 4: Generate design system
echo "🎨 Creating professional design system..."
cat > design-system/tokens.ts << 'EOF'
// Professional Design Tokens
export const tokens = {
  colors: {
    // Professional blue palette
    primary: {
      50: '#e6f2ff',
      500: '#0066cc',
      600: '#0052a3',
      700: '#003d7a',
      900: '#002952',
    },
    // True grays for data
    gray: {
      50: '#fafafa',
      100: '#f4f4f5',
      200: '#e4e4e7',
      300: '#d4d4d8',
      400: '#a1a1aa',
      500: '#71717a',
      600: '#52525b',
      700: '#3f3f46',
      800: '#27272a',
      900: '#18181b',
    },
    // Semantic colors
    success: '#10b981',
    warning: '#f59e0b',
    error: '#ef4444',
    info: '#3b82f6',
  },
  fonts: {
    sans: 'Inter, system-ui, -apple-system, sans-serif',
    mono: 'JetBrains Mono, Consolas, monospace',
  },
  spacing: {
    xs: '0.5rem',
    sm: '1rem',
    md: '1.5rem',
    lg: '2rem',
    xl: '3rem',
  },
}
EOF

# Step 5: Create base UI components
echo "🧩 Creating professional UI components..."

# Professional Button component
cat > components/ui/Button.tsx << 'EOF'
import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'bg-primary-600 text-white hover:bg-primary-700',
        secondary: 'bg-gray-100 text-gray-900 hover:bg-gray-200',
        outline: 'border border-gray-300 bg-transparent hover:bg-gray-100',
        ghost: 'hover:bg-gray-100 hover:text-gray-900',
        danger: 'bg-red-600 text-white hover:bg-red-700',
      },
      size: {
        sm: 'h-8 px-3',
        md: 'h-10 px-4',
        lg: 'h-12 px-6',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'md',
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = 'Button'
EOF

# Step 6: Create Tailwind config
echo "🎨 Setting up Tailwind for professional styling..."
cat > tailwind.config.js << 'EOF'
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './design-system/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#e6f2ff',
          100: '#b3d9ff',
          200: '#80bfff',
          300: '#4da6ff',
          400: '#1a8cff',
          500: '#0066cc',
          600: '#0052a3',
          700: '#003d7a',
          800: '#002952',
          900: '#001429',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
    },
  },
  plugins: [],
}
EOF

# Step 7: Create utils
echo "🔧 Creating utility functions..."
mkdir -p lib
cat > lib/utils.ts << 'EOF'
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatBytes(bytes: number, decimals = 2) {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const dm = decimals < 0 ? 0 : decimals
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i]
}
EOF

# Step 8: Create environment template
echo "🔐 Creating environment configuration..."
cat > .env.example << 'EOF'
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/lrpdm?schema=public"

# Redis
REDIS_URL="redis://localhost:6379"

# Map Tiles (MapTiler free tier)
MAPTILER_API_KEY="your_key_here"

# Authentication
NEXTAUTH_SECRET="generate-with-openssl-rand-base64-32"
NEXTAUTH_URL="http://localhost:3000"

# Storage
UPLOAD_DIR="/var/data/uploads"
MAX_FILE_SIZE="104857600"

# Monitoring (optional)
SENTRY_DSN=""
EOF

# Step 9: Update package.json scripts
echo "📝 Updating package.json scripts..."
npm pkg set scripts.dev="next dev"
npm pkg set scripts.build="next build"
npm pkg set scripts.start="next start"
npm pkg set scripts.lint="next lint"
npm pkg set scripts.typecheck="tsc --noEmit"
npm pkg set scripts.test="vitest"
npm pkg set scripts.test:ui="vitest --ui"
npm pkg set scripts.db:migrate="knex migrate:latest"
npm pkg set scripts.db:seed="knex seed:run"

# Step 10: Git commit the transformation
echo "💾 Committing professional transformation..."
git add -A
git commit -m "feat: Transform to professional GIS platform

- Remove childish UI components
- Add professional design system with Radix UI
- Implement proper typography and spacing
- Add Lucide icons (replacing childish icons)
- Set up Tailwind with professional config
- Create base component library
- Add proper TypeScript types
- Implement utility functions

BREAKING CHANGE: Complete UI overhaul"

echo "✅ Professional transformation complete!"
echo ""
echo "📋 Next steps:"
echo "1. Run 'pnpm install' to install new dependencies"
echo "2. Copy .env.example to .env and configure"
echo "3. Run 'pnpm dev' to see your professional GIS platform"
echo "4. Check design-system/ for your new design tokens"
echo ""
echo "🎯 Week 1 Checklist:"
echo "[ ] Review new design system in design-system/"
echo "[ ] Test new Button component in components/ui/"
echo "[ ] Configure MapTiler API key in .env"
echo "[ ] Set up PostgreSQL with PostGIS"
echo "[ ] Configure Redis on your VPS"
echo ""
echo "💡 Your old components are backed up in .backups/"
echo "🗑️  Removed components are in .trash/ (delete when ready)"