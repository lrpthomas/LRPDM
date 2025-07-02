import { Request, Response } from 'express';
import multer from 'multer';
import csv from 'csv-parser';
import fs from 'fs';
import path from 'path';

interface CSVRow {
  [key: string]: string;
}

interface FieldMapping {
  csvField: string;
  targetField: string;
  type: 'string' | 'number' | 'coordinate' | 'date';
}

interface UploadRequest extends Request {
  file?: Express.Multer.File;
  body: {
    fieldMapping?: string;
  };
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    const uploadDir = path.join(process.cwd(), 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `${file.fieldname}-${uniqueSuffix}.csv`);
  }
});

const fileFilter = (_req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
    cb(null, true);
  } else {
    cb(new Error('Only CSV files are allowed'));
  }
};

export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

export const uploadCSV = async (req: UploadRequest, res: Response) => {
  try {
    if (!req.file) {
      res.status(400).json({
        error: 'No file uploaded',
        message: 'Please select a CSV file to upload'
      });
      return;
    }

    const filePath = req.file.path;
    // Parse CSV and extract first few rows for preview
    const csvData: CSVRow[] = [];
    const headers: string[] = [];

    await new Promise<void>((resolve, reject) => {
      fs.createReadStream(filePath)
        .pipe(csv())
        .on('headers', (headerList: string[]) => {
          headers.push(...headerList);
        })
        .on('data', (row: CSVRow) => {
          if (csvData.length < 5) { // Preview first 5 rows
            csvData.push(row);
          }
        })
        .on('end', () => {
          // Clean up uploaded file
          fs.unlinkSync(filePath);
          
          res.status(200).json({
            success: true,
            message: 'CSV file processed successfully',
            data: {
              filename: req.file!.originalname,
              headers,
              preview: csvData,
              totalRows: csvData.length,
              suggestedFieldMapping: generateFieldMapping(headers)
            }
          });
          resolve();
        })
        .on('error', (error: Error) => {
          // Clean up uploaded file on error
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
          }
          reject(error);
        });
    });

  } catch (error) {
    console.error('CSV upload error:', error);
    
    // Clean up uploaded file on error
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to process CSV file'
    });
  }
};

function generateFieldMapping(headers: string[]): FieldMapping[] {
  const commonMappings: { [key: string]: FieldMapping } = {
    'lat': { csvField: 'lat', targetField: 'latitude', type: 'coordinate' },
    'latitude': { csvField: 'latitude', targetField: 'latitude', type: 'coordinate' },
    'lng': { csvField: 'lng', targetField: 'longitude', type: 'coordinate' },
    'lon': { csvField: 'lon', targetField: 'longitude', type: 'coordinate' },
    'longitude': { csvField: 'longitude', targetField: 'longitude', type: 'coordinate' },
    'name': { csvField: 'name', targetField: 'name', type: 'string' },
    'title': { csvField: 'title', targetField: 'name', type: 'string' },
    'description': { csvField: 'description', targetField: 'description', type: 'string' },
    'date': { csvField: 'date', targetField: 'date', type: 'date' },
    'created_at': { csvField: 'created_at', targetField: 'date', type: 'date' }
  };

  return headers
    .map(header => {
      const lowerHeader = header.toLowerCase().trim();
      return commonMappings[lowerHeader] || {
        csvField: header,
        targetField: header.toLowerCase().replace(/\s+/g, '_'),
        type: 'string' as const
      };
    });
}