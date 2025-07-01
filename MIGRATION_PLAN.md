# Monorepo Migration Plan

## Current State
- **Express API** in `src/` - Complete implementation with routes, controllers, services
- **Fastify API** in `packages/api/` - Minimal skeleton
- **Duplicate directories**: `apps/` and `packages/` for web/mobile
- **Mixed dependencies** in root package.json

## Migration Strategy

### Phase 1: Preserve Working Code
Since the Express API in `src/` is the working implementation with all the business logic, we'll:
1. Keep it temporarily as `packages/api-legacy/`
2. Gradually migrate features to the Fastify API
3. This allows the app to remain functional during migration

### Phase 2: Monorepo Structure
```
gis-platform/
├── packages/
│   ├── api/          # New Fastify API (target)
│   ├── api-legacy/   # Current Express API (temporary)
│   ├── web/          # React Native Web app
│   ├── mobile/       # React Native mobile app
│   └── shared/       # Shared types and utils
└── (remove apps/ directory after migration)
```

### Phase 3: Dependency Management
- Move all API dependencies to `packages/api-legacy/package.json`
- Move all web dependencies to `packages/web/package.json`
- Keep only workspace tools in root `package.json`

### Phase 4: Feature Migration
Migrate from Express to Fastify one module at a time:
1. Database connections and models
2. Authentication routes
3. File upload functionality
4. Spatial query endpoints
5. Task management
6. Notifications

### Phase 5: Cleanup
Once all features are migrated:
1. Remove `packages/api-legacy/`
2. Remove `apps/` directory
3. Update all imports and references

## Benefits of This Approach
- **Zero downtime** - App remains functional throughout
- **Incremental migration** - Test each feature as it's moved
- **Clear separation** - No mixing of Express and Fastify code
- **Rollback capability** - Can revert to legacy API if needed