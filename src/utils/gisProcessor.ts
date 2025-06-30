import * as shapefile from 'shapefile';
import * as fs from 'fs';
import * as path from 'path';
import { XMLParser } from 'fast-xml-parser';
import * as togeojson from '@mapbox/togeojson';
import { DOMParser } from '@xmldom/xmldom';
import StreamZip from 'node-stream-zip';
import { validate } from 'geojson-validation';
import reproject from 'reproject';

export interface ProcessingResult {
  success: boolean;
  data?: any;
  error?: string;
  warnings?: string[];
  metadata?: {
    featureCount: number;
    crs?: string;
    bounds?: number[];
    fileSize: number;
    format: string;
  };
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  statistics: {
    totalFeatures: number;
    validFeatures: number;
    invalidFeatures: number;
    geometryTypes: { [key: string]: number };
  };
}

export class GISProcessor {
  
  // Main processing entry point
  static async processFile(filePath: string, options: {
    targetCrs?: string;
    validate?: boolean;
    maxFeatures?: number;
  } = {}): Promise<ProcessingResult> {
    try {
      const ext = path.extname(filePath).toLowerCase();
      const stats = fs.statSync(filePath);
      
      let result: ProcessingResult;
      
      switch (ext) {
        case '.shp':
          result = await this.processShapefile(filePath, options);
          break;
        case '.kml':
        case '.kmz':
          result = await this.processKML(filePath, options);
          break;
        case '.gpx':
          result = await this.processGPX(filePath, options);
          break;
        case '.geojson':
        case '.json':
          result = await this.processGeoJSON(filePath, options);
          break;
        default:
          return {
            success: false,
            error: `Unsupported file format: ${ext}`
          };
      }
      
      // Add metadata
      if (result.success && result.data) {
        result.metadata = {
          featureCount: result.data.features ? result.data.features.length : 0,
          fileSize: stats.size,
          format: ext.substring(1).toUpperCase(),
          ...result.metadata
        };
      }
      
      return result;
    } catch (error) {
      return {
        success: false,
        error: `File processing failed: ${error.message}`
      };
    }
  }
  
  // Process Shapefile
  static async processShapefile(filePath: string, options: any = {}): Promise<ProcessingResult> {
    try {
      const warnings: string[] = [];
      const features: any[] = [];
      
      // Check for required shapefile components
      const baseName = path.basename(filePath, '.shp');
      const dir = path.dirname(filePath);
      const shxPath = path.join(dir, `${baseName}.shx`);
      const dbfPath = path.join(dir, `${baseName}.dbf`);
      const prjPath = path.join(dir, `${baseName}.prj`);
      
      if (!fs.existsSync(shxPath)) {
        warnings.push('Missing .shx file - index may be incorrect');
      }
      if (!fs.existsSync(dbfPath)) {
        warnings.push('Missing .dbf file - no attributes will be available');
      }
      
      let crs: string | undefined;
      if (fs.existsSync(prjPath)) {
        const prjContent = fs.readFileSync(prjPath, 'utf8');
        crs = this.parsePRJ(prjContent);
      } else {
        warnings.push('Missing .prj file - assuming WGS84');
        crs = 'EPSG:4326';
      }
      
      // Read shapefile
      const source = await shapefile.open(filePath);
      let featureCount = 0;
      
      while (true) {
        const result = await source.read();
        if (result.done) break;
        
        if (options.maxFeatures && featureCount >= options.maxFeatures) {
          warnings.push(`Limited to ${options.maxFeatures} features`);
          break;
        }
        
        features.push(result.value);
        featureCount++;
      }
      
      let geojson = {
        type: 'FeatureCollection',
        features: features
      };
      
      // Coordinate transformation if needed
      if (options.targetCrs && crs && crs !== options.targetCrs) {
        geojson = this.reprojectGeoJSON(geojson, crs, options.targetCrs);
      }
      
      return {
        success: true,
        data: geojson,
        warnings,
        metadata: {
          crs: crs,
          featureCount: features.length,
          bounds: this.calculateBounds(geojson),
          fileSize: 0,
          format: 'SHP'
        }
      };
      
    } catch (error) {
      return {
        success: false,
        error: `Shapefile processing failed: ${error.message}`
      };
    }
  }
  
