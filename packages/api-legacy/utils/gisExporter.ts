import fs from 'fs';
import path from 'path';
import AdmZip from 'adm-zip';
import { XMLBuilder } from 'fast-xml-parser';

export interface ExportOptions {
  format: 'geojson' | 'kml' | 'csv' | 'shapefile' | 'gpx';
  filename?: string;
  includeProperties?: string[];
  excludeProperties?: string[];
  spatialFilter?: {
    bounds?: number[]; // [minX, minY, maxX, maxY]
    buffer?: number; // meters
  };
  crs?: string;
  compress?: boolean;
}

export interface ExportResult {
  success: boolean;
  filePath?: string;
  fileName?: string;
  fileSize?: number;
  error?: string;
  warnings?: string[];
  metadata?: {
    featureCount: number;
    format: string;
    crs: string;
  };
}

export class GISExporter {
  
  static async exportData(
    geojson: any, 
    outputDir: string, 
    options: ExportOptions
  ): Promise<ExportResult> {
    try {
      // Apply spatial filter if specified
      let filteredData = geojson;
      if (options.spatialFilter) {
        filteredData = this.applySpatialFilter(geojson, options.spatialFilter);
      }
      
      // Apply property filters
      if (options.includeProperties || options.excludeProperties) {
        filteredData = this.applyPropertyFilter(filteredData, options);
      }
      
      const fileName = options.filename || `export_${Date.now()}`;
      let filePath: string;
      let actualFileName: string;
      
      switch (options.format) {
        case 'geojson':
          const result = await this.exportGeoJSON(filteredData, outputDir, fileName, options);
          filePath = result.filePath;
          actualFileName = result.fileName;
          break;
          
        case 'kml':
          const kmlResult = await this.exportKML(filteredData, outputDir, fileName, options);
          filePath = kmlResult.filePath;
          actualFileName = kmlResult.fileName;
          break;
          
        case 'csv':
          const csvResult = await this.exportCSV(filteredData, outputDir, fileName, options);
          filePath = csvResult.filePath;
          actualFileName = csvResult.fileName;
          break;
          
        case 'gpx':
          const gpxResult = await this.exportGPX(filteredData, outputDir, fileName, options);
          filePath = gpxResult.filePath;
          actualFileName = gpxResult.fileName;
          break;
          
        case 'shapefile':
          const shpResult = await this.exportShapefile(filteredData, outputDir, fileName, options);
          filePath = shpResult.filePath;
          actualFileName = shpResult.fileName;
          break;
          
        default:
          return {
            success: false,
            error: `Unsupported export format: ${options.format}`
          };
      }
      
      const stats = fs.statSync(filePath);
      
      return {
        success: true,
        filePath,
        fileName: actualFileName,
        fileSize: stats.size,
        metadata: {
          featureCount: filteredData.features ? filteredData.features.length : 0,
          format: options.format.toUpperCase(),
          crs: options.crs || 'EPSG:4326'
        }
      };
      
    } catch (error) {
      return {
        success: false,
        error: `Export failed: ${(error as Error).message}`
      };
    }
  }
  
  // Export to GeoJSON
  static async exportGeoJSON(
    geojson: any, 
    outputDir: string, 
    fileName: string, 
    _options: ExportOptions
  ): Promise<{ filePath: string, fileName: string }> {
    const actualFileName = `${fileName}.geojson`;
    const filePath = path.join(outputDir, actualFileName);
    
    // Add CRS information if specified
    if (_options.crs && _options.crs !== 'EPSG:4326') {
      geojson.crs = {
        type: 'name',
        properties: {
          name: _options.crs
        }
      };
    }
    
    const jsonString = JSON.stringify(geojson, null, 2);
    fs.writeFileSync(filePath, jsonString);
    
    return { filePath, fileName: actualFileName };
  }
  
