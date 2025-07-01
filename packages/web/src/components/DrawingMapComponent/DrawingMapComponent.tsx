import React, { useEffect, useRef, useState, useCallback } from 'react';
import maplibregl, { Map, MapMouseEvent, LngLat } from 'maplibre-gl';
import MapboxDraw from '@mapbox/mapbox-gl-draw';
import 'maplibre-gl/dist/maplibre-gl.css';
import '@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css';

// Import our data management hooks
import { useSpatialData } from '../../hooks/useSpatialData';

// Import new controls
import BasemapControl from '../MapControls/BasemapControl';
import ScaleControl from '../MapControls/ScaleControl';
import UnitToggle, { UnitSystem, formatDistance, formatArea } from '../MapControls/UnitToggle';
import GeocodingSearch from '../MapControls/GeocodingSearch';
import BookmarkManager from '../MapControls/BookmarkManager';

// Types
interface Feature {
  id: string;
  type: 'Feature';
  geometry: {
    type: 'Point' | 'LineString' | 'Polygon';
    coordinates: any;
  };
  properties: {
    [key: string]: any;
  };
}

interface DrawingMapComponentProps {
  initialCenter?: [number, number];
  initialZoom?: number;
  style?: React.CSSProperties;
  onFeatureCreate?: (feature: Feature) => void;
  onFeatureUpdate?: (feature: Feature) => void;
  onFeatureDelete?: (featureId: string) => void;
  onMapClick?: (lngLat: LngLat) => void;
  onModeChange?: (mode: string) => void;
  enableDrawing?: boolean;
  drawingModes?: ('point' | 'line_string' | 'polygon')[];
  existingFeatures?: Feature[];
  showCoordinates?: boolean;
  showMeasurements?: boolean;
  showBasemapControl?: boolean;
  showScaleControl?: boolean;
  showUnitToggle?: boolean;
  showGeocodingSearch?: boolean;
  showBookmarkManager?: boolean;
  enableDataPersistence?: boolean;
  autoSaveFeatures?: boolean;
  loadExistingFeatures?: boolean;
}

