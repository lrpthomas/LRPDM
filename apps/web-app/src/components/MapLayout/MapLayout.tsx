import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import {
  View,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Text,
  Platform,
  Modal,
  SafeAreaView
} from 'react-native';
import { Map } from 'maplibre-gl';
import MapView from '../MapView/MapView';
import LayerControl from '../LayerControl/LayerControl';
import DrawingTools from '../SpatialTools/DrawingTools';
import SpatialSearch from '../SpatialTools/SpatialSearch';
import { DataTable } from '../DataTable/DataTable';

// Base component props
interface BaseComponentProps {
  className?: string;
  loading?: boolean;
  error?: string;
  onError?: (error: Error) => void;
}

// Layout modes
type LayoutMode = 'map-only' | 'split-horizontal' | 'split-vertical' | 'table-only';

// Map data
interface MapLayer {
  id: string;
  dataset_id: string;
  name: string;
  description?: string;
  geometry_type: string;
  feature_count: number;
  style?: Record<string, any>;
  visible: boolean;
  opacity: number;
  minZoom?: number;
  maxZoom?: number;
  isLoading?: boolean;
  hasError?: boolean;
  errorMessage?: string;
  bounds?: [number, number, number, number];
}

interface Dataset {
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
  created_at: Date;
  updated_at: Date;
}

interface FeatureData {
  id: string;
  layer_id: string;
  properties: Record<string, any>;
  geometry?: any;
  created_at: Date;
  updated_at: Date;
}

// Map layout props
interface MapLayoutProps extends BaseComponentProps {
  // Data
  layers?: MapLayer[];
  datasets?: Dataset[];
  features?: FeatureData[];
  
  // Layout configuration
  initialLayout?: LayoutMode;
  allowLayoutChange?: boolean;
  showToolbar?: boolean;
  
  // Map configuration
  initialViewState?: {
    longitude: number;
    latitude: number;
    zoom: number;
    bearing?: number;
    pitch?: number;
  };
  
  // Control visibility
  showLayerControl?: boolean;
  showDrawingTools?: boolean;
  showSpatialSearch?: boolean;
  showDataTable?: boolean;
  
  // Mobile configuration
  mobileBreakpoint?: number;
  collapsibleSidebars?: boolean;
  
  // Event handlers
  onLayerToggle?: (layerId: string, visible: boolean) => void;
  onLayerOpacityChange?: (layerId: string, opacity: number) => void;
  onLayerStyleChange?: (layerId: string, style: Record<string, any>) => void;
  onFeatureSelect?: (features: FeatureData[]) => void;
  onFeatureCreate?: (feature: any) => void;
  onFeatureUpdate?: (feature: FeatureData) => void;
  onFeatureDelete?: (featureId: string) => void;
  onSpatialQuery?: (query: any) => Promise<any[]>;
  onViewStateChange?: (viewState: any) => void;
  onMapLoad?: (map: Map) => void;
}