  // Export to KML
  static async exportKML(
    geojson: any, 
    outputDir: string, 
    fileName: string, 
    options: ExportOptions
  ): Promise<{ filePath: string, fileName: string }> {
    const kmlData = this.geojsonToKML(geojson);
    
    const actualFileName = `${fileName}.kml`;
    const filePath = path.join(outputDir, actualFileName);
    
    const xmlBuilder = new XMLBuilder({
      ignoreAttributes: false,
      format: true,
      suppressEmptyNode: true
    });
    
    const kmlXml = xmlBuilder.build(kmlData);
    const xmlHeader = '<?xml version="1.0" encoding="UTF-8"?>\n';
    
    fs.writeFileSync(filePath, xmlHeader + kmlXml);
    
    // Optionally compress to KMZ
    if (options.compress) {
      const kmzFileName = `${fileName}.kmz`;
      const kmzPath = path.join(outputDir, kmzFileName);
      
      const zip = new AdmZip();
      zip.addFile(`${fileName}.kml`, Buffer.from(xmlHeader + kmlXml));
      zip.writeZip(kmzPath);
      
      // Remove the uncompressed KML file
      fs.unlinkSync(filePath);
      
      return { filePath: kmzPath, fileName: kmzFileName };
    }
    
    return { filePath, fileName: actualFileName };
  }
  
  // Export to CSV
  static async exportCSV(
    geojson: any, 
    outputDir: string, 
    fileName: string, 
    _options: ExportOptions
  ): Promise<{ filePath: string, fileName: string }> {
    const csvData = this.geojsonToCSV(geojson);
    
    const actualFileName = `${fileName}.csv`;
    const filePath = path.join(outputDir, actualFileName);
    
    fs.writeFileSync(filePath, csvData);
    
    return { filePath, fileName: actualFileName };
  }
  
  // Export to GPX
  static async exportGPX(
    geojson: any, 
    outputDir: string, 
    fileName: string, 
    _options: ExportOptions
  ): Promise<{ filePath: string, fileName: string }> {
    const gpxData = this.geojsonToGPX(geojson);
    
    const actualFileName = `${fileName}.gpx`;
    const filePath = path.join(outputDir, actualFileName);
    
    const xmlBuilder = new XMLBuilder({
      ignoreAttributes: false,
      format: true,
      suppressEmptyNode: true
    });
    
    const gpxXml = xmlBuilder.build(gpxData);
    const xmlHeader = '<?xml version="1.0" encoding="UTF-8"?>\n';
    
    fs.writeFileSync(filePath, xmlHeader + gpxXml);
    
    return { filePath, fileName: actualFileName };
  }
  
  // Export to Shapefile (simplified - creates a zip with basic components)
  static async exportShapefile(
    geojson: any, 
    outputDir: string, 
    fileName: string, 
    options: ExportOptions
  ): Promise<{ filePath: string, fileName: string }> {
    // Note: This is a simplified shapefile export
    // In production, you'd use a proper shapefile library
    
    const warnings: string[] = [];
    warnings.push('Shapefile export is simplified - some data may be lost');
    
    // Convert to a basic format and zip
    const shapeData = this.geojsonToShapeComponents(geojson);
    
    const zipFileName = `${fileName}_shapefile.zip`;
    const zipPath = path.join(outputDir, zipFileName);
    
    const zip = new AdmZip();
    
    // Add shapefile components
    zip.addFile(`${fileName}.shp`, Buffer.from('Placeholder SHP data'));
    zip.addFile(`${fileName}.shx`, Buffer.from('Placeholder SHX data'));
    zip.addFile(`${fileName}.dbf`, Buffer.from(shapeData.dbf));
    zip.addFile(`${fileName}.prj`, Buffer.from(this.getCRSDefinition(options.crs || 'EPSG:4326')));
    
    zip.writeZip(zipPath);
    
    return { filePath: zipPath, fileName: zipFileName };
  }
  
