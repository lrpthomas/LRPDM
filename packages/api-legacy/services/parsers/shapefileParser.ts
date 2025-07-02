import AdmZip from 'adm-zip';
import shapefile from 'shapefile';
import fs from 'fs';
import path from 'path';

export interface ShapefileParseResult {
  headers: string[];
  data: Record<string, any>[];
  geometryType: string;
  totalFeatures: number;
  bounds?: [number, number, number, number];
  crs?: string;
}

export interface ShapefileParseOptions {
  maxFeatures?: number;
  includeGeometry?: boolean;
}

export class ShapefileParser {
  static async parseFile(filePath: string, options: ShapefileParseOptions = {}): Promise<ShapefileParseResult> {
    const {
      maxFeatures = 10,
      includeGeometry = true
    } = options;

    let tempDir: string | null = null;

    try {
      // Extract ZIP file to temporary directory
      tempDir = await this.extractZipFile(filePath);
      
      // Find required shapefile components
      const shapefilePaths = await this.findShapefileComponents(tempDir);
      
      // Read shapefile
      const result = await this.readShapefile(shapefilePaths, {
        maxFeatures,
        includeGeometry
      });

      return result;

    } catch (error) {
      throw new Error(`Failed to parse Shapefile: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      // Clean up temporary directory
      if (tempDir && fs.existsSync(tempDir)) {
        await this.removeDirectory(tempDir);
      }
    }
  }

  private static async extractZipFile(zipPath: string): Promise<string> {
    const zip = new AdmZip(zipPath);
    const tempDir = path.join(process.cwd(), 'temp', `shapefile_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);
    
    // Create temporary directory
    fs.mkdirSync(tempDir, { recursive: true });
    
    // Extract all files
    zip.extractAllTo(tempDir, true);
    
    return tempDir;
  }

  private static async findShapefileComponents(dir: string): Promise<{
    shp: string;
    shx: string;
    dbf: string;
    prj?: string;
  }> {
    const files = fs.readdirSync(dir);
    
    // Find files with same base name but different extensions
    const shapefileGroups = new Map<string, { shp?: string; shx?: string; dbf?: string; prj?: string }>();
    
    files.forEach(file => {
      const ext = path.extname(file).toLowerCase();
      const baseName = path.basename(file, ext);
      
      if (!shapefileGroups.has(baseName)) {
        shapefileGroups.set(baseName, {});
      }
      
      const group = shapefileGroups.get(baseName)!;
      
      switch (ext) {
        case '.shp':
          group.shp = path.join(dir, file);
          break;
        case '.shx':
          group.shx = path.join(dir, file);
          break;
        case '.dbf':
          group.dbf = path.join(dir, file);
          break;
        case '.prj':
          group.prj = path.join(dir, file);
          break;
      }
    });

    // Find the most complete shapefile
    let bestGroup: { shp: string; shx: string; dbf: string; prj?: string } | null = null;
    
    for (const [_baseName, group] of shapefileGroups) {
      if (group.shp && group.shx && group.dbf) {
        bestGroup = {
          shp: group.shp,
          shx: group.shx,
          dbf: group.dbf,
          prj: group.prj
        };
        break;
      }
    }

    if (!bestGroup) {
      const availableFiles = files.join(', ');
      throw new Error(`Incomplete shapefile. Required files (.shp, .shx, .dbf) not found. Available files: ${availableFiles}`);
    }

    return bestGroup;
  }

  private static async readShapefile(
    paths: { shp: string; shx: string; dbf: string; prj?: string },
    options: { maxFeatures: number; includeGeometry: boolean }
  ): Promise<ShapefileParseResult> {
    
    // Read CRS information if available
    let crs: string | undefined;
    if (paths.prj && fs.existsSync(paths.prj)) {
      try {
        crs = fs.readFileSync(paths.prj, 'utf8').trim();
      } catch (error) {
        // CRS is optional, continue without it
      }
    }

    // Open shapefile for reading
    const source = await shapefile.open(paths.shp, paths.dbf);
    
    const features: any[] = [];
    const geometryTypes = new Set<string>();
    const allHeaders = new Set<string>();
    
    // Add geometry headers if including geometry
    if (options.includeGeometry) {
      allHeaders.add('geometry_type');
      allHeaders.add('geometry_wkt');
    }

    // Read features
    let result = await source.read();
    let featureCount = 0;
    
    while (!result.done && featureCount < options.maxFeatures) {
      const feature = result.value;
      
      if (feature) {
        features.push(feature);
        
        // Track geometry type
        if (feature.geometry && feature.geometry.type) {
          geometryTypes.add(feature.geometry.type);
        }
        
        // Collect property headers
        if (feature.properties) {
          Object.keys(feature.properties).forEach(key => allHeaders.add(key));
        }
        
        featureCount++;
      }
      
      result = await source.read();
    }

    // Get total feature count
    let totalFeatures = featureCount;
    while (!result.done) {
      totalFeatures++;
      result = await source.read();
    }

    // Close the source if the method exists
    if (source.close) {
      await source.close();
    }

    if (features.length === 0) {
      throw new Error('No features found in shapefile');
    }

    const headers = Array.from(allHeaders);
    const geometryType = geometryTypes.size === 1 
      ? Array.from(geometryTypes)[0] 
      : `Mixed (${Array.from(geometryTypes).join(', ')})`;

    // Convert features to tabular data
    const data = features.map(feature => {
      const row: Record<string, any> = {};

      // Add geometry information if requested
      if (options.includeGeometry && feature.geometry) {
        row.geometry_type = feature.geometry.type;
        row.geometry_wkt = this.geometryToWKT(feature.geometry);
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
      bounds,
      crs
    };
  }

  private static geometryToWKT(geometry: any): string {
    if (!geometry || !geometry.type || !geometry.coordinates) {
      return 'EMPTY';
    }

    switch (geometry.type) {
      case 'Point':
        const [x, y] = geometry.coordinates;
        return `POINT(${x} ${y})`;
      
      case 'LineString':
        const lineCoords = geometry.coordinates.map((coord: number[]) => `${coord[0]} ${coord[1]}`).join(', ');
        return `LINESTRING(${lineCoords})`;
      
      case 'Polygon':
        const rings = geometry.coordinates.map((ring: number[][]) => 
          '(' + ring.map((coord: number[]) => `${coord[0]} ${coord[1]}`).join(', ') + ')'
        ).join(', ');
        return `POLYGON(${rings})`;
      
      default:
        return `${geometry.type.toUpperCase()}(...)`;
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

  private static async removeDirectory(dirPath: string): Promise<void> {
    if (fs.existsSync(dirPath)) {
      const files = fs.readdirSync(dirPath);
      
      for (const file of files) {
        const filePath = path.join(dirPath, file);
        const stat = fs.statSync(filePath);
        
        if (stat.isDirectory()) {
          await this.removeDirectory(filePath);
        } else {
          fs.unlinkSync(filePath);
        }
      }
      
      fs.rmdirSync(dirPath);
    }
  }

  static detectPropertyTypes(data: Record<string, any>[], headers: string[]): Record<string, string> {
    const types: Record<string, string> = {};

    headers.forEach(header => {
      // Skip geometry-specific headers
      if (header === 'geometry_type' || header === 'geometry_wkt') {
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