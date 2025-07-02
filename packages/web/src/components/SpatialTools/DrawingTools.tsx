import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  TextInput,
  Alert,
  Dimensions
} from 'react-native';
import { Map } from 'maplibre-gl';
import MapboxDraw from '@mapbox/mapbox-gl-draw';
import '@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css';

// Base component props
interface BaseComponentProps {
  className?: string;
  loading?: boolean;
  error?: string;
  onError?: (error: Error) => void;
}

// Drawing modes
type DrawingMode = 
  | 'point' 
  | 'line_string' 
  | 'polygon' 
  | 'rectangle' 
  | 'circle' 
  | 'select' 
  | 'none';

// Geometry types
interface DrawnGeometry {
  id: string;
  type: 'Point' | 'LineString' | 'Polygon';
  coordinates: any;
  properties?: Record<string, any>;
}

// Drawing events
interface DrawingEvents {
  onCreate?: (geometry: DrawnGeometry) => void;
  onUpdate?: (geometry: DrawnGeometry) => void;
  onDelete?: (geometryIds: string[]) => void;
  onSelectionChange?: (selectedIds: string[]) => void;
  onModeChange?: (mode: DrawingMode) => void;
}

// Drawing tool configuration
interface DrawingConfig {
  enablePoint?: boolean;
  enableLineString?: boolean;
  enablePolygon?: boolean;
  enableRectangle?: boolean;
  enableCircle?: boolean;
  enableEdit?: boolean;
  enableDelete?: boolean;
  enableCombine?: boolean;
  enableUncombine?: boolean;
  showMeasurements?: boolean;
  snapToGrid?: boolean;
  gridSize?: number;
  maxVertices?: number;
}

// Drawing tools props
interface DrawingToolsProps extends BaseComponentProps, DrawingEvents {
  map: Map | null;
  config?: DrawingConfig;
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  vertical?: boolean;
  compactMode?: boolean;
  showLabels?: boolean;
  onSaveGeometry?: (geometry: DrawnGeometry, properties: Record<string, any>) => void;
  onClearAll?: () => void;
  onImportGeometry?: (geojson: any) => void;
  onExportGeometry?: () => void;
}

// Default configuration
const DEFAULT_CONFIG: DrawingConfig = {
  enablePoint: true,
  enableLineString: true,
  enablePolygon: true,
  enableRectangle: true,
  enableCircle: false, // MapboxDraw doesn't support circles by default
  enableEdit: true,
  enableDelete: true,
  enableCombine: true,
  enableUncombine: true,
  showMeasurements: true,
  snapToGrid: false,
  gridSize: 0.001,
  maxVertices: 1000
};

