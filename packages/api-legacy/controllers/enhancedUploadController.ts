import { Request, Response } from 'express';
import multer from 'multer';
import csv from 'csv-parser';
import fs from 'fs';
import path from 'path';
import { validateFile, SupportedFileType, detectFileType } from '../utils/fileValidation';
import { ExcelParser } from '../services/parsers/excelParser';
import { GeoJSONParser } from '../services/parsers/geojsonParser';
import { ShapefileParser } from '../services/parsers/shapefileParser';
import { DataImportService } from '../services/DataImportService';
import { testConnection, checkPostGIS } from '../config/database';

export interface FieldMapping {
  sourceField: string;
  targetField: string;
  type: 'string' | 'number' | 'coordinate' | 'date' | 'geometry';
}

export interface UploadRequest extends Request {
  file?: Express.Multer.File;
  body: {
    fieldMapping?: string;
    options?: string;
    saveToDatabase?: string;
    datasetName?: string;
    description?: string;
  };
}

export interface ParsedFileResult {
  success: boolean;
  fileType: SupportedFileType;
  filename: string;
  headers: string[];
  preview: Record<string, any>[];
  totalRows: number;
  suggestedFieldMapping: FieldMapping[];
  columnTypes: Record<string, string>;
  metadata?: {
    sheets?: string[];
    geometryType?: string;
    bounds?: [number, number, number, number];
    crs?: string;
  };
  importResult?: {
    datasetId: string;
    layerId: string;
    featuresImported: number;
  };
  errors?: string[];
  warnings?: string[];
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(process.cwd(), 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
  }
});

const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const validation = validateFile(file);
  
  if (validation.isValid) {
    cb(null, true);
  } else {
    cb(new Error(validation.errors.join('; ')));
  }
};

export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 100 * 1024 * 1024 // 100MB limit
  }
});

