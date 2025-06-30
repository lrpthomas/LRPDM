import { db } from '../config/database';
import { Layer } from '../database/schema';

export class LayerModel {
  static async create(data: Omit<Layer, 'id' | 'created_at' | 'updated_at'>): Promise<Layer> {
    const [layer] = await db('layers')
      .insert(data)
      .returning('*');
    
    return layer;
  }

  static async findById(id: string): Promise<Layer | null> {
    const layer = await db('layers')
      .where('id', id)
      .first();
    
    return layer || null;
  }

  static async findByDatasetId(datasetId: string): Promise<Layer[]> {
    return db('layers')
      .where('dataset_id', datasetId)
      .orderBy('created_at', 'asc');
  }

  static async update(id: string, data: Partial<Layer>): Promise<Layer | null> {
    const [layer] = await db('layers')
      .where('id', id)
      .update({
        ...data,
        updated_at: new Date()
      })
      .returning('*');
    
    return layer || null;
  }

  static async delete(id: string): Promise<boolean> {
    const deleted = await db('layers')
      .where('id', id)
      .delete();
    
    return deleted > 0;
  }

  static async updateFeatureCount(id: string): Promise<void> {
    await db.raw(`
      UPDATE layers
      SET feature_count = (
        SELECT COUNT(*)
        FROM features
        WHERE layer_id = ?
      )
      WHERE id = ?
    `, [id, id]);
  }

  static async getStatistics(id: string): Promise<{
    featureCount: number;
    bounds: any;
    geometryTypes: string[];
  } | null> {
    const result = await db.raw(`
      SELECT 
        COUNT(*) as feature_count,
        ST_AsGeoJSON(ST_Extent(geometry)) as bounds,
        array_agg(DISTINCT ST_GeometryType(geometry)) as geometry_types
      FROM features
      WHERE layer_id = ?
    `, [id]);

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return {
      featureCount: parseInt(row.feature_count),
      bounds: row.bounds ? JSON.parse(row.bounds) : null,
      geometryTypes: row.geometry_types || []
    };
  }
}