export const DrawingTools: React.FC<DrawingToolsProps> = ({
  map,
  config = DEFAULT_CONFIG,
  position = 'top-left',
  vertical = true,
  compactMode = false,
  showLabels = true,
  onCreate,
  onUpdate,
  onDelete,
  onSelectionChange,
  onModeChange,
  onSaveGeometry,
  onClearAll,
  onImportGeometry,
  onExportGeometry,
  loading = false,
  error,
  onError,
  className
}) => {
  // State
  const [currentMode, setCurrentMode] = useState<DrawingMode>('none');
  const [selectedFeatures, setSelectedFeatures] = useState<string[]>([]);
  const [drawInstance, setDrawInstance] = useState<MapboxDraw | null>(null);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [pendingGeometry, setPendingGeometry] = useState<DrawnGeometry | null>(null);
  const [geometryProperties, setGeometryProperties] = useState<Record<string, any>>({});
  const [screenData, setScreenData] = useState(Dimensions.get('window'));
  
  // Refs
  const drawRef = useRef<MapboxDraw | null>(null);
  
  // Mobile detection
  const isMobile = screenData.width < 768;

  // Initialize drawing controls
  useEffect(() => {
    if (!map || drawInstance) return;

    try {
      const draw = new MapboxDraw({
        displayControlsDefault: false,
        controls: {},
        modes: {
          ...MapboxDraw.modes,
          // Custom modes could be added here
        },
        styles: [
          // Point styles
          {
            id: 'gl-draw-point',
            type: 'circle',
            filter: ['all', ['==', '$type', 'Point'], ['!=', 'mode', 'static']],
            paint: {
              'circle-radius': 8,
              'circle-color': '#007AFF',
              'circle-stroke-color': '#FFFFFF',
              'circle-stroke-width': 2
            }
          },
          // Line styles
          {
            id: 'gl-draw-line',
            type: 'line',
            filter: ['all', ['==', '$type', 'LineString'], ['!=', 'mode', 'static']],
            layout: {
              'line-cap': 'round',
              'line-join': 'round'
            },
            paint: {
              'line-color': '#007AFF',
              'line-width': 3
            }
          },
          // Polygon styles
          {
            id: 'gl-draw-polygon-fill',
            type: 'fill',
            filter: ['all', ['==', '$type', 'Polygon'], ['!=', 'mode', 'static']],
            paint: {
              'fill-color': '#007AFF',
              'fill-opacity': 0.2
            }
          },
          {
            id: 'gl-draw-polygon-stroke',
            type: 'line',
            filter: ['all', ['==', '$type', 'Polygon'], ['!=', 'mode', 'static']],
            layout: {
              'line-cap': 'round',
              'line-join': 'round'
            },
            paint: {
              'line-color': '#007AFF',
              'line-width': 2
            }
          },
          // Vertex styles
          {
            id: 'gl-draw-polygon-and-line-vertex-halo-active',
            type: 'circle',
            filter: ['all', ['==', 'meta', 'vertex'], ['==', '$type', 'Point']],
            paint: {
              'circle-radius': 6,
              'circle-color': '#FFFFFF',
              'circle-stroke-color': '#007AFF',
              'circle-stroke-width': 2
            }
          }
        ]
      });

      map.addControl(draw);
      setDrawInstance(draw);
      drawRef.current = draw;

      // Event listeners
      map.on('draw.create', (e) => {
        const feature = e.features[0];
        const geometry: DrawnGeometry = {
          id: feature.id!,
          type: feature.geometry.type as any,
          coordinates: feature.geometry.coordinates,
          properties: feature.properties
        };
        
        // Show save modal if callback is provided
        if (onSaveGeometry) {
          setPendingGeometry(geometry);
          setShowSaveModal(true);
        } else {
          onCreate?.(geometry);
        }
      });

      map.on('draw.update', (e) => {
        const feature = e.features[0];
        const geometry: DrawnGeometry = {
          id: feature.id!,
          type: feature.geometry.type as any,
          coordinates: feature.geometry.coordinates,
          properties: feature.properties
        };
        onUpdate?.(geometry);
      });

      map.on('draw.delete', (e) => {
        const deletedIds = e.features.map(f => f.id!);
        onDelete?.(deletedIds);
      });

      map.on('draw.selectionchange', (e) => {
        const selectedIds = e.features.map(f => f.id!);
        setSelectedFeatures(selectedIds);
        onSelectionChange?.(selectedIds);
      });

      map.on('draw.modechange', (e) => {
        const mode = e.mode as DrawingMode;
        setCurrentMode(mode);
        onModeChange?.(mode);
      });

    } catch (error) {
      console.error('Failed to initialize drawing tools:', error);
      onError?.(error instanceof Error ? error : new Error('Failed to initialize drawing tools'));
    }

    return () => {
      if (drawRef.current && map) {
        map.removeControl(drawRef.current);
        setDrawInstance(null);
        drawRef.current = null;
      }
    };
  }, [map, onCreate, onUpdate, onDelete, onSelectionChange, onModeChange, onSaveGeometry, onError]);

  // Drawing mode handlers
  const handleSetMode = useCallback((mode: DrawingMode) => {
    if (!drawInstance) return;

    try {
      switch (mode) {
        case 'point':
          drawInstance.changeMode('draw_point');
          break;
        case 'line_string':
          drawInstance.changeMode('draw_line_string');
          break;
        case 'polygon':
          drawInstance.changeMode('draw_polygon');
          break;
        case 'rectangle':
          // MapboxDraw doesn't have built-in rectangle mode
          // This would require a custom mode implementation
          drawInstance.changeMode('draw_polygon');
          break;
        case 'select':
          drawInstance.changeMode('simple_select');
          break;
        case 'none':
        default:
          drawInstance.changeMode('simple_select');
          break;
      }
    } catch (error) {
      console.error('Failed to change drawing mode:', error);
      onError?.(error instanceof Error ? error : new Error('Failed to change drawing mode'));
    }
  }, [drawInstance, onError]);

  const handleDeleteSelected = useCallback(() => {
    if (!drawInstance || selectedFeatures.length === 0) return;

    Alert.alert(
      'Delete Features',
      `Are you sure you want to delete ${selectedFeatures.length} feature(s)?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            drawInstance.delete(selectedFeatures);
          }
        }
      ]
    );
  }, [drawInstance, selectedFeatures]);

  const handleClearAll = useCallback(() => {
    if (!drawInstance) return;

    Alert.alert(
      'Clear All',
      'Are you sure you want to delete all drawn features?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: () => {
            drawInstance.deleteAll();
            onClearAll?.();
          }
        }
      ]
    );
  }, [drawInstance, onClearAll]);

  const handleSaveGeometry = useCallback(() => {
    if (!pendingGeometry || !onSaveGeometry) return;

    onSaveGeometry(pendingGeometry, geometryProperties);
    setShowSaveModal(false);
    setPendingGeometry(null);
    setGeometryProperties({});
  }, [pendingGeometry, geometryProperties, onSaveGeometry]);

  const handleExportGeometry = useCallback(() => {
    if (!drawInstance) return;

    const features = drawInstance.getAll();
    onExportGeometry?.();
    
    // Create and download GeoJSON
    const geojson = JSON.stringify(features, null, 2);
    const blob = new Blob([geojson], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'drawn-features.geojson';
    a.click();
    URL.revokeObjectURL(url);
  }, [drawInstance, onExportGeometry]);

  // Tool button configuration
  const toolButtons = [
    {
      id: 'point',
      icon: '📍',
      label: 'Point',
      mode: 'point' as DrawingMode,
      enabled: config.enablePoint
    },
    {
      id: 'line',
      icon: '📏',
      label: 'Line',
      mode: 'line_string' as DrawingMode,
      enabled: config.enableLineString
    },
    {
      id: 'polygon',
      icon: '⬟',
      label: 'Polygon',
      mode: 'polygon' as DrawingMode,
      enabled: config.enablePolygon
    },
    {
      id: 'rectangle',
      icon: '▭',
      label: 'Rectangle',
      mode: 'rectangle' as DrawingMode,
      enabled: config.enableRectangle
    },
    {
      id: 'select',
      icon: '👆',
      label: 'Select',
      mode: 'select' as DrawingMode,
      enabled: true
    }
  ].filter(button => button.enabled);

  const actionButtons = [
    {
      id: 'delete',
      icon: '🗑',
      label: 'Delete',
      action: handleDeleteSelected,
      enabled: config.enableDelete && selectedFeatures.length > 0,
      destructive: true
    },
    {
      id: 'clear',
      icon: '🧹',
      label: 'Clear All',
      action: handleClearAll,
      enabled: true,
      destructive: true
    },
    {
      id: 'export',
      icon: '💾',
      label: 'Export',
      action: handleExportGeometry,
      enabled: true
    }
  ];

  // Position styles
  const getPositionStyles = () => {
    const baseStyles: any = {
      position: 'absolute',
      zIndex: 1000,
    };
    
    switch (position) {
      case 'top-left':
        return { ...baseStyles, top: 10, left: 10 };
      case 'top-right':
        return { ...baseStyles, top: 10, right: 10 };
      case 'bottom-left':
        return { ...baseStyles, bottom: 10, left: 10 };
      case 'bottom-right':
        return { ...baseStyles, bottom: 10, right: 10 };
      default:
        return { ...baseStyles, top: 10, left: 10 };
    }
  };

  // Render save modal
  const renderSaveModal = () => (
    <Modal
      visible={showSaveModal}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={() => setShowSaveModal(false)}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Save Feature</Text>
          <View style={styles.modalHeaderButtons}>
            <TouchableOpacity
              style={styles.modalButton}
              onPress={() => setShowSaveModal(false)}
            >
              <Text style={styles.modalButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalButton, styles.modalSaveButton]}
              onPress={handleSaveGeometry}
            >
              <Text style={styles.modalSaveButtonText}>Save</Text>
            </TouchableOpacity>
          </View>
        </View>
        
        <View style={styles.modalContent}>
          <Text style={styles.modalLabel}>Name</Text>
          <TextInput
            style={styles.modalInput}
            value={geometryProperties.name || ''}
            onChangeText={(text) => setGeometryProperties(prev => ({ ...prev, name: text }))}
            placeholder="Enter feature name"
          />
          
          <Text style={styles.modalLabel}>Description</Text>
          <TextInput
            style={[styles.modalInput, styles.modalTextArea]}
            value={geometryProperties.description || ''}
            onChangeText={(text) => setGeometryProperties(prev => ({ ...prev, description: text }))}
            placeholder="Enter feature description"
            multiline
            numberOfLines={3}
          />
          
          {pendingGeometry && (
            <View style={styles.modalInfo}>
              <Text style={styles.modalInfoTitle}>Geometry Info</Text>
              <Text style={styles.modalInfoText}>Type: {pendingGeometry.type}</Text>
              {config.showMeasurements && (
                <Text style={styles.modalInfoText}>
                  {pendingGeometry.type === 'Point' && 'Point feature'}
                  {pendingGeometry.type === 'LineString' && 'Line feature'}
                  {pendingGeometry.type === 'Polygon' && 'Polygon feature'}
                </Text>
              )}
            </View>
          )}
        </View>
      </View>
    </Modal>
  );

  // Main render
  return (
    <>
      <View style={[
        styles.container,
        getPositionStyles(),
        vertical ? styles.verticalContainer : styles.horizontalContainer,
        compactMode && styles.compactContainer,
        className && { className }
      ]}>
        {/* Tool buttons */}
        <View style={[
          styles.buttonGroup,
          vertical ? styles.verticalButtonGroup : styles.horizontalButtonGroup
        ]}>
          {toolButtons.map(button => (
            <TouchableOpacity
              key={button.id}
              style={[
                styles.toolButton,
                currentMode === button.mode && styles.toolButtonActive,
                compactMode && styles.toolButtonCompact
              ]}
              onPress={() => handleSetMode(button.mode)}
            >
              <Text style={[
                styles.toolButtonIcon,
                compactMode && styles.toolButtonIconCompact
              ]}>
                {button.icon}
              </Text>
              {showLabels && !compactMode && (
                <Text style={styles.toolButtonLabel}>{button.label}</Text>
              )}
            </TouchableOpacity>
          ))}
        </View>
        
        {/* Action buttons */}
        <View style={[
          styles.buttonGroup,
          styles.actionButtonGroup,
          vertical ? styles.verticalButtonGroup : styles.horizontalButtonGroup
        ]}>
          {actionButtons.map(button => (
            <TouchableOpacity
              key={button.id}
              style={[
                styles.actionButton,
                !button.enabled && styles.actionButtonDisabled,
                button.destructive && styles.actionButtonDestructive,
                compactMode && styles.actionButtonCompact
              ]}
              onPress={button.action}
              disabled={!button.enabled}
            >
              <Text style={[
                styles.actionButtonIcon,
                !button.enabled && styles.actionButtonIconDisabled,
                compactMode && styles.actionButtonIconCompact
              ]}>
                {button.icon}
              </Text>
              {showLabels && !compactMode && (
                <Text style={[
                  styles.actionButtonLabel,
                  !button.enabled && styles.actionButtonLabelDisabled
                ]}>
                  {button.label}
                </Text>
              )}
            </TouchableOpacity>
          ))}
        </View>
      </View>
      
      {renderSaveModal()}
    </>
  );
};

// Styles
const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    padding: 8,
  },
  verticalContainer: {
    flexDirection: 'column',
  },
  horizontalContainer: {
    flexDirection: 'row',
  },
  compactContainer: {
    padding: 4,
  },
  buttonGroup: {
    marginBottom: 8,
  },
  verticalButtonGroup: {
    flexDirection: 'column',
  },
  horizontalButtonGroup: {
    flexDirection: 'row',
  },
  actionButtonGroup: {
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
    paddingTop: 8,
    marginTop: 8,
    marginBottom: 0,
  },
  toolButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    marginBottom: 4,
    borderRadius: 6,
    backgroundColor: '#F8F9FA',
  },
  toolButtonActive: {
    backgroundColor: '#007AFF',
  },
  toolButtonCompact: {
    padding: 8,
    marginBottom: 2,
  },
  toolButtonIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  toolButtonIconCompact: {
    fontSize: 16,
    marginRight: 0,
  },
  toolButtonLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    marginBottom: 4,
    borderRadius: 6,
    backgroundColor: '#F8F9FA',
  },
  actionButtonDisabled: {
    opacity: 0.5,
  },
  actionButtonDestructive: {
    backgroundColor: '#FFEBEE',
  },
  actionButtonCompact: {
    padding: 6,
  },
  actionButtonIcon: {
    fontSize: 16,
    marginRight: 6,
  },
  actionButtonIconDisabled: {
    opacity: 0.5,
  },
  actionButtonIconCompact: {
    fontSize: 14,
    marginRight: 0,
  },
  actionButtonLabel: {
    fontSize: 12,
    color: '#666',
  },
  actionButtonLabelDisabled: {
    opacity: 0.5,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
    backgroundColor: '#F8F9FA',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  modalHeaderButtons: {
    flexDirection: 'row',
  },
  modalButton: {
    padding: 8,
    marginLeft: 12,
  },
  modalButtonText: {
    fontSize: 16,
    color: '#007AFF',
  },
  modalSaveButton: {
    backgroundColor: '#007AFF',
    borderRadius: 6,
    paddingHorizontal: 16,
  },
  modalSaveButtonText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  modalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
    marginTop: 16,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#FFFFFF',
  },
  modalTextArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  modalInfo: {
    marginTop: 24,
    padding: 16,
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
  },
  modalInfoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  modalInfoText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
});

export default DrawingTools;