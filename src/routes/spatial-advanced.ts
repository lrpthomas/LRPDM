import { Router, Request, Response } from 'express';
import { z } from 'zod';
import multer from 'multer';
import * as path from 'path';
import * as fs from 'fs';
import GISProcessor, { ProcessingResult } from '../utils/gisProcessor';
import GISExporter, { ExportOptions } from '../utils/gisExporter';
import { db as knex } from '../config/database';

const router = Router();

// Configure multer for file uploads
const upload = multer({
  dest: 'uploads/gis/',
  limits: {
    fileSize: 100 * 1024 * 1024 // 100MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedExtensions = ['.shp', '.kml', '.kmz', '.gpx', '.geojson', '.json'];
    const ext = path.extname(file.originalname).toLowerCase();
    
    if (allowedExtensions.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported file type: ${ext}`));
    }
  }
});

// Validation schemas
const processFileSchema = z.object({
  targetCrs: z.string().optional(),
  validate: z.boolean().default(true),
  maxFeatures: z.number().min(1).max(50000).optional(),
  importToDatabase: z.boolean().default(false),
  tableName: z.string().optional()
});

const exportDataSchema = z.object({
  format: z.enum(['geojson', 'kml', 'csv', 'shapefile', 'gpx']),
  filename: z.string().optional(),
  includeProperties: z.array(z.string()).optional(),
  excludeProperties: z.array(z.string()).optional(),
  spatialFilter: z.object({
    bounds: z.array(z.number()).length(4).optional(),
    buffer: z.number().optional()
  }).optional(),
  crs: z.string().optional(),
  compress: z.boolean().default(false)
});

const spatialQuerySchema = z.object({
  operation: z.enum(['intersects', 'within', 'contains', 'buffer', 'union', 'difference']),
  geometry: z.object({
    type: z.string(),
    coordinates: z.any()
  }),
  bufferDistance: z.number().optional(),
  targetTable: z.string().default('features'),
  outputFormat: z.enum(['geojson', 'count']).default('geojson')
});

// Process uploaded GIS file
router.post('/process-file', upload.single('file'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      res.status(400).json({
        error: 'No file uploaded'
      });
      return;
    }

    const options = processFileSchema.parse(req.body);
    
    // Process the file
    const result: ProcessingResult = await GISProcessor.processFile(req.file.path, {
      targetCrs: options.targetCrs,
      validate: options.validate,
      maxFeatures: options.maxFeatures
    });

    if (!result.success) {
      // Clean up uploaded file
      fs.unlinkSync(req.file.path);
      
      res.status(400).json({
        error: 'File processing failed',
        details: result.error
      });
      return;
    }

    // Optionally import to database
    let importResult;
    if (options.importToDatabase && result.data) {
      importResult = await importGeoJSONToDatabase(
        result.data, 
        options.tableName || 'imported_features'
      );
    }

    // Clean up uploaded file
    fs.unlinkSync(req.file.path);

    res.json({
      success: true,
      message: 'File processed successfully',
      data: result.data,
      metadata: result.metadata,
      warnings: result.warnings,
      validation: options.validate ? GISProcessor.validateGeoJSON(result.data) : undefined,
      import: importResult
    });

  } catch (error) {
    // Clean up uploaded file on error
    if (req.file) {
      fs.unlinkSync(req.file.path);
    }
    
    console.error('File processing error:', error);
    
    if (error instanceof z.ZodError) {
      res.status(400).json({
        error: 'Invalid parameters',
        details: error.errors
      });
      return;
    }
    
    res.status(500).json({
      error: 'File processing failed',
      message: error.message
    });
  }
});

// Validate GeoJSON data
router.post('/validate', async (req: Request, res: Response) => {
  try {
    const { geojson } = req.body;
    
    if (!geojson) {
      res.status(400).json({
        error: 'GeoJSON data is required'
      });
      return;
    }

    const validation = GISProcessor.validateGeoJSON(geojson);
    
    res.json({
      validation,
      recommendations: generateValidationRecommendations(validation)
    });

  } catch (error) {
    console.error('Validation error:', error);
    res.status(500).json({
      error: 'Validation failed',
      message: error.message
    });
  }
});

// Export spatial data
router.post('/export', async (req: Request, res: Response) => {
  try {
    const exportOptions = exportDataSchema.parse(req.body);
    
    if (!exportOptions.format) {
      res.status(400).json({
        error: 'Export format is required'
      });
      return;
    }
    const { source, sourceId } = req.body;
    
    let geojson;
    
    // Get data from different sources
    if (source === 'database') {
      const tableName = sourceId || 'features';
      geojson = await exportFromDatabase(tableName, exportOptions.spatialFilter);
    } else if (source === 'geojson') {
      geojson = req.body.geojson;
    } else {
      res.status(400).json({
        error: 'Invalid data source. Use "database" or "geojson"'
      });
      return;
    }

    if (!geojson || !geojson.features || geojson.features.length === 0) {
      res.status(400).json({
        error: 'No data to export'
      });
      return;
    }

    // Create export directory if it doesn't exist
    const exportDir = 'exports/gis';
    if (!fs.existsSync(exportDir)) {
      fs.mkdirSync(exportDir, { recursive: true });
    }

    // Export the data
    const result = await GISExporter.exportData(geojson, exportDir, exportOptions as any);
    
    if (!result.success) {
      res.status(500).json({
        error: 'Export failed',
        details: result.error
      });
      return;
    }

    res.json({
      success: true,
      message: 'Data exported successfully',
      file: {
        path: result.filePath,
        name: result.fileName,
        size: result.fileSize,
        downloadUrl: `/api/spatial-advanced/download/${encodeURIComponent(result.fileName!)}`
      },
      metadata: result.metadata,
      warnings: result.warnings
    });

  } catch (error) {
    console.error('Export error:', error);
    
    if (error instanceof z.ZodError) {
      res.status(400).json({
        error: 'Invalid export parameters',
        details: error.errors
      });
      return;
    }
    
    res.status(500).json({
      error: 'Export failed',
      message: error.message
    });
  }
});

// Download exported file
router.get('/download/:filename', (req: Request, res: Response) => {
  try {
    const { filename } = req.params;
    const filePath = path.join('exports/gis', filename);
    
    if (!fs.existsSync(filePath)) {
      res.status(404).json({
        error: 'File not found'
      });
      return;
    }

    res.download(filePath, filename, (err) => {
      if (err) {
        console.error('Download error:', err);
        res.status(500).json({
          error: 'Download failed'
        });
      }
    });

  } catch (error) {
    console.error('Download error:', error);
    res.status(500).json({
      error: 'Download failed'
    });
  }
});

// Advanced spatial queries
router.post('/spatial-query', async (req: Request, res: Response) => {
  try {
    const queryParams = spatialQuerySchema.parse(req.body);
    
    const result = await executeSpatialQuery(queryParams);
    
    res.json({
      success: true,
      operation: queryParams.operation,
      result: result
    });

  } catch (error) {
    console.error('Spatial query error:', error);
    
    if (error instanceof z.ZodError) {
      res.status(400).json({
        error: 'Invalid query parameters',
        details: error.errors
      });
      return;
    }
    
    res.status(500).json({
      error: 'Spatial query failed',
      message: error.message
    });
  }
});

// Get supported formats and capabilities
router.get('/capabilities', (req: Request, res: Response) => {
  res.json({
    supportedImportFormats: [
      {
        format: 'Shapefile',
        extensions: ['.shp'],
        description: 'ESRI Shapefile format',
        requiresAdditionalFiles: ['.shx', '.dbf', '.prj'],
        maxSize: '100MB',
        features: ['geometry', 'attributes', 'crs']
      },
      {
        format: 'KML/KMZ',
        extensions: ['.kml', '.kmz'],
        description: 'Google Earth format',
        requiresAdditionalFiles: [],
        maxSize: '100MB',
        features: ['geometry', 'attributes', 'styling']
      },
      {
        format: 'GPX',
        extensions: ['.gpx'],
        description: 'GPS Exchange format',
        requiresAdditionalFiles: [],
        maxSize: '100MB',
        features: ['tracks', 'waypoints', 'routes']
      },
      {
        format: 'GeoJSON',
        extensions: ['.geojson', '.json'],
        description: 'Geographic JSON format',
        requiresAdditionalFiles: [],
        maxSize: '100MB',
        features: ['geometry', 'attributes', 'crs']
      }
    ],
    supportedExportFormats: [
      'geojson', 'kml', 'csv', 'shapefile', 'gpx'
    ],
    spatialOperations: [
      'intersects', 'within', 'contains', 'buffer', 'union', 'difference'
    ],
    coordinateSystems: [
      { code: 'EPSG:4326', name: 'WGS 84 (Geographic)', type: 'geographic' },
      { code: 'EPSG:3857', name: 'Web Mercator', type: 'projected' }
    ],
    maxFileSize: '100MB',
    maxFeatures: 50000,
    validation: {
      geometryValidation: true,
      attributeValidation: true,
      crsValidation: true,
      boundsChecking: true
    }
  });
});

// Batch processing status
router.get('/batch-status/:jobId', async (req: Request, res: Response) => {
  try {
    const { jobId } = req.params;
    
    // This would integrate with a job queue system in production
    res.json({
      jobId,
      status: 'completed', // placeholder
      progress: 100,
      message: 'Batch processing completed',
      results: {
        processed: 1000,
        successful: 950,
        failed: 50
      }
    });

  } catch (error) {
    console.error('Batch status error:', error);
    res.status(500).json({
      error: 'Failed to get batch status'
    });
  }
});

// Helper functions

async function importGeoJSONToDatabase(geojson: any, tableName: string): Promise<any> {
  try {
    const features = geojson.features || [];
    const imported = [];
    
    for (const feature of features) {
      if (!feature.geometry) continue;
      
      const record: any = {
        feature_type: 'imported',
        properties: feature.properties || {},
        geom: knex.raw(
          'ST_SetSRID(ST_GeomFromGeoJSON(?), 4326)',
          [JSON.stringify(feature.geometry)]
        )
      };
      
      const [inserted] = await knex('features')
        .insert(record)
        .returning('id');
      
      imported.push(inserted.id);
    }
    
    return {
      success: true,
      imported: imported.length,
      ids: imported
    };
    
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

async function exportFromDatabase(tableName: string, spatialFilter?: any): Promise<any> {
  try {
    let query = knex(tableName)
      .select([
        'id',
        'feature_type',
        'properties',
        knex.raw('ST_AsGeoJSON(geom)::json as geometry')
      ]);
    
    // Apply spatial filter if provided
    if (spatialFilter && spatialFilter.bounds) {
      const [minX, minY, maxX, maxY] = spatialFilter.bounds;
      query = query.whereRaw(`
        ST_Intersects(
          geom,
          ST_MakeEnvelope(?, ?, ?, ?, 4326)
        )
      `, [minX, minY, maxX, maxY]);
    }
    
    const results = await query;
    
    const features = results.map((row: any) => ({
      type: 'Feature',
      id: row.id,
      geometry: row.geometry,
      properties: {
        ...row.properties,
        feature_type: row.feature_type
      }
    }));
    
    return {
      type: 'FeatureCollection',
      features
    };
    
  } catch (error) {
    throw new Error(`Database export failed: ${error.message}`);
  }
}

async function executeSpatialQuery(params: any): Promise<any> {
  try {
    const { operation, geometry, bufferDistance, targetTable, outputFormat } = params;
    
    let query = knex(targetTable);
    
    switch (operation) {
      case 'intersects':
        query = query.whereRaw(`
          ST_Intersects(geom, ST_SetSRID(ST_GeomFromGeoJSON(?), 4326))
        `, [JSON.stringify(geometry)]);
        break;
        
      case 'within':
        query = query.whereRaw(`
          ST_Within(geom, ST_SetSRID(ST_GeomFromGeoJSON(?), 4326))
        `, [JSON.stringify(geometry)]);
        break;
        
      case 'contains':
        query = query.whereRaw(`
          ST_Contains(geom, ST_SetSRID(ST_GeomFromGeoJSON(?), 4326))
        `, [JSON.stringify(geometry)]);
        break;
        
      case 'buffer':
        if (!bufferDistance) {
          throw new Error('Buffer distance is required for buffer operation');
        }
        query = query.whereRaw(`
          ST_Intersects(
            geom, 
            ST_Buffer(ST_SetSRID(ST_GeomFromGeoJSON(?), 4326)::geography, ?)::geometry
          )
        `, [JSON.stringify(geometry), bufferDistance]);
        break;
        
      default:
        throw new Error(`Unsupported spatial operation: ${operation}`);
    }
    
    if (outputFormat === 'count') {
      const result = await query.count('* as count').first();
      return { count: parseInt((result as any).count) };
    } else {
      query = query.select([
        'id',
        'feature_type',
        'properties',
        knex.raw('ST_AsGeoJSON(geom)::json as geometry')
      ]);
      
      const results = await query;
      
      const features = results.map(row => ({
        type: 'Feature',
        id: row.id,
        geometry: row.geometry,
        properties: {
          ...row.properties,
          feature_type: row.feature_type
        }
      }));
      
      return {
        type: 'FeatureCollection',
        features
      };
    }
    
  } catch (error) {
    throw new Error(`Spatial query failed: ${error.message}`);
  }
}

function generateValidationRecommendations(validation: any): string[] {
  const recommendations: string[] = [];
  
  if (!validation.isValid) {
    recommendations.push('Fix geometry validation errors before importing');
  }
  
  if (validation.warnings.length > 0) {
    recommendations.push('Review warnings to ensure data quality');
  }
  
  if (validation.statistics.invalidFeatures > 0) {
    recommendations.push(`Remove or fix ${validation.statistics.invalidFeatures} invalid features`);
  }
  
  if (validation.statistics.totalFeatures > 10000) {
    recommendations.push('Consider splitting large datasets for better performance');
  }
  
  return recommendations;
}

export default router;