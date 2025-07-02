import { db } from '../config/database';
import { CreateFeatureData } from '../models/Feature';
import { PostGISService } from './PostGISService';
import { Dataset, Layer } from '../database/schema';
import { FieldMapping } from '../controllers/enhancedUploadController';
import { SupportedFileType } from '../utils/fileValidation';

export interface ImportOptions {
  datasetName: string;
  description?: string;
  fieldMapping: FieldMapping[];
  batchSize?: number;
}

export interface ImportProgress {
  total: number;
  processed: number;
  errors: number;
  percentage: number;
}

export interface ImportResult {
  success: boolean;
  datasetId?: string;
  layerId?: string;
  featuresImported: number;
  errors: any[];
  warnings: string[];
}

export class DataImportService {
  private importSessionId?: string;
  private onProgress?: (progress: ImportProgress) => void;

  constructor(onProgress?: (progress: ImportProgress) => void) {
    this.onProgress = onProgress;
  }

  async importData(
    data: Record<string, any>[],
    fileType: SupportedFileType,
    filename: string,
    options: ImportOptions
  ): Promise<ImportResult> {
    const trx = await db.transaction();
    const errors: any[] = [];
    const warnings: string[] = [];
    let dataset: Dataset | null = null;
    let layer: Layer | null = null;
    let featuresImported = 0;

    try {
      // Create import session
      const [importSession] = await trx('import_sessions').insert({
        filename,
        file_type: fileType,
        status: 'processing',
        total_rows: data.length,
        field_mapping: JSON.stringify(options.fieldMapping),
        started_at: new Date()
      }).returning('*');

      this.importSessionId = importSession.id;

      // Create dataset
      dataset = await this.createDataset(trx, {
        name: options.datasetName,
        description: options.description,
        type: this.detectGeometryType(data, options.fieldMapping),
        source_format: fileType,
        original_filename: filename,
        feature_count: 0
      });

      // Update import session with dataset ID
      await trx('import_sessions')
        .where('id', this.importSessionId)
        .update({ dataset_id: dataset.id });

      // Create layer
      layer = await this.createLayer(trx, {
        dataset_id: dataset.id,
        name: `${options.datasetName} - Layer 1`,
        geometry_type: 'GEOMETRY',
        feature_count: 0
      });

      // Import features in batches
      const batchSize = options.batchSize || 100;
      const batches = this.createBatches(data, batchSize);

      for (let i = 0; i < batches.length; i++) {
        const batch = batches[i];
        const batchResults = await this.importBatch(
          trx,
          batch,
          layer.id,
          options.fieldMapping,
          i * batchSize
        );

        featuresImported += batchResults.imported;
        errors.push(...batchResults.errors);

        // Update progress
        const processed = Math.min((i + 1) * batchSize, data.length);
        await this.updateProgress(trx, processed, errors.length);
      }

      // Update counts
      await this.updateCounts(trx, dataset.id, layer.id);

      // Complete import session
      await trx('import_sessions')
        .where('id', this.importSessionId)
        .update({
          status: 'completed',
          processed_rows: data.length,
          error_count: errors.length,
          errors: errors.length > 0 ? JSON.stringify(errors) : null,
          completed_at: new Date()
        });

      await trx.commit();

      return {
        success: true,
        datasetId: dataset.id,
        layerId: layer.id,
        featuresImported,
        errors,
        warnings
      };

    } catch (error) {
      await trx.rollback();

      if (this.importSessionId) {
        await db('import_sessions')
          .where('id', this.importSessionId)
          .update({
            status: 'failed',
            errors: JSON.stringify([{ message: error instanceof Error ? error.message : 'Unknown error' }]),
            completed_at: new Date()
          });
      }

      throw error;
    }
  }

  private async createDataset(trx: any, data: any): Promise<Dataset> {
    const [dataset] = await trx('datasets').insert(data).returning('*');
    return dataset;
  }

  private async createLayer(trx: any, data: any): Promise<Layer> {
    const [layer] = await trx('layers').insert(data).returning('*');
    return layer;
  }

  private detectGeometryType(
    data: Record<string, any>[],
    fieldMapping: FieldMapping[]
  ): 'point' | 'linestring' | 'polygon' | 'mixed' {
    const hasLatLng = fieldMapping.some(fm => 
      fm.type === 'coordinate' && 
      (fm.targetField === 'latitude' || fm.targetField === 'longitude')
    );

    const hasGeometry = fieldMapping.some(fm => fm.type === 'geometry');

    if (hasLatLng && !hasGeometry) {
      return 'point';
    }

    if (hasGeometry) {
      // Sample first few rows to detect geometry type
      const geometryField = fieldMapping.find(fm => fm.type === 'geometry')?.sourceField;
      if (geometryField) {
        const types = new Set<string>();
        
        for (let i = 0; i < Math.min(5, data.length); i++) {
          const geom = data[i][geometryField];
          if (geom && typeof geom === 'string') {
            if (geom.startsWith('POINT')) types.add('point');
            else if (geom.startsWith('LINESTRING')) types.add('linestring');
            else if (geom.startsWith('POLYGON')) types.add('polygon');
          }
        }

        if (types.size === 1) {
          return Array.from(types)[0] as any;
        }
      }
    }

    return 'mixed';
  }

