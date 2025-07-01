# CLAUDE.md - LRPDM GIS Platform Development Guidelines

## Project Overview

You are working on LRPDM (Live, Reliable, Project, Data & Mapping), a comprehensive GIS web/mobile application that enables field data collection, mapping, and spatial analysis with offline-first capabilities.

**Project Repository**: `gis-platform`
**Primary Developer**: One-person team requiring maximum automation
**Target Platforms**: Web (primary), iOS/Android (native apps via React Native)

## Technical Stack

### Core Technologies
- **Backend**: Node.js 22.11.0, Fastify, PostGIS 16-3.4
- **Frontend**: React Native Web, MapLibre GL JS
- **Database**: PostgreSQL 16 with PostGIS 3.4 extensions
- **Package Manager**: PNPM workspaces
- **State Management**: RxDB with CRDT for offline sync
- **Infrastructure**: Docker, Kubernetes (future), Hostwinds VPS
- **Monitoring**: Prometheus, Grafana, Loki

### Development Tools
- **IDE**: Cursor
- **AI Assistants**: Claude Code, ChatGPT
- **Version Control**: GitHub
- **Testing**: Jest, React Testing Library, Playwright

## Project Structure

```
gis-platform/
├── packages/
│   ├── api/         # Fastify API with PostGIS integration
│   ├── web/         # React Native Web app
│   ├── mobile/      # React Native mobile app
│   └── shared/      # Shared utilities and types
├── docs/            # Documentation
├── migrations/      # Database migrations
└── infrastructure/  # Docker, K8s configs
```

## Coding Standards

### TypeScript Configuration
- **Always use strict mode**
- **Enable all strict flags** in tsconfig.json
- **No implicit any** - all types must be explicit
- **Use interfaces** for object shapes, types for unions/primitives

### Naming Conventions
```typescript
// Files: kebab-case
feature-collection.ts
spatial-utils.ts

// React Components: PascalCase
DataTable.tsx
MapContainer.tsx

// Functions/Variables: camelCase
const processFeatures = () => {}
let featureCount = 0

// Constants: UPPER_SNAKE_CASE
const MAX_FEATURES = 10000
const DEFAULT_SRID = 4326

// Database: snake_case
CREATE TABLE feature_collections (
  feature_id SERIAL PRIMARY KEY,
  created_at TIMESTAMP
)
```

### Error Handling
```typescript
// Always use custom error classes
class SpatialError extends Error {
  constructor(message: string, public code: string, public details?: any) {
    super(message);
    this.name = 'SpatialError';
  }
}

// Always handle errors explicitly
try {
  const result = await performSpatialQuery();
} catch (error) {
  if (error instanceof SpatialError) {
    logger.error('Spatial operation failed', { code: error.code, details: error.details });
    throw new ApiError(400, 'Invalid spatial operation');
  }
  throw error;
}
```

## Spatial Data Handling

### Geometry Standards
- **Always use GeoJSON format** for API communication
- **Coordinate system**: EPSG:4326 (WGS84) for storage
- **Transform to EPSG:3857** (Web Mercator) for display
- **Validate geometries** before storage using PostGIS ST_IsValid()

### PostGIS Patterns
```sql
-- Always create spatial indexes
CREATE INDEX idx_features_geom ON features USING GIST(geom);

-- Use ST_Transform for coordinate system changes
SELECT ST_Transform(geom, 3857) as web_geom FROM features;

-- Optimize spatial queries with bbox pre-filtering
SELECT * FROM features 
WHERE geom && ST_MakeEnvelope($1, $2, $3, $4, 4326)
AND ST_DWithin(geom, ST_SetSRID(ST_MakePoint($5, $6), 4326), $7);
```

### Performance Requirements
- Spatial queries: < 2 seconds for 100k features
- Map tile generation: < 500ms per tile
- File upload processing: < 30 seconds for 10MB CSV
- Table virtualization: Handle 100k+ rows smoothly

## React/React Native Guidelines

### Component Structure
```typescript
// Always use functional components with TypeScript
interface DataTableProps {
  features: Feature[];
  onFeatureSelect?: (feature: Feature) => void;
  loading?: boolean;
}

export const DataTable: React.FC<DataTableProps> = ({ 
  features, 
  onFeatureSelect,
  loading = false 
}) => {
  // Hooks at the top
  const [sortColumn, setSortColumn] = useState<string>('');
  const isMobile = useMediaQuery('(max-width: 768px)');
  
  // Memoize expensive computations
  const sortedFeatures = useMemo(() => 
    sortFeatures(features, sortColumn), 
    [features, sortColumn]
  );
  
  // Early returns for edge cases
  if (loading) return <LoadingSpinner />;
  if (!features.length) return <EmptyState />;
  
  // Main render
  return (
    <View style={styles.container}>
      {/* Component JSX */}
    </View>
  );
};
```

### Mobile-First Design
- **Touch targets**: Minimum 44pt (11mm)
- **Use Pressable** instead of TouchableOpacity for better performance
- **Implement pull-to-refresh** for data updates
- **Handle offline state** with clear indicators

