import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // PostGIS extensions should already be created by superuser
  // await knex.raw('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
  // await knex.raw('CREATE EXTENSION IF NOT EXISTS postgis');
  // await knex.raw('CREATE EXTENSION IF NOT EXISTS postgis_topology');

  // Create datasets table
  await knex.schema.createTable('datasets', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.string('name').notNullable();
    table.text('description');
    table.enum('type', ['point', 'linestring', 'polygon', 'mixed']).notNullable();
    table.enum('source_format', ['csv', 'excel', 'shapefile', 'geojson']).notNullable();
    table.string('original_filename').notNullable();
    table.integer('feature_count').defaultTo(0);
    table.float('min_lng');
    table.float('min_lat');
    table.float('max_lng');
    table.float('max_lat');
    table.string('crs');
    table.jsonb('metadata');
    table.timestamps(true, true);
    
    table.index('name');
    table.index('type');
    table.index('created_at');
  });

  // Create layers table
  await knex.schema.createTable('layers', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.uuid('dataset_id').notNullable().references('id').inTable('datasets').onDelete('CASCADE');
    table.string('name').notNullable();
    table.text('description');
    table.string('geometry_type').notNullable();
    table.integer('feature_count').defaultTo(0);
    table.jsonb('style');
    table.boolean('visible').defaultTo(true);
    table.integer('min_zoom').defaultTo(0);
    table.integer('max_zoom').defaultTo(22);
    table.timestamps(true, true);
    
    table.index('dataset_id');
    table.index('name');
    table.index('visible');
  });

  // Create features table with PostGIS geometry
  await knex.schema.createTable('features', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.uuid('layer_id').notNullable().references('id').inTable('layers').onDelete('CASCADE');
    table.string('feature_type').defaultTo('feature');
    table.jsonb('properties').notNullable().defaultTo('{}');
    table.specificType('geom', 'geometry(Geometry, 4326)');
    table.timestamps(true, true);
    
    table.index('layer_id');
    table.index('feature_type');
    table.index('created_at');
  });

  // Add spatial index to geometry column
  await knex.raw('CREATE INDEX features_geom_idx ON features USING GIST (geom)');

  // Create import_sessions table
  await knex.schema.createTable('import_sessions', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.uuid('dataset_id').references('id').inTable('datasets').onDelete('SET NULL');
    table.string('filename').notNullable();
    table.string('file_type').notNullable();
    table.enum('status', ['pending', 'processing', 'completed', 'failed']).defaultTo('pending');
    table.integer('total_rows').defaultTo(0);
    table.integer('processed_rows').defaultTo(0);
    table.integer('error_count').defaultTo(0);
    table.jsonb('errors');
    table.jsonb('field_mapping').notNullable();
    table.timestamp('started_at');
    table.timestamp('completed_at');
    table.timestamps(true, true);
    
    table.index('status');
    table.index('created_at');
  });

  // Create a view for dataset statistics
  await knex.raw(`
    CREATE VIEW dataset_statistics AS
    SELECT 
      d.id,
      d.name,
      d.type,
      d.feature_count,
      COUNT(DISTINCT l.id) as layer_count,
      COUNT(DISTINCT f.id) as total_features,
      ST_Extent(f.geom) as extent
    FROM datasets d
    LEFT JOIN layers l ON d.id = l.dataset_id
    LEFT JOIN features f ON l.id = f.layer_id
    GROUP BY d.id, d.name, d.type, d.feature_count
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.raw('DROP VIEW IF EXISTS dataset_statistics');
  await knex.schema.dropTableIfExists('import_sessions');
  await knex.schema.dropTableIfExists('features');
  await knex.schema.dropTableIfExists('layers');
  await knex.schema.dropTableIfExists('datasets');
}