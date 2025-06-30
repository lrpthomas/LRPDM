import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Switch,
  Modal,
  TextInput,
  Alert,
  Dimensions,
  Platform
} from 'react-native';
import { Dataset, Layer } from '../../types/database';

// Base component props
interface BaseComponentProps {
  className?: string;
  loading?: boolean;
  error?: string;
  onError?: (error: Error) => void;
}

// Layer style configuration
interface LayerStyle {
  color?: string;
  opacity?: number;
  strokeColor?: string;
  strokeWidth?: number;
  fillColor?: string;
  fillOpacity?: number;
  pointSize?: number;
  pointColor?: string;
  heatmapRadius?: number;
  heatmapIntensity?: number;
}

// Extended layer with map-specific properties
interface MapLayer extends Layer {
  datasetName?: string;
  style?: LayerStyle;
  visible: boolean;
  opacity: number;
  minZoom?: number;
  maxZoom?: number;
  isLoading?: boolean;
  hasError?: boolean;
  errorMessage?: string;
  featureCount?: number;
  bounds?: [number, number, number, number];
}

// Layer group for organization
interface LayerGroup {
  id: string;
  name: string;
  layers: MapLayer[];
  visible: boolean;
  expanded: boolean;
  type: 'dataset' | 'basemap' | 'overlay';
}

// Layer control props
interface LayerControlProps extends BaseComponentProps {
  layers: MapLayer[];
  layerGroups?: LayerGroup[];
  datasets?: Dataset[];
  onLayerToggle: (layerId: string, visible: boolean) => void;
  onLayerOpacityChange: (layerId: string, opacity: number) => void;
  onLayerStyleChange: (layerId: string, style: LayerStyle) => void;
  onLayerRemove?: (layerId: string) => void;
  onLayerAdd?: (datasetId: string) => void;
  onLayerReorder?: (fromIndex: number, toIndex: number) => void;
  onGroupToggle?: (groupId: string, visible: boolean) => void;
  onZoomToLayer?: (layerId: string) => void;
  onLayerInfo?: (layerId: string) => void;
  // Mobile props
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  collapsed?: boolean;
  onCollapseToggle?: (collapsed: boolean) => void;
  maxHeight?: number;
  showAddLayer?: boolean;
  showLayerInfo?: boolean;
  showLayerStyle?: boolean;
  compactMode?: boolean;
}

