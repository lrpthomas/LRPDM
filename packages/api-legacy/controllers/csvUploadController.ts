import { Request, Response } from 'express';
import { parse } from 'csv-parse';
import { DataImportService, ImportOptions } from '../services/DataImportService';
import { validateSupportedFileType, SupportedFileType } from '../utils/fileValidation';
import { APIError, ErrorType } from '../types/errors';

export interface FieldMapping {
  sourceField: string;
  targetField: string;
  type: 'string' | 'number' | 'coordinate' | 'date' | 'geometry';
}

export interface CSVUploadRequest extends Request {
  body: {
    datasetName: string;
    description?: string;
    fieldMapping: string; // JSON string
    batchSize?: number;
  };
  file?: Express.Multer.File;
}

export class CSVUploadController {
  static async uploadCSV(
    request: CSVUploadRequest,
    response: Response
  ): Promise<Response | void> {
    const startTime = Date.now();
    
    try {
      // Validate file upload
      if (!request.file) {
        const error: APIError = {
          type: ErrorType.VALIDATION,
          message: 'No file uploaded',
          code: 'FILE_REQUIRED',
          details: { field: 'file' }
        };
        return response.status(400).json({ error });
      }

      // Validate file type
      const fileType = validateSupportedFileType(request.file.originalname, request.file.mimetype);
      if (fileType !== 'csv') {
        const error: APIError = {
          type: ErrorType.FILE_PROCESSING,
          message: 'Only CSV files are supported',
          code: 'INVALID_FILE_TYPE',
          details: { 
            filename: request.file.originalname,
            mimetype: request.file.mimetype,
            supported: ['text/csv', 'application/csv']
          }
        };
        return response.status(400).json({ error });
      }

      // Validate request body
      const { datasetName, description, fieldMapping: fieldMappingStr, batchSize = 100 } = request.body;
      
      if (!datasetName || datasetName.trim().length === 0) {
        const error: APIError = {
          type: ErrorType.VALIDATION,
          message: 'Dataset name is required',
          code: 'DATASET_NAME_REQUIRED',
          details: { field: 'datasetName' }
        };
        return response.status(400).json({ error });
      }

      if (!fieldMappingStr) {
        const error: APIError = {
          type: ErrorType.VALIDATION,
          message: 'Field mapping is required',
          code: 'FIELD_MAPPING_REQUIRED',
          details: { field: 'fieldMapping' }
        };
        return response.status(400).json({ error });
      }

      // Parse field mapping
      let fieldMapping: FieldMapping[];
      try {
        fieldMapping = JSON.parse(fieldMappingStr);
        if (!Array.isArray(fieldMapping) || fieldMapping.length === 0) {
          throw new Error('Field mapping must be a non-empty array');
        }
      } catch (parseError) {
        const error: APIError = {
          type: ErrorType.VALIDATION,
          message: 'Invalid field mapping format',
          code: 'INVALID_FIELD_MAPPING',
          details: { 
            field: 'fieldMapping',
            parseError: parseError instanceof Error ? parseError.message : 'Unknown error'
          }
        };
        return response.status(400).json({ error });
      }

      // Validate field mapping structure
      const mappingValidation = this.validateFieldMapping(fieldMapping);
      if (!mappingValidation.isValid) {
        const error: APIError = {
          type: ErrorType.VALIDATION,
          message: mappingValidation.error!,
          code: 'INVALID_FIELD_MAPPING_STRUCTURE',
          details: { field: 'fieldMapping' }
        };
        return response.status(400).json({ error });
      }

      // Parse CSV data
      const csvData = await this.parseCSVBuffer(request.file.buffer);
      
      if (csvData.length === 0) {
        const error: APIError = {
          type: ErrorType.FILE_PROCESSING,
          message: 'CSV file is empty or contains no valid data',
          code: 'EMPTY_CSV_FILE',
          details: { filename: request.file.originalname }
        };
        return response.status(400).json({ error });
      }

      // Check if CSV has required fields
      const csvHeaders = Object.keys(csvData[0]);
      const missingFields = fieldMapping
        .filter(fm => !csvHeaders.includes(fm.sourceField))
        .map(fm => fm.sourceField);

      if (missingFields.length > 0) {
        const error: APIError = {
          type: ErrorType.VALIDATION,
          message: 'CSV file is missing required fields',
          code: 'MISSING_CSV_FIELDS',
          details: { 
            missingFields,
            availableFields: csvHeaders,
            filename: request.file.originalname
          }
        };
        return response.status(400).json({ error });
      }

      // Validate batch size
      if (batchSize < 1 || batchSize > 1000) {
        const error: APIError = {
          type: ErrorType.VALIDATION,
          message: 'Batch size must be between 1 and 1000',
          code: 'INVALID_BATCH_SIZE',
          details: { field: 'batchSize', value: batchSize }
        };
        return response.status(400).json({ error });
      }

      // Prepare import options
      const importOptions: ImportOptions = {
        datasetName: datasetName.trim(),
        description: description?.trim(),
        fieldMapping,
        batchSize
      };

      // Progress tracking
      let lastProgressUpdate = 0;
      const progressCallback = (progress: any) => {
        const now = Date.now();
        // Throttle progress updates to every 500ms
        if (now - lastProgressUpdate > 500) {
          lastProgressUpdate = now;
          // In a real implementation, you might want to emit progress via WebSocket
          console.log(`Import progress: ${progress.percentage}% (${progress.processed}/${progress.total})`);
        }
      };

      // Start import process
      const importService = new DataImportService(progressCallback);
      const result = await importService.importData(
        csvData,
        SupportedFileType.CSV,
        request.file.originalname,
        importOptions
      );

      const processingTime = Date.now() - startTime;

      // Return success response
      response.status(200).json({
        success: true,
        message: 'CSV file imported successfully',
        data: {
          datasetId: result.datasetId,
          layerId: result.layerId,
          featuresImported: result.featuresImported,
          totalRows: csvData.length,
          errors: result.errors,
          warnings: result.warnings,
          processingTime: `${processingTime}ms`,
          performance: {
            rowsPerSecond: Math.round(csvData.length / (processingTime / 1000)),
            averageRowProcessingTime: `${(processingTime / csvData.length).toFixed(2)}ms`
          }
        }
      });

    } catch (error) {
      console.error('CSV upload error:', error);

      const apiError: APIError = {
        type: ErrorType.FILE_PROCESSING,
        message: 'Failed to process CSV file',
        code: 'CSV_PROCESSING_ERROR',
        details: {
          error: error instanceof Error ? error.message : 'Unknown error',
          filename: request.file?.filename
        }
      };

      response.status(500).json({ error: apiError });
    }
  }

