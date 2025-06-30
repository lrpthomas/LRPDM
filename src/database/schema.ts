export interface Dataset {
  id: string;
  name: string;
  description?: string;
  type: 'point' | 'linestring' | 'polygon' | 'mixed';
  source_format: 'csv' | 'excel' | 'shapefile' | 'geojson';
  original_filename: string;
  feature_count: number;
  bounds?: {
    min_lng: number;
    min_lat: number;
    max_lng: number;
    max_lat: number;
  };
  crs?: string;
  metadata?: Record<string, any>;
  created_at: Date;
  updated_at: Date;
}

export interface Layer {
  id: string;
  dataset_id: string;
  name: string;
  description?: string;
  geometry_type: string;
  feature_count: number;
  style?: Record<string, any>;
  visible: boolean;
  min_zoom?: number;
  max_zoom?: number;
  created_at: Date;
  updated_at: Date;
}

export interface Feature {
  id: string;
  layer_id: string;
  properties: Record<string, any>;
  geometry?: any; // PostGIS geometry type
  created_at: Date;
  updated_at: Date;
}

export interface ImportSession {
  id: string;
  dataset_id?: string;
  filename: string;
  file_type: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  total_rows: number;
  processed_rows: number;
  error_count: number;
  errors?: Record<string, any>[];
  field_mapping: Record<string, any>;
  started_at?: Date;
  completed_at?: Date;
  created_at: Date;
}