  // Helper methods for format conversion
  
  static geojsonToKML(geojson: any): any {
    const placemarks = geojson.features.map((feature: any) => {
      const placemark: any = {
        '@_id': feature.id || `feature_${Math.random()}`,
        name: feature.properties?.name || 'Unnamed Feature',
        description: this.formatDescription(feature.properties)
      };
      
      // Convert geometry
      if (feature.geometry) {
        switch (feature.geometry.type) {
          case 'Point':
            placemark.Point = {
              coordinates: feature.geometry.coordinates.join(',')
            };
            break;
          case 'LineString':
            placemark.LineString = {
              coordinates: feature.geometry.coordinates.map((coord: number[]) => coord.join(',')).join(' ')
            };
            break;
          case 'Polygon':
            placemark.Polygon = {
              outerBoundaryIs: {
                LinearRing: {
                  coordinates: feature.geometry.coordinates[0].map((coord: number[]) => coord.join(',')).join(' ')
                }
              }
            };
            break;
        }
      }
      
      return placemark;
    });
    
    return {
      kml: {
        '@_xmlns': 'http://www.opengis.net/kml/2.2',
        Document: {
          name: 'Exported Data',
          Placemark: placemarks
        }
      }
    };
  }
  
  static geojsonToCSV(geojson: any): string {
    if (!geojson.features || geojson.features.length === 0) {
      return '';
    }
    
    // Collect all property keys
    const allKeys = new Set<string>();
    geojson.features.forEach((feature: any) => {
      if (feature.properties) {
        Object.keys(feature.properties).forEach(key => allKeys.add(key));
      }
    });
    
    // Add geometry columns
    const headers = ['geometry_type', 'longitude', 'latitude', ...Array.from(allKeys)];
    
    // Convert features to CSV rows
    const rows = geojson.features.map((feature: any) => {
      const row: any = {
        geometry_type: feature.geometry?.type || '',
        longitude: '',
        latitude: ''
      };
      
      // Extract coordinates (simplified - takes first coordinate for multipart geometries)
      if (feature.geometry && feature.geometry.coordinates) {
        const coords = this.extractFirstCoordinate(feature.geometry);
        if (coords) {
          row.longitude = coords[0];
          row.latitude = coords[1];
        }
      }
      
      // Add properties
      if (feature.properties) {
        Object.assign(row, feature.properties);
      }
      
      return headers.map(header => {
        const value = row[header] || '';
        // Escape commas and quotes in CSV
        if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
      }).join(',');
    });
    
    return [headers.join(','), ...rows].join('\n');
  }
  
  static geojsonToGPX(geojson: any): any {
    const waypoints: any[] = [];
    const tracks: any[] = [];
    
    geojson.features.forEach((feature: any) => {
      if (feature.geometry) {
        switch (feature.geometry.type) {
          case 'Point':
            waypoints.push({
              '@_lat': feature.geometry.coordinates[1],
              '@_lon': feature.geometry.coordinates[0],
              name: feature.properties?.name || 'Waypoint',
              desc: feature.properties?.description || ''
            });
            break;
          case 'LineString':
            const trackPoints = feature.geometry.coordinates.map((coord: number[]) => ({
              '@_lat': coord[1],
              '@_lon': coord[0]
            }));
            
            tracks.push({
              name: feature.properties?.name || 'Track',
              trkseg: {
                trkpt: trackPoints
              }
            });
            break;
        }
      }
    });
    
    return {
      gpx: {
        '@_version': '1.1',
        '@_creator': 'GIS Platform',
        '@_xmlns': 'http://www.topografix.com/GPX/1/1',
        wpt: waypoints,
        trk: tracks
      }
    };
  }
  