## Testing Requirements

### Test Coverage Targets
- **Unit tests**: >85% coverage
- **Integration tests**: All API endpoints
- **E2E tests**: Critical user workflows
- **Performance tests**: Load testing for spatial queries

### Test Patterns
```typescript
// Test file naming: component.test.tsx or module.test.ts
describe('FeatureCollection', () => {
  // Group related tests
  describe('when processing GeoJSON', () => {
    it('should validate geometry types', async () => {
      // Arrange
      const invalidGeometry = { type: 'InvalidType', coordinates: [] };
      
      // Act & Assert
      await expect(processGeometry(invalidGeometry))
        .rejects
        .toThrow(GeometryValidationError);
    });
  });
});
```

## Git Workflow

### Branch Naming
```bash
feature/week{n}-{component}-{description}
bugfix/issue-{number}-{description}
chore/update-{dependency}
```

### Commit Messages
```bash
# Format: type(scope): description [TASK-ID]

feat(map): add cluster layer for point features [TASK-2-3]
fix(offline): resolve sync conflict for overlapping edits [TASK-3-5]
perf(query): optimize spatial index usage [TASK-4-1]
docs(api): update shapefile upload endpoint docs [TASK-1-8]
```

### PR Guidelines
- **One feature per PR**
- **Include test coverage**
- **Update documentation**
- **Add performance impact notes**

## Common Patterns

### API Endpoint Structure
```typescript
// packages/api/src/routes/features.ts
export default async function featureRoutes(fastify: FastifyInstance) {
  // Input validation schema
  const createFeatureSchema = {
    body: {
      type: 'object',
      required: ['geometry', 'properties'],
      properties: {
        geometry: { $ref: 'geometry#' },
        properties: { type: 'object' }
      }
    }
  };
  
  // Route handler
  fastify.post<{ Body: CreateFeatureDto }>('/', {
    schema: createFeatureSchema,
    preHandler: [authenticate, validateSpatialData]
  }, async (request, reply) => {
    const { geometry, properties } = request.body;
    
    try {
      const feature = await createFeature(geometry, properties);
      return reply.code(201).send({ data: feature });
    } catch (error) {
      request.log.error(error);
      throw new ApiError(400, 'Failed to create feature');
    }
  });
}
```

### Offline Sync Pattern
```typescript
// Always implement conflict resolution
const syncManager = new SyncManager({
  conflictResolution: 'client-wins', // or 'server-wins', 'custom'
  retryAttempts: 3,
  retryDelay: 1000,
  batchSize: 100
});

// Queue operations when offline
if (!navigator.onLine) {
  await syncManager.queueOperation({
    type: 'CREATE_FEATURE',
    data: featureData,
    timestamp: Date.now()
  });
}
```

## Performance Optimization

### Database Queries
- **Use connection pooling** (min: 10, max: 100)
- **Implement query result caching** with Redis
- **Paginate large result sets** (default: 50 items)
- **Use database views** for complex repeated queries

### Frontend Optimization
- **Lazy load map layers** based on zoom level
- **Implement virtual scrolling** for tables >1000 rows
- **Use web workers** for geometry processing
- **Cache map tiles** in IndexedDB

## Security Guidelines

- **Validate all spatial inputs** against injection attacks
- **Implement rate limiting** (100 requests/minute default)
- **Use parameterized queries** - never concatenate SQL
- **Sanitize file uploads** - check file types and sizes
- **Implement CORS properly** for API endpoints

## AI Assistant Integration

When integrating AI features:
- **Cache AI responses** to minimize API costs
- **Implement fallbacks** for when AI services are unavailable
- **Log token usage** for cost tracking
- **Use streaming responses** for better UX

## Debugging Tips

### Spatial Issues
```bash
# Check geometry validity
SELECT id, ST_IsValid(geom), ST_IsValidReason(geom) 
FROM features WHERE NOT ST_IsValid(geom);

# Debug coordinate system issues
SELECT ST_SRID(geom), ST_AsText(geom) FROM features LIMIT 10;
```

### Performance Profiling
```typescript
// Use performance marks
performance.mark('spatial-query-start');
const results = await querySpatialData();
performance.mark('spatial-query-end');
performance.measure('spatial-query', 'spatial-query-start', 'spatial-query-end');
```

## Task Completion Checklist

Before marking any task complete:
- [ ] Code follows all style guidelines above
- [ ] TypeScript strict mode passes
- [ ] Tests written and passing (>85% coverage)
- [ ] Documentation updated
- [ ] Performance benchmarks met
- [ ] Mobile compatibility verified
- [ ] Offline functionality tested
- [ ] Error handling comprehensive
- [ ] Logs and monitoring in place
- [ ] Security considerations addressed

## Questions or Clarifications

If you encounter ambiguity or need clarification:
1. Check existing code patterns first
2. Refer to PostGIS documentation for spatial operations
3. Follow React Native Web compatibility guidelines
4. When in doubt, optimize for mobile performance

Remember: This is a one-person project, so prioritize automation, maintainability, and clear documentation in every implementation decision.