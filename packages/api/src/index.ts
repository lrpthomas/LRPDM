import Fastify from 'fastify';
import { Pool } from 'pg';

const fastify = Fastify({
  logger: {
    level: 'info',
    transport: {
      target: 'pino-pretty',
      options: {
        translateTime: 'HH:MM:ss Z',
        ignore: 'pid,hostname'
      }
    }
  }
});

const pgPool = new Pool({
  host: process.env.POSTGRES_HOST || 'localhost',
  port: parseInt(process.env.POSTGRES_PORT || '5432'),
  database: process.env.POSTGRES_DB || 'gis_platform',
  user: process.env.POSTGRES_USER || 'gis_admin',
  password: process.env.POSTGRES_PASSWORD || 'gis_dev_2024',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

fastify.get('/health', async (request, reply) => {
  try {
    const result = await pgPool.query('SELECT PostGIS_Version()');
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      postgis: result.rows[0].postgis_version
    };
  } catch (error) {
    reply.code(503);
    return {
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
});

fastify.get('/api/spatial/test', async (request, reply) => {
  const result = await pgPool.query(`
    SELECT 
      id,
      name,
      ST_AsGeoJSON(location) as geojson,
      ST_X(location) as lng,
      ST_Y(location) as lat
    FROM spatial_test
    ORDER BY id
  `);
  return {
    type: 'FeatureCollection',
    features: result.rows.map(row => ({
      type: 'Feature',
      properties: {
        id: row.id,
        name: row.name
      },
      geometry: JSON.parse(row.geojson)
    }))
  };
});

const start = async () => {
  try {
    await fastify.listen({ port: 3000, host: '0.0.0.0' });
    console.log('GIS Platform API running on http://localhost:3000');
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();

fastify.get('/', async (request, reply) => {
  return {
    name: 'GIS Platform API',
    version: '0.0.1',
    status: 'operational',
    endpoints: {
      health: '/health',
      spatial_test: '/api/spatial/test'
    },
    documentation: 'https://github.com/YOUR_USERNAME/gis-platform'
  };
});
