import { Client } from 'pg';
import { promises as fs } from 'fs';
import path from 'path';

// Test database configuration
const testDbConfig = {
  host: process.env.PGHOST || 'localhost',
  port: parseInt(process.env.PGPORT || '5432'),
  database: process.env.PGDATABASE || 'gis_test',
  user: process.env.PGUSER || 'postgres',
  password: process.env.PGPASSWORD || process.env.POSTGRES_PASSWORD
};

describe('Spatial Data Validation Tests', () => {
  let client: Client;

  beforeAll(async () => {
    client = new Client(testDbConfig);
    await client.connect();
  });

  afterAll(async () => {
    await client.end();
  });

  describe('PostGIS Installation', () => {
    test('PostGIS extension should be installed', async () => {
      const result = await client.query(`
        SELECT extname, extversion 
        FROM pg_extension 
        WHERE extname = 'postgis'
      `);
      
      expect(result.rows.length).toBe(1);
      expect(result.rows[0].extname).toBe('postgis');
      console.log(`✓ PostGIS version: ${result.rows[0].extversion}`);
    });

    test('Spatial reference systems should be loaded', async () => {
      const result = await client.query(`
        SELECT COUNT(*) as srid_count 
        FROM spatial_ref_sys
      `);
      
      const sridCount = parseInt(result.rows[0].srid_count);
      expect(sridCount).toBeGreaterThan(1000);
      console.log(`✓ Loaded ${sridCount} spatial reference systems`);
    });
  });

  describe('Spatial Tables Structure', () => {
    test('Features table should have proper spatial columns', async () => {
      const result = await client.query(`
        SELECT column_name, data_type, udt_name
        FROM information_schema.columns
        WHERE table_name = 'features'
        AND column_name IN ('geom', 'location', 'geometry')
        ORDER BY ordinal_position
      `);

      const spatialColumns = result.rows.filter(col => 
        col.udt_name === 'geometry' || col.data_type === 'USER-DEFINED'
      );
      
      expect(spatialColumns.length).toBeGreaterThan(0);
      console.log(`✓ Found ${spatialColumns.length} spatial columns`);
    });

    test('Spatial indexes should exist', async () => {
      const result = await client.query(`
        SELECT COUNT(*) as spatial_index_count
        FROM pg_indexes
        WHERE indexdef LIKE '%gist%'
        OR indexdef LIKE '%GIST%'
      `);
      
      const indexCount = parseInt(result.rows[0].spatial_index_count);
      expect(indexCount).toBeGreaterThan(0);
      console.log(`✓ Found ${indexCount} spatial indexes`);
    });
  });

  describe('Geometry Validation', () => {
    test('All geometries should be valid', async () => {
      // Skip if features table doesn't exist
      const tableCheck = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_name = 'features'
        ) as table_exists
      `);

      if (!tableCheck.rows[0].table_exists) {
        console.log('⚠ Features table not found, skipping geometry validation');
        return;
      }

      const result = await client.query(`
        SELECT COUNT(*) as invalid_count
        FROM features
        WHERE geom IS NOT NULL 
        AND NOT ST_IsValid(geom)
      `);
      
      const invalidCount = parseInt(result.rows[0].invalid_count);
      expect(invalidCount).toBe(0);
      console.log('✓ All geometries are valid');
    });

    test('Geometries should be in correct SRID', async () => {
      // Skip if features table doesn't exist
      const tableCheck = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_name = 'features'
        ) as table_exists
      `);

      if (!tableCheck.rows[0].table_exists) {
        console.log('⚠ Features table not found, skipping SRID validation');
        return;
      }

      const result = await client.query(`
        SELECT DISTINCT ST_SRID(geom) as srid
        FROM features
        WHERE geom IS NOT NULL
      `);
      
      result.rows.forEach(row => {
        expect([4326, 3857]).toContain(row.srid);
      });
      console.log(`✓ All geometries use valid SRID: ${result.rows.map(r => r.srid).join(', ')}`);
    });
  });

  describe('Spatial Functions', () => {
    test('Basic spatial functions should work', async () => {
      // Test point creation
      const pointResult = await client.query(`
        SELECT ST_AsText(ST_MakePoint(-74.006, 40.7128)) as point
      `);
      expect(pointResult.rows[0].point).toBe('POINT(-74.006 40.7128)');

      // Test distance calculation
      const distResult = await client.query(`
        SELECT ST_Distance(
          ST_MakePoint(-74.006, 40.7128)::geography,
          ST_MakePoint(-73.935, 40.730)::geography
        ) as distance
      `);
      
      const distance = parseFloat(distResult.rows[0].distance);
      expect(distance).toBeGreaterThan(0);
      expect(distance).toBeLessThan(100000); // Less than 100km
      console.log(`✓ Spatial functions working correctly`);
    });

    test('Coordinate transformations should work', async () => {
      const result = await client.query(`
        SELECT 
          ST_AsText(ST_Transform(ST_SetSRID(ST_MakePoint(-74.006, 40.7128), 4326), 3857)) as transformed
      `);
      
      expect(result.rows[0].transformed).toContain('POINT');
      console.log('✓ Coordinate transformations working');
    });
  });
});

// Run tests if called directly
if (require.main === module) {
  const { execSync } = require('child_process');
  try {
    execSync('jest --config jest.config.js tests/spatial-validation.test.ts', { stdio: 'inherit' });
  } catch (error) {
    process.exit(1);
  }
}