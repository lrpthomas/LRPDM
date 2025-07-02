import React, { useState, useCallback, useEffect } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { Map } from 'maplibre-gl';
import { MapLayout } from './MapLayout';

// Mock data matching our database schema
const mockDatasets = [
  {
    id: 'dataset-1',
    name: 'NYC Restaurants',
    description: 'Restaurant locations in New York City',
    type: 'point' as const,
    source_format: 'csv' as const,
    original_filename: 'nyc_restaurants.csv',
    feature_count: 1250,
    bounds: {
      min_lng: -74.1,
      min_lat: 40.6,
      max_lng: -73.9,
      max_lat: 40.8
    },
    created_at: new Date('2024-01-15'),
    updated_at: new Date('2024-01-20')
  },
  {
    id: 'dataset-2',
    name: 'Central Park Trails',
    description: 'Walking and biking trails in Central Park',
    type: 'linestring' as const,
    source_format: 'geojson' as const,
    original_filename: 'central_park_trails.geojson',
    feature_count: 45,
    bounds: {
      min_lng: -73.98,
      min_lat: 40.76,
      max_lng: -73.95,
      max_lat: 40.80
    },
    created_at: new Date('2024-01-16'),
    updated_at: new Date('2024-01-21')
  },
  {
    id: 'dataset-3',
    name: 'Manhattan Neighborhoods',
    description: 'Neighborhood boundaries in Manhattan',
    type: 'polygon' as const,
    source_format: 'shapefile' as const,
    original_filename: 'manhattan_neighborhoods.shp',
    feature_count: 28,
    bounds: {
      min_lng: -74.02,
      min_lat: 40.70,
      max_lng: -73.93,
      max_lat: 40.88
    },
    created_at: new Date('2024-01-17'),
    updated_at: new Date('2024-01-22')
  }
];

const mockLayers = [
  {
    id: 'layer-1',
    dataset_id: 'dataset-1',
    name: 'Restaurant Points',
    description: 'Individual restaurant locations',
    geometry_type: 'Point',
    feature_count: 1250,
    style: {
      pointSize: 8,
      pointColor: '#FF6B35',
      strokeColor: '#FFFFFF',
      strokeWidth: 2
    },
    visible: true,
    opacity: 0.8,
    minZoom: 10,
    maxZoom: 20,
    isLoading: false,
    hasError: false
  },
  {
    id: 'layer-2',
    dataset_id: 'dataset-2',
    name: 'Park Trails',
    description: 'Central Park trail network',
    geometry_type: 'LineString',
    feature_count: 45,
    style: {
      strokeColor: '#34C759',
      strokeWidth: 3
    },
    visible: true,
    opacity: 1.0,
    minZoom: 12,
    maxZoom: 18,
    isLoading: false,
    hasError: false
  },
  {
    id: 'layer-3',
    dataset_id: 'dataset-3',
    name: 'Neighborhood Boundaries',
    description: 'Manhattan neighborhood polygons',
    geometry_type: 'Polygon',
    feature_count: 28,
    style: {
      fillColor: '#007AFF',
      fillOpacity: 0.15,
      strokeColor: '#007AFF',
      strokeWidth: 2
    },
    visible: false,
    opacity: 0.7,
    minZoom: 8,
    maxZoom: 16,
    isLoading: false,
    hasError: false
  }
];