  // Process KML/KMZ
  static async processKML(filePath: string, options: any = {}): Promise<ProcessingResult> {
    try {
      let kmlContent: string;
      const warnings: string[] = [];
      
      if (path.extname(filePath).toLowerCase() === '.kmz') {
        // Extract KML from KMZ
        const zip = new StreamZip.async({ file: filePath });
        const entries = await zip.entries();
        
        let kmlEntry = null;
        for (const entry of Object.values(entries)) {
          if (entry.name.endsWith('.kml')) {
            kmlEntry = entry;
            break;
          }
        }
        
        if (!kmlEntry) {
          throw new Error('No KML file found in KMZ archive');
        }
        
        kmlContent = await zip.entryData(kmlEntry.name).then(data => data.toString());
        await zip.close();
      } else {
        kmlContent = fs.readFileSync(filePath, 'utf8');
      }
      
      // Parse KML to GeoJSON
      const parser = new DOMParser();
      const dom = parser.parseFromString(kmlContent, 'text/xml');
      const geojson = togeojson.kml(dom);
      
      // Apply feature limit
      if (options.maxFeatures && geojson.features.length > options.maxFeatures) {
        geojson.features = geojson.features.slice(0, options.maxFeatures);
        warnings.push(`Limited to ${options.maxFeatures} features`);
      }
      
      return {
        success: true,
        data: geojson,
        warnings,
        metadata: {
          crs: 'EPSG:4326', // KML is always WGS84
          featureCount: geojson.features.length,
          bounds: this.calculateBounds(geojson),
          fileSize: 0,
          format: 'KML'
        }
      };
      
    } catch (error) {
      return {
        success: false,
        error: `KML processing failed: ${error.message}`
      };
    }
  }
  
  // Process GPX
  static async processGPX(filePath: string, options: any = {}): Promise<ProcessingResult> {
    try {
      const gpxContent = fs.readFileSync(filePath, 'utf8');
      const dom = new DOMParser().parseFromString(gpxContent, 'text/xml');
      const geojson = togeojson.gpx(dom);
      
      const warnings: string[] = [];
      
      // Apply feature limit
      if (options.maxFeatures && geojson.features.length > options.maxFeatures) {
        geojson.features = geojson.features.slice(0, options.maxFeatures);
        warnings.push(`Limited to ${options.maxFeatures} features`);
      }
      
      return {
        success: true,
        data: geojson,
        warnings,
        metadata: {
          crs: 'EPSG:4326', // GPX is always WGS84
          featureCount: geojson.features.length,
          bounds: this.calculateBounds(geojson),
          fileSize: 0,
          format: 'GPX'
        }
      };
      
    } catch (error) {
      return {
        success: false,
        error: `GPX processing failed: ${error.message}`
      };
    }
  }
  
