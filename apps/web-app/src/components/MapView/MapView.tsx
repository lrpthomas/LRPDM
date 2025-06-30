import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { View, StyleSheet, Dimensions, Platform } from 'react-native';
import maplibregl, { Map, MapMouseEvent, MapTouchEvent, LngLatBounds } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

// Base component props following our architecture
interface BaseComponentProps {
  className?: string;
  loading?: boolean;
  error?: string;
  onError?: (error: Error) => void;
}

// Map style configuration
interface MapStyle {
  version: number;
  sources: Record<string, any>;
  layers: Array<any>;
  glyphs?: string;
  sprite?: string;
}

// Viewport configuration
interface ViewState {
  longitude: number;
  latitude: number;
  zoom: number;
  bearing?: number;
  pitch?: number;
}

// Layer definition for GIS data
interface MapLayer {
  id: string;
  type: 'point' | 'line' | 'fill' | 'raster' | 'heatmap';
  source: string;
  sourceLayer?: string;
  paint?: Record<string, any>;
  layout?: Record<string, any>;
  filter?: any[];
  visible: boolean;
  opacity?: number;
  minZoom?: number;
  maxZoom?: number;
}

// Data source configuration
interface DataSource {
  id: string;
  type: 'geojson' | 'vector' | 'raster' | 'raster-dem';
  data?: string | object;
  url?: string;
  tiles?: string[];
  bounds?: [number, number, number, number];
  minzoom?: number;
  maxzoom?: number;
}

// Map interaction events
interface MapEvents {
  onClick?: (event: MapMouseEvent | MapTouchEvent) => void;
  onDoubleClick?: (event: MapMouseEvent | MapTouchEvent) => void;
  onContextMenu?: (event: MapMouseEvent) => void;
  onMoveStart?: () => void;
  onMove?: (viewState: ViewState) => void;
  onMoveEnd?: (viewState: ViewState) => void;
  onZoomStart?: () => void;
  onZoom?: (viewState: ViewState) => void;
  onZoomEnd?: (viewState: ViewState) => void;
  onDragStart?: () => void;
  onDrag?: () => void;
  onDragEnd?: () => void;
  onPitchStart?: () => void;
  onPitch?: () => void;
  onPitchEnd?: () => void;
  onRotateStart?: () => void;
  onRotate?: () => void;
  onRotateEnd?: () => void;
}

// Feature click/hover events
interface FeatureEvents {
  onFeatureClick?: (feature: any, layer: MapLayer) => void;
  onFeatureHover?: (feature: any, layer: MapLayer) => void;
  onFeatureLeave?: () => void;
}

// Main MapView props
interface MapViewProps extends BaseComponentProps, MapEvents, FeatureEvents {
  // Core map configuration
  initialViewState?: ViewState;
  mapStyle?: MapStyle | string;
  width?: number | string;
  height?: number | string;
  
  // Data layers
  layers?: MapLayer[];
  sources?: DataSource[];
  
  // Interaction settings
  interactive?: boolean;
  dragPan?: boolean;
  dragRotate?: boolean;
  scrollZoom?: boolean;
  boxZoom?: boolean;
  doubleClickZoom?: boolean;
  keyboard?: boolean;
  touchZoomRotate?: boolean;
  
  // Constraints
  minZoom?: number;
  maxZoom?: number;
  maxBounds?: LngLatBounds;
  
  // Performance settings
  preserveDrawingBuffer?: boolean;
  antialias?: boolean;
  optimizeForTerrain?: boolean;
  
  // Mobile-specific settings
  cooperativeGestures?: boolean;
  touchPitch?: boolean;
  
  // Controls
  showNavigationControl?: boolean;
  showScaleControl?: boolean;
  showFullscreenControl?: boolean;
  showGeolocateControl?: boolean;
  
  // Styling
  cursor?: string;
  fadeDuration?: number;
  
  // Callbacks
  onMapLoad?: (map: Map) => void;
  onMapResize?: () => void;
  onMapRemove?: () => void;
  onStyleLoad?: () => void;
  onSourceData?: (event: any) => void;
  onStyleData?: (event: any) => void;
  onLayerAdd?: (layer: MapLayer) => void;
  onLayerRemove?: (layerId: string) => void;
}

// Default map style (OpenStreetMap-based)
const DEFAULT_MAP_STYLE: MapStyle = {
  version: 8,
  sources: {
    osm: {
      type: 'raster',
      tiles: [
        'https://tile.openstreetmap.org/{z}/{x}/{y}.png'
      ],
      tileSize: 256,
      attribution: '© OpenStreetMap contributors'
    }
  },
  layers: [
    {
      id: 'osm-layer',
      type: 'raster',
      source: 'osm'
    }
  ]
};

