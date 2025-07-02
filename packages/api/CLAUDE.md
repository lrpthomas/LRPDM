# CLAUDE.md - API Package Guidelines

## Package Overview

This is the Fastify-based API package for LRPDM, providing RESTful endpoints with PostGIS integration for spatial data operations.

**Package Name**: `@lrpdm/api`
**Dependencies**: Inherits from root, references `@lrpdm/shared`
**Port**: 3001 (development), configurable via environment

## Package-Specific Commands

```bash
# From repository root:
pnpm --filter @lrpdm/api dev      # Start development server
pnpm --filter @lrpdm/api test     # Run tests
pnpm --filter @lrpdm/api build    # Build for production

# Database operations (from root):
pnpm --filter @lrpdm/api db:migrate     # Run migrations
pnpm --filter @lrpdm/api db:seed        # Seed development data
pnpm --filter @lrpdm/api db:reset       # Reset database
```

## API Architecture

### Directory Structure
```
packages/api/
├── src/
│   ├── routes/          # Fastify route handlers
│   ├── services/        # Business logic
│   ├── models/          # Database models
│   ├── plugins/         # Fastify plugins
│   ├── utils/           # Shared utilities
│   └── server.ts        # Main server file
├── tests/               # Test files
├── migrations/          # Database migrations
└── scripts/             # Database scripts
```

### Key Patterns

1. **Route Registration**: Use Fastify's plugin system
2. **Validation**: JSON Schema for all endpoints
3. **Error Handling**: Centralized error handler plugin
4. **Authentication**: JWT with refresh tokens
5. **Rate Limiting**: Per-route configuration

### Spatial Endpoints

All spatial endpoints follow RESTful conventions with GeoJSON:

```typescript
// GET /api/features - List features with spatial filtering
// POST /api/features - Create new feature
// GET /api/features/:id - Get single feature
// PUT /api/features/:id - Update feature
// DELETE /api/features/:id - Delete feature

// Spatial operations
// POST /api/spatial/intersect - Find intersecting features
// POST /api/spatial/buffer - Create buffer around features
// POST /api/spatial/transform - Transform coordinates
```

### Database Connection

Always use the connection pool from `@lrpdm/shared`:

```typescript
import { db } from '@lrpdm/shared';

// Never create direct connections
// Always use parameterized queries
// Handle PostGIS types properly
```

### Testing Approach

1. **Unit tests**: Service layer with mocked database
2. **Integration tests**: Full API with test database
3. **Spatial tests**: Validate geometry operations
4. **Performance tests**: Load testing with k6

## Performance Considerations

- Enable query result caching for read-heavy endpoints
- Use database indexes for all spatial columns
- Implement cursor-based pagination for large datasets
- Stream large GeoJSON responses

## Security Requirements

- Validate all geometry inputs with ST_IsValid
- Sanitize file uploads before processing
- Implement CORS with specific origins
- Rate limit by IP and user account

Remember: This package handles all data persistence and spatial operations. Optimize for query performance and data integrity.