  private static async parseCSVBuffer(buffer: Buffer): Promise<Record<string, any>[]> {
    const records: Record<string, any>[] = [];
    
    try {
      const parser = parse({
        columns: true,
        skip_empty_lines: true,
        trim: true,
        relax_column_count: true,
        relax_quotes: true
      });

      parser.on('readable', function() {
        let record;
        while ((record = parser.read()) !== null) {
          // Filter out completely empty rows
          const hasContent = Object.values(record).some(value => 
            value !== null && value !== undefined && String(value).trim() !== ''
          );
          
          if (hasContent) {
            records.push(record);
          }
        }
      });

      parser.write(buffer);
      parser.end();

      // Wait for parser to complete
      await new Promise((resolve, reject) => {
        parser.on('end', resolve);
        parser.on('error', reject);
      });
    } catch (error) {
      throw new Error(`CSV parsing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return records;
  }

  private static validateFieldMapping(fieldMapping: FieldMapping[]): { isValid: boolean; error?: string } {
    const validTypes = ['string', 'number', 'coordinate', 'date', 'geometry'];
    
    for (const mapping of fieldMapping) {
      if (!mapping.sourceField || typeof mapping.sourceField !== 'string') {
        return { isValid: false, error: 'sourceField is required and must be a string' };
      }
      
      if (!mapping.targetField || typeof mapping.targetField !== 'string') {
        return { isValid: false, error: 'targetField is required and must be a string' };
      }
      
      if (!validTypes.includes(mapping.type)) {
        return { isValid: false, error: `Invalid field type: ${mapping.type}. Must be one of: ${validTypes.join(', ')}` };
      }
    }

    // Check for coordinate pairs
    const coordinateFields = fieldMapping.filter(fm => fm.type === 'coordinate');
    const hasLat = coordinateFields.some(fm => fm.targetField === 'latitude');
    const hasLng = coordinateFields.some(fm => fm.targetField === 'longitude');
    const hasGeometry = fieldMapping.some(fm => fm.type === 'geometry');

    if (!hasGeometry && (!hasLat || !hasLng)) {
      return { 
        isValid: false, 
        error: 'Either geometry field or both latitude and longitude coordinate fields are required' 
      };
    }

    return { isValid: true };
  }

  static async previewCSV(
    request: CSVUploadRequest,
    response: Response
  ): Promise<Response | void> {
    try {
      if (!request.file) {
        const error: APIError = {
          type: ErrorType.VALIDATION,
          message: 'No file uploaded',
          code: 'FILE_REQUIRED'
        };
        return response.status(400).json({ error });
      }

      // Validate file type
      const fileType = validateSupportedFileType(request.file.originalname, request.file.mimetype);
      if (fileType !== 'csv') {
        const error: APIError = {
          type: ErrorType.FILE_PROCESSING,
          message: 'Only CSV files are supported',
          code: 'INVALID_FILE_TYPE'
        };
        return response.status(400).json({ error });
      }

      // Parse first 10 rows for preview
      const previewData = await this.parseCSVPreview(request.file.buffer, 10);
      
      if (previewData.length === 0) {
        const error: APIError = {
          type: ErrorType.FILE_PROCESSING,
          message: 'CSV file is empty or contains no valid data',
          code: 'EMPTY_CSV_FILE'
        };
        return response.status(400).json({ error });
      }

      const headers = Object.keys(previewData[0]);
      const suggestedMapping = this.generateSuggestedFieldMapping(headers);

      response.status(200).json({
        success: true,
        data: {
          filename: request.file.originalname,
          headers,
          preview: previewData,
          rowCount: previewData.length,
          suggestedFieldMapping: suggestedMapping
        }
      });

    } catch (error) {
      console.error('CSV preview error:', error);

      const apiError: APIError = {
        type: ErrorType.FILE_PROCESSING,
        message: 'Failed to preview CSV file',
        code: 'CSV_PREVIEW_ERROR',
        details: {
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      };

      response.status(500).json({ error: apiError });
    }
  }

  private static async parseCSVPreview(buffer: Buffer, limit: number): Promise<Record<string, any>[]> {
    const records: Record<string, any>[] = [];
    let count = 0;
    
    try {
      const parser = parse({
        columns: true,
        skip_empty_lines: true,
        trim: true,
        relax_column_count: true,
        relax_quotes: true
      });

      parser.on('readable', function() {
        let record;
        while ((record = parser.read()) !== null && count < limit) {
          const hasContent = Object.values(record).some(value => 
            value !== null && value !== undefined && String(value).trim() !== ''
          );
          
          if (hasContent) {
            records.push(record);
            count++;
          }
        }
      });

      parser.write(buffer);
      parser.end();

      // Wait for parser to complete
      await new Promise((resolve, reject) => {
        parser.on('end', resolve);
        parser.on('error', reject);
      });
    } catch (error) {
      throw new Error(`CSV preview parsing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return records;
  }

  private static generateSuggestedFieldMapping(headers: string[]): FieldMapping[] {
    const commonMappings: { [key: string]: Omit<FieldMapping, 'sourceField'> } = {
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
      'updated_at': { targetField: 'updated_at', type: 'date' },
      'geometry': { targetField: 'geometry', type: 'geometry' },
      'geom': { targetField: 'geometry', type: 'geometry' },
      'wkt': { targetField: 'geometry', type: 'geometry' }
    };

    return headers.map((header): FieldMapping => {
      const lowerHeader = header.toLowerCase().trim();
      const suggestion = commonMappings[lowerHeader];
      
      if (suggestion) {
        return {
          sourceField: header,
          ...suggestion
        };
      }

      // Auto-detect field type based on header name patterns
      let type: FieldMapping['type'] = 'string';
      
      if (lowerHeader.includes('date') || lowerHeader.includes('time')) {
        type = 'date';
      } else if (lowerHeader.includes('count') || lowerHeader.includes('number') || lowerHeader.includes('amount')) {
        type = 'number';
      } else if (lowerHeader.includes('coord') || lowerHeader.includes('lat') || lowerHeader.includes('lng')) {
        type = 'coordinate';
      } else if (lowerHeader.includes('geom') || lowerHeader.includes('wkt') || lowerHeader.includes('shape')) {
        type = 'geometry';
      }

      return {
        sourceField: header,
        targetField: header.toLowerCase().replace(/[^a-z0-9]/g, '_'),
        type
      };
    });
  }
}