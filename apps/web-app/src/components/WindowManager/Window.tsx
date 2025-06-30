import React, { useRef, useState, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Pressable, 
  Animated
} from 'react-native';
import { WindowState, useWindowManager } from './WindowManager';

interface WindowProps {
  window: WindowState;
}

const Window: React.FC<WindowProps> = ({ window }) => {
  const { 
    focusWindow, 
    moveWindow, 
    resizeWindow, 
    closeWindow, 
    minimizeWindow, 
    maximizeWindow, 
    collapseWindow,
    dockWindow,
    undockWindow,
    state: { settings }
  } = useWindowManager();

  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [resizeStart, setResizeStart] = useState({ width: 0, height: 0 });

  const windowRef = useRef<View>(null);
  const animatedScale = useRef(new Animated.Value(1)).current;
  const animatedOpacity = useRef(new Animated.Value(1)).current;

  const handleFocus = useCallback(() => {
    focusWindow(window.id);
  }, [focusWindow, window.id]);

  const handleClose = useCallback(() => {
    if (settings.animationEnabled) {
      Animated.parallel([
        Animated.timing(animatedScale, {
          toValue: 0.8,
          duration: 200,
          useNativeDriver: true
        }),
        Animated.timing(animatedOpacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true
        })
      ]).start(() => {
        closeWindow(window.id);
      });
    } else {
      closeWindow(window.id);
    }
  }, [closeWindow, window.id, animatedScale, animatedOpacity, settings.animationEnabled]);

  const handleMinimize = useCallback(() => {
    if (settings.animationEnabled) {
      Animated.timing(animatedScale, {
        toValue: window.isMinimized ? 1 : 0.1,
        duration: 300,
        useNativeDriver: true
      }).start();
    }
    minimizeWindow(window.id);
  }, [minimizeWindow, window.id, animatedScale, window.isMinimized, settings.animationEnabled]);

  const handleMaximize = useCallback(() => {
    maximizeWindow(window.id);
  }, [maximizeWindow, window.id]);

  const handleCollapse = useCallback(() => {
    collapseWindow(window.id);
  }, [collapseWindow, window.id]);

  const handleDragStart = useCallback((event: any) => {
    if (!window.isMovable || window.isDocked) return;
    
    handleFocus();
    setIsDragging(true);
    const clientX = event.nativeEvent.pageX || event.nativeEvent.clientX || 0;
    const clientY = event.nativeEvent.pageY || event.nativeEvent.clientY || 0;
    setDragStart({
      x: clientX - window.position.x,
      y: clientY - window.position.y
    });
  }, [window.isMovable, window.isDocked, window.position, handleFocus]);

  const handleDragMove = useCallback((event: any) => {
    if (!isDragging || !window.isMovable) return;

    const clientX = event.nativeEvent.pageX || event.nativeEvent.clientX || 0;
    const clientY = event.nativeEvent.pageY || event.nativeEvent.clientY || 0;
    const newX = clientX - dragStart.x;
    const newY = clientY - dragStart.y;

    moveWindow(window.id, { x: newX, y: newY });
  }, [isDragging, window.isMovable, window.id, dragStart, moveWindow]);

  const handleDragEnd = useCallback((event: any) => {
    if (!isDragging) return;
    
    setIsDragging(false);

    // Check for docking if enabled
    if (settings.enableDocking && !window.isDocked) {
      const clientX = event.nativeEvent.pageX || event.nativeEvent.clientX || 0;
      const clientY = event.nativeEvent.pageY || event.nativeEvent.clientY || 0;
      const dockThreshold = 50;
      const screenWidth = typeof globalThis.window !== 'undefined' ? globalThis.window.innerWidth : 1000;
      const screenHeight = typeof globalThis.window !== 'undefined' ? globalThis.window.innerHeight : 800;

      if (clientX < dockThreshold) {
        dockWindow(window.id, 'left');
      } else if (clientX > screenWidth - dockThreshold) {
        dockWindow(window.id, 'right');
      } else if (clientY < dockThreshold) {
        dockWindow(window.id, 'top');
      } else if (clientY > screenHeight - dockThreshold) {
        dockWindow(window.id, 'bottom');
      }
    }
  }, [isDragging, settings.enableDocking, window.isDocked, window.id, dockWindow]);

  const handleResizeStart = useCallback((event: any) => {
    if (!window.isResizable || window.isDocked || window.isMaximized) return;
    
    setIsResizing(true);
    const clientX = event.nativeEvent.pageX || event.nativeEvent.clientX || 0;
    const clientY = event.nativeEvent.pageY || event.nativeEvent.clientY || 0;
    setResizeStart({
      width: window.size.width,
      height: window.size.height
    });
    setDragStart({ x: clientX, y: clientY });
  }, [window.isResizable, window.isDocked, window.isMaximized, window.size]);

  const handleResizeMove = useCallback((event: any) => {
    if (!isResizing || !window.isResizable) return;

    const clientX = event.nativeEvent.pageX || event.nativeEvent.clientX || 0;
    const clientY = event.nativeEvent.pageY || event.nativeEvent.clientY || 0;
    const deltaX = clientX - dragStart.x;
    const deltaY = clientY - dragStart.y;

    const newWidth = Math.max(window.minSize.width, resizeStart.width + deltaX);
    const newHeight = Math.max(window.minSize.height, resizeStart.height + deltaY);

    resizeWindow(window.id, { width: newWidth, height: newHeight });
  }, [isResizing, window.isResizable, window.id, window.minSize, resizeStart, resizeWindow, dragStart]);

  const handleResizeEnd = useCallback(() => {
    setIsResizing(false);
  }, []);

  const handleDoublePress = useCallback(() => {
    if (window.isDocked) {
      undockWindow(window.id);
    } else {
      handleMaximize();
    }
  }, [window.isDocked, window.id, undockWindow, handleMaximize]);

  if (!window.isVisible) return null;

  const windowStyle = [
    styles.window,
    {
      left: window.position.x,
      top: window.position.y,
      width: window.size.width,
      height: window.isCollapsed ? 40 : window.size.height,
      zIndex: window.zIndex,
      opacity: window.isMinimized ? 0.3 : 1,
      transform: [
        { scale: animatedScale },
      ]
    },
    window.isDocked && styles.dockedWindow,
    window.isMaximized && styles.maximizedWindow,
    isDragging && styles.draggingWindow,
    isResizing && styles.resizingWindow
  ];

  const Component = window.component;

  // Simple fallback component
  const SafeComponent = Component || (() => (
    <View style={{ flex: 1, padding: 20, justifyContent: 'center', alignItems: 'center' }}>
      <Text style={{ fontSize: 16, marginBottom: 10 }}>Window Content</Text>
      <Text style={{ fontSize: 12, color: '#666' }}>ID: {window.id}</Text>
      <Text style={{ fontSize: 12, color: '#666' }}>Component: {typeof Component}</Text>
    </View>
  ));

  return (
    <Animated.View 
      ref={windowRef}
      style={[windowStyle, { opacity: animatedOpacity }]}
      onStartShouldSetResponder={() => true}
      onResponderGrant={handleFocus}
    >
      {/* Window Header */}
      <View style={styles.header}>
        <Pressable 
          style={styles.titleArea}
          onPress={handleDoublePress}
          onPressIn={handleDragStart}
          onTouchMove={handleDragMove}
          onPressOut={handleDragEnd}
        >
          <Text style={styles.title} numberOfLines={1}>
            {window.title}
          </Text>
          <Text style={styles.dragHint}>📱 Drag to move</Text>
        </Pressable>

        <View style={styles.controls}>
          {/* Collapse Button */}
          <Pressable style={styles.controlButton} onPress={handleCollapse}>
            <Text style={styles.controlText}>
              {window.isCollapsed ? '▼' : '▲'}
            </Text>
          </Pressable>

          {/* Minimize Button */}
          <Pressable style={styles.controlButton} onPress={handleMinimize}>
            <Text style={styles.controlText}>−</Text>
          </Pressable>

          {/* Maximize Button */}
          <Pressable style={styles.controlButton} onPress={handleMaximize}>
            <Text style={styles.controlText}>
              {window.isMaximized ? '⧉' : '□'}
            </Text>
          </Pressable>

          {/* Close Button */}
          <Pressable style={[styles.controlButton, styles.closeButton]} onPress={handleClose}>
            <Text style={[styles.controlText, styles.closeText]}>×</Text>
          </Pressable>
        </View>
      </View>

      {/* Window Content */}
      {!window.isCollapsed && (
        <View style={styles.content}>
          <SafeComponent {...window.props} windowId={window.id} />
        </View>
      )}

      {/* Resize Handle */}
      {window.isResizable && !window.isDocked && !window.isMaximized && !window.isCollapsed && (
        <Pressable 
          style={styles.resizeHandle}
          onPressIn={handleResizeStart}
          onTouchMove={handleResizeMove}
          onPressOut={handleResizeEnd}
        >
          <Text style={styles.resizeIcon}>↗️</Text>
          <Text style={styles.resizeHint}>Resize</Text>
        </Pressable>
      )}

      {/* Docking Indicators */}
      {isDragging && settings.enableDocking && !window.isDocked && (
        <>
          <View style={[styles.dockIndicator, styles.dockLeft]} />
          <View style={[styles.dockIndicator, styles.dockRight]} />
          <View style={[styles.dockIndicator, styles.dockTop]} />
          <View style={[styles.dockIndicator, styles.dockBottom]} />
        </>
      )}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  window: {
    position: 'absolute',
    backgroundColor: '#ffffff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e1e5e9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    overflow: 'hidden'
  },
  dockedWindow: {
    borderRadius: 0,
    shadowOpacity: 0.05
  },
  maximizedWindow: {
    borderRadius: 0,
    shadowOpacity: 0
  },
  draggingWindow: {
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 12
  },
  resizingWindow: {
    borderColor: '#007bff',
    borderWidth: 2
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 40,
    backgroundColor: '#f8f9fa',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
    paddingHorizontal: 12
  },
  titleArea: {
    flex: 1,
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: '#495057'
  },
  dragHint: {
    fontSize: 9,
    color: '#6c757d',
    marginTop: 2
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  controlButton: {
    width: 32,
    height: 32,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 6,
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#e9ecef'
  },
  closeButton: {
    backgroundColor: '#dc3545'
  },
  controlText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6c757d'
  },
  closeText: {
    color: '#ffffff'
  },
  content: {
    flex: 1,
    overflow: 'hidden'
  },
  resizeHandle: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#007bff',
    borderTopLeftRadius: 8,
    borderLeftWidth: 2,
    borderTopWidth: 2,
    borderColor: '#0056b3'
  },
  resizeIcon: {
    fontSize: 14,
    color: '#ffffff'
  },
  resizeHint: {
    fontSize: 8,
    color: '#ffffff',
    marginTop: 2
  },
  dockIndicator: {
    position: 'absolute',
    backgroundColor: '#007bff',
    opacity: 0.3,
    borderRadius: 4
  },
  dockLeft: {
    left: -100,
    top: 0,
    width: 100,
    height: '100%'
  },
  dockRight: {
    right: -100,
    top: 0,
    width: 100,
    height: '100%'
  },
  dockTop: {
    top: -50,
    left: 0,
    width: '100%',
    height: 50
  },
  dockBottom: {
    bottom: -50,
    left: 0,
    width: '100%',
    height: 50
  }
});

export default Window;