export const LayerControl: React.FC<LayerControlProps> = ({
  layers = [],
  layerGroups = [],
  datasets = [],
  onLayerToggle,
  onLayerOpacityChange,
  onLayerStyleChange,
  onLayerRemove,
  onLayerAdd,
  onLayerReorder,
  onGroupToggle,
  onZoomToLayer,
  onLayerInfo,
  position = 'top-right',
  collapsed = false,
  onCollapseToggle,
  maxHeight = 400,
  showAddLayer = true,
  showLayerInfo = true,
  showLayerStyle = true,
  compactMode = false,
  loading = false,
  error,
  onError,
  className
}) => {
  // State
  const [isExpanded, setIsExpanded] = useState(!collapsed);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [selectedLayer, setSelectedLayer] = useState<MapLayer | null>(null);
  const [showStyleModal, setShowStyleModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [screenData, setScreenData] = useState(Dimensions.get('window'));
  
  // Mobile detection
  const isMobile = screenData.width < 768;

  // Organize layers into groups
  const organizedGroups = useMemo(() => {
    const groups: LayerGroup[] = [...layerGroups];
    
    // Create dataset groups for ungrouped layers
    const ungroupedLayers = layers.filter(layer => 
      !layerGroups.some(group => group.layers.some(l => l.id === layer.id))
    );
    
    // Group by dataset
    const datasetGroups = ungroupedLayers.reduce((acc, layer) => {
      const datasetId = layer.dataset_id;
      if (!acc[datasetId]) {
        const dataset = datasets.find(d => d.id === datasetId);
        acc[datasetId] = {
          id: `dataset-${datasetId}`,
          name: dataset?.name || 'Unnamed Dataset',
          layers: [],
          visible: true,
          expanded: expandedGroups.has(`dataset-${datasetId}`),
          type: 'dataset' as const
        };
      }
      acc[datasetId].layers.push(layer);
      return acc;
    }, {} as Record<string, LayerGroup>);
    
    groups.push(...Object.values(datasetGroups));
    
    return groups;
  }, [layers, layerGroups, datasets, expandedGroups]);

  // Event handlers
  const handleToggleExpanded = useCallback(() => {
    const newExpanded = !isExpanded;
    setIsExpanded(newExpanded);
    onCollapseToggle?.(!newExpanded);
  }, [isExpanded, onCollapseToggle]);

  const handleGroupToggle = useCallback((groupId: string) => {
    setExpandedGroups(prev => {
      const newSet = new Set(prev);
      if (newSet.has(groupId)) {
        newSet.delete(groupId);
      } else {
        newSet.add(groupId);
      }
      return newSet;
    });
  }, []);

  const handleLayerVisibilityToggle = useCallback((layer: MapLayer) => {
    onLayerToggle(layer.id, !layer.visible);
  }, [onLayerToggle]);

  const handleLayerOpacityChange = useCallback((layer: MapLayer, opacity: number) => {
    onLayerOpacityChange(layer.id, opacity);
  }, [onLayerOpacityChange]);

  const handleLayerStyleEdit = useCallback((layer: MapLayer) => {
    setSelectedLayer(layer);
    setShowStyleModal(true);
  }, []);

  const handleLayerRemove = useCallback((layer: MapLayer) => {
    Alert.alert(
      'Remove Layer',
      `Are you sure you want to remove "${layer.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Remove', 
          style: 'destructive',
          onPress: () => onLayerRemove?.(layer.id)
        }
      ]
    );
  }, [onLayerRemove]);

  const handleZoomToLayer = useCallback((layer: MapLayer) => {
    onZoomToLayer?.(layer.id);
  }, [onZoomToLayer]);

  const handleLayerInfo = useCallback((layer: MapLayer) => {
    onLayerInfo?.(layer.id);
  }, [onLayerInfo]);

  const handleAddLayer = useCallback((datasetId: string) => {
    onLayerAdd?.(datasetId);
    setShowAddModal(false);
  }, [onLayerAdd]);

  // Render layer item
  const renderLayerItem = useCallback((layer: MapLayer, index: number) => {
    const isCompact = compactMode || isMobile;
    
    return (
      <View key={layer.id} style={[styles.layerItem, isCompact && styles.layerItemCompact]}>
        {/* Layer header */}
        <View style={styles.layerHeader}>
          <TouchableOpacity
            style={styles.layerToggle}
            onPress={() => handleLayerVisibilityToggle(layer)}
          >
            <View style={[
              styles.layerCheckbox,
              layer.visible && styles.layerCheckboxChecked
            ]}>
              {layer.visible && (
                <Text style={styles.layerCheckboxCheck}>✓</Text>
              )}
            </View>
          </TouchableOpacity>
          
          <View style={styles.layerInfo}>
            <Text style={[styles.layerName, !layer.visible && styles.layerNameDisabled]}>
              {layer.name}
            </Text>
            
            {!isCompact && (
              <View style={styles.layerMeta}>
                <Text style={styles.layerMetaText}>
                  {layer.geometry_type} • {layer.feature_count || 0} features
                </Text>
                {layer.isLoading && (
                  <Text style={styles.layerStatus}>Loading...</Text>
                )}
                {layer.hasError && (
                  <Text style={styles.layerError}>Error</Text>
                )}
              </View>
            )}
          </View>
          
          <View style={styles.layerActions}>
            {!isCompact && (
              <>
                {showLayerInfo && (
                  <TouchableOpacity
                    style={styles.layerActionButton}
                    onPress={() => handleLayerInfo(layer)}
                  >
                    <Text style={styles.layerActionIcon}>ℹ</Text>
                  </TouchableOpacity>
                )}
                
                <TouchableOpacity
                  style={styles.layerActionButton}
                  onPress={() => handleZoomToLayer(layer)}
                >
                  <Text style={styles.layerActionIcon}>🔍</Text>
                </TouchableOpacity>
                
                {showLayerStyle && (
                  <TouchableOpacity
                    style={styles.layerActionButton}
                    onPress={() => handleLayerStyleEdit(layer)}
                  >
                    <Text style={styles.layerActionIcon}>🎨</Text>
                  </TouchableOpacity>
                )}
                
                {onLayerRemove && (
                  <TouchableOpacity
                    style={styles.layerActionButton}
                    onPress={() => handleLayerRemove(layer)}
                  >
                    <Text style={styles.layerActionIcon}>🗑</Text>
                  </TouchableOpacity>
                )}
              </>
            )}
          </View>
        </View>
        
        {/* Layer controls */}
        {!isCompact && layer.visible && (
          <View style={styles.layerControls}>
            <View style={styles.opacityControl}>
              <Text style={styles.opacityLabel}>Opacity</Text>
              <input
                type="range"
                style={styles.opacitySlider}
                value={layer.opacity}
                min={0}
                max={1}
                step={0.1}
                onChange={(e) => handleLayerOpacityChange(layer, parseFloat(e.target.value))}
              />
              <Text style={styles.opacityValue}>{Math.round(layer.opacity * 100)}%</Text>
            </View>
          </View>
        )}
      </View>
    );
  }, [
    compactMode, isMobile, handleLayerVisibilityToggle, handleLayerInfo,
    handleZoomToLayer, handleLayerStyleEdit, handleLayerRemove,
    handleLayerOpacityChange, showLayerInfo, showLayerStyle, onLayerRemove
  ]);

  // Render layer group
  const renderLayerGroup = useCallback((group: LayerGroup) => {
    const isExpanded = expandedGroups.has(group.id);
    const visibleLayers = group.layers.filter(l => l.visible).length;
    
    return (
      <View key={group.id} style={styles.layerGroup}>
        {/* Group header */}
        <TouchableOpacity
          style={styles.groupHeader}
          onPress={() => handleGroupToggle(group.id)}
        >
          <Text style={styles.groupExpandIcon}>
            {isExpanded ? '▼' : '▶'}
          </Text>
          
          <View style={styles.groupInfo}>
            <Text style={styles.groupName}>{group.name}</Text>
            <Text style={styles.groupMeta}>
              {visibleLayers}/{group.layers.length} layers visible
            </Text>
          </View>
          
          <Switch
            value={group.visible}
            onValueChange={(visible) => onGroupToggle?.(group.id, visible)}
            trackColor={{ false: '#E5E5E5', true: '#007AFF' }}
            thumbColor={group.visible ? '#FFFFFF' : '#FFFFFF'}
          />
        </TouchableOpacity>
        
        {/* Group layers */}
        {isExpanded && (
          <View style={styles.groupLayers}>
            {group.layers.map((layer, index) => renderLayerItem(layer, index))}
          </View>
        )}
      </View>
    );
  }, [expandedGroups, handleGroupToggle, onGroupToggle, renderLayerItem]);

  // Render position styles
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
        return { ...baseStyles, top: 10, right: 10 };
    }
  };

  // Style modal
  const renderStyleModal = () => {
    if (!selectedLayer) return null;
    
    return (
      <Modal
        visible={showStyleModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowStyleModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Layer Style: {selectedLayer.name}</Text>
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setShowStyleModal(false)}
            >
              <Text style={styles.modalCloseText}>Done</Text>
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.modalContent}>
            {/* Style controls would go here */}
            <Text style={styles.modalSectionTitle}>Coming Soon</Text>
            <Text style={styles.modalSectionText}>
              Layer styling controls will be implemented here.
            </Text>
          </ScrollView>
        </View>
      </Modal>
    );
  };

  // Add layer modal
  const renderAddModal = () => (
    <Modal
      visible={showAddModal}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={() => setShowAddModal(false)}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Add Layer</Text>
          <TouchableOpacity
            style={styles.modalCloseButton}
            onPress={() => setShowAddModal(false)}
          >
            <Text style={styles.modalCloseText}>Cancel</Text>
          </TouchableOpacity>
        </View>
        
        <ScrollView style={styles.modalContent}>
          <Text style={styles.modalSectionTitle}>Available Datasets</Text>
          
          {datasets.map(dataset => (
            <TouchableOpacity
              key={dataset.id}
              style={styles.datasetItem}
              onPress={() => handleAddLayer(dataset.id)}
            >
              <Text style={styles.datasetName}>{dataset.name}</Text>
              <Text style={styles.datasetMeta}>
                {dataset.feature_count} features • {dataset.type}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    </Modal>
  );

  // Main render
  return (
    <>
      <View style={[styles.container, getPositionStyles(), className && { className }]}>
        {/* Header */}
        <TouchableOpacity
          style={styles.header}
          onPress={handleToggleExpanded}
        >
          <Text style={styles.headerText}>Layers</Text>
          <View style={styles.headerActions}>
            {showAddLayer && (
              <TouchableOpacity
                style={styles.headerButton}
                onPress={() => setShowAddModal(true)}
              >
                <Text style={styles.headerButtonText}>+</Text>
              </TouchableOpacity>
            )}
            <Text style={styles.headerExpandIcon}>
              {isExpanded ? '▼' : '▶'}
            </Text>
          </View>
        </TouchableOpacity>
        
        {/* Content */}
        {isExpanded && (
          <View style={[styles.content, { maxHeight }]}>
            {loading && (
              <View style={styles.loadingContainer}>
                <Text style={styles.loadingText}>Loading layers...</Text>
              </View>
            )}
            
            {error && (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>Error: {error}</Text>
              </View>
            )}
            
            {!loading && !error && (
              <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
                {organizedGroups.map(group => renderLayerGroup(group))}
                
                {organizedGroups.length === 0 && (
                  <View style={styles.emptyContainer}>
                    <Text style={styles.emptyText}>No layers available</Text>
                    {showAddLayer && (
                      <TouchableOpacity
                        style={styles.addButton}
                        onPress={() => setShowAddModal(true)}
                      >
                        <Text style={styles.addButtonText}>Add Layer</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                )}
              </ScrollView>
            )}
          </View>
        )}
      </View>
      
      {renderStyleModal()}
      {renderAddModal()}
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
    minWidth: 250,
    maxWidth: 350,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
      web: {
        boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
      }
    }),
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
    backgroundColor: '#F8F9FA',
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
  },
  headerText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  headerButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  headerExpandIcon: {
    fontSize: 12,
    color: '#666',
  },
  content: {
    backgroundColor: '#FFFFFF',
  },
  scrollView: {
    flex: 1,
  },
  layerGroup: {
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#F8F9FA',
  },
  groupExpandIcon: {
    fontSize: 12,
    color: '#666',
    marginRight: 8,
    width: 12,
  },
  groupInfo: {
    flex: 1,
  },
  groupName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  groupMeta: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  groupLayers: {
    backgroundColor: '#FFFFFF',
  },
  layerItem: {
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  layerItemCompact: {
    paddingVertical: 8,
  },
  layerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  layerToggle: {
    marginRight: 12,
  },
  layerCheckbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#CCC',
    justifyContent: 'center',
    alignItems: 'center',
  },
  layerCheckboxChecked: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  layerCheckboxCheck: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  layerInfo: {
    flex: 1,
  },
  layerName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  layerNameDisabled: {
    color: '#999',
  },
  layerMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  layerMetaText: {
    fontSize: 12,
    color: '#666',
  },
  layerStatus: {
    fontSize: 12,
    color: '#007AFF',
    marginLeft: 8,
  },
  layerError: {
    fontSize: 12,
    color: '#FF3B30',
    marginLeft: 8,
  },
  layerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  layerActionButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 4,
  },
  layerActionIcon: {
    fontSize: 16,
  },
  layerControls: {
    paddingHorizontal: 12,
    paddingBottom: 12,
  },
  opacityControl: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  opacityLabel: {
    fontSize: 12,
    color: '#666',
    width: 50,
  },
  opacitySlider: {
    flex: 1,
    marginHorizontal: 8,
    height: 20,
    backgroundColor: '#E5E5E5',
    borderRadius: 10,
    outlineStyle: 'none',
    cursor: 'pointer',
  },
  opacityValue: {
    fontSize: 12,
    color: '#666',
    width: 35,
    textAlign: 'right',
  },
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 14,
    color: '#666',
  },
  errorContainer: {
    padding: 20,
    alignItems: 'center',
  },
  errorText: {
    fontSize: 14,
    color: '#FF3B30',
    textAlign: 'center',
  },
  emptyContainer: {
    padding: 20,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  addButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
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
  modalCloseButton: {
    padding: 8,
  },
  modalCloseText: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  modalSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  modalSectionText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  datasetItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  datasetName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  datasetMeta: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
});

export default LayerControl;