export const uploadFile = async (req: UploadRequest, res: Response) => {
  let filePath: string | undefined;

  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No file uploaded',
        message: 'Please select a supported file to upload (CSV, Excel, Shapefile, GeoJSON)'
      });
    }

    filePath = req.file.path;

    // Validate file
    const validation = validateFile(req.file);
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        error: 'File validation failed',
        message: validation.errors.join('; '),
        warnings: validation.warnings
      });
    }

    const fileType = validation.fileType!;
    
    // Parse options if provided
    const options = req.body.options ? JSON.parse(req.body.options) : {};

    // Parse file based on type
    let result: ParsedFileResult;

    switch (fileType) {
      case SupportedFileType.CSV:
        result = await parseCSVFile(filePath, req.file.originalname, options);
        break;
      case SupportedFileType.EXCEL:
        result = await parseExcelFile(filePath, req.file.originalname, options);
        break;
      case SupportedFileType.GEOJSON:
        result = await parseGeoJSONFile(filePath, req.file.originalname, options);
        break;
      case SupportedFileType.SHAPEFILE:
        result = await parseShapefileFile(filePath, req.file.originalname, options);
        break;
      default:
        throw new Error(`Unsupported file type: ${fileType}`);
    }

    // Add validation warnings if any
    if (validation.warnings.length > 0) {
      result.warnings = [...(result.warnings || []), ...validation.warnings];
    }

    return res.status(200).json(result);

  } catch (error) {
    console.error('File upload error:', error);
    
    return res.status(500).json({
      success: false,
      error: 'File processing failed',
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

async function parseCSVFile(filePath: string, filename: string, options: any = {}): Promise<ParsedFileResult> {
  return new Promise((resolve, reject) => {
    const csvData: Record<string, any>[] = [];
    const headers: string[] = [];
    const maxRows = options.maxRows || 10;

    fs.createReadStream(filePath)
      .pipe(csv())
      .on('headers', (headerList: string[]) => {
        headers.push(...headerList);
      })
      .on('data', (row: Record<string, any>) => {
        if (csvData.length < maxRows) {
          csvData.push(row);
        }
      })
      .on('end', () => {
        const columnTypes = detectColumnTypes(csvData, headers);
        
        resolve({
          success: true,
          fileType: SupportedFileType.CSV,
          filename,
          headers,
          preview: csvData,
          totalRows: csvData.length,
          suggestedFieldMapping: generateFieldMapping(headers, columnTypes),
          columnTypes
        });
      })
      .on('error', (error) => {
        reject(new Error(`CSV parsing failed: ${error.message}`));
      });
  });
}

async function parseExcelFile(filePath: string, filename: string, options: any = {}): Promise<ParsedFileResult> {
  try {
    const parseResult = await ExcelParser.parseFile(filePath, {
      sheetName: options.sheetName,
      maxRows: options.maxRows || 10
    });

    const columnTypes = ExcelParser.detectColumnTypes(parseResult.data, parseResult.headers);

    return {
      success: true,
      fileType: SupportedFileType.EXCEL,
      filename,
      headers: parseResult.headers,
      preview: parseResult.data,
      totalRows: parseResult.totalRows,
      suggestedFieldMapping: generateFieldMapping(parseResult.headers, columnTypes),
      columnTypes,
      metadata: {
        sheets: parseResult.sheets
      }
    };
  } catch (error) {
    throw new Error(`Excel parsing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

async function parseGeoJSONFile(filePath: string, filename: string, options: any = {}): Promise<ParsedFileResult> {
  try {
    const parseResult = await GeoJSONParser.parseFile(filePath, {
      maxFeatures: options.maxFeatures || 10,
      includeGeometry: options.includeGeometry !== false
    });

    const columnTypes = GeoJSONParser.detectPropertyTypes(parseResult.data, parseResult.headers);

    return {
      success: true,
      fileType: SupportedFileType.GEOJSON,
      filename,
      headers: parseResult.headers,
      preview: parseResult.data,
      totalRows: parseResult.totalFeatures,
      suggestedFieldMapping: generateFieldMapping(parseResult.headers, columnTypes),
      columnTypes,
      metadata: {
        geometryType: parseResult.geometryType,
        bounds: parseResult.bounds
      }
    };
  } catch (error) {
    throw new Error(`GeoJSON parsing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

async function parseShapefileFile(filePath: string, filename: string, options: any = {}): Promise<ParsedFileResult> {
  try {
    const parseResult = await ShapefileParser.parseFile(filePath, {
      maxFeatures: options.maxFeatures || 10,
      includeGeometry: options.includeGeometry !== false
    });

    const columnTypes = ShapefileParser.detectPropertyTypes(parseResult.data, parseResult.headers);

    return {
      success: true,
      fileType: SupportedFileType.SHAPEFILE,
      filename,
      headers: parseResult.headers,
      preview: parseResult.data,
      totalRows: parseResult.totalFeatures,
      suggestedFieldMapping: generateFieldMapping(parseResult.headers, columnTypes),
      columnTypes,
      metadata: {
        geometryType: parseResult.geometryType,
        bounds: parseResult.bounds,
        crs: parseResult.crs
      }
    };
  } catch (error) {
    throw new Error(`Shapefile parsing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

function detectColumnTypes(data: Record<string, any>[], headers: string[]): Record<string, string> {
  const types: Record<string, string> = {};

  headers.forEach(header => {
    const values = data.map(row => row[header]).filter(val => val !== null && val !== undefined && val !== '');
    
    if (values.length === 0) {
      types[header] = 'string';
      return;
    }

    let isNumber = true;
    let isDate = true;
    let isCoordinate = true;

    for (const value of values.slice(0, 5)) {
      const str = String(value).trim();
      
      if (isNumber && (isNaN(Number(str)) || str === '')) {
        isNumber = false;
      }

      if (isDate && isNaN(Date.parse(str))) {
        isDate = false;   
      }

      if (isCoordinate) {
        const num = Number(str);
        if (isNaN(num) || num < -180 || num > 180) {
          isCoordinate = false;
        }
      }
    }

    const lowerHeader = header.toLowerCase();
    if (isCoordinate && isNumber && (
      lowerHeader.includes('lat') || lowerHeader.includes('lng') || 
      lowerHeader.includes('lon') || lowerHeader.includes('coord')
    )) {
      types[header] = 'coordinate';
    } else if (isNumber) {
      types[header] = 'number';
    } else if (isDate) {
      types[header] = 'date';
    } else {
      types[header] = 'string';
    }
  });

  return types;
}

function generateFieldMapping(headers: string[], columnTypes: Record<string, string>): FieldMapping[] {
  const commonMappings: Record<string, Omit<FieldMapping, 'sourceField'>> = {
    'lat': { targetField: 'latitude', type: 'coordinate' },
    'latitude': { targetField: 'latitude', type: 'coordinate' },
    'lng': { targetField: 'longitude', type: 'coordinate' },
    'lon': { targetField: 'longitude', type: 'coordinate' },
    'longitude': { targetField: 'longitude', type: 'coordinate' },
    'name': { targetField: 'name', type: 'string' },
    'title': { targetField: 'name', type: 'string' },
    'description': { targetField: 'description', type: 'string' },
    'date': { targetField: 'date', type: 'date' },
    'created_at': { targetField: 'created_at', type: 'date' },
    'geometry_type': { targetField: 'geometry_type', type: 'geometry' },
    'geometry_wkt': { targetField: 'geometry', type: 'geometry' },
    'coordinates': { targetField: 'geometry', type: 'geometry' }
  };

  return headers.map(header => {
    const lowerHeader = header.toLowerCase().trim();
    const commonMapping = commonMappings[lowerHeader];
    
    if (commonMapping) {
      return {
        sourceField: header,
        ...commonMapping
      };
    }

    return {
      sourceField: header,
      targetField: header.toLowerCase().replace(/\s+/g, '_'),
      type: (columnTypes[header] as any) || 'string'
    };
  });
}