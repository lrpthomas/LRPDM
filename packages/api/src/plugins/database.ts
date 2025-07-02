import fp from 'fastify-plugin';
import { FastifyPluginAsync } from 'fastify';
import pg from 'pg';
import { getPool } from '@lrpdm/shared';

const { Pool } = pg;

declare module 'fastify' {
  interface FastifyInstance {
    pg: pg.Pool;
  }
}

const databasePlugin: FastifyPluginAsync = async (fastify) => {
  const databaseUrl = process.env.DATABASE_URL;
  
  if (!databaseUrl) {
    throw new Error('DATABASE_URL environment variable is required');
  }

  // Use shared pool if available, otherwise create new one
  let pool: pg.Pool;
  
  try {
    pool = getPool();
  } catch {
    // Create new pool if shared one doesn't exist
    pool = new Pool({
      connectionString: databaseUrl,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });
  }

  // Test the connection
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT PostGIS_Version()');
    fastify.log.info(`Connected to PostgreSQL with PostGIS ${result.rows[0].postgis_version}`);
    client.release();
  } catch (err) {
    fastify.log.error('Failed to connect to PostgreSQL:', err);
    throw err;
  }

  // Make pool available on fastify instance
  fastify.decorate('pg', pool);

  // Gracefully close pool on shutdown
  fastify.addHook('onClose', async () => {
    await pool.end();
  });
};

export default fp(databasePlugin, {
  name: 'database',
});