export const MapLayout: React.FC<MapLayoutProps> = ({
  // Data
  layers = [],
  datasets = [],
  features = [],
  
  // Layout
  initialLayout = 'split-horizontal',
  allowLayoutChange = true,
  showToolbar = true,
  
  // Map
  initialViewState = {
    longitude: -74.006,
    latitude: 40.7128,
    zoom: 10
  },
  
  // Controls
  showLayerControl = true,
  showDrawingTools = true,
  showSpatialSearch = true,
  showDataTable = true,
  
  // Mobile
  mobileBreakpoint = 768,
  collapsibleSidebars = true,
  
  // Events
  onLayerToggle,
  onLayerOpacityChange,
  onLayerStyleChange,
  onFeatureSelect,
  onFeatureCreate,
  onFeatureUpdate,
  onFeatureDelete,
  onSpatialQuery,
  onViewStateChange,
  onMapLoad,
  
  // Base props
  loading = false,
  error,
  onError,
  className
}) => {
  // State
  const [layoutMode, setLayoutMode] = useState<LayoutMode>(initialLayout);
  const [screenData, setScreenData] = useState(Dimensions.get('window'));
  const [selectedFeatures, setSelectedFeatures] = useState<string[]>([]);
  const [mapInstance, setMapInstance] = useState<Map | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showMobileControls, setShowMobileControls] = useState(false);
  
  // Refs
  const mapRef = useRef<any>(null);
  
  // Mobile detection
  const isMobile = screenData.width < mobileBreakpoint;
  
  // Listen for screen size changes
  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setScreenData(window);
    });

    return () => subscription?.remove();
  }, []);

  // Auto-adjust layout for mobile
  useEffect(() => {
    if (isMobile && (layoutMode === 'split-horizontal' || layoutMode === 'split-vertical')) {
      setLayoutMode('map-only');
    }
  }, [isMobile, layoutMode]);

  // Memoized map sources and layers for MapLibre
  const mapSources = useMemo(() => {
    return layers.map(layer => ({
      id: `layer-source-${layer.id}`,
      type: 'geojson' as const,
      data: {
        type: 'FeatureCollection',
        features: features
          .filter(f => f.layer_id === layer.id)
          .map(f => ({
            type: 'Feature',
            id: f.id,
            properties: f.properties,
            geometry: f.geometry
          }))
      }
    }));
  }, [layers, features]);

  const mapLayers = useMemo(() => {
    return layers.map(layer => {
      const baseStyle = {
        id: layer.id,
        source: `layer-source-${layer.id}`,
        visible: layer.visible,
        opacity: layer.opacity,
        minZoom: layer.minZoom,
        maxZoom: layer.maxZoom
      };

      // Style based on geometry type
      switch (layer.geometry_type.toLowerCase()) {
        case 'point':
        case 'multipoint':
          return {
            ...baseStyle,
            type: 'circle' as const,
            paint: {
              'circle-radius': layer.style?.pointSize || 6,
              'circle-color': layer.style?.pointColor || '#007AFF',
              'circle-stroke-color': layer.style?.strokeColor || '#FFFFFF',
              'circle-stroke-width': layer.style?.strokeWidth || 1,
              'circle-opacity': layer.opacity
            }
          };
          
        case 'linestring':
        case 'multilinestring':
          return {
            ...baseStyle,
            type: 'line' as const,
            layout: {
              'line-join': 'round',
              'line-cap': 'round'
            },
            paint: {
              'line-color': layer.style?.strokeColor || '#007AFF',
              'line-width': layer.style?.strokeWidth || 2,
              'line-opacity': layer.opacity
            }
          };
          
        case 'polygon':
        case 'multipolygon':
          return [
            {
              ...baseStyle,
              id: `${layer.id}-fill`,
              type: 'fill' as const,
              paint: {
                'fill-color': layer.style?.fillColor || '#007AFF',
                'fill-opacity': layer.style?.fillOpacity || 0.2
              }
            },
            {
              ...baseStyle,
              id: `${layer.id}-stroke`,
              type: 'line' as const,
              paint: {
                'line-color': layer.style?.strokeColor || '#007AFF',
                'line-width': layer.style?.strokeWidth || 1,
                'line-opacity': layer.opacity
              }
            }
          ];
          
        default:
          return {
            ...baseStyle,
            type: 'circle' as const,
            paint: {
              'circle-radius': 4,
              'circle-color': '#007AFF',
              'circle-opacity': layer.opacity
            }
          };
      }
    }).flat();
  }, [layers]);

  // Event handlers
  const handleMapLoad = useCallback((map: Map) => {
    setMapInstance(map);
    onMapLoad?.(map);
  }, [onMapLoad]);

  const handleFeatureClick = useCallback((feature: any, layer: any) => {
    const featureData = features.find(f => f.id === feature.id);
    if (featureData) {
      setSelectedFeatures(prev => {
        const isSelected = prev.includes(feature.id);
        if (isSelected) {
          return prev.filter(id => id !== feature.id);
        } else {
          return [...prev, feature.id];
        }
      });
    }
  }, [features]);

  const handleLayoutChange = useCallback((newLayout: LayoutMode) => {
    if (!allowLayoutChange) return;
    setLayoutMode(newLayout);
  }, [allowLayoutChange]);

  const handleSidebarToggle = useCallback(() => {
    setSidebarCollapsed(prev => !prev);
  }, []);

  const handleMobileControlsToggle = useCallback(() => {
    setShowMobileControls(prev => !prev);
  }, []);

  const handleFeatureSelectionChange = useCallback((selectedIds: string[]) => {
    setSelectedFeatures(selectedIds);
    const selectedFeatureData = features.filter(f => selectedIds.includes(f.id));
    onFeatureSelect?.(selectedFeatureData);
  }, [features, onFeatureSelect]);

  // Layout calculations
  const getLayoutStyles = () => {
    const { width, height } = screenData;
    
    switch (layoutMode) {
      case 'map-only':
        return {
          mapContainer: { width: '100%', height: '100%' },
          tableContainer: { display: 'none' }
        };
        
      case 'table-only':
        return {
          mapContainer: { display: 'none' },
          tableContainer: { width: '100%', height: '100%' }
        };
        
      case 'split-horizontal':
        return {
          mapContainer: { width: '100%', height: '60%' },
          tableContainer: { width: '100%', height: '40%' }
        };
        
      case 'split-vertical':
        const sidebarWidth = sidebarCollapsed ? 0 : (isMobile ? width * 0.8 : 400);
        const mapWidth = width - sidebarWidth;
        console.log('V-Split layout calculation:', {
          screenWidth: width,
          sidebarWidth,
          mapWidth,
          sidebarCollapsed,
          isMobile
        });
        return {
          mapContainer: { 
            width: isMobile ? '100%' : mapWidth > 0 ? `${mapWidth}px` : '100%', 
            height: '100%',
            minWidth: '300px' // Ensure minimum width
          },
          tableContainer: { 
            width: isMobile ? '100%' : sidebarWidth > 0 ? `${sidebarWidth}px` : '0px', 
            height: '100%',
            display: sidebarCollapsed ? 'none' : 'flex'
          }
        };
        
      default:
        return {
          mapContainer: { width: '100%', height: '100%' },
          tableContainer: { display: 'none' }
        };
    }
  };

  const layoutStyles = getLayoutStyles();

  // Toolbar buttons
  const toolbarButtons = [
    {
      id: 'map-only',
      icon: '🗺',
      label: 'Map',
      layout: 'map-only' as LayoutMode,
      active: layoutMode === 'map-only'
    },
    {
      id: 'split-horizontal',
      icon: '⬜',
      label: 'H-Split',
      layout: 'split-horizontal' as LayoutMode,
      active: layoutMode === 'split-horizontal',
      disabled: isMobile
    },
    {
      id: 'split-vertical',
      icon: '▯',
      label: 'V-Split',
      layout: 'split-vertical' as LayoutMode,
      active: layoutMode === 'split-vertical',
      disabled: isMobile
    },
    {
      id: 'table-only',
      icon: '📋',
      label: 'Table',
      layout: 'table-only' as LayoutMode,
      active: layoutMode === 'table-only'
    }
  ];

  // Mobile controls modal
  const renderMobileControlsModal = () => (
    <Modal
      visible={showMobileControls}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={() => setShowMobileControls(false)}
    >
      <SafeAreaView style={styles.mobileControlsContainer}>
        <View style={styles.mobileControlsHeader}>
          <Text style={styles.mobileControlsTitle}>Map Controls</Text>
          <TouchableOpacity
            style={styles.mobileControlsCloseButton}
            onPress={() => setShowMobileControls(false)}
          >
            <Text style={styles.mobileControlsCloseText}>Done</Text>
          </TouchableOpacity>
        </View>
        
        <View style={styles.mobileControlsContent}>
          {/* Layer Control */}
          {showLayerControl && (
            <View style={styles.mobileControlSection}>
              <LayerControl
                layers={layers}
                datasets={datasets}
                onLayerToggle={onLayerToggle}
                onLayerOpacityChange={onLayerOpacityChange}
                onLayerStyleChange={onLayerStyleChange}
                compactMode={true}
                maxHeight={200}
              />
            </View>
          )}
          
          {/* Layout Controls */}
          <View style={styles.mobileControlSection}>
            <Text style={styles.mobileControlSectionTitle}>Layout</Text>
            <View style={styles.mobileLayoutButtons}>
              {toolbarButtons.filter(btn => !btn.disabled).map(button => (
                <TouchableOpacity
                  key={button.id}
                  style={[
                    styles.mobileLayoutButton,
                    button.active && styles.mobileLayoutButtonActive
                  ]}
                  onPress={() => {
                    handleLayoutChange(button.layout);
                    setShowMobileControls(false);
                  }}
                >
                  <Text style={styles.mobileLayoutButtonText}>
                    {button.icon} {button.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </SafeAreaView>
    </Modal>
  );

  // Main render
  return (
    <View style={[styles.container, className && { className }]}>
      {/* Toolbar */}
      {showToolbar && !isMobile && (
        <View style={styles.toolbar}>
          <View style={styles.toolbarLeft}>
            <Text style={styles.toolbarTitle}>GIS Platform</Text>
          </View>
          
          <View style={styles.toolbarCenter}>
            {allowLayoutChange && (
              <View style={styles.layoutButtons}>
                {toolbarButtons.map(button => (
                  <TouchableOpacity
                    key={button.id}
                    style={[
                      styles.layoutButton,
                      button.active && styles.layoutButtonActive,
                      button.disabled && styles.layoutButtonDisabled
                    ]}
                    onPress={() => handleLayoutChange(button.layout)}
                    disabled={button.disabled}
                  >
                    <Text style={[
                      styles.layoutButtonText,
                      button.active && styles.layoutButtonTextActive
                    ]}>
                      {button.icon}
                    </Text>
                    <Text style={[
                      styles.layoutButtonLabel,
                      button.active && styles.layoutButtonLabelActive
                    ]}>
                      {button.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
          
          <View style={styles.toolbarRight}>
            {collapsibleSidebars && layoutMode === 'split-vertical' && (
              <TouchableOpacity
                style={styles.sidebarToggle}
                onPress={handleSidebarToggle}
              >
                <Text style={styles.sidebarToggleText}>
                  {sidebarCollapsed ? '◀' : '▶'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}
      
      {/* Mobile floating controls */}
      {isMobile && (
        <TouchableOpacity
          style={styles.mobileControlsButton}
          onPress={handleMobileControlsToggle}
        >
          <Text style={styles.mobileControlsButtonText}>⚙️</Text>
        </TouchableOpacity>
      )}
      
      {/* Content area */}
      <View style={[
        styles.content,
        layoutMode === 'split-horizontal' && styles.contentHorizontal,
        layoutMode === 'split-vertical' && styles.contentVertical
      ]}>
        {/* Map container */}
        <View style={[styles.mapContainer, layoutStyles.mapContainer]}>
          <MapView
            map={mapInstance}
            sources={mapSources}
            layers={mapLayers}
            initialViewState={initialViewState}
            onMapLoad={handleMapLoad}
            onFeatureClick={handleFeatureClick}
            onMoveEnd={onViewStateChange}
            width="100%"
            height="100%"
            loading={loading}
            error={error}
            onError={onError}
          />
          
          {/* Map controls */}
          {!isMobile && (
            <>
              {showLayerControl && (
                <LayerControl
                  layers={layers}
                  datasets={datasets}
                  onLayerToggle={onLayerToggle}
                  onLayerOpacityChange={onLayerOpacityChange}
                  onLayerStyleChange={onLayerStyleChange}
                  position="top-right"
                  collapsed={false}
                  maxHeight={400}
                />
              )}
              
              {showDrawingTools && (
                <DrawingTools
                  map={mapInstance}
                  position="top-left"
                  vertical={true}
                  compactMode={false}
                  onSaveGeometry={onFeatureCreate}
                />
              )}
              
              {showSpatialSearch && (
                <SpatialSearch
                  map={mapInstance}
                  availableLayers={layers.map(l => ({ id: l.id, name: l.name, type: l.geometry_type }))}
                  position="bottom-right"
                  onQueryExecute={onSpatialQuery}
                  onResultsSelect={onFeatureSelect}
                />
              )}
            </>
          )}
        </View>
        
        {/* Data table container */}
        {showDataTable && layoutMode !== 'map-only' && (
          <View style={[styles.tableContainer, layoutStyles.tableContainer]}>
            <DataTable
              data={features}
              selectedIds={selectedFeatures}
              onSelectionChange={handleFeatureSelectionChange}
              onUpdate={onFeatureUpdate}
              onDelete={onFeatureDelete}
              height={layoutMode === 'split-horizontal' ? screenData.height * 0.4 : undefined}
              virtualScrolling={true}
              sortable={true}
              selectable={true}
              multiSelect={true}
              cardViewOnMobile={isMobile}
              mobileBreakpoint={mobileBreakpoint}
              columns={[
                { key: 'id', title: 'ID', width: 100, sortable: true, type: 'string' },
                { key: 'name', title: 'Name', width: 200, sortable: true, type: 'string' },
                { key: 'description', title: 'Description', width: 300, sortable: true, type: 'string' },
                { key: 'geometry', title: 'Geometry', width: 120, sortable: false, type: 'geometry', align: 'center' },
                { key: 'created_at', title: 'Created', width: 150, sortable: true, type: 'date' }
              ]}
            />
          </View>
        )}
      </View>
      
      {renderMobileControlsModal()}
    </View>
  );
};

// Styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 56,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
    paddingHorizontal: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
      },
      android: {
        elevation: 2,
      },
      web: {
        boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
      },
    }),
    zIndex: 1000,
  },
  toolbarLeft: {
    flex: 1,
  },
  toolbarTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  toolbarCenter: {
    flex: 2,
    alignItems: 'center',
  },
  layoutButtons: {
    flexDirection: 'row',
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    padding: 4,
  },
  layoutButton: {
    flexDirection: 'column',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    minWidth: 60,
  },
  layoutButtonActive: {
    backgroundColor: '#007AFF',
  },
  layoutButtonDisabled: {
    opacity: 0.5,
  },
  layoutButtonText: {
    fontSize: 16,
    marginBottom: 2,
  },
  layoutButtonTextActive: {
    color: '#FFFFFF',
  },
  layoutButtonLabel: {
    fontSize: 10,
    color: '#666',
    fontWeight: '500',
  },
  layoutButtonLabelActive: {
    color: '#FFFFFF',
  },
  toolbarRight: {
    flex: 1,
    alignItems: 'flex-end',
  },
  sidebarToggle: {
    padding: 8,
    borderRadius: 6,
    backgroundColor: '#F8F9FA',
  },
  sidebarToggleText: {
    fontSize: 14,
    color: '#666',
  },
  mobileControlsButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 20,
    right: 16,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
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
      },
    }),
    zIndex: 1000,
  },
  mobileControlsButtonText: {
    fontSize: 20,
    color: '#FFFFFF',
  },
  content: {
    flex: 1,
  },
  contentHorizontal: {
    flexDirection: 'column',
  },
  contentVertical: {
    flexDirection: 'row',
  },
  mapContainer: {
    position: 'relative',
    backgroundColor: '#F0F0F0',
    minHeight: '400px',
    overflow: 'hidden',
  },
  tableContainer: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
  },
  mobileControlsContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  mobileControlsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
    backgroundColor: '#F8F9FA',
  },
  mobileControlsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  mobileControlsCloseButton: {
    padding: 8,
  },
  mobileControlsCloseText: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
  },
  mobileControlsContent: {
    flex: 1,
    padding: 16,
  },
  mobileControlSection: {
    marginBottom: 24,
  },
  mobileControlSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  mobileLayoutButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  mobileLayoutButton: {
    flex: 1,
    minWidth: 120,
    padding: 16,
    borderRadius: 8,
    backgroundColor: '#F8F9FA',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  mobileLayoutButtonActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  mobileLayoutButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
});

export default MapLayout;