// Generate mock features
const generateMockFeatures = () => {
  const features = [];
  
  // Restaurant points
  for (let i = 0; i < 100; i++) {
    features.push({
      id: `restaurant-${i}`,
      layer_id: 'layer-1',
      properties: {
        name: `Restaurant ${i + 1}`,
        description: `A great restaurant in NYC`,
        cuisine: ['Italian', 'Chinese', 'Mexican', 'American', 'Thai'][i % 5],
        rating: Math.round((Math.random() * 5) * 10) / 10,
        price_range: ['$', '$$', '$$$', '$$$$'][i % 4],
        phone: `(555) 000-${String(i).padStart(4, '0')}`,
        address: `${100 + i} Main St, New York, NY`
      },
      geometry: {
        type: 'Point',
        coordinates: [
          -74.006 + (Math.random() - 0.5) * 0.1,
          40.7128 + (Math.random() - 0.5) * 0.1
        ]
      },
      created_at: new Date(2024, 0, Math.floor(Math.random() * 30) + 1),
      updated_at: new Date(2024, 0, Math.floor(Math.random() * 30) + 1)
    });
  }
  
  // Trail lines
  for (let i = 0; i < 10; i++) {
    const startLng = -73.98 + Math.random() * 0.03;
    const startLat = 40.76 + Math.random() * 0.04;
    
    features.push({
      id: `trail-${i}`,
      layer_id: 'layer-2',
      properties: {
        name: `Trail ${i + 1}`,
        description: `Walking trail in Central Park`,
        trail_type: ['Walking', 'Biking', 'Running'][i % 3],
        difficulty: ['Easy', 'Moderate', 'Hard'][i % 3],
        length_miles: Math.round((Math.random() * 3 + 0.5) * 10) / 10,
        surface: ['Paved', 'Dirt', 'Gravel'][i % 3]
      },
      geometry: {
        type: 'LineString',
        coordinates: [
          [startLng, startLat],
          [startLng + 0.01, startLat + 0.005],
          [startLng + 0.015, startLat + 0.01],
          [startLng + 0.02, startLat + 0.008]
        ]
      },
      created_at: new Date(2024, 0, Math.floor(Math.random() * 30) + 1),
      updated_at: new Date(2024, 0, Math.floor(Math.random() * 30) + 1)
    });
  }
  
  // Neighborhood polygons
  for (let i = 0; i < 5; i++) {
    const centerLng = -73.98 + (i * 0.02);
    const centerLat = 40.75 + (i * 0.02);
    
    features.push({
      id: `neighborhood-${i}`,
      layer_id: 'layer-3',
      properties: {
        name: `Neighborhood ${i + 1}`,
        description: `Manhattan neighborhood area`,
        population: Math.floor(Math.random() * 50000) + 10000,
        area_sq_miles: Math.round((Math.random() * 2 + 0.5) * 100) / 100,
        median_income: Math.floor(Math.random() * 80000) + 40000,
        zip_code: `100${10 + i}`
      },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [centerLng - 0.01, centerLat - 0.008],
          [centerLng + 0.01, centerLat - 0.008],
          [centerLng + 0.01, centerLat + 0.008],
          [centerLng - 0.01, centerLat + 0.008],
          [centerLng - 0.01, centerLat - 0.008]
        ]]
      },
      created_at: new Date(2024, 0, Math.floor(Math.random() * 30) + 1),
      updated_at: new Date(2024, 0, Math.floor(Math.random() * 30) + 1)
    });
  }
  
  return features;
};