// Default viewport (New York City)
const DEFAULT_VIEW_STATE: ViewState = {
  longitude: -74.006,
  latitude: 40.7128,
  zoom: 10
};

export const MapView: React.FC<MapViewProps> = ({
  // Core props
  initialViewState = DEFAULT_VIEW_STATE,
  mapStyle = DEFAULT_MAP_STYLE,
  width = '100%',
  height = 400,
  
  // Data
  layers = [],
  sources = [],
  
  // Interaction
  interactive = true,
  dragPan = true,
  dragRotate = true,
  scrollZoom = true,
  boxZoom = true,
  doubleClickZoom = true,
  keyboard = true,
  touchZoomRotate = true,
  
  // Constraints
  minZoom = 0,
  maxZoom = 24,
  maxBounds,
  
  // Performance
  preserveDrawingBuffer = false,
  antialias = true,
  optimizeForTerrain = false,
  
  // Mobile
  cooperativeGestures = false,
  touchPitch = true,
  
  // Controls
  showNavigationControl = true,
  showScaleControl = true,
  showFullscreenControl = false,
  showGeolocateControl = true,
  
  // Styling
  cursor = 'grab',
  fadeDuration = 300,
  
  // Base props
  loading = false,
  error,
  onError,
  className,
  
  // Event handlers
  onClick,
  onDoubleClick,
  onContextMenu,
  onMoveStart,
  onMove,
  onMoveEnd,
  onZoomStart,
  onZoom,
  onZoomEnd,
  onDragStart,
  onDrag,
  onDragEnd,
  onPitchStart,
  onPitch,
  onPitchEnd,
  onRotateStart,
  onRotate,
  onRotateEnd,
  onFeatureClick,
  onFeatureHover,
  onFeatureLeave,
  onMapLoad,
  onMapResize,
  onMapRemove,
  onStyleLoad,
  onSourceData,
  onStyleData,
  onLayerAdd,
  onLayerRemove
}) => {
  // Refs
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<Map | null>(null);
  
  // State
  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const [currentViewState, setCurrentViewState] = useState<ViewState>(initialViewState);
  const [screenData, setScreenData] = useState(Dimensions.get('window'));
  
  // Mobile detection
  const isMobile = screenData.width < 768;
  
  // Listen for screen size changes
  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setScreenData(window);
    });

    return () => subscription?.remove();
  }, []);

  // Memoized map options (without container - will be added during initialization)
  const mapOptions = useMemo(() => ({
    style: mapStyle,
    center: [initialViewState.longitude, initialViewState.latitude] as [number, number],
    zoom: initialViewState.zoom,
    bearing: initialViewState.bearing || 0,
    pitch: initialViewState.pitch || 0,
    interactive,
    dragPan,
    dragRotate,
    scrollZoom,
    boxZoom,
    doubleClickZoom,
    keyboard,
    touchZoomRotate,
    touchPitch,
    minZoom,
    maxZoom,
    maxBounds,
    preserveDrawingBuffer,
    antialias,
    fadeDuration,
    cooperativeGestures: cooperativeGestures || isMobile,
    // Mobile-specific optimizations
    optimizeForTerrain: optimizeForTerrain || !isMobile,
    attributionControl: !isMobile // Hide on mobile to save space
  }), [
    mapStyle, initialViewState, interactive, dragPan, dragRotate, scrollZoom,
    boxZoom, doubleClickZoom, keyboard, touchZoomRotate, touchPitch,
    minZoom, maxZoom, maxBounds, preserveDrawingBuffer, antialias,
    fadeDuration, cooperativeGestures, optimizeForTerrain, isMobile
  ]);

  // Initialize map
  useEffect(() => {
    console.log('MapView useEffect triggered');
    
    const initializeMap = () => {
      console.log('initializeMap called');
      
      if (!mapContainerRef.current) {
        console.log('No container ref, retrying...');
        setTimeout(initializeMap, 100);
        return;
      }
      
      if (mapRef.current) {
        console.log('Map already exists, skipping initialization');
        return;
      }
      
      try {
        // Ensure container has dimensions
        const container = mapContainerRef.current;
        console.log('MapView container check:', {
          exists: !!container,
          width: container.offsetWidth,
          height: container.offsetHeight,
          computedStyle: window.getComputedStyle(container).getPropertyValue('display'),
          visible: container.offsetParent !== null
        });
        
        if (container.offsetWidth === 0 || container.offsetHeight === 0) {
          console.warn('Map container has no dimensions, retrying in 100ms...');
          setTimeout(initializeMap, 100);
          return;
        }

        console.log('About to create MapLibre instance...');
        
        // Test if maplibregl is available
        if (typeof maplibregl === 'undefined') {
          console.error('MapLibre GL is not defined!');
          return;
        }
        
        console.log('MapLibre GL available:', maplibregl);

        const map = new maplibregl.Map({
          container: container,
          style: {
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
                id: 'osm-layer',
                type: 'raster',
                source: 'osm'
              }
            ]
          },
          center: [initialViewState.longitude, initialViewState.latitude],
          zoom: initialViewState.zoom,
          bearing: initialViewState.bearing || 0,
          pitch: initialViewState.pitch || 0
        });
        
        console.log('MapLibre instance created successfully:', map);
        mapRef.current = map;

      // Map load event
      map.on('load', () => {
        setIsMapLoaded(true);
        onMapLoad?.(map);
      });

      // Style load event
      map.on('style.load', () => {
        onStyleLoad?.();
      });

      // Movement events
      if (onMoveStart) map.on('movestart', onMoveStart);
      if (onMove) {
        map.on('move', () => {
          const center = map.getCenter();
          const viewState: ViewState = {
            longitude: center.lng,
            latitude: center.lat,
            zoom: map.getZoom(),
            bearing: map.getBearing(),
            pitch: map.getPitch()
          };
          setCurrentViewState(viewState);
          onMove(viewState);
        });
      }
      if (onMoveEnd) {
        map.on('moveend', () => {
          const center = map.getCenter();
          const viewState: ViewState = {
            longitude: center.lng,
            latitude: center.lat,
            zoom: map.getZoom(),
            bearing: map.getBearing(),
            pitch: map.getPitch()
          };
          setCurrentViewState(viewState);
          onMoveEnd(viewState);
        });
      }

      // Zoom events
      if (onZoomStart) map.on('zoomstart', onZoomStart);
      if (onZoom) {
        map.on('zoom', () => {
          const center = map.getCenter();
          const viewState: ViewState = {
            longitude: center.lng,
            latitude: center.lat,
            zoom: map.getZoom(),
            bearing: map.getBearing(),
            pitch: map.getPitch()
          };
          onZoom(viewState);
        });
      }
      if (onZoomEnd) {
        map.on('zoomend', () => {
          const center = map.getCenter();
          const viewState: ViewState = {
            longitude: center.lng,
            latitude: center.lat,
            zoom: map.getZoom(),
            bearing: map.getBearing(),
            pitch: map.getPitch()
          };
          onZoomEnd(viewState);
        });
      }

      // Drag events
      if (onDragStart) map.on('dragstart', onDragStart);
      if (onDrag) map.on('drag', onDrag);
      if (onDragEnd) map.on('dragend', onDragEnd);

      // Rotation events
      if (onRotateStart) map.on('rotatestart', onRotateStart);
      if (onRotate) map.on('rotate', onRotate);
      if (onRotateEnd) map.on('rotateend', onRotateEnd);

      // Pitch events
      if (onPitchStart) map.on('pitchstart', onPitchStart);
      if (onPitch) map.on('pitch', onPitch);
      if (onPitchEnd) map.on('pitchend', onPitchEnd);

      // Click events
      if (onClick) {
        map.on('click', (e) => {
          onClick(e);
        });
      }

      if (onDoubleClick) {
        map.on('dblclick', (e) => {
          onDoubleClick(e);
        });
      }

      if (onContextMenu) {
        map.on('contextmenu', (e) => {
          onContextMenu(e);
        });
      }

      // Data events
      if (onSourceData) map.on('sourcedata', onSourceData);
      if (onStyleData) map.on('styledata', onStyleData);

      // Resize handler
      const handleResize = () => {
        map.resize();
        onMapResize?.();
      };

      window.addEventListener('resize', handleResize);

      // Error handling
      map.on('error', (e) => {
        console.error('MapLibre GL error:', e);
        onError?.(new Error(`Map error: ${e.error?.message || 'Unknown error'}`));
      });
      
      // Add more detailed error logging
      map.on('style.load', () => {
        console.log('Map style loaded successfully');
      });
      
      map.on('sourcedata', (e) => {
        if (e.sourceId === 'osm' && e.isSourceLoaded) {
          console.log('OSM tiles source loaded');
        }
      });

      return () => {
        window.removeEventListener('resize', handleResize);
        
        if (mapRef.current) {
          onMapRemove?.();
          mapRef.current.remove();
          mapRef.current = null;
        }
        
        setIsMapLoaded(false);
      };

      } catch (error) {
        console.error('Failed to initialize map:', error);
        onError?.(error instanceof Error ? error : new Error('Failed to initialize map'));
      }
    };

    // Start initialization
    setTimeout(initializeMap, 100);
  }, [initialViewState.longitude, initialViewState.latitude, initialViewState.zoom]);

  // Add/remove data sources
  useEffect(() => {
    if (!isMapLoaded || !mapRef.current) return;

    const map = mapRef.current;

    // Add new sources
    sources.forEach(source => {
      if (!map.getSource(source.id)) {
        const { id, ...sourceConfig } = source;
        map.addSource(id, sourceConfig);
      }
    });

    // Remove sources that are no longer in the list
    const currentSources = map.getStyle().sources;
    Object.keys(currentSources).forEach(sourceId => {
      if (!['osm'].includes(sourceId) && !sources.find(s => s.id === sourceId)) {
        // Remove all layers using this source first
        const styleLayers = map.getStyle().layers;
        styleLayers.forEach(layer => {
          if (layer.source === sourceId) {
            map.removeLayer(layer.id);
          }
        });
        map.removeSource(sourceId);
      }
    });

  }, [sources, isMapLoaded]);

  // Add/remove layers
  useEffect(() => {
    if (!isMapLoaded || !mapRef.current) return;

    const map = mapRef.current;

    // Add new layers
    layers.forEach(layer => {
      if (!map.getLayer(layer.id)) {
        const { id, visible, opacity, minZoom, maxZoom, ...layerConfig } = layer;
        
        map.addLayer({
          id,
          ...layerConfig,
          layout: {
            ...layerConfig.layout,
            visibility: visible ? 'visible' : 'none'
          },
          paint: {
            ...layerConfig.paint,
            ...(opacity !== undefined && getOpacityProperty(layer.type, opacity))
          }
        });

        if (minZoom !== undefined) {
          map.setLayerZoomRange(id, minZoom, maxZoom || 24);
        }

        // Add feature interaction
        if (onFeatureClick || onFeatureHover) {
          // Make layer interactive
          map.on('click', id, (e) => {
            if (onFeatureClick && e.features && e.features[0]) {
              onFeatureClick(e.features[0], layer);
            }
          });

          if (onFeatureHover) {
            map.on('mouseenter', id, (e) => {
              map.getCanvas().style.cursor = 'pointer';
              if (e.features && e.features[0]) {
                onFeatureHover(e.features[0], layer);
              }
            });

            map.on('mouseleave', id, () => {
              map.getCanvas().style.cursor = cursor;
              onFeatureLeave?.();
            });
          }
        }

        onLayerAdd?.(layer);
      } else {
        // Update existing layer
        const existingLayer = map.getLayer(layer.id);
        if (existingLayer) {
          // Update visibility
          map.setLayoutProperty(layer.id, 'visibility', layer.visible ? 'visible' : 'none');
          
          // Update opacity
          if (layer.opacity !== undefined) {
            const opacityProperty = getOpacityProperty(layer.type, layer.opacity);
            Object.entries(opacityProperty).forEach(([prop, value]) => {
              map.setPaintProperty(layer.id, prop, value);
            });
          }
        }
      }
    });

    // Remove layers that are no longer in the list
    const currentLayers = map.getStyle().layers;
    currentLayers.forEach(mapLayer => {
      if (!['osm-layer'].includes(mapLayer.id) && !layers.find(l => l.id === mapLayer.id)) {
        map.removeLayer(mapLayer.id);
        onLayerRemove?.(mapLayer.id);
      }
    });

  }, [layers, isMapLoaded, onFeatureClick, onFeatureHover, onFeatureLeave, cursor]);

  // Add navigation controls
  useEffect(() => {
    if (!isMapLoaded || !mapRef.current) return;

    const map = mapRef.current;

    // Navigation control (zoom buttons)
    if (showNavigationControl) {
      const nav = new maplibregl.NavigationControl({
        showCompass: !isMobile, // Hide compass on mobile
        showZoom: true,
        visualizePitch: !isMobile
      });
      map.addControl(nav, 'top-right');
    }

    // Scale control
    if (showScaleControl) {
      const scale = new maplibregl.ScaleControl({
        maxWidth: isMobile ? 80 : 120,
        unit: 'metric'
      });
      map.addControl(scale, 'bottom-left');
    }

    // Fullscreen control (web only)
    if (showFullscreenControl && Platform.OS === 'web') {
      const fullscreen = new maplibregl.FullscreenControl();
      map.addControl(fullscreen, 'top-right');
    }

    // Geolocate control
    if (showGeolocateControl) {
      const geolocate = new maplibregl.GeolocateControl({
        positionOptions: {
          enableHighAccuracy: true
        },
        trackUserLocation: true,
        showUserHeading: true
      });
      map.addControl(geolocate, 'top-right');
    }

  }, [isMapLoaded, showNavigationControl, showScaleControl, showFullscreenControl, showGeolocateControl, isMobile]);

  // Helper function to get opacity property for different layer types
  const getOpacityProperty = (layerType: string, opacity: number): Record<string, number> => {
    switch (layerType) {
      case 'fill':
        return { 'fill-opacity': opacity };
      case 'line':
        return { 'line-opacity': opacity };
      case 'circle':
      case 'point':
        return { 'circle-opacity': opacity };
      case 'symbol':
        return { 'text-opacity': opacity, 'icon-opacity': opacity };
      case 'raster':
        return { 'raster-opacity': opacity };
      case 'heatmap':
        return { 'heatmap-opacity': opacity };
      default:
        return {};
    }
  };

  // Public methods via ref
  const getMap = useCallback(() => mapRef.current, []);
  const fitBounds = useCallback((bounds: LngLatBounds, options?: any) => {
    if (mapRef.current) {
      mapRef.current.fitBounds(bounds, {
        padding: isMobile ? 20 : 50,
        maxZoom: 16,
        ...options
      });
    }
  }, [isMobile]);

  const flyTo = useCallback((viewState: Partial<ViewState>, options?: any) => {
    if (mapRef.current) {
      mapRef.current.flyTo({
        center: viewState.longitude !== undefined && viewState.latitude !== undefined 
          ? [viewState.longitude, viewState.latitude] 
          : undefined,
        zoom: viewState.zoom,
        bearing: viewState.bearing,
        pitch: viewState.pitch,
        duration: 2000,
        ...options
      });
    }
  }, []);

  // Expose methods through ref
  React.useImperativeHandle(React.createRef(), () => ({
    getMap,
    fitBounds,
    flyTo,
    getCurrentViewState: () => currentViewState
  }));

  // Render
  return (
    <div 
      style={{
        width: typeof width === 'string' ? width : `${width}px`,
        height: typeof height === 'string' ? height : `${height}px`,
        position: 'relative',
        overflow: 'hidden',
        backgroundColor: '#f0f0f0',
        minHeight: '400px'
      }}
    >
      <div
        ref={mapContainerRef}
        id="map-container"
        style={{
          width: '100%',
          height: '100%',
          position: 'absolute',
          top: 0,
          left: 0
        }}
      >
        {!isMapLoaded && (
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            zIndex: 1000,
            background: 'white',
            padding: '10px',
            borderRadius: '4px',
            border: '1px solid #ccc'
          }}>
            Initializing Map...
          </div>
        )}
      </div>
      
      {loading && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(255, 255, 255, 0.8)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000
        }}>
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '20px',
            border: '3px solid #007AFF',
            borderTopColor: 'transparent',
            animation: 'spin 1s linear infinite'
          }} />
        </div>
      )}
      
      {error && (
        <div style={{
          position: 'absolute',
          top: '20px',
          left: '20px',
          right: '20px',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: '#FF3B30',
            padding: '12px',
            borderRadius: '8px',
            color: '#FFFFFF',
            fontSize: '14px',
            fontWeight: '600',
            textAlign: 'center',
            boxShadow: '0 2px 4px rgba(0,0,0,0.25)'
          }}>
            Map Error: {error}
          </div>
        </div>
      )}
    </div>
  );
};

// Styles
const styles = StyleSheet.create({
  container: {
    position: 'relative',
    overflow: 'hidden',
    backgroundColor: '#f0f0f0',
  },
  mapContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
    minHeight: 300,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  loadingSpinner: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 3,
    borderColor: '#007AFF',
    borderTopColor: 'transparent',
    // Animation would be added via CSS or animated library
  },
  errorOverlay: {
    position: 'absolute',
    top: 20,
    left: 20,
    right: 20,
    zIndex: 1000,
  },
  errorMessage: {
    backgroundColor: '#FF3B30',
    padding: 12,
    borderRadius: 8,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
      },
      android: {
        elevation: 5,
      },
      web: {
        boxShadow: '0 2px 4px rgba(0,0,0,0.25)',
      }
    }),
  },
  errorText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
});

export default MapView;