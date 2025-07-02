import path from 'path';

export enum SupportedFileType {
  CSV = 'csv',
  EXCEL = 'excel',
  SHAPEFILE = 'shapefile',
  GEOJSON = 'geojson'
}

export interface FileTypeInfo {
  type: SupportedFileType;
  extension: string;
  mimeType: string;
  maxSize: number; // in bytes
}

export const SUPPORTED_FILE_TYPES: Record<SupportedFileType, FileTypeInfo> = {
  [SupportedFileType.CSV]: {
    type: SupportedFileType.CSV,
    extension: '.csv',
    mimeType: 'text/csv',
    maxSize: 100 * 1024 * 1024 // 100MB
  },
  [SupportedFileType.EXCEL]: {
    type: SupportedFileType.EXCEL,
    extension: '.xlsx',
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    maxSize: 100 * 1024 * 1024 // 100MB
  },
  [SupportedFileType.SHAPEFILE]: {
    type: SupportedFileType.SHAPEFILE,
    extension: '.zip',
    mimeType: 'application/zip',
    maxSize: 100 * 1024 * 1024 // 100MB
  },
  [SupportedFileType.GEOJSON]: {
    type: SupportedFileType.GEOJSON,
    extension: '.geojson',
    mimeType: 'application/geo+json',
    maxSize: 100 * 1024 * 1024 // 100MB
  }
};

export interface FileValidationResult {
  isValid: boolean;
  fileType?: SupportedFileType;
  errors: string[];
  warnings: string[];
}

export function detectFileType(filename: string, mimeType: string): SupportedFileType | null {
  const ext = path.extname(filename).toLowerCase();
  
  // Check by extension first
  if (ext === '.csv') return SupportedFileType.CSV;
  if (ext === '.xlsx' || ext === '.xls') return SupportedFileType.EXCEL;
  if (ext === '.geojson' || ext === '.json') return SupportedFileType.GEOJSON;
  if (ext === '.zip') return SupportedFileType.SHAPEFILE;
  
  // Check by MIME type as fallback
  if (mimeType === 'text/csv') return SupportedFileType.CSV;
  if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) return SupportedFileType.EXCEL;
  if (mimeType === 'application/geo+json' || mimeType === 'application/json') return SupportedFileType.GEOJSON;
  if (mimeType === 'application/zip') return SupportedFileType.SHAPEFILE;
  
  return null;
}

export function validateFile(file: Express.Multer.File): FileValidationResult {
  const result: FileValidationResult = {
    isValid: true,
    errors: [],
    warnings: []
  };

  // Detect file type
  const fileType = detectFileType(file.originalname, file.mimetype);
  
  if (!fileType) {
    result.isValid = false;
    result.errors.push(
      `Unsupported file type. Supported formats: ${Object.values(SupportedFileType).join(', ')}`
    );
    return result;
  }

  result.fileType = fileType;
  const typeInfo = SUPPORTED_FILE_TYPES[fileType];

  // Validate file size
  if (file.size > typeInfo.maxSize) {
    result.isValid = false;
    result.errors.push(
      `File size (${Math.round(file.size / 1024 / 1024)}MB) exceeds maximum allowed size (${Math.round(typeInfo.maxSize / 1024 / 1024)}MB)`
    );
  }

  // Validate MIME type (with some flexibility)
  const expectedMimeTypes = [typeInfo.mimeType];
  
  // Add common variations
  if (fileType === SupportedFileType.CSV) {
    expectedMimeTypes.push('application/csv', 'text/plain');
  } else if (fileType === SupportedFileType.EXCEL) {
    expectedMimeTypes.push('application/vnd.ms-excel');
  } else if (fileType === SupportedFileType.GEOJSON) {
    expectedMimeTypes.push('application/json', 'text/plain');
  }

  if (!expectedMimeTypes.includes(file.mimetype)) {
    result.warnings.push(
      `Unexpected MIME type: ${file.mimetype}. Expected: ${expectedMimeTypes.join(' or ')}`
    );
  }

  // File-specific validations
  if (fileType === SupportedFileType.SHAPEFILE) {
    if (!file.originalname.toLowerCase().endsWith('.zip')) {
      result.errors.push('Shapefile must be uploaded as a ZIP archive containing .shp, .shx, and .dbf files');
      result.isValid = false;
    }
  }

  return result;
}

export function getFileTypeInfo(fileType: SupportedFileType): FileTypeInfo {
  return SUPPORTED_FILE_TYPES[fileType];
}

export function getAllSupportedTypes(): SupportedFileType[] {
  return Object.values(SupportedFileType);
}

export function validateSupportedFileType(filename: string, mimeType: string): string {
  const fileType = detectFileType(filename, mimeType);
  
  if (!fileType) {
    throw new Error(`Unsupported file type for file: ${filename}`);
  }
  
  return fileType.toLowerCase();
}