import Fastify from 'fastify';
import cors from '@fastify/cors';
import { config } from 'dotenv';
import databasePlugin from './plugins/database.js';
import authPlugin from './plugins/auth.js';
import authRoutes from './routes/auth.js';

// Load environment variables
config();

const fastify = Fastify({
  logger: {
    level: process.env.LOG_LEVEL || 'info',
    transport: {
      target: 'pino-pretty',
      options: {
        translateTime: 'HH:MM:ss Z',
        ignore: 'pid,hostname'
      }
    }
  }
});

// Register plugins
fastify.register(cors, {
  origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3000'],
  credentials: true
});

// Register database plugin
fastify.register(databasePlugin);

// Register auth plugin
fastify.register(authPlugin);

// Register routes
fastify.register(authRoutes, { prefix: '/api/auth' });

// Health check endpoint
fastify.get('/health', async (request, reply) => {
  try {
    const result = await fastify.pg.query('SELECT PostGIS_Version()');
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      postgis: result.rows[0].postgis_version,
      database: 'connected'
    };
  } catch (error) {
    reply.code(503);
    return {
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error',
      database: 'disconnected'
    };
  }
});

// Spatial test endpoint (from original)
fastify.get('/api/spatial/test', async (request, reply) => {
  try {
    const result = await fastify.pg.query(`
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
  } catch (error) {
    // If table doesn't exist, return empty collection
    if (error instanceof Error && error.message.includes('does not exist')) {
      return {
        type: 'FeatureCollection',
        features: []
      };
    }
    throw error;
  }
});

// Root endpoint
fastify.get('/', async (request, reply) => {
  return {
    name: 'LRPDM GIS Platform API',
    version: '1.0.0',
    status: 'operational',
    endpoints: {
      health: '/health',
      auth: '/api/auth',
      spatial_test: '/api/spatial/test',
      docs: '/docs'
    },
    documentation: 'https://github.com/lrpthomas/LRPDM'
  };
});

const start = async () => {
  try {
    const port = parseInt(process.env.API_PORT || '3000');
    const host = process.env.API_HOST || '0.0.0.0';
    
    await fastify.listen({ port, host });
    console.log(`LRPDM GIS Platform API running on http://${host}:${port}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully...');
  await fastify.close();
  process.exit(0);
});

start();