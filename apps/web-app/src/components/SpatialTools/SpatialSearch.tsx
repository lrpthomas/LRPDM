import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  TextInput,
  ScrollView,
  Switch,
  Alert,
  Dimensions
} from 'react-native';
import { Map, LngLatBounds } from 'maplibre-gl';

// Base component props
interface BaseComponentProps {
  className?: string;
  loading?: boolean;
  error?: string;
  onError?: (error: Error) => void;
}

// Spatial query types
type SpatialQueryType = 
  | 'within' 
  | 'intersects' 
  | 'contains' 
  | 'overlaps' 
  | 'touches' 
  | 'crosses' 
  | 'buffer';

// Query geometry
interface QueryGeometry {
  type: 'Point' | 'LineString' | 'Polygon' | 'Circle';
  coordinates: any;
  radius?: number; // for circles and buffer operations
  buffer?: number; // buffer distance in meters
}

// Spatial query configuration
interface SpatialQuery {
  id: string;
  name: string;
  type: SpatialQueryType;
  geometry: QueryGeometry;
  targetLayers: string[];
  filters?: Record<string, any>;
  bufferDistance?: number;
  bufferUnit?: 'meters' | 'kilometers' | 'miles';
  maxResults?: number;
  includeGeometry?: boolean;
}

// Query result
interface QueryResult {
  id: string;
  layerId: string;
  feature: any;
  distance?: number; // distance from query geometry
  area?: number; // area of intersection
}

// Search events
interface SpatialSearchEvents {
  onQueryExecute?: (query: SpatialQuery) => Promise<QueryResult[]>;
  onResultsSelect?: (results: QueryResult[]) => void;
  onGeometryDraw?: (geometry: QueryGeometry) => void;
  onQuerySave?: (query: SpatialQuery) => void;
  onQueryLoad?: (queryId: string) => void;
}

// Saved query
interface SavedQuery {
  id: string;
  name: string;
  query: SpatialQuery;
  createdAt: Date;
  lastUsed: Date;
}

// Spatial search props
interface SpatialSearchProps extends BaseComponentProps, SpatialSearchEvents {
  map: Map | null;
  availableLayers: Array<{ id: string; name: string; type: string }>;
  savedQueries?: SavedQuery[];
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  enableDrawing?: boolean;
  enableBuffer?: boolean;
  enableSavedQueries?: boolean;
  defaultBufferDistance?: number;
  defaultBufferUnit?: 'meters' | 'kilometers' | 'miles';
  maxResults?: number;
}

