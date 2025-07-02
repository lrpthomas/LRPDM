import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { useWindowManager } from './WindowManager';

const Taskbar: React.FC = () => {
  const { state, focusWindow, minimizeWindow, createWindow } = useWindowManager();
  const [isExpanded, setIsExpanded] = useState(false);

  const minimizedWindows = Object.values(state.windows).filter(w => w.isMinimized);
  const activeWindows = Object.values(state.windows).filter(w => w.isVisible && !w.isMinimized);

  const handleWindowClick = (windowId: string, isMinimized: boolean) => {
    if (isMinimized) {
      minimizeWindow(windowId); // This will restore it
    }
    focusWindow(windowId);
  };

  const openSettingsWindow = () => {
    const settingsId = 'window-settings';
    if (!state.windows[settingsId]) {
      createWindow({
        id: settingsId,
        title: 'Window Settings',
        component: WindowSettingsPanel,
        size: { width: 400, height: 500 },
        position: { x: 50, y: 50 },
        isResizable: true,
        isMovable: true
      });
    } else {
      focusWindow(settingsId);
    }
  };

  return (
    <View style={styles.taskbar}>
      {/* Window Manager Button */}
      <Pressable 
        style={styles.managerButton}
        onPress={() => setIsExpanded(!isExpanded)}
      >
        <Text style={styles.managerIcon}>⚏</Text>
        <Text style={styles.managerText}>Windows</Text>
      </Pressable>

      {/* Active Windows */}
      <ScrollView 
        horizontal 
        style={styles.windowList}
        showsHorizontalScrollIndicator={false}
      >
        {activeWindows.map((window) => (
          <Pressable
            key={window.id}
            style={[
              styles.windowButton,
              window.id === state.activeWindowId && styles.activeWindowButton
            ]}
            onPress={() => handleWindowClick(window.id, false)}
          >
            <Text style={styles.windowTitle} numberOfLines={1}>
              {window.title}
            </Text>
            {window.isDocked && (
              <Text style={styles.dockIndicator}>📌</Text>
            )}
          </Pressable>
        ))}
      </ScrollView>

      {/* Minimized Windows */}
      {minimizedWindows.length > 0 && (
        <View style={styles.minimizedSection}>
          <Text style={styles.sectionLabel}>Minimized ({minimizedWindows.length})</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {minimizedWindows.map((window) => (
              <Pressable
                key={window.id}
                style={styles.minimizedWindow}
                onPress={() => handleWindowClick(window.id, true)}
              >
                <Text style={styles.minimizedTitle} numberOfLines={1}>
                  {window.title}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Settings Button */}
      <Pressable style={styles.settingsButton} onPress={openSettingsWindow}>
        <Text style={styles.settingsIcon}>⚙️</Text>
      </Pressable>

      {/* Expanded Panel */}
      {isExpanded && (
        <View style={styles.expandedPanel}>
          <Text style={styles.panelTitle}>Window Management</Text>
          
          <View style={styles.stats}>
            <Text style={styles.statText}>Active: {activeWindows.length}</Text>
            <Text style={styles.statText}>Minimized: {minimizedWindows.length}</Text>
            <Text style={styles.statText}>Total: {Object.keys(state.windows).length}</Text>
          </View>

          <View style={styles.quickActions}>
            <Pressable style={styles.actionButton} onPress={() => {
              Object.keys(state.windows).forEach(id => minimizeWindow(id));
            }}>
              <Text style={styles.actionText}>Minimize All</Text>
            </Pressable>
            
            <Pressable style={styles.actionButton} onPress={openSettingsWindow}>
              <Text style={styles.actionText}>Settings</Text>
            </Pressable>
          </View>
        </View>
      )}
    </View>
  );
};

// Window Settings Panel Component
const WindowSettingsPanel: React.FC<{ windowId: string }> = ({ windowId }) => {
  const { state, updateSettings, closeWindow } = useWindowManager();
  const { settings } = state;

  return (
    <View style={styles.settingsPanel}>
      <Text style={styles.settingsTitle}>Window Manager Settings</Text>
      
      <View style={styles.settingGroup}>
        <Text style={styles.groupTitle}>Behavior</Text>
        
        <Pressable 
          style={styles.settingItem}
          onPress={() => updateSettings({ enableSnapping: !settings.enableSnapping })}
        >
          <Text style={styles.settingLabel}>Enable Window Snapping</Text>
          <View style={[styles.toggle, settings.enableSnapping && styles.toggleActive]}>
            <Text style={styles.toggleText}>
              {settings.enableSnapping ? '✓' : '○'}
            </Text>
          </View>
        </Pressable>

        <Pressable 
          style={styles.settingItem}
          onPress={() => updateSettings({ enableDocking: !settings.enableDocking })}
        >
          <Text style={styles.settingLabel}>Enable Window Docking</Text>
          <View style={[styles.toggle, settings.enableDocking && styles.toggleActive]}>
            <Text style={styles.toggleText}>
              {settings.enableDocking ? '✓' : '○'}
            </Text>
          </View>
        </Pressable>

        <Pressable 
          style={styles.settingItem}
          onPress={() => updateSettings({ animationEnabled: !settings.animationEnabled })}
        >
          <Text style={styles.settingLabel}>Enable Animations</Text>
          <View style={[styles.toggle, settings.animationEnabled && styles.toggleActive]}>
            <Text style={styles.toggleText}>
              {settings.animationEnabled ? '✓' : '○'}
            </Text>
          </View>
        </Pressable>

        <Pressable 
          style={styles.settingItem}
          onPress={() => updateSettings({ rememberPositions: !settings.rememberPositions })}
        >
          <Text style={styles.settingLabel}>Remember Window Positions</Text>
          <View style={[styles.toggle, settings.rememberPositions && styles.toggleActive]}>
            <Text style={styles.toggleText}>
              {settings.rememberPositions ? '✓' : '○'}
            </Text>
          </View>
        </Pressable>
      </View>

      <View style={styles.settingGroup}>
        <Text style={styles.groupTitle}>Snap Settings</Text>
        
        <View style={styles.settingItem}>
          <Text style={styles.settingLabel}>Snap Threshold: {settings.snapThreshold}px</Text>
          <View style={styles.sliderContainer}>
            {[10, 15, 20, 25, 30].map(value => (
              <Pressable
                key={value}
                style={[
                  styles.sliderOption,
                  settings.snapThreshold === value && styles.sliderActive
                ]}
                onPress={() => updateSettings({ snapThreshold: value })}
              >
                <Text style={styles.sliderText}>{value}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      </View>

      <View style={styles.settingGroup}>
        <Text style={styles.groupTitle}>Window Statistics</Text>
        <Text style={styles.statDetail}>Total Windows: {Object.keys(state.windows).length}</Text>
        <Text style={styles.statDetail}>Active Windows: {Object.values(state.windows).filter(w => w.isVisible && !w.isMinimized).length}</Text>
        <Text style={styles.statDetail}>Docked Windows: {Object.values(state.windows).filter(w => w.isDocked).length}</Text>
        <Text style={styles.statDetail}>Max Z-Index: {state.maxZIndex}</Text>
      </View>

      <Pressable 
        style={styles.closeSettingsButton} 
        onPress={() => closeWindow(windowId)}
      >
        <Text style={styles.closeSettingsText}>Close Settings</Text>
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  taskbar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 50,
    backgroundColor: '#2c3e50',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    borderTopWidth: 1,
    borderTopColor: '#34495e',
    zIndex: 2000
  },
  managerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#34495e',
    borderRadius: 6,
    marginRight: 8
  },
  managerIcon: {
    fontSize: 16,
    color: '#ecf0f1',
    marginRight: 4
  },
  managerText: {
    fontSize: 12,
    color: '#ecf0f1',
    fontWeight: '600'
  },
  windowList: {
    flex: 1,
    marginRight: 8
  },
  windowButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#34495e',
    borderRadius: 6,
    marginRight: 4,
    minWidth: 120,
    maxWidth: 200,
    flexDirection: 'row',
    alignItems: 'center'
  },
  activeWindowButton: {
    backgroundColor: '#3498db'
  },
  windowTitle: {
    fontSize: 12,
    color: '#ecf0f1',
    flex: 1
  },
  dockIndicator: {
    fontSize: 10,
    marginLeft: 4
  },
  minimizedSection: {
    marginRight: 8
  },
  sectionLabel: {
    fontSize: 10,
    color: '#bdc3c7',
    marginBottom: 4
  },
  minimizedWindow: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#7f8c8d',
    borderRadius: 4,
    marginRight: 4,
    minWidth: 80,
    maxWidth: 120
  },
  minimizedTitle: {
    fontSize: 10,
    color: '#ecf0f1'
  },
  settingsButton: {
    paddingHorizontal: 8,
    paddingVertical: 8,
    backgroundColor: '#34495e',
    borderRadius: 6
  },
  settingsIcon: {
    fontSize: 16
  },
  expandedPanel: {
    position: 'absolute',
    bottom: 55,
    left: 8,
    width: 300,
    backgroundColor: '#34495e',
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: '#2c3e50'
  },
  panelTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ecf0f1',
    marginBottom: 12
  },
  stats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12
  },
  statText: {
    fontSize: 12,
    color: '#bdc3c7'
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  actionButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#3498db',
    borderRadius: 6,
    flex: 1,
    marginHorizontal: 4
  },
  actionText: {
    fontSize: 12,
    color: '#ecf0f1',
    textAlign: 'center',
    fontWeight: '600'
  },
  settingsPanel: {
    flex: 1,
    padding: 16,
    backgroundColor: '#ffffff'
  },
  settingsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 20
  },
  settingGroup: {
    marginBottom: 20
  },
  groupTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#34495e',
    marginBottom: 12
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#ecf0f1'
  },
  settingLabel: {
    fontSize: 14,
    color: '#2c3e50',
    flex: 1
  },
  toggle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#bdc3c7',
    justifyContent: 'center',
    alignItems: 'center'
  },
  toggleActive: {
    backgroundColor: '#27ae60'
  },
  toggleText: {
    fontSize: 12,
    color: '#ffffff',
    fontWeight: '600'
  },
  sliderContainer: {
    flexDirection: 'row'
  },
  sliderOption: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#ecf0f1',
    borderRadius: 4,
    marginLeft: 4
  },
  sliderActive: {
    backgroundColor: '#3498db'
  },
  sliderText: {
    fontSize: 10,
    color: '#2c3e50',
    fontWeight: '600'
  },
  statDetail: {
    fontSize: 12,
    color: '#7f8c8d',
    marginBottom: 4
  },
  closeSettingsButton: {
    backgroundColor: '#e74c3c',
    paddingVertical: 12,
    borderRadius: 6,
    marginTop: 20
  },
  closeSettingsText: {
    color: '#ffffff',
    textAlign: 'center',
    fontWeight: '600'
  }
});

export default Taskbar;