  static geojsonToShapeComponents(geojson: any): any {
    // Simplified DBF creation (attribute table)
    const headers = new Set<string>();
    geojson.features.forEach((feature: any) => {
      if (feature.properties) {
        Object.keys(feature.properties).forEach(key => headers.add(key));
      }
    });
    
    // Create basic DBF content (placeholder)
    let dbfContent = 'DBF_HEADER\n';
    geojson.features.forEach((feature: any, index: number) => {
      const row = Array.from(headers).map(header => 
        feature.properties?.[header] || ''
      ).join(',');
      dbfContent += `${index},${row}\n`;
    });
    
    return {
      dbf: dbfContent
    };
  }
  
  // Utility methods
  
  static applySpatialFilter(geojson: any, filter: any): any {
    if (!filter.bounds) return geojson;
    
    const [minX, minY, maxX, maxY] = filter.bounds;
    
    const filteredFeatures = geojson.features.filter((feature: any) => {
      if (!feature.geometry) return false;
      
      const coords = this.extractFirstCoordinate(feature.geometry);
      if (!coords) return false;
      
      const [lon, lat] = coords;
      return lon >= minX && lon <= maxX && lat >= minY && lat <= maxY;
    });
    
    return {
      ...geojson,
      features: filteredFeatures
    };
  }
  
  static applyPropertyFilter(geojson: any, options: ExportOptions): any {
    const filteredFeatures = geojson.features.map((feature: any) => {
      if (!feature.properties) return feature;
      
      let filteredProperties = { ...feature.properties };
      
      if (options.includeProperties) {
        filteredProperties = {};
        options.includeProperties.forEach(prop => {
          if (feature.properties[prop] !== undefined) {
            filteredProperties[prop] = feature.properties[prop];
          }
        });
      }
      
      if (options.excludeProperties) {
        options.excludeProperties.forEach(prop => {
          delete filteredProperties[prop];
        });
      }
      
      return {
        ...feature,
        properties: filteredProperties
      };
    });
    
    return {
      ...geojson,
      features: filteredFeatures
    };
  }
  
  static extractFirstCoordinate(geometry: any): number[] | null {
    if (!geometry.coordinates) return null;
    
    switch (geometry.type) {
      case 'Point':
        return geometry.coordinates;
      case 'LineString':
      case 'MultiPoint':
        return geometry.coordinates[0];
      case 'Polygon':
      case 'MultiLineString':
        return geometry.coordinates[0][0];
      case 'MultiPolygon':
        return geometry.coordinates[0][0][0];
      default:
        return null;
    }
  }
  
  static formatDescription(properties: any): string {
    if (!properties) return '';
    
    return Object.entries(properties)
      .map(([key, value]) => `${key}: ${value}`)
      .join('\n');
  }
  
  static getCRSDefinition(crs: string): string {
    switch (crs) {
      case 'EPSG:4326':
        return 'GEOGCS["WGS 84",DATUM["WGS_1984",SPHEROID["WGS 84",6378137,298.257223563]],PRIMEM["Greenwich",0],UNIT["degree",0.0174532925199433]]';
      case 'EPSG:3857':
        return 'PROJCS["WGS_1984_Web_Mercator_Auxiliary_Sphere",GEOGCS["GCS_WGS_1984",DATUM["D_WGS_1984",SPHEROID["WGS_1984",6378137.0,298.257223563]],PRIMEM["Greenwich",0.0],UNIT["Degree",0.0174532925199433]],PROJECTION["Mercator_Auxiliary_Sphere"],PARAMETER["False_Easting",0.0],PARAMETER["False_Northing",0.0],PARAMETER["Central_Meridian",0.0],PARAMETER["Standard_Parallel_1",0.0],PARAMETER["Auxiliary_Sphere_Type",0.0],UNIT["Meter",1.0]]';
      default:
        return 'GEOGCS["WGS 84",DATUM["WGS_1984",SPHEROID["WGS 84",6378137,298.257223563]],PRIMEM["Greenwich",0],UNIT["degree",0.0174532925199433]]';
    }
  }
}

export default GISExporter;