const DrawingMapComponent: React.FC<DrawingMapComponentProps> = ({
  initialCenter = [-74.006, 40.7128], // NYC
  initialZoom = 10,
  style = { width: '100%', height: '500px' },
  onFeatureCreate,
  onFeatureUpdate,
  onFeatureDelete,
  onMapClick,
  onModeChange,
  enableDrawing = true,
  drawingModes = ['point', 'line_string', 'polygon'],
  existingFeatures = [],
  showCoordinates = true,
  showMeasurements = true,
  showBasemapControl = true,
  showScaleControl = true,
  showUnitToggle = true,
  showGeocodingSearch = true,
  showBookmarkManager = true,
  enableDataPersistence = true,
  autoSaveFeatures = true,
  loadExistingFeatures = true
}) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<Map | null>(null);
  const draw = useRef<MapboxDraw | null>(null);
  
  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const [currentCoordinates, setCurrentCoordinates] = useState<LngLat | null>(null);
  const [measurements, setMeasurements] = useState<{
    area?: number;
    length?: number;
    perimeter?: number;
    coordinates?: { lat: number; lng: number };
  }>({});
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentMode, setCurrentMode] = useState<string>('simple_select');
  const [currentBasemap, setCurrentBasemap] = useState('osm');
  const [currentUnits, setCurrentUnits] = useState<UnitSystem>('metric');
  const [performance, setPerformance] = useState<{
    lastRenderTime?: number;
    featureCount?: number;
  }>({});

  // Spatial data management with backend integration
  const spatialData = useSpatialData({
    autoLoad: loadExistingFeatures && enableDataPersistence,
    limit: 1000
  });

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current) return;

    // Default OSM style
    const defaultStyle = {
      version: 8,
      sources: {
        'osm': {
          type: 'raster',
          tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
          tileSize: 256,
          attribution: '© OpenStreetMap contributors'
        }
      },
      layers: [
        {
          id: 'osm',
          type: 'raster',
          source: 'osm'
        }
      ]
    };

    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: defaultStyle,
      center: initialCenter,
      zoom: initialZoom,
      // Performance optimizations
      preserveDrawingBuffer: false,
      antialias: false,
      maxZoom: 18,
      minZoom: 1
    });

    // Performance monitoring
    const startTime = Date.now();

    // Initialize drawing controls
    if (enableDrawing) {
      const drawingControls = ['point', 'line_string', 'polygon', 'trash'];
      const modes = drawingModes.reduce((acc, mode) => {
        switch (mode) {
          case 'point':
            acc.push('draw_point');
            break;
          case 'line_string':
            acc.push('draw_line_string');
            break;
          case 'polygon':
            acc.push('draw_polygon');
            break;
        }
        return acc;
      }, ['simple_select', 'direct_select'] as string[]);

      draw.current = new MapboxDraw({
        displayControlsDefault: false,
        controls: {
          point: drawingModes.includes('point'),
          line_string: drawingModes.includes('line_string'),
          polygon: drawingModes.includes('polygon'),
          trash: true
        },
        modes: {
          ...MapboxDraw.modes
        },
        styles: [
          // Custom styling for drawn features
          {
            id: 'gl-draw-polygon-fill-inactive',
            type: 'fill',
            filter: ['all', ['==', 'active', 'false'], ['==', '$type', 'Polygon'], ['!=', 'mode', 'static']],
            paint: {
              'fill-color': '#3bb2d0',
              'fill-outline-color': '#3bb2d0',
              'fill-opacity': 0.1
            }
          },
          {
            id: 'gl-draw-polygon-fill-active',
            type: 'fill',
            filter: ['all', ['==', 'active', 'true'], ['==', '$type', 'Polygon']],
            paint: {
              'fill-color': '#fbb03b',
              'fill-outline-color': '#fbb03b',
              'fill-opacity': 0.1
            }
          },
          {
            id: 'gl-draw-polygon-stroke-inactive',
            type: 'line',
            filter: ['all', ['==', 'active', 'false'], ['==', '$type', 'Polygon'], ['!=', 'mode', 'static']],
            layout: {
              'line-cap': 'round',
              'line-join': 'round'
            },
            paint: {
              'line-color': '#3bb2d0',
              'line-width': 2
            }
          },
          {
            id: 'gl-draw-polygon-stroke-active',
            type: 'line',
            filter: ['all', ['==', 'active', 'true'], ['==', '$type', 'Polygon']],
            layout: {
              'line-cap': 'round',
              'line-join': 'round'
            },
            paint: {
              'line-color': '#fbb03b',
              'line-dasharray': [0.2, 2],
              'line-width': 2
            }
          },
          {
            id: 'gl-draw-line-inactive',
            type: 'line',
            filter: ['all', ['==', 'active', 'false'], ['==', '$type', 'LineString'], ['!=', 'mode', 'static']],
            layout: {
              'line-cap': 'round',
              'line-join': 'round'
            },
            paint: {
              'line-color': '#3bb2d0',
              'line-width': 2
            }
          },
          {
            id: 'gl-draw-line-active',
            type: 'line',
            filter: ['all', ['==', 'active', 'true'], ['==', '$type', 'LineString']],
            layout: {
              'line-cap': 'round',
              'line-join': 'round'
            },
            paint: {
              'line-color': '#fbb03b',
              'line-dasharray': [0.2, 2],
              'line-width': 2
            }
          },
          {
            id: 'gl-draw-point-point-stroke-inactive',
            type: 'circle',
            filter: ['all', ['==', 'active', 'false'], ['==', '$type', 'Point'], ['!=', 'mode', 'static']],
            paint: {
              'circle-radius': 5,
              'circle-opacity': 1,
              'circle-color': '#fff'
            }
          },
          {
            id: 'gl-draw-point-inactive',
            type: 'circle',
            filter: ['all', ['==', 'active', 'false'], ['==', '$type', 'Point'], ['!=', 'mode', 'static']],
            paint: {
              'circle-radius': 3,
              'circle-color': '#3bb2d0'
            }
          },
          {
            id: 'gl-draw-point-stroke-active',
            type: 'circle',
            filter: ['all', ['==', 'active', 'true'], ['==', '$type', 'Point']],
            paint: {
              'circle-radius': 7,
              'circle-color': '#fff'
            }
          },
          {
            id: 'gl-draw-point-active',
            type: 'circle',
            filter: ['all', ['==', 'active', 'true'], ['==', '$type', 'Point']],
            paint: {
              'circle-radius': 5,
              'circle-color': '#fbb03b'
            }
          }
        ]
      });

      map.current.addControl(draw.current);
    }

    // Map load event
    map.current.on('load', () => {
      const loadTime = Date.now() - startTime;
      setIsMapLoaded(true);
      setPerformance(prev => ({ 
        ...prev, 
        lastRenderTime: loadTime,
        featureCount: existingFeatures.length 
      }));
      
      // Add existing features with performance optimization
      const allFeatures = [
        ...existingFeatures,
        ...(enableDataPersistence ? spatialData.getFeaturesForMap() : [])
      ];

      if (draw.current && allFeatures.length > 0) {
        // Batch add features for better performance
        const batchSize = 100;
        const batches = [];
        for (let i = 0; i < allFeatures.length; i += batchSize) {
          batches.push(allFeatures.slice(i, i + batchSize));
        }
        
        batches.forEach((batch, index) => {
          setTimeout(() => {
            draw.current?.add({
              type: 'FeatureCollection',
              features: batch
            });
          }, index * 10); // Stagger loading
        });
      }
    });

    // Mouse move for coordinates (throttled for performance)
    if (showCoordinates) {
      let throttleTimeout: NodeJS.Timeout;
      map.current.on('mousemove', (e) => {
        if (throttleTimeout) clearTimeout(throttleTimeout);
        throttleTimeout = setTimeout(() => {
          setCurrentCoordinates(e.lngLat);
        }, 50); // Throttle to 20fps
      });
    }

    // Map click event
    if (onMapClick) {
      map.current.on('click', (e) => {
        onMapClick(e.lngLat);
      });
    }

    return () => {
      if (map.current) {
        map.current.remove();
      }
    };
  }, []);

  // Drawing event handlers
  useEffect(() => {
    if (!map.current || !draw.current || !enableDrawing) return;

    const onDrawCreate = async (e: any) => {
      const feature = e.features[0];
      setIsDrawing(false);
      calculateMeasurements(feature);
      setPerformance(prev => ({ 
        ...prev, 
        featureCount: (prev.featureCount || 0) + 1 
      }));

      // Save to backend if persistence is enabled
      if (enableDataPersistence) {
        if (autoSaveFeatures) {
          try {
            const saved = await spatialData.saveFeature(feature);
            if (saved) {
              console.log('✅ Feature saved to database:', feature.id);
            } else {
              console.warn('⚠️ Feature save failed, added to pending:', feature.id);
              spatialData.addPendingFeature(feature);
            }
          } catch (error) {
            console.error('❌ Error saving feature:', error);
            spatialData.addPendingFeature(feature);
          }
        } else {
          // Add to pending for manual save
          spatialData.addPendingFeature(feature);
        }
      }

      if (onFeatureCreate) {
        onFeatureCreate(feature);
      }
    };

    const onDrawUpdate = (e: any) => {
      const feature = e.features[0];
      calculateMeasurements(feature);
      if (onFeatureUpdate) {
        onFeatureUpdate(feature);
      }
    };

    const onDrawModeChange = (e: any) => {
      const drawingModes = ['draw_point', 'draw_line_string', 'draw_polygon'];
      setCurrentMode(e.mode);
      setIsDrawing(drawingModes.includes(e.mode));
      if (onModeChange) {
        onModeChange(e.mode);
      }
    };

    const onDrawDelete = async (e: any) => {
      const feature = e.features[0];
      setMeasurements({});

      // Delete from backend if persistence is enabled
      if (enableDataPersistence && feature.properties?.source === 'database') {
        try {
          const deleted = await spatialData.deleteFeature(feature.id);
          if (deleted) {
            console.log('✅ Feature deleted from database:', feature.id);
          } else {
            console.warn('⚠️ Failed to delete feature from database:', feature.id);
          }
        } catch (error) {
          console.error('❌ Error deleting feature:', error);
        }
      }

      if (onFeatureDelete) {
        onFeatureDelete(feature.id);
      }
    };

    const onDrawSelectionChange = (e: any) => {
      if (e.features.length > 0 && showMeasurements) {
        calculateMeasurements(e.features[0]);
      } else {
        setMeasurements({});
      }
    };

    map.current.on('draw.create', onDrawCreate);
    map.current.on('draw.update', onDrawUpdate);
    map.current.on('draw.delete', onDrawDelete);
    map.current.on('draw.selectionchange', onDrawSelectionChange);
    map.current.on('draw.modechange', onDrawModeChange);

    return () => {
      if (map.current) {
        map.current.off('draw.create', onDrawCreate);
        map.current.off('draw.update', onDrawUpdate);
        map.current.off('draw.delete', onDrawDelete);
        map.current.off('draw.selectionchange', onDrawSelectionChange);
        map.current.off('draw.modechange', onDrawModeChange);
      }
    };
  }, [isMapLoaded, onFeatureCreate, onFeatureUpdate, onFeatureDelete, showMeasurements]);

  // Calculate measurements using optimized geographic calculations
  const calculateMeasurements = useCallback((feature: any) => {
    if (!feature || !showMeasurements) return;

    const newMeasurements: typeof measurements = {};

    try {
      switch (feature.geometry.type) {
        case 'Point':
          // For points, show coordinates in a readable format
          const [lng, lat] = feature.geometry.coordinates;
          newMeasurements.coordinates = { 
            lat: Math.round(lat * 100000) / 100000, 
            lng: Math.round(lng * 100000) / 100000 
          };
          break;
          
        case 'LineString':
          newMeasurements.length = calculateLineLength(feature.geometry.coordinates);
          break;
          
        case 'Polygon':
          newMeasurements.area = calculatePolygonArea(feature.geometry.coordinates[0]);
          newMeasurements.perimeter = calculatePolygonPerimeter(feature.geometry.coordinates[0]);
          break;
      }

      setMeasurements(newMeasurements);
    } catch (error) {
      console.error('Error calculating measurements:', error);
    }
  }, [showMeasurements]);

  // Utility functions for measurements
  // Handler functions for new controls
  const handleBasemapChange = useCallback((basemapId: string, style: any) => {
    if (map.current) {
      map.current.setStyle(style);
      setCurrentBasemap(basemapId);
    }
  }, []);

  const handleUnitChange = useCallback((unit: UnitSystem) => {
    setCurrentUnits(unit);
    // Recalculate measurements with new units if there are any
    if (Object.keys(measurements).length > 0) {
      // Force recalculation by finding the last drawn feature
      const allFeatures = draw.current?.getAll();
      if (allFeatures && allFeatures.features.length > 0) {
        const lastFeature = allFeatures.features[allFeatures.features.length - 1];
        calculateMeasurements(lastFeature);
      }
    }
  }, [measurements]);

  const handleLocationSelect = useCallback((location: { lat: number; lng: number; name: string }) => {
    console.log('Location selected:', location);
  }, []);

  const calculateLineLength = (coordinates: [number, number][]): number => {
    let length = 0;
    for (let i = 0; i < coordinates.length - 1; i++) {
      length += haversineDistance(coordinates[i], coordinates[i + 1]);
    }
    return length;
  };

  const calculatePolygonArea = (coordinates: [number, number][]): number => {
    // Simplified area calculation using the shoelace formula
    // Note: This is approximate - for accurate area use PostGIS on backend
    let area = 0;
    const n = coordinates.length - 1; // Last point equals first point

    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      area += coordinates[i][0] * coordinates[j][1];
      area -= coordinates[j][0] * coordinates[i][1];
    }

    return Math.abs(area * 0.5) * 111320 * 111320; // Rough conversion to square meters
  };

  const calculatePolygonPerimeter = (coordinates: [number, number][]): number => {
    return calculateLineLength(coordinates);
  };

  const haversineDistance = (coord1: [number, number], coord2: [number, number]): number => {
    const R = 6371000; // Earth's radius in meters
    const lat1 = coord1[1] * Math.PI / 180;
    const lat2 = coord2[1] * Math.PI / 180;
    const deltaLat = (coord2[1] - coord1[1]) * Math.PI / 180;
    const deltaLng = (coord2[0] - coord1[0]) * Math.PI / 180;

    const a = Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
             Math.cos(lat1) * Math.cos(lat2) *
             Math.sin(deltaLng / 2) * Math.sin(deltaLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  };

  // Format measurements for display
  const formatDistanceWithUnits = (meters: number): string => {
    return formatDistance(meters, currentUnits);
  };

  const formatAreaWithUnits = (squareMeters: number): string => {
    return formatArea(squareMeters, currentUnits);
  };

  // Public methods for external control
  const addFeature = useCallback((feature: Feature) => {
    if (draw.current) {
      draw.current.add(feature);
    }
  }, []);

  const removeFeature = useCallback((featureId: string) => {
    if (draw.current) {
      draw.current.delete(featureId);
    }
  }, []);

  const getAllFeatures = useCallback((): Feature[] => {
    if (draw.current) {
      return draw.current.getAll().features as Feature[];
    }
    return [];
  }, []);

  const clearAllFeatures = useCallback(() => {
    if (draw.current) {
      draw.current.deleteAll();
      setMeasurements({});
    }
  }, []);

  // Expose methods via ref
  React.useImperativeHandle(React.useRef(), () => ({
    addFeature,
    removeFeature,
    getAllFeatures,
    clearAllFeatures,
    getMap: () => map.current,
    getDraw: () => draw.current
  }));

  return (
    <div style={{ position: 'relative', ...style }}>
      <div 
        ref={mapContainer} 
        style={{ width: '100%', height: '100%' }}
      />
      
      {/* Coordinates display */}
      {showCoordinates && currentCoordinates && (
        <div style={{
          position: 'absolute',
          bottom: '10px',
          left: '10px',
          background: 'rgba(0, 0, 0, 0.8)',
          color: 'white',
          padding: '5px 10px',
          borderRadius: '3px',
          fontSize: '12px',
          fontFamily: 'monospace'
        }}>
          {currentCoordinates.lng.toFixed(6)}, {currentCoordinates.lat.toFixed(6)}
        </div>
      )}

      {/* Measurements display */}
      {showMeasurements && Object.keys(measurements).length > 0 && (
        <div style={{
          position: 'absolute',
          top: '10px',
          right: '10px',
          background: 'rgba(255, 255, 255, 0.95)',
          border: '1px solid #ccc',
          borderRadius: '3px',
          padding: '10px',
          fontSize: '14px',
          maxWidth: '200px'
        }}>
          <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>
            Measurements
          </div>
          {measurements.length && (
            <div>Length: {formatDistanceWithUnits(measurements.length)}</div>
          )}
          {measurements.area && (
            <div>Area: {formatAreaWithUnits(measurements.area)}</div>
          )}
          {measurements.perimeter && (
            <div>Perimeter: {formatDistanceWithUnits(measurements.perimeter)}</div>
          )}
          {measurements.coordinates && (
            <div>
              Lat: {measurements.coordinates.lat}<br/>
              Lng: {measurements.coordinates.lng}
            </div>
          )}
        </div>
      )}

      {/* Performance indicator */}
      {performance.lastRenderTime && (
        <div style={{
          position: 'absolute',
          bottom: '10px',
          right: '10px',
          background: 'rgba(0, 0, 0, 0.7)',
          color: 'white',
          padding: '5px 8px',
          borderRadius: '3px',
          fontSize: '11px',
          fontFamily: 'monospace'
        }}>
          Load: {Math.round(performance.lastRenderTime)}ms | Features: {performance.featureCount || 0}
        </div>
      )}

      {/* Drawing toolbar */}
      {enableDrawing && (
        <div style={{
          position: 'absolute',
          top: '10px',
          left: '10px',
          background: 'rgba(255, 255, 255, 0.95)',
          border: '1px solid #ccc',
          borderRadius: '4px',
          padding: '8px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>
          <div style={{ display: 'flex', gap: '4px', marginBottom: '8px' }}>
            {drawingModes.includes('point') && (
              <button
                onClick={() => draw.current?.changeMode('draw_point')}
                style={{
                  padding: '6px 12px',
                  border: '1px solid #ddd',
                  borderRadius: '3px',
                  background: currentMode === 'draw_point' ? '#007bff' : 'white',
                  color: currentMode === 'draw_point' ? 'white' : 'black',
                  cursor: 'pointer',
                  fontSize: '12px'
                }}
                title="Draw Point"
              >
                📍 Point
              </button>
            )}
            {drawingModes.includes('line_string') && (
              <button
                onClick={() => draw.current?.changeMode('draw_line_string')}
                style={{
                  padding: '6px 12px',
                  border: '1px solid #ddd',
                  borderRadius: '3px',
                  background: currentMode === 'draw_line_string' ? '#007bff' : 'white',
                  color: currentMode === 'draw_line_string' ? 'white' : 'black',
                  cursor: 'pointer',
                  fontSize: '12px'
                }}
                title="Draw Line"
              >
                📏 Line
              </button>
            )}
            {drawingModes.includes('polygon') && (
              <button
                onClick={() => draw.current?.changeMode('draw_polygon')}
                style={{
                  padding: '6px 12px',
                  border: '1px solid #ddd',
                  borderRadius: '3px',
                  background: currentMode === 'draw_polygon' ? '#007bff' : 'white',
                  color: currentMode === 'draw_polygon' ? 'white' : 'black',
                  cursor: 'pointer',
                  fontSize: '12px'
                }}
                title="Draw Polygon"
              >
                ⬛ Polygon
              </button>
            )}
          </div>
          <div style={{ display: 'flex', gap: '4px' }}>
            <button
              onClick={() => {
                draw.current?.changeMode('simple_select');
                setCurrentMode('simple_select');
                setIsDrawing(false);
              }}
              style={{
                padding: '6px 12px',
                border: '1px solid #ddd',
                borderRadius: '3px',
                background: currentMode === 'simple_select' ? '#007bff' : 'white',
                color: currentMode === 'simple_select' ? 'white' : 'black',
                cursor: 'pointer',
                fontSize: '12px'
              }}
              title="Select Mode"
            >
              👆 Select
            </button>
            <button
              onClick={() => {
                const features = draw.current?.getAll();
                if (features && features.features.length > 0) {
                  const featureIds = features.features.map(f => f.id as string);
                  draw.current?.changeMode('simple_select', { featureIds });
                }
              }}
              style={{
                padding: '6px 12px',
                border: '1px solid #ddd',
                borderRadius: '3px',
                background: 'white',
                cursor: 'pointer',
                fontSize: '12px'
              }}
              title="Select All"
            >
              ☑️ All
            </button>
            <button
              onClick={() => {
                const selected = draw.current?.getSelectedIds();
                if (selected && selected.length > 0) {
                  draw.current?.delete(selected);
                }
              }}
              style={{
                padding: '6px 12px',
                border: '1px solid #ddd',
                borderRadius: '3px',
                background: 'white',
                cursor: 'pointer',
                fontSize: '12px',
                color: '#dc3545'
              }}
              title="Delete Selected"
            >
              🗑️ Delete
            </button>
            <button
              onClick={() => clearAllFeatures()}
              style={{
                padding: '6px 12px',
                border: '1px solid #ddd',
                borderRadius: '3px',
                background: 'white',
                cursor: 'pointer',
                fontSize: '12px',
                color: '#dc3545'
              }}
              title="Clear All"
            >
              🗑️ Clear All
            </button>
            <button
              onClick={() => {
                const features = draw.current?.getAll();
                if (features && features.features.length > 0) {
                  const dataStr = JSON.stringify(features, null, 2);
                  const dataBlob = new Blob([dataStr], { type: 'application/json' });
                  const url = URL.createObjectURL(dataBlob);
                  const link = document.createElement('a');
                  link.href = url;
                  link.download = 'drawing-features.geojson';
                  link.click();
                  URL.revokeObjectURL(url);
                }
              }}
              style={{
                padding: '6px 12px',
                border: '1px solid #ddd',
                borderRadius: '3px',
                background: 'white',
                cursor: 'pointer',
                fontSize: '12px',
                color: '#28a745'
              }}
              title="Export as GeoJSON"
            >
              💾 Export
            </button>
          </div>
          <div style={{ 
            marginTop: '8px', 
            fontSize: '11px', 
            color: '#666',
            borderTop: '1px solid #eee',
            paddingTop: '4px'
          }}>
            {isDrawing ? '🎨 Drawing mode active' : '👆 Select mode active'}
          </div>
        </div>
      )}

      {/* Data Persistence Status */}
      {enableDataPersistence && (
        <div style={{
          position: 'absolute',
          bottom: showCoordinates ? '35px' : '10px',
          left: '10px',
          background: 'rgba(255, 255, 255, 0.95)',
          border: '1px solid #ccc',
          borderRadius: '4px',
          padding: '8px',
          fontSize: '12px',
          maxWidth: '200px',
          zIndex: 500
        }}>
          <div style={{ fontWeight: 'bold', marginBottom: '4px', color: '#007bff' }}>
            📊 Data Status
          </div>
          <div style={{ color: '#28a745' }}>
            Saved: {spatialData.features.length}
          </div>
          {spatialData.hasPendingFeatures && (
            <div style={{ color: '#ffc107' }}>
              Pending: {spatialData.pendingFeatures.length}
            </div>
          )}
          {spatialData.loading && (
            <div style={{ color: '#6c757d' }}>
              Loading...
            </div>
          )}
          {spatialData.error && (
            <div style={{ color: '#dc3545', fontSize: '10px' }}>
              Error: {spatialData.error}
            </div>
          )}
          {spatialData.hasPendingFeatures && (
            <button
              onClick={async () => {
                const saved = await spatialData.savePendingFeatures();
                console.log(`💾 Saved ${saved} pending features`);
              }}
              style={{
                marginTop: '4px',
                padding: '4px 8px',
                backgroundColor: '#28a745',
                color: 'white',
                border: 'none',
                borderRadius: '3px',
                fontSize: '10px',
                cursor: 'pointer',
                width: '100%'
              }}
            >
              💾 Save Pending ({spatialData.pendingFeatures.length})
            </button>
          )}
        </div>
      )}

      {/* New Map Controls */}
      {showBasemapControl && (
        <BasemapControl
          currentBasemap={currentBasemap}
          onBasemapChange={handleBasemapChange}
          position="top-right"
        />
      )}

      {showScaleControl && (
        <ScaleControl
          map={map.current}
          position="bottom-left"
          units={currentUnits}
          showZoomLevel={true}
        />
      )}

      {showUnitToggle && (
        <UnitToggle
          currentUnit={currentUnits}
          onUnitChange={handleUnitChange}
          position="top-left"
          compact={false}
        />
      )}

      {showGeocodingSearch && (
        <GeocodingSearch
          map={map.current}
          onLocationSelect={handleLocationSelect}
          position="top-center"
          placeholder="Search places..."
        />
      )}

      {showBookmarkManager && (
        <BookmarkManager
          map={map.current}
          position="bottom-right"
          onBookmarkSelect={(bookmark) => console.log('Bookmark selected:', bookmark)}
        />
      )}
    </div>
  );
};

export default DrawingMapComponent;
export type { DrawingMapComponentProps, Feature };