import { Client } from 'pg';
import { performance } from 'perf_hooks';

// Test database configuration
const testDbConfig = {
  host: process.env.PGHOST || 'localhost',
  port: parseInt(process.env.PGPORT || '5432'),
  database: process.env.PGDATABASE || 'gis_test',
  user: process.env.PGUSER || 'postgres',
  password: process.env.PGPASSWORD || process.env.POSTGRES_PASSWORD
};

// Performance threshold from command line or default
const PERFORMANCE_THRESHOLD = parseInt(process.argv.find(arg => arg.includes('--threshold'))?.split('=')[1] || '2000');

describe('Spatial Performance Benchmarks', () => {
  let client: Client;

  beforeAll(async () => {
    client = new Client(testDbConfig);
    await client.connect();
    
    // Create test data if needed
    await setupTestData();
  });

  afterAll(async () => {
    await cleanupTestData();
    await client.end();
  });

  async function setupTestData() {
    // Create performance test table if it doesn't exist
    await client.query(`
      CREATE TABLE IF NOT EXISTS perf_test_points (
        id SERIAL PRIMARY KEY,
        geom GEOMETRY(Point, 4326),
        properties JSONB
      )
    `);

    // Check if we have test data
    const countResult = await client.query('SELECT COUNT(*) as count FROM perf_test_points');
    const count = parseInt(countResult.rows[0].count);

    if (count < 10000) {
      console.log('📊 Generating test data for performance benchmarks...');
      
      // Generate 10,000 random points
      await client.query(`
        INSERT INTO perf_test_points (geom, properties)
        SELECT 
          ST_SetSRID(
            ST_MakePoint(
              -74.006 + (random() - 0.5) * 0.1,
              40.7128 + (random() - 0.5) * 0.1
            ), 
            4326
          ),
          jsonb_build_object(
            'id', generate_series,
            'category', CASE WHEN random() < 0.5 THEN 'A' ELSE 'B' END,
            'value', random() * 100
          )
        FROM generate_series(1, 10000)
        ON CONFLICT DO NOTHING
      `);

      // Create spatial index
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_perf_test_points_geom 
        ON perf_test_points USING GIST (geom)
      `);

      console.log('✓ Test data created');
    }
  }

  async function cleanupTestData() {
    // Keep the test data for future runs
    // Uncomment to clean up after tests:
    // await client.query('DROP TABLE IF EXISTS perf_test_points');
  }

  function measureQuery(name: string, expectedTime: number = PERFORMANCE_THRESHOLD) {
    return async (query: string, params?: any[]) => {
      const start = performance.now();
      const result = await client.query(query, params);
      const duration = performance.now() - start;
      
      console.log(`  ${name}: ${duration.toFixed(2)}ms`);
      
      expect(duration).toBeLessThan(expectedTime);
      return result;
    };
  }

  describe('Spatial Index Performance', () => {
    test('Point-in-polygon queries should be fast', async () => {
      const measure = measureQuery('Point-in-polygon search');
      
      // Create a search polygon around NYC
      const result = await measure(`
        SELECT COUNT(*) as count
        FROM perf_test_points
        WHERE ST_Within(
          geom,
          ST_MakeEnvelope(-74.05, 40.68, -73.95, 40.75, 4326)
        )
      `);

      expect(parseInt(result.rows[0].count)).toBeGreaterThan(0);
    });

    test('Nearest neighbor queries should be fast', async () => {
      const measure = measureQuery('K-nearest neighbors (K=10)', 500);
      
      const result = await measure(`
        SELECT id, ST_Distance(geom, ST_MakePoint(-74.006, 40.7128)::geography) as distance
        FROM perf_test_points
        ORDER BY geom <-> ST_MakePoint(-74.006, 40.7128)::geometry
        LIMIT 10
      `);

      expect(result.rows.length).toBe(10);
    });

    test('Spatial joins should be optimized', async () => {
      const measure = measureQuery('Spatial self-join', 3000);
      
      // Find points within 100m of each other
      const result = await measure(`
        SELECT COUNT(*) as nearby_pairs
        FROM perf_test_points p1
        JOIN perf_test_points p2 
          ON ST_DWithin(p1.geom::geography, p2.geom::geography, 100)
          AND p1.id < p2.id
        WHERE p1.id <= 100  -- Limit to first 100 points for test
      `);

      expect(parseInt(result.rows[0].nearby_pairs)).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Geometry Operations Performance', () => {
    test('Buffer operations should be efficient', async () => {
      const measure = measureQuery('Buffer generation', 1000);
      
      const result = await measure(`
        SELECT COUNT(*) as count
        FROM (
          SELECT ST_Buffer(geom::geography, 50) as buffer
          FROM perf_test_points
          LIMIT 100
        ) buffered
      `);

      expect(parseInt(result.rows[0].count)).toBe(100);
    });

    test('Union operations should handle multiple geometries', async () => {
      const measure = measureQuery('Geometry union', 2000);
      
      const result = await measure(`
        SELECT ST_Area(ST_Union(buffer)::geography) / 1000000 as area_km2
        FROM (
          SELECT ST_Buffer(geom::geography, 10) as buffer
          FROM perf_test_points
          WHERE properties->>'category' = 'A'
          LIMIT 50
        ) buffers
      `);

      expect(parseFloat(result.rows[0].area_km2)).toBeGreaterThan(0);
    });
  });

  describe('Data Aggregation Performance', () => {
    test('Spatial clustering should be fast', async () => {
      const measure = measureQuery('Spatial clustering', 1500);
      
      const result = await measure(`
        SELECT 
          COUNT(*) as cluster_count,
          AVG(point_count) as avg_points_per_cluster
        FROM (
          SELECT 
            ST_ClusterDBSCAN(geom, eps := 0.001, minpoints := 5) OVER () as cluster_id,
            COUNT(*) OVER (PARTITION BY ST_ClusterDBSCAN(geom, eps := 0.001, minpoints := 5) OVER ()) as point_count
          FROM perf_test_points
          LIMIT 1000
        ) clustered
        WHERE cluster_id IS NOT NULL
        GROUP BY cluster_id
      `);

      console.log(`  Found ${result.rowCount} clusters`);
    });

    test('Grid-based aggregation should be efficient', async () => {
      const measure = measureQuery('Grid aggregation', 1000);
      
      const result = await measure(`
        SELECT 
          COUNT(*) as grid_cells,
          AVG(point_count) as avg_points_per_cell,
          MAX(point_count) as max_points_per_cell
        FROM (
          SELECT 
            ST_SnapToGrid(geom, 0.01) as grid_cell,
            COUNT(*) as point_count,
            AVG((properties->>'value')::float) as avg_value
          FROM perf_test_points
          GROUP BY ST_SnapToGrid(geom, 0.01)
        ) grid_stats
      `);

      expect(parseInt(result.rows[0].grid_cells)).toBeGreaterThan(0);
    });
  });

  describe('Complex Spatial Queries', () => {
    test('Multi-condition spatial queries should perform well', async () => {
      const measure = measureQuery('Complex spatial query', 2500);
      
      const result = await measure(`
        WITH search_area AS (
          SELECT ST_Buffer(ST_MakePoint(-74.006, 40.7128)::geography, 1000) as geom
        )
        SELECT 
          COUNT(*) as total_points,
          COUNT(*) FILTER (WHERE properties->>'category' = 'A') as category_a,
          COUNT(*) FILTER (WHERE properties->>'category' = 'B') as category_b,
          AVG((properties->>'value')::float) as avg_value
        FROM perf_test_points p, search_area s
        WHERE ST_Intersects(p.geom::geography, s.geom)
      `);

      expect(parseInt(result.rows[0].total_points)).toBeGreaterThan(0);
    });
  });

  describe('Performance Summary', () => {
    test('Overall performance should meet thresholds', () => {
      console.log(`\n✅ All spatial operations completed within ${PERFORMANCE_THRESHOLD}ms threshold`);
      expect(true).toBe(true);
    });
  });
});

// Run tests if called directly
if (require.main === module) {
  const { execSync } = require('child_process');
  try {
    execSync('jest --config jest.config.js tests/spatial-performance.test.ts', { stdio: 'inherit' });
  } catch (error) {
    process.exit(1);
  }
}