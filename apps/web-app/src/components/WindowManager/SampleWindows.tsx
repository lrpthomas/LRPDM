import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, TextInput } from 'react-native';
import { useWindowManager } from './WindowManager';

// Sample Map Window
export const MapWindow: React.FC<{ windowId: string }> = ({ windowId }) => {
  const [zoomLevel, setZoomLevel] = useState(10);
  
  return (
    <View style={styles.mapContainer}>
      <View style={styles.mapHeader}>
        <Text style={styles.mapTitle}>Interactive Map</Text>
        <View style={styles.mapControls}>
          <Pressable 
            style={styles.mapButton}
            onPress={() => setZoomLevel(Math.max(1, zoomLevel - 1))}
          >
            <Text style={styles.buttonText}>-</Text>
          </Pressable>
          <Text style={styles.zoomText}>Zoom: {zoomLevel}</Text>
          <Pressable 
            style={styles.mapButton}
            onPress={() => setZoomLevel(Math.min(20, zoomLevel + 1))}
          >
            <Text style={styles.buttonText}>+</Text>
          </Pressable>
        </View>
      </View>
      
      <View style={styles.mapViewport}>
        <View style={[styles.mapLayer, { transform: [{ scale: zoomLevel / 10 }] }]}>
          <Text style={styles.mapPlaceholder}>🗺️ Map Content Here</Text>
          <Text style={styles.coordinates}>Lat: 40.7128, Lng: -74.0060</Text>
        </View>
      </View>
      
      <View style={styles.mapFooter}>
        <Text style={styles.footerText}>Scale: 1:{Math.round(1000000 / zoomLevel)}</Text>
      </View>
    </View>
  );
};

