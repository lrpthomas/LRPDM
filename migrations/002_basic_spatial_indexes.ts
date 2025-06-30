import { Knex } from 'knex';

/**
 * Migration: Basic Spatial Indexes
 * Simplified version with essential indexes only
 */

export async function up(knex: Knex): Promise<void> {
  console.log('🚀 Creating basic spatial indexes...');

  // 1. JSONB GIN index for property searches
  await knex.raw(`
    CREATE INDEX IF NOT EXISTS features_properties_gin_idx 
    ON features USING GIN (properties)
  `);

  // 2. Feature type index
  await knex.raw(`
    CREATE INDEX IF NOT EXISTS features_feature_type_idx 
    ON features (feature_type)
  `);

  // 3. Temporal indexes
  await knex.raw(`
    CREATE INDEX IF NOT EXISTS features_created_at_idx 
    ON features (created_at)
  `);

  await knex.raw(`
    CREATE INDEX IF NOT EXISTS features_updated_at_idx 
    ON features (updated_at)
  `);

  // 4. Basic constraints for data quality
  try {
    await knex.raw(`
      ALTER TABLE features 
      ADD CONSTRAINT features_geom_srid_check 
      CHECK (ST_SRID(geom) = 4326)
    `);
  } catch (error) {
    console.log('Constraint might already exist, skipping...');
  }

  // 5. Analyze table for better query planning
  await knex.raw(`ANALYZE features`);

  console.log('✅ Basic spatial indexes created successfully!');
}

export async function down(knex: Knex): Promise<void> {
  console.log('🔄 Dropping basic spatial indexes...');

  await knex.raw(`ALTER TABLE features DROP CONSTRAINT IF EXISTS features_geom_srid_check`);
  await knex.raw(`DROP INDEX IF EXISTS features_updated_at_idx`);
  await knex.raw(`DROP INDEX IF EXISTS features_created_at_idx`);
  await knex.raw(`DROP INDEX IF EXISTS features_feature_type_idx`);
  await knex.raw(`DROP INDEX IF EXISTS features_properties_gin_idx`);

  console.log('✅ Basic spatial indexes dropped successfully');
}