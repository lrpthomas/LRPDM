import React, { useEffect } from 'react';
import { View, StyleSheet, Pressable, Text } from 'react-native';
import WindowManagerProvider, { useWindowManager } from '../WindowManager/WindowManager';
import WindowContainer from '../WindowManager/WindowContainer';
import Taskbar from '../WindowManager/Taskbar';
import DrawingMapComponent from '../DrawingMapComponent/DrawingMapComponent';
import { 
  MapWindow, 
  ToolsWindow, 
  PropertiesWindow, 
  LayersWindow, 
  DataWindow 
} from '../WindowManager/SampleWindows';

// Debug imports
console.log('Component imports:', {
  MapWindow,
  ToolsWindow,
  PropertiesWindow,
  LayersWindow,
  DataWindow
});

// Fallback component in case imports fail
const FallbackWindow: React.FC<{ windowId: string }> = ({ windowId }) => (
  <View style={{ flex: 1, padding: 20, justifyContent: 'center', alignItems: 'center' }}>
    <Text style={{ fontSize: 16, marginBottom: 10 }}>Fallback Window</Text>
    <Text style={{ fontSize: 12, color: '#666' }}>Window ID: {windowId}</Text>
  </View>
);

// Main workspace component that includes the map and window management
const GISWorkspaceContent: React.FC = () => {
  const { createWindow, state } = useWindowManager();

  // Initialize default windows - only once
  useEffect(() => {
    // Only create windows if none exist to prevent infinite creation
    if (Object.keys(state.windows).length === 0) {
      setTimeout(() => {
        createWindow({
          id: 'tools-panel',
          title: 'Drawing Tools',
          component: ToolsWindow || FallbackWindow,
          size: { width: 250, height: 400 },
          position: { x: 20, y: 80 },
          isResizable: true,
          isMovable: true
        });
      }, 100);
    }
  }, [createWindow]);

  const openSimpleWindow = () => {
    const simpleId = 'simple-' + Date.now();
    createWindow({
      id: simpleId,
      title: 'Simple Window',
      component: FallbackWindow,
      size: { width: 400, height: 300 },
      position: { x: 200, y: 100 },
      isResizable: true,
      isMovable: true
    });
  };

  const openDataWindow = () => {
    const dataWindowId = 'data-window-' + Date.now();
    createWindow({
      id: dataWindowId,
      title: 'Feature Data',
      component: DataWindow || FallbackWindow,
      size: { width: 500, height: 400 },
      position: { x: 350, y: 150 },
      isResizable: true,
      isMovable: true
    });
  };

  const openPropertiesWindow = () => {
    const propsWindowId = 'properties-window-' + Date.now();
    createWindow({
      id: propsWindowId,
      title: 'Feature Properties',
      component: PropertiesWindow || FallbackWindow,
      size: { width: 320, height: 450 },
      position: { x: 400, y: 120 },
      isResizable: true,
      isMovable: true
    });
  };

  const dockToolsLeft = () => {
    if (state.windows['tools-panel']) {
      // Note: Dock functionality would be implemented here
      console.log('Docking tools panel to left');
    }
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

      {/* Quick Access Toolbar */}
      <View style={styles.quickToolbar}>
        <Text style={styles.toolbarTitle}>Quick Access</Text>
        
        <Pressable style={styles.quickButton} onPress={openSimpleWindow}>
          <Text style={styles.quickButtonText}>➕ Simple Window</Text>
        </Pressable>
        
        <Pressable style={styles.quickButton} onPress={openDataWindow}>
          <Text style={styles.quickButtonText}>📊 Data View</Text>
        </Pressable>
        
        <Pressable style={styles.quickButton} onPress={openPropertiesWindow}>
          <Text style={styles.quickButtonText}>📝 Properties</Text>
        </Pressable>

        <View style={styles.toolbarSeparator} />

        <Pressable style={styles.quickButton} onPress={dockToolsLeft}>
          <Text style={styles.quickButtonText}>📌 Dock Tools</Text>
        </Pressable>
      </View>

      {/* Window Container - renders all floating windows */}
      <WindowContainer />

      {/* Taskbar at bottom */}
      <Taskbar />

      {/* Workspace Info */}
      <View style={styles.workspaceInfo}>
        <Text style={styles.infoText}>
          Windows: {Object.keys(state.windows).length} | 
          Active: {Object.values(state.windows).filter(w => w.isVisible && !w.isMinimized).length}
        </Text>
      </View>
    </View>
  );
};

// Main component with provider
const GISWorkspace: React.FC = () => {
  return (
    <WindowManagerProvider>
      <GISWorkspaceContent />
    </WindowManagerProvider>
  );
};

const styles = StyleSheet.create({
  workspace: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    position: 'relative'
  },
  mapArea: {
    flex: 1,
    margin: 10,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e1e5e9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4
  },
  quickToolbar: {
    position: 'absolute',
    top: 20,
    right: 20,
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e1e5e9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 6,
    minWidth: 160,
    zIndex: 500
  },
  toolbarTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#495057',
    marginBottom: 8,
    textAlign: 'center'
  },
  quickButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 6,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: '#e9ecef'
  },
  quickButtonText: {
    fontSize: 11,
    color: '#495057',
    fontWeight: '500',
    textAlign: 'center'
  },
  toolbarSeparator: {
    height: 1,
    backgroundColor: '#e9ecef',
    marginVertical: 8
  },
  workspaceInfo: {
    position: 'absolute',
    top: 20,
    left: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#e1e5e9',
    zIndex: 500
  },
  infoText: {
    fontSize: 10,
    color: '#6c757d',
    fontWeight: '500'
  }
});

export default GISWorkspace;