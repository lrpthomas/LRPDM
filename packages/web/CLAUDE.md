# CLAUDE.md - Web Package Guidelines

## Package Overview

This is the React Native Web application package for LRPDM, providing a responsive web interface with MapLibre GL JS integration.

**Package Name**: `@lrpdm/web`
**Dependencies**: Inherits from root, references `@lrpdm/shared`
**Port**: 3000 (development), configurable via environment

## Package-Specific Commands

```bash
# From repository root:
pnpm --filter @lrpdm/web dev      # Start development server
pnpm --filter @lrpdm/web test     # Run tests
pnpm --filter @lrpdm/web build    # Build for production
pnpm --filter @lrpdm/web analyze  # Analyze bundle size
```

## Web Architecture

### Directory Structure
```
packages/web/
├── src/
│   ├── components/      # React components
│   ├── screens/         # Screen components
│   ├── hooks/           # Custom React hooks
│   ├── services/        # API client services
│   ├── stores/          # State management (RxDB)
│   ├── utils/           # Web-specific utilities
│   └── App.tsx          # Main app component
├── public/              # Static assets
├── tests/               # Test files
└── webpack.config.js    # Webpack configuration
```

### Key Patterns

1. **Component Structure**: Functional components with TypeScript
2. **State Management**: RxDB for offline-first sync
3. **Routing**: React Navigation Web
4. **Styling**: React Native Web StyleSheet
5. **Map Integration**: MapLibre GL JS with React wrapper

### Map Implementation

```typescript
// Always use the MapContainer wrapper
import { MapContainer } from '@components/MapContainer';

// Never instantiate MapLibre directly
// Use React Native Web compatible gestures
// Implement touch-friendly controls
```

### Offline Capabilities

1. **Service Worker**: Cache map tiles and API responses
2. **RxDB Sync**: Automatic conflict resolution
3. **Queue Management**: Store actions when offline
4. **Status Indicators**: Clear offline/online state

### Performance Optimizations

```typescript
// Lazy load heavy components
const MapView = lazy(() => import('./MapView'));

// Virtualize large lists
import { VirtualizedList } from 'react-native-web';

// Memoize expensive calculations
const features = useMemo(() => processFeatures(data), [data]);
```

### Mobile-First Considerations

- Touch targets minimum 44pt
- Responsive breakpoints: 320px, 768px, 1024px
- Progressive enhancement for desktop
- Gesture support for all interactions

## Testing Approach

1. **Component tests**: React Testing Library
2. **Integration tests**: Playwright for E2E
3. **Visual regression**: Percy snapshots
4. **Performance tests**: Lighthouse CI

## Accessibility Requirements

- WCAG 2.1 AA compliance
- Keyboard navigation for all features
- Screen reader announcements
- High contrast mode support

Remember: This package provides the web interface. Always prioritize mobile UX and offline functionality.