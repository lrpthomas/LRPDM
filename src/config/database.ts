import knex from 'knex';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config();

export const dbConfig = {
  client: 'pg',
  connection: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'gis_platform',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
  },
  pool: {
    min: 2,
    max: 10,
  },
  migrations: {
    directory: path.join(__dirname, '../../migrations'),
    extension: 'ts',
  },
  seeds: {
    directory: path.join(__dirname, '../../seeds'),
    extension: 'ts',
  },
};

// Create Knex instance
export const db = knex(dbConfig);

// Test database connection
export async function testConnection(): Promise<boolean> {
  try {
    await db.raw('SELECT 1');
    console.log('✅ Database connection successful');
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    return false;
  }
}

// Check if PostGIS is installed
export async function checkPostGIS(): Promise<boolean> {
  try {
    const result = await db.raw('SELECT PostGIS_Version()');
    const version = result.rows[0].postgis_version;
    console.log(`✅ PostGIS ${version} is installed`);
    return true;
  } catch (error) {
    console.error('❌ PostGIS not found. Please install PostGIS extension.');
    return false;
  }
}

// Initialize PostGIS extension
export async function initializePostGIS(): Promise<void> {
  try {
    await db.raw('CREATE EXTENSION IF NOT EXISTS postgis');
    await db.raw('CREATE EXTENSION IF NOT EXISTS postgis_topology');
    console.log('✅ PostGIS extensions initialized');
  } catch (error) {
    console.error('❌ Failed to initialize PostGIS:', error);
    throw error;
  }
}