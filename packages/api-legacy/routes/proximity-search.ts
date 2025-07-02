import { Router, Request, Response } from 'express';
import { db as knex } from '../config/database';
import { z } from 'zod';

const router: Router = Router();

// Validation schemas
const proximitySearchSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  radius: z.number().min(1).max(50000), // meters
  featureType: z.string().optional(),
  limit: z.number().min(1).max(1000).default(100),
  properties: z.array(z.string()).optional()
});

const proximitySearchQuerySchema = z.object({
  lat: z.string().transform(Number),
  lng: z.string().transform(Number),
  radius: z.string().transform(Number),
  type: z.string().optional(),
  limit: z.string().transform(Number).optional(),
  props: z.string().optional(),
  sort: z.enum(['distance', 'name', 'created_at']).optional().default('distance'),
  order: z.enum(['asc', 'desc']).optional().default('asc'),
  include_count: z.string().transform(val => val === 'true').optional()
});

// GET /api/spatial/proximity-search
router.get('/proximity-search', async (req: Request, res: Response) => {
  try {
    // Parse and validate query parameters
    const parsedQuery = proximitySearchQuerySchema.parse(req.query);
    const searchParams = proximitySearchSchema.parse({
      latitude: parsedQuery.lat,
      longitude: parsedQuery.lng,
      radius: parsedQuery.radius,
      featureType: parsedQuery.type,
      limit: parsedQuery.limit || 100,
      properties: parsedQuery.props?.split(',')
    });

    // Performance optimization: early validation
    if (searchParams.radius > 50000) {
      res.status(400).json({
        error: 'Radius too large',
        message: 'Maximum radius is 50km for performance reasons'
      });
      return;
    }

    // Build the spatial query using the proximity search template
    const query = knex('features')
      .select(
        'id',
        'feature_type',
        'properties',
        knex.raw('ST_AsGeoJSON(geom)::json as geometry'),
        knex.raw(`
          ST_Distance(
            geom::geography,
            ST_SetSRID(ST_MakePoint(?, ?), 4326)::geography
          ) as distance
        `, [searchParams.longitude, searchParams.latitude])
      )
      .whereRaw(`
        ST_DWithin(
          geom::geography,
          ST_SetSRID(ST_MakePoint(?, ?), 4326)::geography,
          ?
        )
      `, [searchParams.longitude, searchParams.latitude, searchParams.radius])
      .orderBy('distance', 'asc')
      .limit(searchParams.limit);

    // Add feature type filter if specified
    if (searchParams.featureType) {
      query.where('feature_type', searchParams.featureType);
    }

    // Execute the query
    const results = await query;

    // Format response as GeoJSON FeatureCollection
    const features = results.map(row => {
      const feature: any = {
        type: 'Feature',
        id: row.id,
        geometry: row.geometry,
        properties: {
          ...row.properties,
          feature_type: row.feature_type
        },
        distance: Math.round(row.distance * 100) / 100 // Round to 2 decimals
      };

      // Filter properties if specified
      if (searchParams.properties) {
        const filteredProps: any = {};
        searchParams.properties.forEach(prop => {
          if (feature.properties[prop] !== undefined) {
            filteredProps[prop] = feature.properties[prop];
          }
        });
        feature.properties = filteredProps;
      }

      return feature;
    });

    const response = {
      type: 'FeatureCollection',
      features,
      metadata: {
        total: features.length,
        radius: searchParams.radius,
        center: {
          latitude: searchParams.latitude,
          longitude: searchParams.longitude
        }
      }
    };

    res.json(response);
    return;

  } catch (error) {
    console.error('Proximity search error:', error);
    
    if (error instanceof z.ZodError) {
      res.status(400).json({
        error: 'Invalid parameters',
        details: error.errors
      });
      return;
    }

    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to perform proximity search'
    });
  }
});

