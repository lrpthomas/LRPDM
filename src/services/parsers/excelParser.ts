import * as XLSX from 'xlsx';
import fs from 'fs';

export interface ExcelParseResult {
  headers: string[];
  data: Record<string, any>[];
  sheets: string[];
  totalRows: number;
}

export interface ExcelParseOptions {
  sheetName?: string;
  maxRows?: number;
  startRow?: number;
}

export class ExcelParser {
  static async parseFile(filePath: string, options: ExcelParseOptions = {}): Promise<ExcelParseResult> {
    const {
      sheetName,
      maxRows = 10,
      startRow = 0
    } = options;

    try {
      const workbook = XLSX.readFile(filePath);
      const sheets = workbook.SheetNames;
      
      if (sheets.length === 0) {
        throw new Error('No sheets found in Excel file');
      }

      // Use specified sheet or first sheet
      const targetSheet = sheetName || sheets[0];
      
      if (!sheets.includes(targetSheet)) {
        throw new Error(`Sheet "${targetSheet}" not found. Available sheets: ${sheets.join(', ')}`);
      }

      const worksheet = workbook.Sheets[targetSheet];
      
      // Convert to JSON with headers
      const jsonData = XLSX.utils.sheet_to_json(worksheet, {
        header: 1, // Use first row as headers
        range: startRow,
        defval: null // Use null for empty cells
      }) as any[][];

      if (jsonData.length === 0) {
        throw new Error('Sheet is empty');
      }

      // Extract headers from first row
      const headers = jsonData[0]?.map((header: any) => 
        header ? String(header).trim() : 'Unnamed Column'
      ) || [];

      if (headers.length === 0) {
        throw new Error('No headers found in the first row');
      }

      // Extract data rows (skip header row)
      const dataRows = jsonData.slice(1, maxRows + 1);
      
      // Convert to objects with headers
      const data = dataRows.map((row: any[]) => {
        const rowObj: Record<string, any> = {};
        headers.forEach((header, index) => {
          rowObj[header] = row[index] !== undefined ? row[index] : null;
        });
        return rowObj;
      });

      // Get total row count (excluding header)
      const totalRows = Math.max(0, jsonData.length - 1);

      return {
        headers,
        data,
        sheets,
        totalRows
      };

    } catch (error) {
      throw new Error(`Failed to parse Excel file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  static detectColumnTypes(data: Record<string, any>[], headers: string[]): Record<string, string> {
    const types: Record<string, string> = {};

    headers.forEach(header => {
      const values = data.map(row => row[header]).filter(val => val !== null && val !== undefined);
      
      if (values.length === 0) {
        types[header] = 'string';
        return;
      }

      let isNumber = true;
      let isDate = true;
      let isCoordinate = true;

      for (const value of values.slice(0, 5)) { // Check first 5 non-null values
        const str = String(value).trim();
        
        // Check if it's a number
        if (isNumber && (isNaN(Number(str)) || str === '')) {
          isNumber = false;
        }

        // Check if it's a date
        if (isDate && isNaN(Date.parse(str))) {
          isDate = false;
        }

        // Check if it's a coordinate (latitude/longitude)
        if (isCoordinate) {
          const num = Number(str);
          if (isNaN(num) || num < -180 || num > 180) {
            isCoordinate = false;
          }
        }
      }

      // Determine type based on checks
      if (isCoordinate && isNumber) {
        // Check if header suggests it's a coordinate
        const lowerHeader = header.toLowerCase();
        if (lowerHeader.includes('lat') || lowerHeader.includes('lng') || 
            lowerHeader.includes('lon') || lowerHeader.includes('coord')) {
          types[header] = 'coordinate';
        } else {
          types[header] = 'number';
        }
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
}