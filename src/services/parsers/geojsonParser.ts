import fs from 'fs';
import { valid } from 'geojson-validation';

export interface GeoJSONParseResult {
  headers: string[];
  data: Record<string, any>[];
  geometryType: string;
  totalFeatures: number;
  bounds?: [number, number, number, number]; // [minLng, minLat, maxLng, maxLat]
}

export interface GeoJSONParseOptions {
  maxFeatures?: number;
  includeGeometry?: boolean;
}

export class GeoJSONParser {
  static async parseFile(filePath: string, options: GeoJSONParseOptions = {}): Promise<GeoJSONParseResult> {
    const {
      maxFeatures = 10,
      includeGeometry = true
    } = options;

    try {
      const fileContent = fs.readFileSync(filePath, 'utf8');
      const geojson = JSON.parse(fileContent);

      // Validate GeoJSON structure
      if (!valid(geojson)) {
        throw new Error('Invalid GeoJSON format');
      }

      if (geojson.type !== 'FeatureCollection') {
        throw new Error('Only FeatureCollection GeoJSON is supported');
      }

      if (!geojson.features || !Array.isArray(geojson.features)) {
        throw new Error('No features found in GeoJSON');
      }

      const features = geojson.features;
      const totalFeatures = features.length;

      if (totalFeatures === 0) {
        throw new Error('FeatureCollection is empty');
      }

      // Extract headers from properties of all features
      const allHeaders = new Set<string>();
      
      // Always include geometry-related headers if including geometry
      if (includeGeometry) {
        allHeaders.add('geometry_type');
        allHeaders.add('coordinates');
      }

      // Extract property headers
      features.forEach((feature: any) => {
        if (feature.properties && typeof feature.properties === 'object') {
          Object.keys(feature.properties).forEach(key => allHeaders.add(key));
        }
      });

      const headers = Array.from(allHeaders);

      // Determine geometry type(s)
      const geometryTypes = new Set<string>();
      features.forEach((feature: any) => {
        if (feature.geometry && feature.geometry.type) {
          geometryTypes.add(feature.geometry.type);
        }
      });

      const geometryType = geometryTypes.size === 1 
        ? Array.from(geometryTypes)[0] 
        : `Mixed (${Array.from(geometryTypes).join(', ')})`;

      // Convert features to tabular data
      const data = features.slice(0, maxFeatures).map((feature: any) => {
        const row: Record<string, any> = {};

        // Add geometry information if requested
        if (includeGeometry && feature.geometry) {
          row.geometry_type = feature.geometry.type;
          row.coordinates = this.formatCoordinates(feature.geometry);
        }

        // Add properties
        if (feature.properties) {
          Object.entries(feature.properties).forEach(([key, value]) => {
            row[key] = value;
          });
        }

        // Fill missing properties with null
        headers.forEach(header => {
          if (!(header in row)) {
            row[header] = null;
          }
        });

        return row;
      });

      // Calculate bounds
      const bounds = this.calculateBounds(features);

      return {
        headers,
        data,
        geometryType,
        totalFeatures,
        bounds
      };

    } catch (error) {
      if (error instanceof SyntaxError) {
        throw new Error('Invalid JSON format in GeoJSON file');
      }
      throw new Error(`Failed to parse GeoJSON file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private static formatCoordinates(geometry: any): string {
    if (!geometry || !geometry.coordinates) {
      return 'Invalid geometry';
    }

    switch (geometry.type) {
      case 'Point':
        return `[${geometry.coordinates.join(', ')}]`;
      case 'LineString':
      case 'MultiPoint':
        return `${geometry.coordinates.length} points`;
      case 'Polygon':
      case 'MultiLineString':
        return `${geometry.coordinates.length} rings/lines`;
      case 'MultiPolygon':
        return `${geometry.coordinates.length} polygons`;
      default:
        return 'Complex geometry';
    }
  }

  private static calculateBounds(features: any[]): [number, number, number, number] | undefined {
    let minLng = Infinity;
    let minLat = Infinity;
    let maxLng = -Infinity;
    let maxLat = -Infinity;

    features.forEach(feature => {
      if (!feature.geometry || !feature.geometry.coordinates) return;

      const coords = this.extractAllCoordinates(feature.geometry);
      coords.forEach(([lng, lat]) => {
        if (typeof lng === 'number' && typeof lat === 'number') {
          minLng = Math.min(minLng, lng);
          minLat = Math.min(minLat, lat);
          maxLng = Math.max(maxLng, lng);
          maxLat = Math.max(maxLat, lat);
        }
      });
    });

    if (minLng === Infinity) return undefined;

    return [minLng, minLat, maxLng, maxLat];
  }

  private static extractAllCoordinates(geometry: any): number[][] {
    const coords: number[][] = [];

    function traverse(coord: any) {
      if (Array.isArray(coord)) {
        if (coord.length >= 2 && typeof coord[0] === 'number' && typeof coord[1] === 'number') {
          coords.push([coord[0], coord[1]]);
        } else {
          coord.forEach(traverse);
        }
      }
    }

    traverse(geometry.coordinates);
    return coords;
  }

  static detectPropertyTypes(data: Record<string, any>[], headers: string[]): Record<string, string> {
    const types: Record<string, string> = {};

    headers.forEach(header => {
      // Skip geometry-specific headers
      if (header === 'geometry_type' || header === 'coordinates') {
        types[header] = 'geometry';
        return;
      }

      const values = data.map(row => row[header]).filter(val => val !== null && val !== undefined);
      
      if (values.length === 0) {
        types[header] = 'string';
        return;
      }

      let isNumber = true;
      let isDate = true;

      for (const value of values.slice(0, 5)) {
        const str = String(value).trim();
        
        if (isNumber && (isNaN(Number(str)) || str === '')) {
          isNumber = false;
        }

        if (isDate && isNaN(Date.parse(str))) {
          isDate = false;
        }
      }

      if (isNumber) {
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