// POST /api/spatial/proximity-search (for complex queries)
router.post('/proximity-search', async (req: Request, res: Response): Promise<void> => {
  try {
    const { center, radius, filters = {}, options = {} } = req.body;

    if (!center || !center.latitude || !center.longitude || !radius) {
      res.status(400).json({
        error: 'Missing required fields: center (latitude, longitude) and radius'
      });
      return;
    }

    // Build complex spatial query
    let query = knex('features')
      .select(
        'id',
        'feature_type',
        'properties',
        'created_at',
        'updated_at',
        knex.raw('ST_AsGeoJSON(geom)::json as geometry'),
        knex.raw(`
          ST_Distance(
            geom::geography,
            ST_SetSRID(ST_MakePoint(?, ?), 4326)::geography
          ) as distance
        `, [center.longitude, center.latitude])
      )
      .whereRaw(`
        ST_DWithin(
          geom::geography,
          ST_SetSRID(ST_MakePoint(?, ?), 4326)::geography,
          ?
        )
      `, [center.longitude, center.latitude, radius]);

    // Apply filters
    if (filters.featureTypes?.length > 0) {
      query = query.whereIn('feature_type', filters.featureTypes);
    }

    if (filters.propertyFilters) {
      Object.entries(filters.propertyFilters).forEach(([key, value]) => {
        query = query.whereRaw('properties->>? = ?', [key, value]);
      });
    }

    if (filters.dateRange) {
      if (filters.dateRange.start) {
        query = query.where('created_at', '>=', filters.dateRange.start);
      }
      if (filters.dateRange.end) {
        query = query.where('created_at', '<=', filters.dateRange.end);
      }
    }

    // Apply options
    query = query
      .orderBy('distance', 'asc')
      .limit(options.limit || 100)
      .offset(options.offset || 0);

    const results = await query;

    // Format response
    const features = results.map(row => {
      let properties = { ...row.properties, feature_type: row.feature_type };

      // Include/exclude properties
      if (options.includeProperties) {
        const filtered: any = {};
        options.includeProperties.forEach((prop: string) => {
          if (properties[prop] !== undefined) {
            filtered[prop] = properties[prop];
          }
        });
        properties = filtered;
      } else if (options.excludeProperties) {
        options.excludeProperties.forEach((prop: string) => {
          delete properties[prop];
        });
      }

      return {
        type: 'Feature',
        id: row.id,
        geometry: row.geometry,
        properties,
        distance: Math.round(row.distance * 100) / 100,
        timestamps: {
          created: row.created_at,
          updated: row.updated_at
        }
      };
    });

    res.json({
      type: 'FeatureCollection',
      features,
      metadata: {
        total: features.length,
        radius,
        center,
        query: {
          filters: filters,
          options: options
        }
      }
    });
    return;

  } catch (error) {
    console.error('Advanced proximity search error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to perform advanced proximity search'
    });
  }
});

// GET /api/spatial/buffer
router.get('/buffer/:featureId', async (req: Request, res: Response): Promise<void> => {
  try {
    const { featureId } = req.params;
    const { radius = 1000, segments = 32 } = req.query;

    const bufferRadius = Number(radius);
    const bufferSegments = Number(segments);

    if (isNaN(bufferRadius) || bufferRadius <= 0) {
      res.status(400).json({
        error: 'Invalid radius parameter'
      });
      return;
    }

    // Generate buffer around feature
    const result = await knex('features')
      .select(
        'id',
        'feature_type',
        'properties',
        knex.raw(`
          ST_AsGeoJSON(
            ST_Buffer(geom::geography, ?)::geometry
          )::json as buffer_geometry
        `, [bufferRadius]),
        knex.raw('ST_Area(ST_Buffer(geom::geography, ?)) as buffer_area', [bufferRadius])
      )
      .where('id', featureId)
      .first();

    if (!result) {
      res.status(404).json({
        error: 'Feature not found'
      });
      return;
    }

    res.json({
      type: 'Feature',
      id: `${result.id}_buffer_${bufferRadius}m`,
      geometry: result.buffer_geometry,
      properties: {
        original_feature_id: result.id,
        original_feature_type: result.feature_type,
        buffer_radius: bufferRadius,
        buffer_area_sqm: Math.round(result.buffer_area),
        buffer_segments: bufferSegments
      }
    });
    return;

  } catch (error) {
    console.error('Buffer generation error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to generate buffer'
    });
  }
});

export default router;