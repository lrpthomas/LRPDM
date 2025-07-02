// Spatial type definitions for the GIS platform

export interface Point {
  type: 'Point';
  coordinates: [number, number]; // [longitude, latitude]
}

export interface LineString {
  type: 'LineString';
  coordinates: [number, number][];
}

export interface Polygon {
  type: 'Polygon';
  coordinates: [number, number][][];
}

export interface MultiPoint {
  type: 'MultiPoint';
  coordinates: [number, number][];
}

export interface MultiLineString {
  type: 'MultiLineString';
  coordinates: [number, number][][];
}

export interface MultiPolygon {
  type: 'MultiPolygon';
  coordinates: [number, number][][][];
}

export type Geometry = Point | LineString | Polygon | MultiPoint | MultiLineString | MultiPolygon;

export interface Feature<G extends Geometry = Geometry, P = any> {
  type: 'Feature';
  id?: string | number;
  geometry: G;
  properties: P;
}

export interface FeatureCollection<G extends Geometry = Geometry, P = any> {
  type: 'FeatureCollection';
  features: Feature<G, P>[];
}

// Domain-specific types
export interface FeatureProperties {
  [key: string]: any;
  feature_type?: string;
  name?: string;
  description?: string;
}

export interface ProximitySearchResult extends Feature {
  distance: number; // Distance in meters
  timestamps?: {
    created: Date;
    updated: Date;
  };
}

export interface SpatialBounds {
  minLat: number;
  minLng: number;
  maxLat: number;
  maxLng: number;
}

export interface VectorTileRequest {
  z: number; // Zoom level
  x: number; // Tile X coordinate
  y: number; // Tile Y coordinate
  layerId?: string;
}

export interface SpatialQueryOptions {
  limit?: number;
  offset?: number;
  orderBy?: 'distance' | 'created_at' | 'updated_at';
  orderDirection?: 'asc' | 'desc';
}

export interface BufferOptions {
  radius: number; // meters
  segments?: number; // Number of segments for circular approximation
  endCap?: 'round' | 'flat' | 'square';
  join?: 'round' | 'mitre' | 'bevel';
}

export interface SpatialIndex {
  tableName: string;
  columnName: string;
  indexType: 'gist' | 'spgist' | 'brin';
  isValid: boolean;
}

export interface GeometryValidation {
  isValid: boolean;
  reason?: string;
  fixedGeometry?: Geometry;
}

// Error types
export class SpatialError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: any
  ) {
    super(message);
    this.name = 'SpatialError';
  }
}

export class GeometryValidationError extends SpatialError {
  constructor(message: string, details?: any) {
    super(message, 'INVALID_GEOMETRY', details);
    this.name = 'GeometryValidationError';
  }
}

export class SpatialReferenceError extends SpatialError {
  constructor(message: string, details?: any) {
    super(message, 'INVALID_SRID', details);
    this.name = 'SpatialReferenceError';
  }
}