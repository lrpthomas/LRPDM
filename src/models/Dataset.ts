import { db } from '../config/database';
import { Dataset } from '../database/schema';

export class DatasetModel {
  static async create(data: Omit<Dataset, 'id' | 'created_at' | 'updated_at'>): Promise<Dataset> {
    const [dataset] = await db('datasets')
      .insert(data)
      .returning('*');
    
    return dataset;
  }

  static async findById(id: string): Promise<Dataset | null> {
    const dataset = await db('datasets')
      .where('id', id)
      .first();
    
    return dataset || null;
  }

  static async findAll(options?: {
    limit?: number;
    offset?: number;
    orderBy?: string;
    order?: 'asc' | 'desc';
  }): Promise<Dataset[]> {
    let query = db('datasets');

    if (options?.orderBy) {
      query = query.orderBy(options.orderBy, options.order || 'desc');
    } else {
      query = query.orderBy('created_at', 'desc');
    }

    if (options?.limit) {
      query = query.limit(options.limit);
    }

    if (options?.offset) {
      query = query.offset(options.offset);
    }

    return query;
  }

  static async update(id: string, data: Partial<Dataset>): Promise<Dataset | null> {
    const [dataset] = await db('datasets')
      .where('id', id)
      .update({
        ...data,
        updated_at: new Date()
      })
      .returning('*');
    
    return dataset || null;
  }

  static async delete(id: string): Promise<boolean> {
    const deleted = await db('datasets')
      .where('id', id)
      .delete();
    
    return deleted > 0;
  }

  static async updateBounds(id: string): Promise<void> {
    await db.raw(`
      UPDATE datasets d
      SET 
        min_lng = subq.min_lng,
        min_lat = subq.min_lat,
        max_lng = subq.max_lng,
        max_lat = subq.max_lat,
        feature_count = subq.feature_count
      FROM (
        SELECT 
          l.dataset_id,
          COUNT(f.id) as feature_count,
          ST_XMin(ST_Extent(f.geometry)) as min_lng,
          ST_YMin(ST_Extent(f.geometry)) as min_lat,
          ST_XMax(ST_Extent(f.geometry)) as max_lng,
          ST_YMax(ST_Extent(f.geometry)) as max_lat
        FROM layers l
        JOIN features f ON l.id = f.layer_id
        WHERE l.dataset_id = ?
        GROUP BY l.dataset_id
      ) subq
      WHERE d.id = subq.dataset_id
    `, [id]);
  }
}