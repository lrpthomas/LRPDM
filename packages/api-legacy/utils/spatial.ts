export interface Point {
  lat: number;
  lng: number;
}

export interface BBox {
  minLat: number;
  minLng: number;
  maxLat: number;
  maxLng: number;
}

export function pointToWKT(point: Point): string {
  return `POINT(${point.lng} ${point.lat})`;
}

export function bboxToWKT(bbox: BBox): string {
  return `POLYGON((
    ${bbox.minLng} ${bbox.minLat},
    ${bbox.maxLng} ${bbox.minLat},
    ${bbox.maxLng} ${bbox.maxLat},
    ${bbox.minLng} ${bbox.maxLat},
    ${bbox.minLng} ${bbox.minLat}
  ))`;
}
