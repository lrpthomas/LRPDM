#!/usr/bin/env ts-node

/**
 * Simple Spatial Performance Audit
 * Basic performance checks for spatial setup
 */

import { db as knex } from '../config/database';

async function runBasicAudit(): Promise<void> {
  console.log('🔍 Running Basic Spatial Performance Audit\n');
  console.log('=' .repeat(50));

  try {
    // 1. Check PostGIS version
    console.log('\n📋 PostGIS Configuration:');
    const version = await knex.raw('SELECT PostGIS_version()');
    console.log(`✅ PostGIS Version: ${version.rows[0].postgis_version}`);

    // 2. Check spatial indexes
    console.log('\n📊 Spatial Indexes:');
    const indexes = await knex.raw(`
      SELECT 
        tablename,
        indexname,
        indexdef
      FROM pg_indexes 
      WHERE indexdef LIKE '%gist%' OR indexdef LIKE '%gin%'
      ORDER BY tablename;
    `);
    
    console.log(`Found ${indexes.rows.length} spatial indexes:`);
    indexes.rows.forEach(idx => {
      const indexType = idx.indexdef.includes('gin') ? 'GIN' : 'GIST';
      console.log(`  ${indexType}: ${idx.tablename}.${idx.indexname}`);
    });

    // 3. Check table statistics
    console.log('\n📈 Table Statistics:');
    const tables = await knex.raw(`
      SELECT 
        relname as tablename,
        n_live_tup as row_count
      FROM pg_stat_user_tables 
      WHERE schemaname = 'public'
      ORDER BY n_live_tup DESC;
    `);

    tables.rows.forEach(table => {
      console.log(`  ${table.tablename}: ${table.row_count} rows`);
    });

    // 4. Check PostGIS functions
    console.log('\n🌍 Available PostGIS Functions:');
    const functions = await knex.raw(`
      SELECT count(*) as function_count 
      FROM pg_proc 
      WHERE proname LIKE 'st_%';
    `);
    console.log(`✅ ${functions.rows[0].function_count} PostGIS functions available`);

    // 5. Test spatial query performance
    console.log('\n⏱️  Query Performance Tests:');
    
    // Test basic spatial query
    console.log('Testing proximity search...');
    const start1 = Date.now();
    await knex.raw(`
      SELECT count(*) FROM features 
      WHERE ST_DWithin(geom::geography, ST_SetSRID(ST_MakePoint(-74.006, 40.7128), 4326)::geography, 1000)
    `);
    const time1 = Date.now() - start1;
    console.log(`✅ Proximity search: ${time1}ms`);

    // Test geometry validation
    console.log('Testing geometry validation...');
    const start2 = Date.now();
    await knex.raw(`SELECT count(*) FROM features WHERE ST_IsValid(geom)`);
    const time2 = Date.now() - start2;
    console.log(`✅ Geometry validation: ${time2}ms`);

    // Test basic buffer operation
    console.log('Testing buffer operation...');
    const start3 = Date.now();
    await knex.raw(`
      SELECT ST_AsGeoJSON(ST_Buffer(geom::geography, 100)::geometry) 
      FROM features 
      LIMIT 1
    `);
    const time3 = Date.now() - start3;
    console.log(`✅ Buffer operation: ${time3}ms`);

    // 6. Check feature data
    console.log('\n📍 Feature Data:');
    const featureStats = await knex.raw(`
      SELECT 
        feature_type,
        count(*) as count,
        ST_GeometryType(geom) as geom_type
      FROM features 
      GROUP BY feature_type, ST_GeometryType(geom)
      ORDER BY count DESC;
    `);

    if (featureStats.rows.length > 0) {
      featureStats.rows.forEach(stat => {
        console.log(`  ${stat.feature_type} (${stat.geom_type}): ${stat.count} features`);
      });
    } else {
      console.log('  No features found');
    }

    // 7. Check constraint status
    console.log('\n🔒 Spatial Constraints:');
    const constraints = await knex.raw(`
      SELECT conname
      FROM pg_constraint 
      WHERE conname LIKE '%geom%' OR conname LIKE '%spatial%'
    `);

    if (constraints.rows.length > 0) {
      constraints.rows.forEach(constraint => {
        console.log(`  ✅ ${constraint.conname}`);
      });
    } else {
      console.log('  No spatial constraints found');
    }

    // 8. Performance recommendations
    console.log('\n💡 Performance Recommendations:');
    
    if (indexes.rows.length < 2) {
      console.log('  ⚠️  Consider adding more spatial indexes for better performance');
    }
    
    if (featureStats.rows.length > 0) {
      const totalFeatures = featureStats.rows.reduce((sum, stat) => sum + parseInt(stat.count), 0);
      if (totalFeatures > 10000) {
        console.log('  📊 Large dataset detected - consider partitioning strategies');
      }
    }
    
    console.log('  ✅ Run VACUUM ANALYZE regularly on spatial tables');
    console.log('  ✅ Monitor query execution plans with EXPLAIN ANALYZE');
    console.log('  ✅ Consider geometry simplification for web display');

    console.log('\n' + '='.repeat(50));
    console.log('🎯 Audit completed successfully!');

  } catch (error) {
    console.error('❌ Audit failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  runBasicAudit()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('Failed to run audit:', error);
      process.exit(1);
    });
}

export { runBasicAudit };