// Sample Tools Window
export const ToolsWindow: React.FC<{ windowId: string }> = ({ windowId }) => {
  const { createWindow } = useWindowManager();
  const [selectedTool, setSelectedTool] = useState('select');

  const tools = [
    { id: 'select', name: 'Select', icon: '👆' },
    { id: 'draw', name: 'Draw', icon: '✏️' },
    { id: 'measure', name: 'Measure', icon: '📏' },
    { id: 'edit', name: 'Edit', icon: '✂️' },
    { id: 'delete', name: 'Delete', icon: '🗑️' }
  ];

  const openPropertiesWindow = () => {
    createWindow({
      id: 'properties-' + Date.now(),
      title: 'Properties Panel',
      component: PropertiesWindow,
      size: { width: 300, height: 400 },
      position: { x: 400, y: 100 }
    });
  };

  return (
    <View style={styles.toolsContainer}>
      <Text style={styles.toolsTitle}>Drawing Tools</Text>
      
      <View style={styles.toolGrid}>
        {tools.map(tool => (
          <Pressable
            key={tool.id}
            style={[
              styles.toolButton,
              selectedTool === tool.id && styles.selectedTool
            ]}
            onPress={() => setSelectedTool(tool.id)}
          >
            <Text style={styles.toolIcon}>{tool.icon}</Text>
            <Text style={styles.toolName}>{tool.name}</Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.toolActions}>
        <Pressable style={styles.actionButton} onPress={openPropertiesWindow}>
          <Text style={styles.actionText}>Open Properties</Text>
        </Pressable>
        
        <Pressable style={styles.actionButton}>
          <Text style={styles.actionText}>Clear All</Text>
        </Pressable>
      </View>
      
      <View style={styles.toolStatus}>
        <Text style={styles.statusText}>Active: {selectedTool}</Text>
        <Text style={styles.statusText}>Features: 12</Text>
      </View>
    </View>
  );
};

// Sample Properties Window
export const PropertiesWindow: React.FC<{ windowId: string }> = ({ windowId }) => {
  const [selectedFeature, setSelectedFeature] = useState('polygon-1');
  const [properties, setProperties] = useState({
    name: 'Building A',
    type: 'Commercial',
    area: '2,500 sqft',
    height: '45 ft'
  });

  return (
    <View style={styles.propertiesContainer}>
      <Text style={styles.propertiesTitle}>Feature Properties</Text>
      
      <View style={styles.featureSelector}>
        <Text style={styles.selectorLabel}>Selected Feature:</Text>
        <Pressable style={styles.featureButton}>
          <Text style={styles.featureText}>{selectedFeature}</Text>
        </Pressable>
      </View>

      <ScrollView style={styles.propertiesList}>
        {Object.entries(properties).map(([key, value]) => (
          <View key={key} style={styles.propertyItem}>
            <Text style={styles.propertyLabel}>{key.charAt(0).toUpperCase() + key.slice(1)}:</Text>
            <TextInput
              style={styles.propertyInput}
              value={value}
              onChangeText={(text) => setProperties(prev => ({ ...prev, [key]: text }))}
            />
          </View>
        ))}
      </ScrollView>

      <View style={styles.propertyActions}>
        <Pressable style={styles.saveButton}>
          <Text style={styles.saveText}>Save Changes</Text>
        </Pressable>
        <Pressable style={styles.revertButton}>
          <Text style={styles.revertText}>Revert</Text>
        </Pressable>
      </View>
    </View>
  );
};

// Sample Layers Window
export const LayersWindow: React.FC<{ windowId: string }> = ({ windowId }) => {
  const [layers, setLayers] = useState([
    { id: 'base', name: 'Base Map', visible: true, opacity: 1 },
    { id: 'buildings', name: 'Buildings', visible: true, opacity: 0.8 },
    { id: 'roads', name: 'Roads', visible: true, opacity: 0.9 },
    { id: 'parks', name: 'Parks', visible: false, opacity: 0.7 }
  ]);

  const toggleLayer = (id: string) => {
    setLayers(prev => prev.map(layer => 
      layer.id === id ? { ...layer, visible: !layer.visible } : layer
    ));
  };

  return (
    <View style={styles.layersContainer}>
      <Text style={styles.layersTitle}>Map Layers</Text>
      
      <ScrollView style={styles.layersList}>
        {layers.map(layer => (
          <View key={layer.id} style={styles.layerItem}>
            <Pressable 
              style={styles.layerToggle}
              onPress={() => toggleLayer(layer.id)}
            >
              <Text style={styles.toggleIcon}>
                {layer.visible ? '👁️' : '👁️‍🗨️'}
              </Text>
            </Pressable>
            
            <Text style={[
              styles.layerName,
              !layer.visible && styles.layerNameHidden
            ]}>
              {layer.name}
            </Text>
            
            <Text style={styles.layerOpacity}>
              {Math.round(layer.opacity * 100)}%
            </Text>
          </View>
        ))}
      </ScrollView>

      <View style={styles.layerActions}>
        <Pressable style={styles.layerButton}>
          <Text style={styles.layerButtonText}>+ Add Layer</Text>
        </Pressable>
        <Pressable style={styles.layerButton}>
          <Text style={styles.layerButtonText}>Import</Text>
        </Pressable>
      </View>
    </View>
  );
};

// Sample Data Window
export const DataWindow: React.FC<{ windowId: string }> = ({ windowId }) => {
  const [selectedTab, setSelectedTab] = useState('features');
  
  const sampleData = [
    { id: 1, name: 'Building A', type: 'Commercial', area: 2500 },
    { id: 2, name: 'Building B', type: 'Residential', area: 1800 },
    { id: 3, name: 'Park C', type: 'Recreation', area: 5000 },
    { id: 4, name: 'Road D', type: 'Infrastructure', area: 1200 }
  ];

  return (
    <View style={styles.dataContainer}>
      <View style={styles.dataTabs}>
        {['features', 'attributes', 'statistics'].map(tab => (
          <Pressable
            key={tab}
            style={[
              styles.dataTab,
              selectedTab === tab && styles.activeTab
            ]}
            onPress={() => setSelectedTab(tab)}
          >
            <Text style={[
              styles.tabText,
              selectedTab === tab && styles.activeTabText
            ]}>
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.dataContent}>
        {selectedTab === 'features' && (
          <ScrollView>
            {sampleData.map(item => (
              <View key={item.id} style={styles.dataRow}>
                <Text style={styles.dataCell}>{item.name}</Text>
                <Text style={styles.dataCell}>{item.type}</Text>
                <Text style={styles.dataCell}>{item.area} sqft</Text>
              </View>
            ))}
          </ScrollView>
        )}
        
        {selectedTab === 'attributes' && (
          <View style={styles.attributesView}>
            <Text style={styles.attributeTitle}>Available Attributes</Text>
            <Text style={styles.attributeItem}>• Name (Text)</Text>
            <Text style={styles.attributeItem}>• Type (Category)</Text>
            <Text style={styles.attributeItem}>• Area (Number)</Text>
            <Text style={styles.attributeItem}>• Created Date (Date)</Text>
          </View>
        )}
        
        {selectedTab === 'statistics' && (
          <View style={styles.statsView}>
            <Text style={styles.statItem}>Total Features: {sampleData.length}</Text>
            <Text style={styles.statItem}>Commercial: 1</Text>
            <Text style={styles.statItem}>Residential: 1</Text>
            <Text style={styles.statItem}>Recreation: 1</Text>
            <Text style={styles.statItem}>Infrastructure: 1</Text>
            <Text style={styles.statItem}>Total Area: {sampleData.reduce((sum, item) => sum + item.area, 0)} sqft</Text>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  // Map Window Styles
  mapContainer: {
    flex: 1,
    backgroundColor: '#f8f9fa'
  },
  mapHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#e9ecef',
    borderBottomWidth: 1,
    borderBottomColor: '#dee2e6'
  },
  mapTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#495057'
  },
  mapControls: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  mapButton: {
    width: 30,
    height: 30,
    backgroundColor: '#007bff',
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 4
  },
  buttonText: {
    color: '#ffffff',
    fontWeight: '600'
  },
  zoomText: {
    fontSize: 12,
    color: '#6c757d',
    marginHorizontal: 8
  },
  mapViewport: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    overflow: 'hidden'
  },
  mapLayer: {
    justifyContent: 'center',
    alignItems: 'center'
  },
  mapPlaceholder: {
    fontSize: 24,
    marginBottom: 8
  },
  coordinates: {
    fontSize: 12,
    color: '#6c757d'
  },
  mapFooter: {
    padding: 8,
    backgroundColor: '#e9ecef',
    borderTopWidth: 1,
    borderTopColor: '#dee2e6'
  },
  footerText: {
    fontSize: 10,
    color: '#6c757d',
    textAlign: 'center'
  },

  // Tools Window Styles
  toolsContainer: {
    flex: 1,
    padding: 12,
    backgroundColor: '#ffffff'
  },
  toolsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 12
  },
  toolGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16
  },
  toolButton: {
    width: '48%',
    aspectRatio: 1,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    margin: '1%',
    borderWidth: 2,
    borderColor: 'transparent'
  },
  selectedTool: {
    backgroundColor: '#e3f2fd',
    borderColor: '#2196f3'
  },
  toolIcon: {
    fontSize: 24,
    marginBottom: 4
  },
  toolName: {
    fontSize: 12,
    color: '#495057',
    fontWeight: '500'
  },
  toolActions: {
    marginBottom: 16
  },
  actionButton: {
    backgroundColor: '#007bff',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 4,
    marginBottom: 8
  },
  actionText: {
    color: '#ffffff',
    textAlign: 'center',
    fontWeight: '600'
  },
  toolStatus: {
    backgroundColor: '#f8f9fa',
    padding: 8,
    borderRadius: 4
  },
  statusText: {
    fontSize: 12,
    color: '#6c757d',
    marginBottom: 2
  },

  // Properties Window Styles
  propertiesContainer: {
    flex: 1,
    backgroundColor: '#ffffff'
  },
  propertiesTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef'
  },
  featureSelector: {
    padding: 12,
    backgroundColor: '#f8f9fa'
  },
  selectorLabel: {
    fontSize: 12,
    color: '#6c757d',
    marginBottom: 4
  },
  featureButton: {
    backgroundColor: '#e9ecef',
    padding: 8,
    borderRadius: 4
  },
  featureText: {
    fontSize: 14,
    color: '#495057'
  },
  propertiesList: {
    flex: 1,
    padding: 12
  },
  propertyItem: {
    marginBottom: 12
  },
  propertyLabel: {
    fontSize: 12,
    color: '#6c757d',
    marginBottom: 4
  },
  propertyInput: {
    borderWidth: 1,
    borderColor: '#ced4da',
    borderRadius: 4,
    padding: 8,
    fontSize: 14,
    color: '#495057'
  },
  propertyActions: {
    flexDirection: 'row',
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: '#e9ecef'
  },
  saveButton: {
    flex: 1,
    backgroundColor: '#28a745',
    paddingVertical: 8,
    borderRadius: 4,
    marginRight: 4
  },
  saveText: {
    color: '#ffffff',
    textAlign: 'center',
    fontWeight: '600'
  },
  revertButton: {
    flex: 1,
    backgroundColor: '#6c757d',
    paddingVertical: 8,
    borderRadius: 4,
    marginLeft: 4
  },
  revertText: {
    color: '#ffffff',
    textAlign: 'center',
    fontWeight: '600'
  },

  // Layers Window Styles
  layersContainer: {
    flex: 1,
    backgroundColor: '#ffffff'
  },
  layersTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef'
  },
  layersList: {
    flex: 1
  },
  layerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f8f9fa'
  },
  layerToggle: {
    marginRight: 12
  },
  toggleIcon: {
    fontSize: 16
  },
  layerName: {
    flex: 1,
    fontSize: 14,
    color: '#495057'
  },
  layerNameHidden: {
    color: '#adb5bd'
  },
  layerOpacity: {
    fontSize: 12,
    color: '#6c757d',
    minWidth: 40,
    textAlign: 'right'
  },
  layerActions: {
    flexDirection: 'row',
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: '#e9ecef'
  },
  layerButton: {
    flex: 1,
    backgroundColor: '#007bff',
    paddingVertical: 8,
    borderRadius: 4,
    marginHorizontal: 4
  },
  layerButtonText: {
    color: '#ffffff',
    textAlign: 'center',
    fontWeight: '600'
  },

  // Data Window Styles
  dataContainer: {
    flex: 1,
    backgroundColor: '#ffffff'
  },
  dataTabs: {
    flexDirection: 'row',
    backgroundColor: '#f8f9fa',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef'
  },
  dataTab: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    backgroundColor: 'transparent'
  },
  activeTab: {
    backgroundColor: '#ffffff',
    borderBottomWidth: 2,
    borderBottomColor: '#007bff'
  },
  tabText: {
    fontSize: 12,
    color: '#6c757d',
    textAlign: 'center',
    fontWeight: '500'
  },
  activeTabText: {
    color: '#007bff',
    fontWeight: '600'
  },
  dataContent: {
    flex: 1,
    padding: 12
  },
  dataRow: {
    flexDirection: 'row',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f8f9fa'
  },
  dataCell: {
    flex: 1,
    fontSize: 12,
    color: '#495057'
  },
  attributesView: {
    flex: 1
  },
  attributeTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 8
  },
  attributeItem: {
    fontSize: 12,
    color: '#6c757d',
    marginBottom: 4
  },
  statsView: {
    flex: 1
  },
  statItem: {
    fontSize: 12,
    color: '#495057',
    marginBottom: 8,
    paddingVertical: 4,
    paddingHorizontal: 8,
    backgroundColor: '#f8f9fa',
    borderRadius: 4
  }
});

