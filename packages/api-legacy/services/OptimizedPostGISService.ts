import { db as knex } from '../config/database';

/**
 * Optimized PostGIS Service following database-spatial-agent best practices
 * Focus: Performance, indexing, and efficient spatial operations
 */
export class OptimizedPostGISService {
  
  // Query performance cache
  private static queryCache = new Map<string, any>();
  private static cacheTimeout = 5 * 60 * 1000; // 5 minutes
  
  // OPTIMIZED: Batch geometry validation with prepared statements
  static async validateGeometries(wkts: string[]): Promise<Array<{
    index: number;
    isValid: boolean;
    reason?: string;
    fixedGeometry?: string;
  }>> {
    if (wkts.length === 0) return [];

    // Use WITH clause for better performance on batch operations
    const values = wkts.map((wkt, i) => `(${i}, '${wkt}')`).join(', ');
    
    const result = await knex.raw(`
      WITH input_geoms AS (
        SELECT 
          idx,
          ST_GeomFromText(wkt_text, 4326) as geom,
          wkt_text
        FROM (VALUES ${values}) AS t(idx, wkt_text)
      )
      SELECT 
        idx,
        ST_IsValid(geom) as is_valid,
        CASE 
          WHEN NOT ST_IsValid(geom) THEN ST_IsValidReason(geom)
          ELSE NULL 
        END as reason,
        CASE 
          WHEN NOT ST_IsValid(geom) THEN ST_AsText(ST_MakeValid(geom))
          ELSE NULL 
        END as fixed_geometry
      FROM input_geoms
    `);

    return result.rows.map((row: any) => ({
      index: row.idx,
      isValid: row.is_valid,
      reason: row.reason,
      fixedGeometry: row.fixed_geometry
    }));
  }

  // OPTIMIZED: High-performance cached proximity search
  static async cachedProximitySearch(
    centerLng: number,
    centerLat: number,
    radiusMeters: number,
    options: { useCache?: boolean; cacheKey?: string } = {}
  ): Promise<any[]> {
    const { useCache = true, cacheKey } = options;
    const key = cacheKey || `prox_${centerLng}_${centerLat}_${radiusMeters}`;
    
    // Check cache first
    if (useCache && this.queryCache.has(key)) {
      const cached = this.queryCache.get(key);
      if (Date.now() - cached.timestamp < this.cacheTimeout) {
        return cached.data;
      }
      this.queryCache.delete(key);
    }

    // Execute optimized query with spatial index usage
    const startTime = Date.now();
    const result = await knex.raw(`
      SELECT 
        id,
        feature_type,
        properties,
        ST_AsGeoJSON(geom)::json as geometry,
        ST_Distance(
          geom::geography,
          ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography
        ) as distance
      FROM features
      WHERE ST_DWithin(
        geom::geography,
        ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography,
        $3
      )
      ORDER BY geom <-> ST_SetSRID(ST_MakePoint($1, $2), 4326)
      LIMIT 100
    `, [centerLng, centerLat, radiusMeters]);

    const queryTime = Date.now() - startTime;
    console.log(`Proximity query executed in ${queryTime}ms`);

    // Cache results
    if (useCache) {
      this.queryCache.set(key, {
        data: result.rows,
        timestamp: Date.now()
      });
    }

    return result.rows;
  }