export const MapLayoutExample: React.FC = () => {
  // State
  const [layers, setLayers] = useState(mockLayers);
  const [features, setFeatures] = useState(() => generateMockFeatures());
  const [selectedFeatures, setSelectedFeatures] = useState<string[]>([]);
  const [mapInstance, setMapInstance] = useState<Map | null>(null);
  
  // Event handlers
  const handleLayerToggle = useCallback((layerId: string, visible: boolean) => {
    setLayers(prev => prev.map(layer => 
      layer.id === layerId ? { ...layer, visible } : layer
    ));
    console.log(`Layer ${layerId} visibility changed to:`, visible);
  }, []);

  const handleLayerOpacityChange = useCallback((layerId: string, opacity: number) => {
    setLayers(prev => prev.map(layer => 
      layer.id === layerId ? { ...layer, opacity } : layer
    ));
    console.log(`Layer ${layerId} opacity changed to:`, opacity);
  }, []);

  const handleLayerStyleChange = useCallback((layerId: string, style: Record<string, any>) => {
    setLayers(prev => prev.map(layer => 
      layer.id === layerId ? { ...layer, style: { ...layer.style, ...style } } : layer
    ));
    console.log(`Layer ${layerId} style changed:`, style);
  }, []);

  const handleFeatureSelect = useCallback((selectedFeatureData: any[]) => {
    const selectedIds = selectedFeatureData.map(f => f.id);
    setSelectedFeatures(selectedIds);
    console.log('Selected features:', selectedFeatureData.length);
  }, []);

  const handleFeatureCreate = useCallback((feature: any, properties: Record<string, any>) => {
    const newFeature = {
      id: `user-feature-${Date.now()}`,
      layer_id: 'layer-1', // Default to first layer
      properties: {
        name: properties.name || 'New Feature',
        description: properties.description || 'User-created feature',
        ...properties
      },
      geometry: feature.geometry || {
        type: feature.type,
        coordinates: feature.coordinates
      },
      created_at: new Date(),
      updated_at: new Date()
    };
    
    setFeatures(prev => [...prev, newFeature]);
    Alert.alert('Feature Created', `New feature "${newFeature.properties.name}" has been added.`);
    console.log('Feature created:', newFeature);
  }, []);

  const handleFeatureUpdate = useCallback((updatedFeature: any) => {
    setFeatures(prev => prev.map(feature => 
      feature.id === updatedFeature.id 
        ? { ...updatedFeature, updated_at: new Date() }
        : feature
    ));
    console.log('Feature updated:', updatedFeature.id);
  }, []);

  const handleFeatureDelete = useCallback((featureId: string) => {
    setFeatures(prev => prev.filter(feature => feature.id !== featureId));
    setSelectedFeatures(prev => prev.filter(id => id !== featureId));
    console.log('Feature deleted:', featureId);
  }, []);

  const handleSpatialQuery = useCallback(async (query: any) => {
    console.log('Executing spatial query:', query);
    
    // Mock spatial query implementation
    return new Promise((resolve) => {
      setTimeout(() => {
        // Simulate finding features based on query
        const mockResults = features
          .filter(feature => {
            // Simple mock logic - in real implementation, use PostGIS
            if (query.type === 'within' && query.geometry.type === 'Point') {
              const [queryLng, queryLat] = query.geometry.coordinates;
              if (feature.geometry.type === 'Point') {
                const [featureLng, featureLat] = feature.geometry.coordinates;
                const distance = Math.sqrt(
                  Math.pow(queryLng - featureLng, 2) + Math.pow(queryLat - featureLat, 2)
                );
                return distance < (query.bufferDistance || 1000) / 100000; // Simple distance check
              }
            }
            return Math.random() > 0.7; // Random selection for demo
          })
          .slice(0, query.maxResults || 50)
          .map(feature => ({
            id: `result-${feature.id}`,
            layerId: feature.layer_id,
            feature,
            distance: Math.random() * 1000,
            area: feature.geometry.type === 'Polygon' ? Math.random() * 10000 : undefined
          }));
        
        resolve(mockResults);
      }, 1500); // Simulate query delay
    });
  }, [features]);

  const handleViewStateChange = useCallback((viewState: any) => {
    console.log('Map view changed:', {
      lng: viewState.longitude?.toFixed(4),
      lat: viewState.latitude?.toFixed(4),
      zoom: viewState.zoom?.toFixed(2)
    });
  }, []);

  const handleMapLoad = useCallback((map: Map) => {
    setMapInstance(map);
    console.log('Map loaded successfully');
    
    // Add any additional map setup here
    map.on('idle', () => {
      console.log('Map is idle');
    });
  }, []);

  // Auto-refresh features (simulate real-time updates)
  useEffect(() => {
    const interval = setInterval(() => {
      // Randomly update a feature's properties
      setFeatures(prev => {
        const randomIndex = Math.floor(Math.random() * prev.length);
        const updatedFeatures = [...prev];
        if (updatedFeatures[randomIndex]) {
          updatedFeatures[randomIndex] = {
            ...updatedFeatures[randomIndex],
            properties: {
              ...updatedFeatures[randomIndex].properties,
              last_updated: new Date().toISOString()
            },
            updated_at: new Date()
          };
        }
        return updatedFeatures;
      });
    }, 30000); // Update every 30 seconds

    return () => clearInterval(interval);
  }, []);

  return (
    <View style={styles.container}>
      <MapLayout
        // Data props
        layers={layers}
        datasets={mockDatasets}
        features={features}
        
        // Layout configuration
        initialLayout="split-horizontal"
        allowLayoutChange={true}
        showToolbar={true}
        
        // Map configuration
        initialViewState={{
          longitude: -74.006,
          latitude: 40.7128,
          zoom: 11,
          bearing: 0,
          pitch: 0
        }}
        
        // Control visibility
        showLayerControl={true}
        showDrawingTools={true}
        showSpatialSearch={true}
        showDataTable={true}
        
        // Mobile configuration
        mobileBreakpoint={768}
        collapsibleSidebars={true}
        
        // Event handlers
        onLayerToggle={handleLayerToggle}
        onLayerOpacityChange={handleLayerOpacityChange}
        onLayerStyleChange={handleLayerStyleChange}
        onFeatureSelect={handleFeatureSelect}
        onFeatureCreate={handleFeatureCreate}
        onFeatureUpdate={handleFeatureUpdate}
        onFeatureDelete={handleFeatureDelete}
        onSpatialQuery={handleSpatialQuery}
        onViewStateChange={handleViewStateChange}
        onMapLoad={handleMapLoad}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
});

export default MapLayoutExample;