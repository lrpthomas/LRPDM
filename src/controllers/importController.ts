import { Request, Response } from 'express';
import { DataImportService, ImportProgress } from '../services/DataImportService';
import { testConnection, checkPostGIS } from '../config/database';
import { 
  UploadRequest,
  ParsedFileResult,
  FieldMapping 
} from './enhancedUploadController';
import { SupportedFileType } from '../utils/fileValidation';
import fs from 'fs';

export interface ImportRequest extends UploadRequest {
  body: {
    datasetName: string;
    description?: string;
    fieldMapping: string;
    parseOptions?: string;
  };
}

export const importFile = async (req: ImportRequest, res: Response) => {
  let filePath: string | undefined;
  let fullData: Record<string, any>[] = [];

  try {
    // Validate request
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No file uploaded'
      });
    }

    if (!req.body.datasetName) {
      return res.status(400).json({
        success: false,
        error: 'Dataset name is required'
      });
    }

    if (!req.body.fieldMapping) {
      return res.status(400).json({
        success: false,
        error: 'Field mapping is required'
      });
    }

    // Check database connection
    const dbConnected = await testConnection();
    if (!dbConnected) {
      return res.status(503).json({
        success: false,
        error: 'Database connection failed',
        message: 'Please check your database configuration'
      });
    }

    // Check PostGIS
    const hasPostGIS = await checkPostGIS();
    if (!hasPostGIS) {
      return res.status(503).json({
        success: false,
        error: 'PostGIS not available',
        message: 'Please install PostGIS extension in your database'
      });
    }

    filePath = req.file.path;
    const fieldMapping: FieldMapping[] = JSON.parse(req.body.fieldMapping);
    const parseOptions = req.body.parseOptions ? JSON.parse(req.body.parseOptions) : {};

    // Detect file type
    const ext = req.file.originalname.toLowerCase();
    let fileType: SupportedFileType;

    if (ext.endsWith('.csv')) {
      fileType = SupportedFileType.CSV;
    } else if (ext.endsWith('.xlsx') || ext.endsWith('.xls')) {
      fileType = SupportedFileType.EXCEL;
    } else if (ext.endsWith('.geojson') || ext.endsWith('.json')) {
      fileType = SupportedFileType.GEOJSON;
    } else if (ext.endsWith('.zip')) {
      fileType = SupportedFileType.SHAPEFILE;
    } else {
      throw new Error('Unsupported file type');
    }

    // Parse full file (not just preview)
    switch (fileType) {
      case SupportedFileType.CSV:
        fullData = await parseCSVFullFile(filePath);
        break;
      case SupportedFileType.EXCEL:
        fullData = await parseExcelFullFile(filePath, parseOptions.sheetName);
        break;
      case SupportedFileType.GEOJSON:
        const geoResult = await GeoJSONParser.parseFile(filePath, { maxFeatures: undefined });
        fullData = geoResult.data;
        break;
      case SupportedFileType.SHAPEFILE:
        const shpResult = await ShapefileParser.parseFile(filePath, { maxFeatures: undefined });
        fullData = shpResult.data;
        break;
    }

    // Import data with progress tracking
    const importService = new DataImportService((progress: ImportProgress) => {
      console.log(`Import progress: ${progress.percentage}% (${progress.processed}/${progress.total})`);
    });

    const importResult = await importService.importData(
      fullData,
      fileType,
      req.file.originalname,
      {
        datasetName: req.body.datasetName,
        description: req.body.description,
        fieldMapping,
        batchSize: 100
      }
    );

    // Return success response
    return res.status(200).json({
      success: true,
      message: 'Data imported successfully',
      filename: req.file.originalname,
      datasetId: importResult.datasetId,
      layerId: importResult.layerId,
      featuresImported: importResult.featuresImported,
      errors: importResult.errors,
      warnings: importResult.warnings
    });

  } catch (error) {
    console.error('Import error:', error);
    
    return res.status(500).json({
      success: false,
      error: 'Import failed',
      message: error instanceof Error ? error.message : 'Unknown error occurred'
    });
  } finally {
    // Clean up uploaded file
    if (filePath && fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
      } catch (cleanupError) {
        console.error('Failed to clean up uploaded file:', cleanupError);
      }
    }
  }
};

// Helper to parse full CSV file
async function parseCSVFullFile(filePath: string): Promise<Record<string, any>[]> {
  const csv = require('csv-parser');
  return new Promise((resolve, reject) => {
    const data: Record<string, any>[] = [];

    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (row: Record<string, any>) => {
        data.push(row);
      })
      .on('end', () => {
        resolve(data);
      })
      .on('error', (error: Error) => {
        reject(error);
      });
  });
}

// Helper to parse full Excel file
async function parseExcelFullFile(filePath: string, sheetName?: string): Promise<Record<string, any>[]> {
  const XLSX = require('xlsx');
  const workbook = XLSX.readFile(filePath);
  const sheet = workbook.Sheets[sheetName || workbook.SheetNames[0]];
  return XLSX.utils.sheet_to_json(sheet);
}

// Import GeoJSON parser
import { GeoJSONParser } from '../services/parsers/geojsonParser';
import { ShapefileParser } from '../services/parsers/shapefileParser';