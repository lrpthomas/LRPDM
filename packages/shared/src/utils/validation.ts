// Validation utility functions
export function isValidGeoJSON(obj: any): boolean {
  if (!obj || typeof obj !== 'object') return false;
  
  if (obj.type === 'Feature') {
    return !!obj.geometry && !!obj.properties;
  }
  
  if (obj.type === 'FeatureCollection') {
    return Array.isArray(obj.features);
  }
  
  return false;
}

export function isValidGeometry(geometry: any): boolean {
  if (!geometry || !geometry.type || !geometry.coordinates) return false;
  
  const validTypes = ['Point', 'LineString', 'Polygon', 'MultiPoint', 'MultiLineString', 'MultiPolygon', 'GeometryCollection'];
  return validTypes.includes(geometry.type);
}