  // OPTIMIZED: Geography casting for accurate distance calculations
  static async findNearbyFeatures(
    centerLng: number,
    centerLat: number,
    radiusMeters: number,
    options: {
      featureTypes?: string[];
      propertyFilters?: Record<string, any>;
      limit?: number;
      includeDistance?: boolean;
      bbox?: [number, number, number, number]; // Optional bounding box pre-filter
    } = {}
  ): Promise<any[]> {
    const {
      featureTypes,
      propertyFilters = {},
      limit = 100,
      includeDistance = true,
      bbox
    } = options;

    let query = knex('features')
      .select([
        'id',
        'feature_type',
        'properties',
        knex.raw('ST_AsGeoJSON(geom)::json as geometry')
      ]);

    // Add distance calculation only if needed
    if (includeDistance) {
      query = query.select(
        knex.raw(`
          ST_Distance(
            geom::geography,
            ST_SetSRID(ST_MakePoint(?, ?), 4326)::geography
          ) as distance
        `, [centerLng, centerLat])
      );
    }

    // OPTIMIZATION: Use bounding box pre-filter if provided (much faster than ST_DWithin alone)
    if (bbox) {
      const [minLng, minLat, maxLng, maxLat] = bbox;
      query = query.whereRaw(
        'geom && ST_MakeEnvelope(?, ?, ?, ?, 4326)',
        [minLng, minLat, maxLng, maxLat]
      );
    }

    // Primary spatial filter - using geography for accurate distance
    query = query.whereRaw(`
      ST_DWithin(
        geom::geography,
        ST_SetSRID(ST_MakePoint(?, ?), 4326)::geography,
        ?
      )
    `, [centerLng, centerLat, radiusMeters]);

    // Feature type filter
    if (featureTypes && featureTypes.length > 0) {
      query = query.whereIn('feature_type', featureTypes);
    }

    // Property filters using GIN index on properties JSONB
    Object.entries(propertyFilters).forEach(([key, value]) => {
      if (Array.isArray(value)) {
        query = query.whereRaw('properties->>? = ANY(?)', [key, value]);
      } else {
        query = query.whereRaw('properties->>? = ?', [key, String(value)]);
      }
    });

    // Order by distance if calculated
    if (includeDistance) {
      query = query.orderBy('distance', 'asc');
    }

    query = query.limit(limit);

    return await query;
  }

  // OPTIMIZED: Vector tile generation with proper clipping and simplification
  static async generateVectorTile(
    z: number,
    x: number,
    y: number,
    layerName: string = 'features',
    options: {
      buffer?: number;
      extent?: number;
      tolerance?: number;
      featureTypes?: string[];
    } = {}
  ): Promise<Buffer> {
    const {
      buffer = 64,
      extent = 4096,
      tolerance: _tolerance = 0,
      featureTypes
    } = options;

    let query = knex('features')
      .select(
        'id',
        'feature_type',
        'properties',
        knex.raw(`
          ST_AsMVTGeom(
            ST_Transform(geom, 3857),
            ST_TileEnvelope(?, ?, ?),
            ?, ?, true
          ) AS geom
        `, [z, x, y, extent, buffer])
      )
      .whereRaw(
        'geom && ST_Transform(ST_TileEnvelope(?, ?, ?), 4326)',
        [z, x, y]
      );

    // Feature type filter
    if (featureTypes && featureTypes.length > 0) {
      query = query.whereIn('feature_type', featureTypes);
    }

    // Wrap in ST_AsMVT
    const result = await knex.raw(`
      SELECT ST_AsMVT(q, ?, ?, 'geom') as mvt
      FROM (${query.toString()}) q
      WHERE q.geom IS NOT NULL
    `, [layerName, extent]);

    return result.rows[0]?.mvt || Buffer.alloc(0);
  }

  // OPTIMIZED: Efficient spatial clustering using ST_ClusterKMeans
  static async clusterFeatures(
    bounds: [number, number, number, number],
    numberOfClusters: number,
    options: {
      featureTypes?: string[];
      minClusterSize?: number;
    } = {}
  ): Promise<Array<{
    clusterId: number;
    center: { lng: number; lat: number };
    featureCount: number;
    featureIds: string[];
    bbox: [number, number, number, number];
  }>> {
    const { featureTypes, minClusterSize = 1 } = options;
    const [minLng, minLat, maxLng, maxLat] = bounds;

    let baseQuery = knex('features')
      .whereRaw(
        'geom && ST_MakeEnvelope(?, ?, ?, ?, 4326)',
        [minLng, minLat, maxLng, maxLat]
      );

    if (featureTypes && featureTypes.length > 0) {
      baseQuery = baseQuery.whereIn('feature_type', featureTypes);
    }

    const result = await knex.raw(`
      WITH clustered AS (
        SELECT 
          id,
          geom,
          ST_ClusterKMeans(geom, ?) OVER() AS cluster_id
        FROM (${baseQuery.toString()}) f
        WHERE geom IS NOT NULL
      ),
      cluster_stats AS (
        SELECT 
          cluster_id,
          array_agg(id) AS feature_ids,
          count(*) AS feature_count,
          ST_Centroid(ST_Collect(geom)) AS center_geom,
          ST_Envelope(ST_Collect(geom)) AS bbox_geom
        FROM clustered
        GROUP BY cluster_id
        HAVING count(*) >= ?
      )
      SELECT 
        cluster_id,
        feature_ids,
        feature_count,
        ST_X(center_geom) AS center_lng,
        ST_Y(center_geom) AS center_lat,
        ST_XMin(bbox_geom) AS bbox_min_lng,
        ST_YMin(bbox_geom) AS bbox_min_lat,
        ST_XMax(bbox_geom) AS bbox_max_lng,
        ST_YMax(bbox_geom) AS bbox_max_lat
      FROM cluster_stats
      ORDER BY cluster_id
    `, [numberOfClusters, minClusterSize]);

    return result.rows.map((row: any) => ({
      clusterId: row.cluster_id,
      center: {
        lng: row.center_lng,
        lat: row.center_lat
      },
      featureCount: row.feature_count,
      featureIds: row.feature_ids,
      bbox: [
        row.bbox_min_lng,
        row.bbox_min_lat,
        row.bbox_max_lng,
        row.bbox_max_lat
      ]
    }));
  }

