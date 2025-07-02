import { db } from '../config/database';
import { Feature } from '../database/schema';

export interface CreateFeatureData {
  layer_id: string;
  properties: Record<string, any>;
  geometry?: {
    type: string;
    coordinates: any;
  };
  wkt?: string;
}

export interface FeatureQuery {
  layerId?: string;
  bbox?: [number, number, number, number];
  properties?: Record<string, any>;
  limit?: number;
  offset?: number;
}

export class FeatureModel {
  static async create(data: CreateFeatureData): Promise<Feature> {
    let geometrySQL = null;

    if (data.geometry) {
      // Create geometry from GeoJSON
      geometrySQL = db.raw(
        'ST_GeomFromGeoJSON(?)',
        [JSON.stringify(data.geometry)]
      );
    } else if (data.wkt) {
      // Create geometry from WKT
      geometrySQL = db.raw(
        'ST_GeomFromText(?, 4326)',
        [data.wkt]
      );
    }

    const insertData: any = {
      layer_id: data.layer_id,
      properties: JSON.stringify(data.properties)
    };

    if (geometrySQL) {
      insertData.geometry = geometrySQL;
    }

    const [feature] = await db('features')
      .insert(insertData)
      .returning(['id', 'layer_id', 'properties', 'created_at', 'updated_at']);
    
    return feature;
  }

  static async createBatch(features: CreateFeatureData[]): Promise<number> {
    const insertData = features.map(data => {
      const item: any = {
        layer_id: data.layer_id,
        properties: JSON.stringify(data.properties)
      };

      if (data.geometry) {
        item.geometry = db.raw(
          'ST_GeomFromGeoJSON(?)',
          [JSON.stringify(data.geometry)]
        );
      } else if (data.wkt) {
        item.geometry = db.raw(
          'ST_GeomFromText(?, 4326)',
          [data.wkt]
        );
      }

      return item;
    });

    const result = await db('features').insert(insertData);
    return result.length;
  }

  static async findById(id: string): Promise<Feature | null> {
    const feature = await db('features')
      .select(
        'id',
        'layer_id',
        'properties',
        db.raw('ST_AsGeoJSON(geometry) as geometry'),
        'created_at',
        'updated_at'
      )
      .where('id', id)
      .first();
    
    if (feature && feature.geometry) {
      feature.geometry = JSON.parse(feature.geometry);
    }
    
    return feature || null;
  }

  static async find(query: FeatureQuery): Promise<Feature[]> {
    let q = db('features')
      .select(
        'id',
        'layer_id',
        'properties',
        db.raw('ST_AsGeoJSON(geometry) as geometry'),
        'created_at',
        'updated_at'
      );

    if (query.layerId) {
      q = q.where('layer_id', query.layerId);
    }

    if (query.bbox) {
      const [minLng, minLat, maxLng, maxLat] = query.bbox;
      q = q.whereRaw(
        'geometry && ST_MakeEnvelope(?, ?, ?, ?, 4326)',
        [minLng, minLat, maxLng, maxLat]
      );
    }

    if (query.properties) {
      Object.entries(query.properties).forEach(([key, value]) => {
        q = q.whereRaw('properties->>? = ?', [key, value]);
      });
    }

    if (query.limit) {
      q = q.limit(query.limit);
    }

    if (query.offset) {
      q = q.offset(query.offset);
    }

    const features = await q;

    // Parse geometry JSON
    return features.map(feature => {
      if (feature.geometry) {
        feature.geometry = JSON.parse(feature.geometry);
      }
      return feature;
    });
  }

  static async delete(id: string): Promise<boolean> {
    const deleted = await db('features')
      .where('id', id)
      .delete();
    
    return deleted > 0;
  }

  static async deleteByLayerId(layerId: string): Promise<number> {
    return db('features')
      .where('layer_id', layerId)
      .delete();
  }

  // Spatial queries
  static async findWithinDistance(
    point: { lng: number; lat: number },
    distanceMeters: number,
    layerId?: string
  ): Promise<Feature[]> {
    let q = db('features')
      .select(
        'id',
        'layer_id',
        'properties',
        db.raw('ST_AsGeoJSON(geometry) as geometry'),
        db.raw('ST_Distance(geometry::geography, ST_MakePoint(?, ?)::geography) as distance', [point.lng, point.lat]),
        'created_at',
        'updated_at'
      )
      .whereRaw(
        'ST_DWithin(geometry::geography, ST_MakePoint(?, ?)::geography, ?)',
        [point.lng, point.lat, distanceMeters]
      )
      .orderBy('distance', 'asc');

    if (layerId) {
      q = q.where('layer_id', layerId);
    }

    const features = await q;

    return features.map(feature => {
      if (feature.geometry) {
        feature.geometry = JSON.parse(feature.geometry);
      }
      return feature;
    });
  }

  static async findIntersecting(
    geometry: any,
    layerId?: string
  ): Promise<Feature[]> {
    let q = db('features')
      .select(
        'id',
        'layer_id',
        'properties',
        db.raw('ST_AsGeoJSON(geometry) as geometry'),
        'created_at',
        'updated_at'
      );

    if (typeof geometry === 'string') {
      // WKT geometry
      q = q.whereRaw(
        'ST_Intersects(geometry, ST_GeomFromText(?, 4326))',
        [geometry]
      );
    } else {
      // GeoJSON geometry
      q = q.whereRaw(
        'ST_Intersects(geometry, ST_GeomFromGeoJSON(?))',
        [JSON.stringify(geometry)]
      );
    }

    if (layerId) {
      q = q.where('layer_id', layerId);
    }

    const features = await q;

    return features.map(feature => {
      if (feature.geometry) {
        feature.geometry = JSON.parse(feature.geometry);
      }
      return feature;
    });
  }
}