export const SpatialSearch: React.FC<SpatialSearchProps> = ({
  map,
  availableLayers = [],
  savedQueries = [],
  position = 'top-right',
  enableDrawing = true,
  enableBuffer = true,
  enableSavedQueries = true,
  defaultBufferDistance = 100,
  defaultBufferUnit = 'meters',
  maxResults = 1000,
  onQueryExecute,
  onResultsSelect,
  onGeometryDraw,
  onQuerySave,
  onQueryLoad,
  loading = false,
  error,
  onError,
  className
}) => {
  // State
  const [isExpanded, setIsExpanded] = useState(false);
  const [showQueryModal, setShowQueryModal] = useState(false);
  const [showResultsModal, setShowResultsModal] = useState(false);
  const [showSavedQueriesModal, setShowSavedQueriesModal] = useState(false);
  
  // Query building state
  const [currentQuery, setCurrentQuery] = useState<Partial<SpatialQuery>>({
    type: 'within',
    targetLayers: [],
    bufferDistance: defaultBufferDistance,
    bufferUnit: defaultBufferUnit,
    maxResults,
    includeGeometry: false
  });
  
  // Results state
  const [queryResults, setQueryResults] = useState<QueryResult[]>([]);
  const [selectedResults, setSelectedResults] = useState<string[]>([]);
  const [isQuerying, setIsQuerying] = useState(false);
  
  // Drawing state
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawingType, setDrawingType] = useState<'point' | 'polygon' | 'circle'>('polygon');
  
  // Screen dimensions
  const [screenData, setScreenData] = useState(Dimensions.get('window'));
  const isMobile = screenData.width < 768;

  // Refs
  const mapClickHandlerRef = useRef<((e: any) => void) | null>(null);

  // Query type options
  const queryTypes = [
    { value: 'within', label: 'Within', description: 'Features completely inside the area' },
    { value: 'intersects', label: 'Intersects', description: 'Features that touch or overlap the area' },
    { value: 'contains', label: 'Contains', description: 'Features that completely contain the area' },
    { value: 'overlaps', label: 'Overlaps', description: 'Features that partially overlap the area' },
    { value: 'touches', label: 'Touches', description: 'Features that touch the boundary' },
    { value: 'crosses', label: 'Crosses', description: 'Features that cross the area' },
    { value: 'buffer', label: 'Buffer', description: 'Features within a distance' }
  ];

  // Buffer unit options
  const bufferUnits = [
    { value: 'meters', label: 'Meters' },
    { value: 'kilometers', label: 'Kilometers' },
    { value: 'miles', label: 'Miles' }
  ];

  // Handle map click for point queries
  useEffect(() => {
    if (!map || !isDrawing || drawingType !== 'point') return;

    const handleMapClick = (e: any) => {
      const point: QueryGeometry = {
        type: 'Point',
        coordinates: [e.lngLat.lng, e.lngLat.lat]
      };

      setCurrentQuery(prev => ({ ...prev, geometry: point }));
      setIsDrawing(false);
      onGeometryDraw?.(point);

      // Show query modal
      setShowQueryModal(true);
    };

    map.on('click', handleMapClick);
    mapClickHandlerRef.current = handleMapClick;

    return () => {
      if (map && mapClickHandlerRef.current) {
        map.off('click', mapClickHandlerRef.current);
        mapClickHandlerRef.current = null;
      }
    };
  }, [map, isDrawing, drawingType, onGeometryDraw]);

  // Handle drawing mode toggle
  const handleStartDrawing = useCallback((type: 'point' | 'polygon' | 'circle') => {
    setDrawingType(type);
    setIsDrawing(true);
    
    if (type === 'point') {
      // Point drawing handled by map click
      Alert.alert(
        'Draw Point',
        'Click on the map to select a location for spatial search.',
        [{ text: 'Cancel', onPress: () => setIsDrawing(false) }]
      );
    } else {
      // For polygon and circle, integration with DrawingTools would be needed
      Alert.alert(
        'Drawing Tools',
        'This feature requires integration with the DrawingTools component.',
        [{ text: 'OK', onPress: () => setIsDrawing(false) }]
      );
    }
  }, []);

  // Execute spatial query
  const handleExecuteQuery = useCallback(async () => {
    if (!currentQuery.geometry || !currentQuery.type || !onQueryExecute) return;

    const query: SpatialQuery = {
      id: `query-${Date.now()}`,
      name: currentQuery.name || `${currentQuery.type} query`,
      type: currentQuery.type,
      geometry: currentQuery.geometry,
      targetLayers: currentQuery.targetLayers || [],
      bufferDistance: currentQuery.bufferDistance,
      bufferUnit: currentQuery.bufferUnit,
      maxResults: currentQuery.maxResults,
      includeGeometry: currentQuery.includeGeometry
    };

    setIsQuerying(true);

    try {
      const results = await onQueryExecute(query);
      setQueryResults(results);
      setShowQueryModal(false);
      setShowResultsModal(true);
    } catch (error) {
      console.error('Query execution failed:', error);
      onError?.(error instanceof Error ? error : new Error('Query execution failed'));
    } finally {
      setIsQuerying(false);
    }
  }, [currentQuery, onQueryExecute, onError]);

  // Handle results selection
  const handleResultSelect = useCallback((resultId: string, selected: boolean) => {
    setSelectedResults(prev => {
      if (selected) {
        return [...prev, resultId];
      } else {
        return prev.filter(id => id !== resultId);
      }
    });
  }, []);

  const handleSelectAllResults = useCallback((selectAll: boolean) => {
    if (selectAll) {
      setSelectedResults(queryResults.map(r => r.id));
    } else {
      setSelectedResults([]);
    }
  }, [queryResults]);

  const handleResultsAction = useCallback(() => {
    const selectedResultObjects = queryResults.filter(r => selectedResults.includes(r.id));
    onResultsSelect?.(selectedResultObjects);
    setShowResultsModal(false);
  }, [queryResults, selectedResults, onResultsSelect]);

  // Save current query
  const handleSaveQuery = useCallback(() => {
    if (!currentQuery.geometry || !currentQuery.type) return;

    const query: SpatialQuery = {
      id: `saved-query-${Date.now()}`,
      name: currentQuery.name || `${currentQuery.type} query`,
      type: currentQuery.type,
      geometry: currentQuery.geometry,
      targetLayers: currentQuery.targetLayers || [],
      bufferDistance: currentQuery.bufferDistance,
      bufferUnit: currentQuery.bufferUnit,
      maxResults: currentQuery.maxResults,
      includeGeometry: currentQuery.includeGeometry
    };

    onQuerySave?.(query);
    Alert.alert('Query Saved', 'Your spatial query has been saved.');
  }, [currentQuery, onQuerySave]);

  // Load saved query
  const handleLoadQuery = useCallback((savedQuery: SavedQuery) => {
    setCurrentQuery(savedQuery.query);
    setShowSavedQueriesModal(false);
    setShowQueryModal(true);
    onQueryLoad?.(savedQuery.id);
  }, [onQueryLoad]);

  // Position styles
  const getPositionStyles = () => {
    const baseStyles: any = {
      position: 'absolute',
      zIndex: 1000,
    };
    
    switch (position) {
      case 'top-left':
        return { ...baseStyles, top: 80, left: 10 };
      case 'top-right':
        return { ...baseStyles, top: 80, right: 10 };
      case 'bottom-left':
        return { ...baseStyles, bottom: 10, left: 10 };
      case 'bottom-right':
        return { ...baseStyles, bottom: 10, right: 10 };
      default:
        return { ...baseStyles, top: 80, right: 10 };
    }
  };

  // Render query modal
  const renderQueryModal = () => (
    <Modal
      visible={showQueryModal}
      animationType="slide"
      presentationStyle={isMobile ? 'fullScreen' : 'pageSheet'}
      onRequestClose={() => setShowQueryModal(false)}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Spatial Query</Text>
          <View style={styles.modalHeaderButtons}>
            <TouchableOpacity
              style={styles.modalButton}
              onPress={() => setShowQueryModal(false)}
            >
              <Text style={styles.modalButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalButton, styles.modalExecuteButton]}
              onPress={handleExecuteQuery}
              disabled={isQuerying || !currentQuery.geometry}
            >
              <Text style={styles.modalExecuteButtonText}>
                {isQuerying ? 'Searching...' : 'Execute'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
        
        <ScrollView style={styles.modalContent}>
          {/* Query Name */}
          <Text style={styles.modalLabel}>Query Name</Text>
          <TextInput
            style={styles.modalInput}
            value={currentQuery.name || ''}
            onChangeText={(text) => setCurrentQuery(prev => ({ ...prev, name: text }))}
            placeholder="Enter query name"
          />
          
          {/* Query Type */}
          <Text style={styles.modalLabel}>Query Type</Text>
          <View style={styles.queryTypeContainer}>
            {queryTypes.map(type => (
              <TouchableOpacity
                key={type.value}
                style={[
                  styles.queryTypeButton,
                  currentQuery.type === type.value && styles.queryTypeButtonActive
                ]}
                onPress={() => setCurrentQuery(prev => ({ ...prev, type: type.value as SpatialQueryType }))}
              >
                <Text style={[
                  styles.queryTypeLabel,
                  currentQuery.type === type.value && styles.queryTypeLabelActive
                ]}>
                  {type.label}
                </Text>
                <Text style={styles.queryTypeDescription}>{type.description}</Text>
              </TouchableOpacity>
            ))}
          </View>
          
          {/* Target Layers */}
          <Text style={styles.modalLabel}>Target Layers</Text>
          <View style={styles.layerSelectionContainer}>
            {availableLayers.map(layer => (
              <TouchableOpacity
                key={layer.id}
                style={[
                  styles.layerSelectionItem,
                  currentQuery.targetLayers?.includes(layer.id) && styles.layerSelectionItemActive
                ]}
                onPress={() => {
                  setCurrentQuery(prev => {
                    const targetLayers = prev.targetLayers || [];
                    if (targetLayers.includes(layer.id)) {
                      return { ...prev, targetLayers: targetLayers.filter(id => id !== layer.id) };
                    } else {
                      return { ...prev, targetLayers: [...targetLayers, layer.id] };
                    }
                  });
                }}
              >
                <Text style={[
                  styles.layerSelectionText,
                  currentQuery.targetLayers?.includes(layer.id) && styles.layerSelectionTextActive
                ]}>
                  {layer.name} ({layer.type})
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          
          {/* Buffer Settings */}
          {(enableBuffer && (currentQuery.type === 'buffer' || currentQuery.type === 'within')) && (
            <>
              <Text style={styles.modalLabel}>Buffer Distance</Text>
              <View style={styles.bufferContainer}>
                <TextInput
                  style={[styles.modalInput, styles.bufferInput]}
                  value={currentQuery.bufferDistance?.toString() || ''}
                  onChangeText={(text) => setCurrentQuery(prev => ({ 
                    ...prev, 
                    bufferDistance: parseFloat(text) || 0 
                  }))}
                  placeholder="Distance"
                  keyboardType="numeric"
                />
                <View style={styles.bufferUnitContainer}>
                  {bufferUnits.map(unit => (
                    <TouchableOpacity
                      key={unit.value}
                      style={[
                        styles.bufferUnitButton,
                        currentQuery.bufferUnit === unit.value && styles.bufferUnitButtonActive
                      ]}
                      onPress={() => setCurrentQuery(prev => ({ 
                        ...prev, 
                        bufferUnit: unit.value as any 
                      }))}
                    >
                      <Text style={[
                        styles.bufferUnitText,
                        currentQuery.bufferUnit === unit.value && styles.bufferUnitTextActive
                      ]}>
                        {unit.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </>
          )}
          
          {/* Advanced Options */}
          <Text style={styles.modalLabel}>Options</Text>
          <View style={styles.optionsContainer}>
            <View style={styles.optionRow}>
              <Text style={styles.optionLabel}>Include Geometry</Text>
              <Switch
                value={currentQuery.includeGeometry || false}
                onValueChange={(value) => setCurrentQuery(prev => ({ ...prev, includeGeometry: value }))}
              />
            </View>
            
            <View style={styles.optionRow}>
              <Text style={styles.optionLabel}>Max Results</Text>
              <TextInput
                style={[styles.modalInput, styles.maxResultsInput]}
                value={currentQuery.maxResults?.toString() || ''}
                onChangeText={(text) => setCurrentQuery(prev => ({ 
                  ...prev, 
                  maxResults: parseInt(text) || maxResults 
                }))}
                placeholder="1000"
                keyboardType="numeric"
              />
            </View>
          </View>
          
          {/* Save Query */}
          {enableSavedQueries && (
            <TouchableOpacity
              style={styles.saveQueryButton}
              onPress={handleSaveQuery}
            >
              <Text style={styles.saveQueryButtonText}>Save Query</Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      </View>
    </Modal>
  );

  // Render results modal
  const renderResultsModal = () => (
    <Modal
      visible={showResultsModal}
      animationType="slide"
      presentationStyle={isMobile ? 'fullScreen' : 'pageSheet'}
      onRequestClose={() => setShowResultsModal(false)}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>
            Query Results ({queryResults.length})
          </Text>
          <View style={styles.modalHeaderButtons}>
            <TouchableOpacity
              style={styles.modalButton}
              onPress={() => setShowResultsModal(false)}
            >
              <Text style={styles.modalButtonText}>Close</Text>
            </TouchableOpacity>
            {selectedResults.length > 0 && (
              <TouchableOpacity
                style={[styles.modalButton, styles.modalExecuteButton]}
                onPress={handleResultsAction}
              >
                <Text style={styles.modalExecuteButtonText}>
                  Select ({selectedResults.length})
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
        
        <View style={styles.modalContent}>
          {/* Select All */}
          <View style={styles.selectAllContainer}>
            <TouchableOpacity
              style={styles.selectAllButton}
              onPress={() => handleSelectAllResults(selectedResults.length !== queryResults.length)}
            >
              <Text style={styles.selectAllText}>
                {selectedResults.length === queryResults.length ? 'Deselect All' : 'Select All'}
              </Text>
            </TouchableOpacity>
          </View>
          
          {/* Results List */}
          <ScrollView style={styles.resultsContainer}>
            {queryResults.map(result => (
              <TouchableOpacity
                key={result.id}
                style={[
                  styles.resultItem,
                  selectedResults.includes(result.id) && styles.resultItemSelected
                ]}
                onPress={() => handleResultSelect(result.id, !selectedResults.includes(result.id))}
              >
                <View style={styles.resultInfo}>
                  <Text style={styles.resultLayerName}>
                    Layer: {availableLayers.find(l => l.id === result.layerId)?.name || result.layerId}
                  </Text>
                  <Text style={styles.resultFeatureInfo}>
                    Feature ID: {result.feature.id || 'Unknown'}
                  </Text>
                  {result.distance !== undefined && (
                    <Text style={styles.resultDistance}>
                      Distance: {result.distance.toFixed(2)}m
                    </Text>
                  )}
                  {result.area !== undefined && (
                    <Text style={styles.resultArea}>
                      Intersection Area: {result.area.toFixed(2)}m²
                    </Text>
                  )}
                </View>
                <View style={[
                  styles.resultCheckbox,
                  selectedResults.includes(result.id) && styles.resultCheckboxSelected
                ]}>
                  {selectedResults.includes(result.id) && (
                    <Text style={styles.resultCheckmark}>✓</Text>
                  )}
                </View>
              </TouchableOpacity>
            ))}
            
            {queryResults.length === 0 && (
              <View style={styles.noResultsContainer}>
                <Text style={styles.noResultsText}>No features found</Text>
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );

  // Render saved queries modal
  const renderSavedQueriesModal = () => (
    <Modal
      visible={showSavedQueriesModal}
      animationType="slide"
      presentationStyle={isMobile ? 'fullScreen' : 'pageSheet'}
      onRequestClose={() => setShowSavedQueriesModal(false)}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Saved Queries</Text>
          <TouchableOpacity
            style={styles.modalButton}
            onPress={() => setShowSavedQueriesModal(false)}
          >
            <Text style={styles.modalButtonText}>Close</Text>
          </TouchableOpacity>
        </View>
        
        <ScrollView style={styles.modalContent}>
          {savedQueries.map(savedQuery => (
            <TouchableOpacity
              key={savedQuery.id}
              style={styles.savedQueryItem}
              onPress={() => handleLoadQuery(savedQuery)}
            >
              <Text style={styles.savedQueryName}>{savedQuery.name}</Text>
              <Text style={styles.savedQueryType}>{savedQuery.query.type}</Text>
              <Text style={styles.savedQueryDate}>
                Last used: {savedQuery.lastUsed.toLocaleDateString()}
              </Text>
            </TouchableOpacity>
          ))}
          
          {savedQueries.length === 0 && (
            <View style={styles.noSavedQueriesContainer}>
              <Text style={styles.noSavedQueriesText}>No saved queries</Text>
            </View>
          )}
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
          onPress={() => setIsExpanded(!isExpanded)}
        >
          <Text style={styles.headerText}>🔍 Spatial Search</Text>
          <Text style={styles.headerExpandIcon}>
            {isExpanded ? '▼' : '▶'}
          </Text>
        </TouchableOpacity>
        
        {/* Content */}
        {isExpanded && (
          <View style={styles.content}>
            {/* Drawing Tools */}
            {enableDrawing && (
              <View style={styles.drawingSection}>
                <Text style={styles.sectionTitle}>Draw Search Area</Text>
                <View style={styles.drawingButtons}>
                  <TouchableOpacity
                    style={[
                      styles.drawingButton,
                      isDrawing && drawingType === 'point' && styles.drawingButtonActive
                    ]}
                    onPress={() => handleStartDrawing('point')}
                  >
                    <Text style={styles.drawingButtonText}>📍 Point</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={[
                      styles.drawingButton,
                      isDrawing && drawingType === 'polygon' && styles.drawingButtonActive
                    ]}
                    onPress={() => handleStartDrawing('polygon')}
                  >
                    <Text style={styles.drawingButtonText}>⬟ Polygon</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={[
                      styles.drawingButton,
                      isDrawing && drawingType === 'circle' && styles.drawingButtonActive
                    ]}
                    onPress={() => handleStartDrawing('circle')}
                  >
                    <Text style={styles.drawingButtonText}>⭕ Circle</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
            
            {/* Quick Actions */}
            <View style={styles.actionsSection}>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => setShowQueryModal(true)}
                disabled={!currentQuery.geometry}
              >
                <Text style={styles.actionButtonText}>Configure Query</Text>
              </TouchableOpacity>
              
              {enableSavedQueries && (
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => setShowSavedQueriesModal(true)}
                >
                  <Text style={styles.actionButtonText}>Saved Queries</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}
      </View>
      
      {renderQueryModal()}
      {renderResultsModal()}
      {renderSavedQueriesModal()}
    </>
  );
};

// Styles (continuing due to length)
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
    minWidth: 250,
    maxWidth: 350,
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
  headerExpandIcon: {
    fontSize: 12,
    color: '#666',
  },
  content: {
    padding: 12,
  },
  drawingSection: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  drawingButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  drawingButton: {
    flex: 1,
    minWidth: 70,
    padding: 8,
    borderRadius: 6,
    backgroundColor: '#F8F9FA',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  drawingButtonActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  drawingButtonText: {
    fontSize: 12,
    color: '#333',
    textAlign: 'center',
  },
  actionsSection: {
    gap: 8,
  },
  actionButton: {
    padding: 12,
    borderRadius: 6,
    backgroundColor: '#007AFF',
    alignItems: 'center',
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
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
  modalExecuteButton: {
    backgroundColor: '#007AFF',
    borderRadius: 6,
    paddingHorizontal: 16,
  },
  modalExecuteButtonText: {
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
  queryTypeContainer: {
    gap: 8,
  },
  queryTypeButton: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    backgroundColor: '#F8F9FA',
  },
  queryTypeButtonActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  queryTypeLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  queryTypeLabelActive: {
    color: '#FFFFFF',
  },
  queryTypeDescription: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  layerSelectionContainer: {
    gap: 4,
  },
  layerSelectionItem: {
    padding: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    backgroundColor: '#F8F9FA',
  },
  layerSelectionItemActive: {
    backgroundColor: '#E3F2FD',
    borderColor: '#007AFF',
  },
  layerSelectionText: {
    fontSize: 14,
    color: '#333',
  },
  layerSelectionTextActive: {
    color: '#007AFF',
    fontWeight: '600',
  },
  bufferContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  bufferInput: {
    flex: 1,
  },
  bufferUnitContainer: {
    flexDirection: 'row',
    gap: 4,
  },
  bufferUnitButton: {
    padding: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    backgroundColor: '#F8F9FA',
  },
  bufferUnitButtonActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  bufferUnitText: {
    fontSize: 12,
    color: '#333',
  },
  bufferUnitTextActive: {
    color: '#FFFFFF',
  },
  optionsContainer: {
    gap: 12,
  },
  optionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  optionLabel: {
    fontSize: 14,
    color: '#333',
  },
  maxResultsInput: {
    width: 80,
    textAlign: 'center',
  },
  saveQueryButton: {
    marginTop: 24,
    padding: 12,
    borderRadius: 6,
    backgroundColor: '#34C759',
    alignItems: 'center',
  },
  saveQueryButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  selectAllContainer: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  selectAllButton: {
    alignItems: 'center',
  },
  selectAllText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#007AFF',
  },
  resultsContainer: {
    flex: 1,
  },
  resultItem: {
    flexDirection: 'row',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  resultItemSelected: {
    backgroundColor: '#E3F2FD',
  },
  resultInfo: {
    flex: 1,
  },
  resultLayerName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  resultFeatureInfo: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  resultDistance: {
    fontSize: 12,
    color: '#007AFF',
    marginTop: 2,
  },
  resultArea: {
    fontSize: 12,
    color: '#34C759',
    marginTop: 2,
  },
  resultCheckbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E5E5E5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  resultCheckboxSelected: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  resultCheckmark: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  noResultsContainer: {
    padding: 24,
    alignItems: 'center',
  },
  noResultsText: {
    fontSize: 16,
    color: '#666',
  },
  savedQueryItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  savedQueryName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  savedQueryType: {
    fontSize: 14,
    color: '#007AFF',
    marginTop: 2,
  },
  savedQueryDate: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  noSavedQueriesContainer: {
    padding: 24,
    alignItems: 'center',
  },
  noSavedQueriesText: {
    fontSize: 16,
    color: '#666',
  },
});

export default SpatialSearch;