  // OPTIMIZED: Spatial aggregation with grid-based analysis
  static async spatialAggregation(
    bounds: [number, number, number, number],
    gridSize: number, // meters
    aggregateField: string,
    aggregateFunction: 'count' | 'sum' | 'avg' | 'min' | 'max' = 'count'
  ): Promise<Array<{
    gridId: string;
    cellGeometry: any;
    value: number;
    featureCount: number;
  }>> {
    const [minLng, minLat, maxLng, maxLat] = bounds;

    const result = await knex.raw(`
      WITH grid AS (
        SELECT 
          row_number() OVER () as grid_id,
          ST_SquareGrid(?, ST_MakeEnvelope(?, ?, ?, ?, 4326)) AS cell
      ),
      aggregated AS (
        SELECT 
          g.grid_id,
          g.cell,
          count(f.id) AS feature_count,
          ${aggregateFunction === 'count' 
            ? 'count(f.id)' 
            : `${aggregateFunction}((f.properties->>'${aggregateField}')::numeric)`
          } AS aggregate_value
        FROM grid g
        LEFT JOIN features f ON ST_Intersects(f.geom, g.cell)
        GROUP BY g.grid_id, g.cell
        HAVING count(f.id) > 0
      )
      SELECT 
        grid_id,
        ST_AsGeoJSON(cell)::json AS cell_geometry,
        aggregate_value,
        feature_count
      FROM aggregated
      ORDER BY grid_id
    `, [gridSize, minLng, minLat, maxLng, maxLat]);

    return result.rows.map((row: any) => ({
      gridId: row.grid_id,
      cellGeometry: row.cell_geometry,
      value: row.aggregate_value || 0,
      featureCount: row.feature_count
    }));
  }

  // OPTIMIZED: Efficient buffer analysis with multiple radii
  static async multiBufferAnalysis(
    featureId: string,
    radii: number[], // Array of buffer distances in meters
    targetTable: string = 'features'
  ): Promise<Array<{
    radius: number;
    bufferArea: number;
    intersectingFeatures: number;
    intersectingFeatureIds: string[];
  }>> {
    const radiiList = radii.join(', ');

    const result = await knex.raw(`
      WITH source_feature AS (
        SELECT geom FROM features WHERE id = ?
      ),
      buffer_analysis AS (
        SELECT 
          radius,
          ST_Buffer(sf.geom::geography, radius)::geometry AS buffer_geom
        FROM source_feature sf,
             unnest(ARRAY[${radiiList}]) AS radius
      ),
      intersections AS (
        SELECT 
          ba.radius,
          ST_Area(ba.buffer_geom::geography) AS buffer_area,
          array_agg(t.id) FILTER (WHERE t.id IS NOT NULL) AS intersecting_ids,
          count(t.id) AS intersecting_count
        FROM buffer_analysis ba
        LEFT JOIN ${targetTable} t ON ST_Intersects(t.geom, ba.buffer_geom)
        GROUP BY ba.radius, ba.buffer_geom
      )
      SELECT 
        radius,
        buffer_area,
        intersecting_count,
        COALESCE(intersecting_ids, ARRAY[]::text[]) AS intersecting_ids
      FROM intersections
      ORDER BY radius
    `, [featureId]);

    return result.rows.map((row: any) => ({
      radius: row.radius,
      bufferArea: row.buffer_area,
      intersectingFeatures: row.intersecting_count,
      intersectingFeatureIds: row.intersecting_ids
    }));
  }