  // Process GeoJSON
  static async processGeoJSON(filePath: string, options: any = {}): Promise<ProcessingResult> {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const geojson = JSON.parse(content);
      
      const warnings: string[] = [];
      
      // Validate GeoJSON
      if (options.validate) {
        const validation = this.validateGeoJSON(geojson);
        if (!validation.isValid) {
          warnings.push(...validation.errors);
        }
        warnings.push(...validation.warnings);
      }
      
      // Ensure FeatureCollection format
      let featureCollection = geojson;
      if (geojson.type === 'Feature') {
        featureCollection = {
          type: 'FeatureCollection',
          features: [geojson]
        };
      } else if (geojson.type !== 'FeatureCollection') {
        throw new Error('Invalid GeoJSON: must be Feature or FeatureCollection');
      }
      
      // Apply feature limit
      if (options.maxFeatures && featureCollection.features.length > options.maxFeatures) {
        featureCollection.features = featureCollection.features.slice(0, options.maxFeatures);
        warnings.push(`Limited to ${options.maxFeatures} features`);
      }
      
      return {
        success: true,
        data: featureCollection,
        warnings,
        metadata: {
          crs: geojson.crs ? this.parseCRS(geojson.crs) : 'EPSG:4326',
          featureCount: featureCollection.features.length,
          bounds: this.calculateBounds(featureCollection),
          fileSize: 0,
          format: 'GeoJSON'
        }
      };
      
    } catch (error) {
      return {
        success: false,
        error: `GeoJSON processing failed: ${error.message}`
      };
    }
  }
  
  // Validate GeoJSON
  static validateGeoJSON(geojson: any): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const geometryTypes: { [key: string]: number } = {};
    
    let totalFeatures = 0;
    let validFeatures = 0;
    let invalidFeatures = 0;
    
    try {
      // Basic structure validation
      if (!validate(geojson)) {
        errors.push('Invalid GeoJSON structure');
        return {
          isValid: false,
          errors,
          warnings,
          statistics: { totalFeatures: 0, validFeatures: 0, invalidFeatures: 0, geometryTypes }
        };
      }
      
      // Feature validation
      if (geojson.type === 'FeatureCollection') {
        totalFeatures = geojson.features.length;
        
        for (const feature of geojson.features) {
          if (feature.geometry) {
            const geomType = feature.geometry.type;
            geometryTypes[geomType] = (geometryTypes[geomType] || 0) + 1;
            
            // Validate geometry
            if (this.validateGeometry(feature.geometry)) {
              validFeatures++;
            } else {
              invalidFeatures++;
              warnings.push(`Invalid ${geomType} geometry detected`);
            }
          } else {
            invalidFeatures++;
            warnings.push('Feature with null geometry detected');
          }
        }
      } else if (geojson.type === 'Feature') {
        totalFeatures = 1;
        if (geojson.geometry) {
          const geomType = geojson.geometry.type;
          geometryTypes[geomType] = 1;
          
          if (this.validateGeometry(geojson.geometry)) {
            validFeatures = 1;
          } else {
            invalidFeatures = 1;
            warnings.push(`Invalid ${geomType} geometry`);
          }
        }
      }
      
      return {
        isValid: errors.length === 0,
        errors,
        warnings,
        statistics: {
          totalFeatures,
          validFeatures,
          invalidFeatures,
          geometryTypes
        }
      };
      
    } catch (error) {
      errors.push(`Validation error: ${error.message}`);
      return {
        isValid: false,
        errors,
        warnings,
        statistics: { totalFeatures, validFeatures, invalidFeatures, geometryTypes }
      };
    }
  }
  
  // Helper functions
  static validateGeometry(geometry: any): boolean {
    try {
      if (!geometry || !geometry.type || !geometry.coordinates) {
        return false;
      }
      
      switch (geometry.type) {
        case 'Point':
          return Array.isArray(geometry.coordinates) && geometry.coordinates.length >= 2;
        case 'LineString':
          return Array.isArray(geometry.coordinates) && geometry.coordinates.length >= 2;
        case 'Polygon':
          return Array.isArray(geometry.coordinates) && geometry.coordinates.length >= 1;
        default:
          return true; // Basic validation for other types
      }
    } catch {
      return false;
    }
  }
  
  static calculateBounds(geojson: any): number[] | undefined {
    try {
      if (!geojson.features || geojson.features.length === 0) {
        return undefined;
      }
      
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      
      for (const feature of geojson.features) {
        if (!feature.geometry) continue;
        
        const coords = this.extractCoordinates(feature.geometry);
        for (const coord of coords) {
          minX = Math.min(minX, coord[0]);
          maxX = Math.max(maxX, coord[0]);
          minY = Math.min(minY, coord[1]);
          maxY = Math.max(maxY, coord[1]);
        }
      }
      
      return [minX, minY, maxX, maxY];
    } catch {
      return undefined;
    }
  }
  
  static extractCoordinates(geometry: any): number[][] {
    const coords: number[][] = [];
    
    function flatten(arr: any): void {
      if (Array.isArray(arr[0])) {
        for (const item of arr) {
          flatten(item);
        }
      } else {
        coords.push(arr);
      }
    }
    
    if (geometry.coordinates) {
      flatten(geometry.coordinates);
    }
    
    return coords;
  }
  
  static parsePRJ(prjContent: string): string {
    // Basic PRJ parsing - in production, use proj4 definitions
    if (prjContent.includes('GCS_WGS_1984')) {
      return 'EPSG:4326';
    } else if (prjContent.includes('WGS_1984_Web_Mercator')) {
      return 'EPSG:3857';
    }
    return 'UNKNOWN';
  }
  
  static parseCRS(crs: any): string {
    if (crs.properties && crs.properties.name) {
      return crs.properties.name;
    }
    return 'EPSG:4326';
  }
  
  static reprojectGeoJSON(geojson: any, fromCrs: string, toCrs: string): any {
    try {
      // Note: This is a placeholder - full reprojection requires proj4 definitions
      console.warn(`Coordinate transformation from ${fromCrs} to ${toCrs} not fully implemented`);
      return geojson;
    } catch (error) {
      console.error('Reprojection failed:', error);
      return geojson;
    }
  }
}

export default GISProcessor;