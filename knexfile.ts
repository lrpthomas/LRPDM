import type { Knex } from 'knex';
import { dbConfig } from './src/config/database';

const config: { [key: string]: Knex.Config } = {
  development: dbConfig,
  staging: dbConfig,
  production: {
    ...dbConfig,
    pool: {
      min: 2,
      max: 20
    }
  }
};

export default config;