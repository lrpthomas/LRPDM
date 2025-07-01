import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Text, Pressable, Platform } from 'react-native';
import { SimpleEnhancedWindow } from '../WindowManager/SimpleEnhancedWindow';
import { SimpleEnhancedDataPanel } from '../DataPanel/SimpleEnhancedDataPanel';
import DrawingMapComponent from '../DrawingMapComponent/DrawingMapComponent';

// Sample data for the enhanced data panel
const sampleDataItems = [
  {
    id: 'nyc-boroughs',
    name: 'NYC Boroughs',
    type: 'Vector' as const,
    status: 'loaded' as const,
    visible: true,
    features: 5,
    size: '2.3 MB',
    metadata: {
      crs: 'EPSG:4326',
      bounds: [-74.2591, 40.4774, -73.7004, 40.9176] as [number, number, number, number],
      lastModified: '2024-01-15T10:30:00Z',
      source: 'NYC OpenData',
      description: 'Administrative boundaries of NYC boroughs',
      tags: ['boundaries', 'administrative', 'nyc']
    }
  },
  {
    id: 'subway-stations',
    name: 'Subway Stations',
    type: 'Vector' as const,
    status: 'loaded' as const,
    visible: true,
    features: 472,
    size: '1.8 MB',
    metadata: {
      crs: 'EPSG:4326',
      lastModified: '2024-01-10T14:20:00Z',
      source: 'MTA',
      description: 'NYC subway station locations',
      tags: ['transit', 'points', 'infrastructure']
    }
  },
  {
    id: 'elevation-raster',
    name: 'Digital Elevation Model',
    type: 'Raster' as const,
    status: 'loading' as const,
    visible: false,
    size: '45.2 MB',
    metadata: {
      crs: 'EPSG:3857',
      lastModified: '2024-01-08T09:15:00Z',
      source: 'USGS',
      description: 'High-resolution elevation data',
      tags: ['elevation', 'terrain', 'usgs']
    }
  },
  {
    id: 'census-data',
    name: 'Census Demographics',
    type: 'External' as const,
    status: 'error' as const,
    visible: false,
    metadata: {
      lastModified: '2024-01-05T16:45:00Z',
      source: 'US Census Bureau',
      description: 'Population and demographic statistics',
      tags: ['demographics', 'census', 'statistics']
    }
  },
  {
    id: 'satellite-imagery',
    name: 'Satellite Imagery',
    type: 'Service' as const,
    status: 'loaded' as const,
    visible: true,
    metadata: {
      lastModified: '2024-01-20T08:00:00Z',
      source: 'Mapbox Satellite',
      description: 'High-resolution satellite imagery',
      tags: ['imagery', 'satellite', 'basemap']
    }
  }
];

interface WindowState {
  id: string;
  isLocked: boolean;
  position: { x: number; y: number };
  size: { width: number; height: number };
}

