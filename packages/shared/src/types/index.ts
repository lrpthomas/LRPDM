// Common type definitions
import type { Geometry, Feature as GeoJSONFeature, FeatureCollection as GeoJSONFeatureCollection } from 'geojson';

export interface Feature extends GeoJSONFeature {
  id: string;
  properties: Record<string, any>;
}

export interface FeatureCollection extends GeoJSONFeatureCollection {
  features: Feature[];
}

export interface SpatialError extends Error {
  code: string;
  details?: any;
}