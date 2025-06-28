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
      error: error.message
    };
  }
});

fastify.get('/api/spatial/test', async (request, reply) => {
  const result = await pgPool.query(`
    SELECT ST_AsGeoJSON(ST_MakePoint(-73.98, 40.75)) as point,
           ST_Distance(
             ST_MakePoint(-73.98, 40.75)::geography,
             ST_MakePoint(-74.00, 40.71)::geography
           ) as distance_meters
  `);
  return result.rows[0];
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
