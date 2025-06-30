import { db } from '../config/database';

export interface SpatialTransformOptions {
  fromSRID?: number;
  toSRID?: number;
}

export interface BufferOptions {
  distance: number;
  unit?: 'meters' | 'kilometers' | 'miles' | 'degrees';
  segments?: number;
}

export class PostGISService {
  // Geometry validation and repair
  static async validateGeometry(wkt: string): Promise<{
    isValid: boolean;
    reason?: string;
  }> {
    const result = await db.raw(
      'SELECT ST_IsValid(ST_GeomFromText(?, 4326)) as is_valid, ST_IsValidReason(ST_GeomFromText(?, 4326)) as reason',
      [wkt, wkt]
    );

    const { is_valid, reason } = result.rows[0];
    return {
      isValid: is_valid,
      reason: is_valid ? undefined : reason
    };
  }

  static async repairGeometry(wkt: string): Promise<string> {
    const result = await db.raw(
      'SELECT ST_AsText(ST_MakeValid(ST_GeomFromText(?, 4326))) as repaired',
      [wkt]
    );

    return result.rows[0].repaired;
  }

  // Coordinate transformation
  static async transformCoordinates(
    geometry: string,
    options: SpatialTransformOptions
  ): Promise<string> {
    const { fromSRID = 4326, toSRID = 4326 } = options;

    const result = await db.raw(
      'SELECT ST_AsText(ST_Transform(ST_GeomFromText(?, ?), ?)) as transformed',
      [geometry, fromSRID, toSRID]
    );

    return result.rows[0].transformed;
  }

  // Buffer operations
  static async createBuffer(
    geometry: string,
    options: BufferOptions
  ): Promise<string> {
    const { distance, unit = 'meters', segments = 8 } = options;

    let bufferDistance = distance;

    // Convert to degrees if needed (approximate)
    if (unit !== 'degrees') {
      const conversions = {
        meters: 0.00001,
        kilometers: 0.01,
        miles: 0.016
      };
      bufferDistance = distance * conversions[unit];
    }

    const result = await db.raw(
      'SELECT ST_AsText(ST_Buffer(ST_GeomFromText(?, 4326)::geography, ?, ?)) as buffer',
      [geometry, bufferDistance, segments]
    );

    return result.rows[0].buffer;
  }

  // Spatial analysis
  static async calculateArea(geometry: string): Promise<{
    squareMeters: number;
    squareKilometers: number;
    acres: number;
  }> {
    const result = await db.raw(
      'SELECT ST_Area(ST_GeomFromText(?, 4326)::geography) as area_m2',
      [geometry]
    );

    const areaM2 = result.rows[0].area_m2;

    return {
      squareMeters: areaM2,
      squareKilometers: areaM2 / 1000000,
      acres: areaM2 * 0.000247105
    };
  }

  static async calculateLength(geometry: string): Promise<{
    meters: number;
    kilometers: number;
    miles: number;
  }> {
    const result = await db.raw(
      'SELECT ST_Length(ST_GeomFromText(?, 4326)::geography) as length_m',
      [geometry]
    );

    const lengthM = result.rows[0].length_m;

    return {
      meters: lengthM,
      kilometers: lengthM / 1000,
      miles: lengthM * 0.000621371
    };
  }

  static async calculateCentroid(geometry: string): Promise<{
    lng: number;
    lat: number;
  }> {
    const result = await db.raw(
      'SELECT ST_X(ST_Centroid(ST_GeomFromText(?, 4326))) as lng, ST_Y(ST_Centroid(ST_GeomFromText(?, 4326))) as lat',
      [geometry, geometry]
    );

    const { lng, lat } = result.rows[0];
    return { lng, lat };
  }

  // Geometry simplification
  static async simplifyGeometry(
    geometry: string,
    tolerance: number = 0.0001
  ): Promise<string> {
    const result = await db.raw(
      'SELECT ST_AsText(ST_Simplify(ST_GeomFromText(?, 4326), ?)) as simplified',
      [geometry, tolerance]
    );

    return result.rows[0].simplified;
  }

  // Coordinate extraction
  static async extractCoordinates(geometry: string): Promise<number[][]> {
    const result = await db.raw(
      'SELECT ST_AsGeoJSON(ST_GeomFromText(?, 4326)) as geojson',
      [geometry]
    );

    const geojson = JSON.parse(result.rows[0].geojson);
    return this.flattenCoordinates(geojson.coordinates);
  }

  private static flattenCoordinates(coords: any): number[][] {
    const flattened: number[][] = [];

    function traverse(c: any) {
      if (Array.isArray(c)) {
        if (c.length >= 2 && typeof c[0] === 'number' && typeof c[1] === 'number') {
          flattened.push([c[0], c[1]]);
        } else {
          c.forEach(traverse);
        }
      }
    }

    traverse(coords);
    return flattened;
  }

  // Batch geometry creation for different data types
  static async createPointFromCoordinates(lng: number, lat: number): Promise<string> {
    const result = await db.raw(
      'SELECT ST_AsText(ST_SetSRID(ST_MakePoint(?, ?), 4326)) as point',
      [lng, lat]
    );

    return result.rows[0].point;
  }

  static async createLineFromCoordinates(coordinates: number[][]): Promise<string> {
    const points = coordinates.map(([lng, lat]) => `${lng} ${lat}`).join(', ');
    
    const result = await db.raw(
      'SELECT ST_AsText(ST_GeomFromText(?, 4326)) as line',
      [`LINESTRING(${points})`]
    );

    return result.rows[0].line;
  }

  static async createPolygonFromCoordinates(coordinates: number[][][]): Promise<string> {
    const rings = coordinates.map(ring => {
      const points = ring.map(([lng, lat]) => `${lng} ${lat}`).join(', ');
      return `(${points})`;
    }).join(', ');
    
    const result = await db.raw(
      'SELECT ST_AsText(ST_GeomFromText(?, 4326)) as polygon',
      [`POLYGON(${rings})`]
    );

    return result.rows[0].polygon;
  }

  // Format conversion utilities
  static async wktToGeoJSON(wkt: string): Promise<any> {
    const result = await db.raw(
      'SELECT ST_AsGeoJSON(ST_GeomFromText(?, 4326)) as geojson',
      [wkt]
    );

    return JSON.parse(result.rows[0].geojson);
  }

  static async geoJSONToWKT(geojson: any): Promise<string> {
    const result = await db.raw(
      'SELECT ST_AsText(ST_GeomFromGeoJSON(?)) as wkt',
      [JSON.stringify(geojson)]
    );

    return result.rows[0].wkt;
  }

  // Spatial indexing helpers
  static async optimizeTable(tableName: string, geometryColumn: string = 'geometry'): Promise<void> {
    // Vacuum analyze the table
    await db.raw(`VACUUM ANALYZE ${tableName}`);
    
    // Ensure spatial index exists
    await db.raw(`
      CREATE INDEX IF NOT EXISTS ${tableName}_${geometryColumn}_idx 
      ON ${tableName} USING GIST (${geometryColumn})
    `);
    
    // Cluster table by spatial index for better performance
    await db.raw(`CLUSTER ${tableName} USING ${tableName}_${geometryColumn}_idx`);
  }
}