import { pointToWKT, bboxToWKT, Point, BBox } from '../../src/utils/spatial';

describe('Spatial Utils', () => {
  test('should convert point to WKT', () => {
    const point: Point = { lat: 40.7128, lng: -74.006 };
    const wkt = pointToWKT(point);
    expect(wkt).toBe('POINT(-74.006 40.7128)');
  });
  
  test('should convert bbox to WKT', () => {
    const bbox: BBox = {
      minLat: 40.7,
      minLng: -74.1,
      maxLat: 40.8,
      maxLng: -73.9
    };
    const wkt = bboxToWKT(bbox);
    expect(wkt).toContain('POLYGON');
    expect(wkt).toContain('-74.1 40.7');
  });
  
  test('should handle negative coordinates', () => {
    const point: Point = { lat: -33.8688, lng: 151.2093 }; // Sydney
    const wkt = pointToWKT(point);
    expect(wkt).toBe('POINT(151.2093 -33.8688)');
  });
  
  test('should create valid bbox polygon', () => {
    const bbox: BBox = {
      minLat: -1,
      minLng: -1,
      maxLat: 1,
      maxLng: 1
    };
    const wkt = bboxToWKT(bbox);
    expect(wkt).toContain('POLYGON');
    expect(wkt).toContain('-1 -1');
    expect(wkt).toContain('1 1');
  });
});