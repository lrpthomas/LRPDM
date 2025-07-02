# CLAUDE.md - Shared Package Guidelines

## Package Overview

This is the shared utilities package for LRPDM, providing common types, utilities, and database connections used across all packages.

**Package Name**: `@lrpdm/shared`
**Dependencies**: Minimal, only essential shared libraries
**Consumers**: `@lrpdm/api`, `@lrpdm/web`, `@lrpdm/mobile`

## Package-Specific Commands

```bash
# From repository root:
pnpm --filter @lrpdm/shared test     # Run tests
pnpm --filter @lrpdm/shared build    # Build TypeScript
pnpm --filter @lrpdm/shared lint     # Lint code
```

## Shared Architecture

### Directory Structure
```
packages/shared/
├── src/
│   ├── types/           # TypeScript type definitions
│   ├── utils/           # Shared utility functions
│   ├── constants/       # Shared constants
│   ├── db/              # Database connection pool
│   ├── errors/          # Custom error classes
│   └── index.ts         # Main export file
└── tests/               # Test files
```

### Export Categories

1. **Types**: All TypeScript interfaces and types
2. **Utils**: Pure functions with no side effects
3. **Constants**: Configuration values and enums
4. **Database**: Connection pool and helpers
5. **Errors**: Custom error classes

### Key Principles

```typescript
// No side effects in shared code
export const calculateArea = (geometry: Geometry): number => {
  // Pure function
};

// No framework-specific code
// No React, no Fastify, no platform code

// Always export types alongside functions
export interface FeatureProperties {
  [key: string]: any;
}

export interface Feature {
  type: 'Feature';
  geometry: Geometry;
  properties: FeatureProperties;
}
```

### Database Pool

```typescript
// Singleton pattern for connection pool
let pool: Pool | null = null;

export const getPool = (): Pool => {
  if (!pool) {
    pool = new Pool(config);
  }
  return pool;
};

// Never expose raw connection
// Always use pool for queries
```

### Spatial Utilities

All spatial calculations must be:
- Framework agnostic
- Well-typed with TypeScript
- Thoroughly tested
- Documented with examples

## Testing Requirements

1. **Unit tests**: 100% coverage target
2. **Type tests**: Ensure proper exports
3. **No integration tests**: Keep it pure

## Version Management

- Follow semantic versioning strictly
- Breaking changes require major version bump
- Document all changes in CHANGELOG.md

Remember: This package is the foundation. Keep it minimal, pure, and well-typed.