export const EnhancedGISWorkspace: React.FC = () => {
  const [windows, setWindows] = useState<{ [key: string]: WindowState }>({
    'tools-panel': {
      id: 'tools-panel',
      isLocked: false,
      position: { x: 20, y: 80 },
      size: { width: 300, height: 600 }
    },
    'data-panel': {
      id: 'data-panel',
      isLocked: false,
      position: { x: 400, y: 80 },
      size: { width: 400, height: 500 }
    }
  });
  
  const [selectedDataItems, setSelectedDataItems] = useState<Set<string>>(new Set(['nyc-boroughs']));
  const [dataItems, setDataItems] = useState(sampleDataItems);

  useEffect(() => {
    // Initialize window positions based on screen size
    if (typeof window !== 'undefined') {
      setWindows(prev => ({
        ...prev,
        'data-panel': {
          ...prev['data-panel'],
          position: { x: Math.max(window.innerWidth - 420, 400), y: 80 }
        }
      }));
    }
  }, []);

  const handleWindowMove = (windowId: string, position: { x: number; y: number }) => {
    setWindows(prev => ({
      ...prev,
      [windowId]: {
        ...prev[windowId],
        position
      }
    }));
  };

  const handleWindowLock = (windowId: string, isLocked: boolean) => {
    setWindows(prev => ({
      ...prev,
      [windowId]: {
        ...prev[windowId],
        isLocked
      }
    }));
  };

  const handleDataItemAction = (itemId: string, action: string) => {
    console.log(`Action ${action} on item ${itemId}`);
    
    switch (action) {
      case 'show':
      case 'hide':
        setDataItems(prev => prev.map(item => 
          item.id === itemId ? { ...item, visible: !item.visible } : item
        ));
        break;
      case 'remove':
        if (itemId === 'selected') {
          // Remove all selected items
          setDataItems(prev => prev.filter(item => !selectedDataItems.has(item.id)));
          setSelectedDataItems(new Set());
        } else {
          setDataItems(prev => prev.filter(item => item.id !== itemId));
        }
        break;
      case 'export':
        if (itemId === 'selected') {
          console.log('Exporting selected items:', Array.from(selectedDataItems));
        } else {
          console.log('Exporting item:', itemId);
        }
        break;
      case 'info':
        console.log('Showing info for item:', itemId);
        break;
      case 'duplicate':
        const itemToDuplicate = dataItems.find(item => item.id === itemId);
        if (itemToDuplicate) {
          const duplicatedItem = {
            ...itemToDuplicate,
            id: `${itemId}-copy-${Date.now()}`,
            name: `${itemToDuplicate.name} (Copy)`
          };
          setDataItems(prev => [...prev, duplicatedItem]);
        }
        break;
    }
  };

  const handleFileUpload = (files: File[]) => {
    console.log('Files uploaded:', files);
    
    // Simulate processing uploaded files
    files.forEach((file, index) => {
      const newItem = {
        id: `upload-${Date.now()}-${index}`,
        name: file.name.replace(/\.[^/.]+$/, ''), // Remove extension
        type: file.name.endsWith('.shp') || file.name.endsWith('.geojson') ? 'Vector' as const : 'Raster' as const,
        status: 'processing' as const,
        visible: false,
        size: `${(file.size / 1024 / 1024).toFixed(1)} MB`,
        metadata: {
          lastModified: new Date().toISOString(),
          source: 'User Upload',
          description: `Uploaded file: ${file.name}`,
          tags: ['uploaded', 'user-data']
        }
      };
      
      setDataItems(prev => [...prev, newItem]);
      
      // Simulate processing completion
      setTimeout(() => {
        setDataItems(prev => prev.map(item => 
          item.id === newItem.id ? { ...item, status: 'loaded' as const, visible: true } : item
        ));
      }, 2000 + index * 1000);
    });
  };

  return (
    <View style={styles.workspace}>
      {/* Main Map Area */}
      <View style={styles.mapArea}>
        <DrawingMapComponent
          initialCenter={[-74.006, 40.7128]}
          initialZoom={12}
          enableDrawing={true}
          showCoordinates={true}
          showMeasurements={true}
          showBasemapControl={true}
          showScaleControl={true}
          showUnitToggle={true}
          showGeocodingSearch={true}
          showBookmarkManager={true}
          onFeatureCreate={(feature) => {
            console.log('Feature created:', feature);
          }}
          onModeChange={(mode) => {
            console.log('Drawing mode changed:', mode);
          }}
        />
      </View>

      {/* Enhanced Tools Panel */}
      <SimpleEnhancedWindow
        id="tools-panel"
        title="🛠️ Drawing Tools"
        isLocked={windows['tools-panel']?.isLocked}
        initialPosition={windows['tools-panel']?.position}
        initialSize={windows['tools-panel']?.size}
        onMove={(position) => handleWindowMove('tools-panel', position)}
        onLock={(isLocked) => handleWindowLock('tools-panel', isLocked)}
        zIndex={10}
      >
        <View style={styles.toolsContent}>
          <View style={styles.toolsGrid}>
            <Pressable style={styles.toolButtonPrimary}>
              <Text style={styles.toolButtonText}>📍 Point</Text>
            </Pressable>
            <Pressable style={styles.toolButtonSecondary}>
              <Text style={styles.toolButtonText}>📏 Line</Text>
            </Pressable>
            <Pressable style={styles.toolButtonSecondary}>
              <Text style={styles.toolButtonText}>⬜ Rectangle</Text>
            </Pressable>
            <Pressable style={styles.toolButtonSecondary}>
              <Text style={styles.toolButtonText}>🔵 Circle</Text>
            </Pressable>
            <Pressable style={styles.toolButtonSecondary}>
              <Text style={styles.toolButtonText}>🖊️ Polygon</Text>
            </Pressable>
            <Pressable style={styles.toolButtonDanger}>
              <Text style={styles.toolButtonText}>🗑️ Delete</Text>
            </Pressable>
          </View>
          
          <View style={styles.separator} />
          
          <View style={styles.measurementsSection}>
            <Text style={styles.measurementsTitle}>Measurements</Text>
            <Text style={styles.measurementText}>Distance: 1.2 km</Text>
            <Text style={styles.measurementText}>Area: 0.8 km²</Text>
            <Text style={styles.measurementText}>Coordinates: -74.006, 40.713</Text>
          </View>
        </View>
      </SimpleEnhancedWindow>

      {/* Enhanced Data Panel */}
      <SimpleEnhancedWindow
        id="data-panel"
        title="📊 Spatial Data Manager"
        isLocked={windows['data-panel']?.isLocked}
        initialPosition={windows['data-panel']?.position}
        initialSize={windows['data-panel']?.size}
        onMove={(position) => handleWindowMove('data-panel', position)}
        onLock={(isLocked) => handleWindowLock('data-panel', isLocked)}
        zIndex={10}
      >
        <SimpleEnhancedDataPanel
          items={dataItems}
          selectedItems={selectedDataItems}
          onSelectionChange={setSelectedDataItems}
          onItemAction={handleDataItemAction}
          onUpload={handleFileUpload}
        />
      </SimpleEnhancedWindow>

      {/* Workspace Status Bar */}
      <View style={styles.statusBar}>
        <View style={styles.statusLeft}>
          <Text style={styles.statusText}>
            🗺️ GIS Platform | Zoom: 12 | Center: -74.006, 40.713
          </Text>
        </View>
        <View style={styles.statusRight}>
          <Text style={styles.statusText}>
            {dataItems.length} layers | {Array.from(selectedDataItems).length} selected
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  workspace: {
    position: 'relative',
    width: '100%',
    height: '100%',
    backgroundColor: '#F7F7F7', // VGK surface-primary
    overflow: 'hidden'
  },
  mapArea: {
    position: 'absolute',
    top: 10,
    left: 10,
    right: 10,
    bottom: 40, // Leave space for status bar
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF', // VGK surface-card
    borderWidth: 1,
    borderColor: '#E1E5E9', // VGK border-subtle
    ...Platform.select({
      web: {
        boxShadow: '0 4px 12px rgba(51, 63, 66, 0.15)', // VGK shadow-md
      },
    }),
  },
  statusBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 30,
    backgroundColor: '#333F42', // VGK steel-gray
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderTopWidth: 2,
    borderTopColor: '#B4975A', // VGK gold
  },
  statusLeft: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  statusRight: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  statusText: {
    fontSize: 11,
    color: '#B4975A', // VGK gold
  },
  // Tools Panel Styles
  toolsContent: {
    flex: 1,
  },
  toolsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  toolButtonPrimary: {
    backgroundColor: '#B4975A', // VGK gold
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    marginBottom: 8,
    width: '48%',
    alignItems: 'center',
  },
  toolButtonSecondary: {
    backgroundColor: '#333F42', // VGK steel-gray
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    marginBottom: 8,
    width: '48%',
    alignItems: 'center',
  },
  toolButtonDanger: {
    backgroundColor: '#C8102E', // VGK red
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    marginBottom: 8,
    width: '48%',
    alignItems: 'center',
  },
  toolButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  separator: {
    height: 1,
    backgroundColor: '#E1E5E9',
    marginVertical: 12,
  },
  measurementsSection: {
    marginTop: 8,
  },
  measurementsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333F42',
    marginBottom: 8,
  },
  measurementText: {
    fontSize: 12,
    color: '#4A565A',
    marginBottom: 4,
  },
});

export default EnhancedGISWorkspace;