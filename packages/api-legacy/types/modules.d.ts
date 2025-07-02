// Type declarations for modules without types

declare module 'shapefile' {
  export function open(shp: string | Buffer, dbf?: string | Buffer): Promise<{
    read(): Promise<{ done: boolean; value?: any }>;
    close?(): Promise<void>;
  }>;
}

declare module '@mapbox/togeojson' {
  export function kml(doc: Document): any;
  export function gpx(doc: Document): any;
}

declare module 'geojson-validation' {
  export function valid(geoJSON: any): boolean;
  export function validate(geoJSON: any): boolean;
  export function isGeoJSONObject(geoJSON: any): boolean;
  export function isGeometryObject(geoJSON: any): boolean;
  export function isFeature(geoJSON: any): boolean;
  export function isFeatureCollection(geoJSON: any): boolean;
  export function isPoint(geoJSON: any): boolean;
  export function isMultiPoint(geoJSON: any): boolean;
  export function isLineString(geoJSON: any): boolean;
  export function isMultiLineString(geoJSON: any): boolean;
  export function isPolygon(geoJSON: any): boolean;
  export function isMultiPolygon(geoJSON: any): boolean;
  export function isGeometryCollection(geoJSON: any): boolean;
}