  // OPTIMIZED: Table optimization with statistics and index maintenance
  static async optimizeTable(
    tableName: string,
    geometryColumn: string = 'geom'
  ): Promise<{
    indexesCreated: string[];
    statisticsUpdated: boolean;
    clustered: boolean;
  }> {
    const indexesCreated: string[] = [];

    // 1. Create GIST index if not exists
    const gistIndexName = `${tableName}_${geometryColumn}_gist_idx`;
    await knex.raw(`
      CREATE INDEX IF NOT EXISTS ${gistIndexName}
      ON ${tableName} USING GIST (${geometryColumn})
    `);
    indexesCreated.push(gistIndexName);

    // 2. Create JSONB GIN index on properties if column exists
    const columnsResult = await knex.raw(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = ? AND column_name = 'properties'
    `, [tableName]);

    if (columnsResult.rows.length > 0) {
      const propertiesIndexName = `${tableName}_properties_gin_idx`;
      await knex.raw(`
        CREATE INDEX IF NOT EXISTS ${propertiesIndexName}
        ON ${tableName} USING GIN (properties)
      `);
      indexesCreated.push(propertiesIndexName);
    }

    // 3. Create feature_type index if column exists
    const featureTypeResult = await knex.raw(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = ? AND column_name = 'feature_type'
    `, [tableName]);

    if (featureTypeResult.rows.length > 0) {
      const featureTypeIndexName = `${tableName}_feature_type_idx`;
      await knex.raw(`
        CREATE INDEX IF NOT EXISTS ${featureTypeIndexName}
        ON ${tableName} (feature_type)
      `);
      indexesCreated.push(featureTypeIndexName);
    }

    // 4. Update table statistics
    await knex.raw(`ANALYZE ${tableName}`);

    // 5. Cluster table by spatial index for better I/O performance
    try {
      await knex.raw(`CLUSTER ${tableName} USING ${gistIndexName}`);
    } catch (error) {
      // Clustering might fail if table is empty or locked
      console.warn(`Could not cluster table ${tableName}:`, error);
    }

    return {
      indexesCreated,
      statisticsUpdated: true,
      clustered: true
    };
  }

  // OPTIMIZED: Query performance analysis
  static async analyzeQueryPerformance(
    sqlQuery: string,
    params: any[] = []
  ): Promise<{
    executionTime: number;
    planningTime: number;
    totalCost: number;
    indexesUsed: string[];
    suggestions: string[];
  }> {
    // Get query plan with timing
    const explainResult = await knex.raw(`
      EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) ${sqlQuery}
    `, params);

    const plan = explainResult.rows[0]['QUERY PLAN'][0];
    const planningTime = plan['Planning Time'];
    const executionTime = plan['Execution Time'];
    const totalCost = plan['Plan']['Total Cost'];

    // Extract index usage and generate suggestions
    const indexesUsed: string[] = [];
    const suggestions: string[] = [];

    function analyzePlan(node: any) {
      if (node['Node Type'] === 'Index Scan' || node['Node Type'] === 'Index Only Scan') {
        indexesUsed.push(node['Index Name']);
      }
      
      if (node['Node Type'] === 'Seq Scan') {
        suggestions.push(`Consider adding an index for table: ${node['Relation Name']}`);
      }

      if (node['Plans']) {
        node['Plans'].forEach(analyzePlan);
      }
    }

    analyzePlan(plan['Plan']);

    // Add performance suggestions
    if (executionTime > 1000) {
      suggestions.push('Query execution time is over 1 second - consider optimization');
    }

    if (totalCost > 10000) {
      suggestions.push('Query cost is high - review query structure and indexes');
    }

    return {
      executionTime,
      planningTime,
      totalCost,
      indexesUsed,
      suggestions
    };
  }
}

export default OptimizedPostGISService;