  private createBatches<T>(array: T[], batchSize: number): T[][] {
    const batches: T[][] = [];
    for (let i = 0; i < array.length; i += batchSize) {
      batches.push(array.slice(i, i + batchSize));
    }
    return batches;
  }

  private async importBatch(
    trx: any,
    batch: Record<string, any>[],
    layerId: string,
    fieldMapping: FieldMapping[],
    startIndex: number
  ): Promise<{ imported: number; errors: any[] }> {
    const features: CreateFeatureData[] = [];
    const errors: any[] = [];

    for (let i = 0; i < batch.length; i++) {
      const row = batch[i];
      const rowIndex = startIndex + i + 1;

      try {
        const feature = await this.convertRowToFeature(row, layerId, fieldMapping);
        features.push(feature);
      } catch (error) {
        errors.push({
          row: rowIndex,
          error: error instanceof Error ? error.message : 'Unknown error',
          data: row
        });
      }
    }

    if (features.length > 0) {
      // Insert features in batch
      const insertData = features.map(feature => {
        const item: any = {
          layer_id: feature.layer_id,
          properties: JSON.stringify(feature.properties)
        };

        if (feature.geometry) {
          item.geometry = trx.raw(
            'ST_GeomFromGeoJSON(?)',
            [JSON.stringify(feature.geometry)]
          );
        } else if (feature.wkt) {
          item.geometry = trx.raw(
            'ST_GeomFromText(?, 4326)',
            [feature.wkt]
          );
        }

        return item;
      });

      await trx('features').insert(insertData);
    }

    return {
      imported: features.length,
      errors
    };
  }

  private async convertRowToFeature(
    row: Record<string, any>,
    layerId: string,
    fieldMapping: FieldMapping[]
  ): Promise<CreateFeatureData> {
    const properties: Record<string, any> = {};
    let geometry: any = null;
    let wkt: string | undefined;
    let lat: number | undefined;
    let lng: number | undefined;

    for (const mapping of fieldMapping) {
      const value = row[mapping.sourceField];

      if (value === null || value === undefined || value === '') {
        continue;
      }

      switch (mapping.type) {
        case 'coordinate':
          const coord = parseFloat(value);
          if (isNaN(coord)) {
            throw new Error(`Invalid coordinate value: ${value}`);
          }
          
          if (mapping.targetField === 'latitude') {
            lat = coord;
            properties[mapping.targetField] = coord;
          } else if (mapping.targetField === 'longitude') {
            lng = coord;
            properties[mapping.targetField] = coord;
          }
          break;

        case 'geometry':
          if (typeof value === 'string') {
            // Check if it's WKT
            if (value.match(/^(POINT|LINESTRING|POLYGON|MULTIPOINT|MULTILINESTRING|MULTIPOLYGON)/i)) {
              const validation = await PostGISService.validateGeometry(value);
              if (!validation.isValid) {
                // Try to repair
                wkt = await PostGISService.repairGeometry(value);
              } else {
                wkt = value;
              }
            } else {
              // Try to parse as GeoJSON
              try {
                geometry = JSON.parse(value);
              } catch (e) {
                throw new Error(`Invalid geometry format: ${value}`);
              }
            }
          } else if (typeof value === 'object') {
            geometry = value;
          }
          break;

        case 'number':
          const num = parseFloat(value);
          if (!isNaN(num)) {
            properties[mapping.targetField] = num;
          }
          break;

        case 'date':
          const date = new Date(value);
          if (!isNaN(date.getTime())) {
            properties[mapping.targetField] = date.toISOString();
          }
          break;

        case 'string':
        default:
          properties[mapping.targetField] = String(value);
          break;
      }
    }

    // Create point geometry from lat/lng if no geometry provided
    if (!geometry && !wkt && lat !== undefined && lng !== undefined) {
      wkt = await PostGISService.createPointFromCoordinates(lng, lat);
    }

    if (!geometry && !wkt) {
      throw new Error('No valid geometry found');
    }

    return {
      layer_id: layerId,
      properties,
      geometry,
      wkt
    };
  }

  private async updateProgress(trx: any, processed: number, errorCount: number): Promise<void> {
    if (this.importSessionId) {
      await trx('import_sessions')
        .where('id', this.importSessionId)
        .update({
          processed_rows: processed,
          error_count: errorCount
        });
    }

    if (this.onProgress) {
      const session = await trx('import_sessions')
        .where('id', this.importSessionId)
        .first();

      this.onProgress({
        total: session.total_rows,
        processed,
        errors: errorCount,
        percentage: Math.round((processed / session.total_rows) * 100)
      });
    }
  }

  private async updateCounts(trx: any, datasetId: string, layerId: string): Promise<void> {
    // Update layer feature count
    await trx.raw(`
      UPDATE layers
      SET feature_count = (
        SELECT COUNT(*)
        FROM features
        WHERE layer_id = ?
      )
      WHERE id = ?
    `, [layerId, layerId]);

    // Update dataset bounds and feature count
    await trx.raw(`
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
    `, [datasetId]);
  }
}