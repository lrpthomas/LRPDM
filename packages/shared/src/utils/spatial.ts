// Spatial utility functions
import type { Feature } from 'geojson';

export const EPSG_WGS84 = 4326;
export const EPSG_WEB_MERCATOR = 3857;

export function validateCoordinates(lon: number, lat: number): boolean {
  return lon >= -180 && lon <= 180 && lat >= -90 && lat <= 90;
}

export function bboxFromFeatures(features: Feature[]): [number, number, number, number] | null {
  if (!features.length) return null;
  
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  
  // Implementation would go here
  // This is a placeholder
  return [minX, minY, maxX, maxY];
}