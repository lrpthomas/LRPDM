import React, { useState, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, Platform, PanResponder } from 'react-native';

interface Position {
  x: number;
  y: number;
}

interface Size {
  width: number;
  height: number;
}

interface SimpleEnhancedWindowProps {
  id: string;
  title: string;
  children: React.ReactNode;
  isLocked?: boolean;
  initialPosition?: Position;
  initialSize?: Size;
  onMove?: (position: Position) => void;
  onResize?: (size: Size) => void;
  onLock?: (isLocked: boolean) => void;
  onClose?: () => void;
  onMinimize?: () => void;
  className?: string;
  zIndex?: number;
}

export const SimpleEnhancedWindow: React.FC<SimpleEnhancedWindowProps> = ({
  id,
  title,
  children,
  isLocked = false,
  initialPosition = { x: 100, y: 100 },
  initialSize = { width: 400, height: 300 },
  onMove,
  onLock,
  onClose,
  onMinimize,
  zIndex = 1,
}) => {
  const [position, setPosition] = useState<Position>(initialPosition);
  const [size] = useState<Size>(initialSize);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => !isLocked,
      onMoveShouldSetPanResponder: () => !isLocked,
      onPanResponderGrant: () => {
        setIsDragging(true);
      },
      onPanResponderMove: (evt, gestureState) => {
        if (!isLocked) {
          const newPosition = {
            x: Math.max(0, initialPosition.x + gestureState.dx),
            y: Math.max(0, initialPosition.y + gestureState.dy),
          };
          setPosition(newPosition);
          onMove?.(newPosition);
        }
      },
      onPanResponderRelease: () => {
        setIsDragging(false);
      },
    })
  ).current;

  const handleLockToggle = () => {
    onLock?.(!isLocked);
  };

  const handleMinimize = () => {
    setIsMinimized(!isMinimized);
    onMinimize?.();
  };

  const handleClose = () => {
    onClose?.();
  };

  return (
    <View
      style={[
        styles.windowContainer,
        {
          left: position.x,
          top: position.y,
          width: size.width,
          height: isMinimized ? 'auto' : size.height,
          zIndex: isDragging ? 1000 : zIndex,
        },
        isDragging && styles.dragging,
      ]}
    >
      {/* Title Bar */}
      <View
        style={[styles.titleBar, isLocked && styles.titleBarLocked]}
        {...(!isLocked ? panResponder.panHandlers : {})}
      >
        <View style={styles.titleContent}>
          <Text style={styles.titleText}>{title}</Text>
          {isDragging && (
            <Text style={styles.dragHint}>Ctrl+Drag to move</Text>
          )}
        </View>
        
        <View style={styles.windowControls}>
          {/* Lock/Unlock Button */}
          <Pressable
            onPress={handleLockToggle}
            style={styles.controlButton}
          >
            <Text style={[styles.controlIcon, isLocked ? styles.lockedIcon : styles.unlockedIcon]}>
              {isLocked ? '🔒' : '🔓'}
            </Text>
          </Pressable>
          
          {/* Minimize Button */}
          <Pressable
            onPress={handleMinimize}
            style={styles.controlButton}
          >
            <Text style={styles.controlIcon}>
              {isMinimized ? '🔼' : '🔽'}
            </Text>
          </Pressable>
          
          {/* Close Button */}
          <Pressable
            onPress={handleClose}
            style={styles.controlButton}
          >
            <Text style={styles.controlIcon}>❌</Text>
          </Pressable>
        </View>
      </View>
      
      {/* Content Area */}
      {!isMinimized && (
        <View style={styles.content}>
          {children}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  windowContainer: {
    position: 'absolute',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#333F42',
    borderRadius: 8,
    ...Platform.select({
      web: {
        boxShadow: '0 4px 12px rgba(51, 63, 66, 0.15)',
      },
    }),
    overflow: 'hidden',
  },
  dragging: {
    ...Platform.select({
      web: {
        boxShadow: '0 0 20px rgba(180, 151, 90, 0.3)',
        transform: 'rotate(0.5deg)',
      },
    }),
  },
  titleBar: {
    backgroundColor: '#333F42',
    borderBottomWidth: 2,
    borderBottomColor: '#B4975A',
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  titleBarLocked: {
    backgroundColor: '#262E31',
    borderBottomColor: '#C8102E',
  },
  titleContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  titleText: {
    color: '#B4975A',
    fontSize: 14,
    fontWeight: '600',
    marginRight: 8,
  },
  dragHint: {
    color: '#D4B575',
    fontSize: 10,
  },
  windowControls: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  controlButton: {
    marginLeft: 8,
    padding: 4,
    borderRadius: 4,
  },
  controlIcon: {
    fontSize: 12,
  },
  lockedIcon: {
    color: '#C8102E',
  },
  unlockedIcon: {
    color: '#B4975A',
  },
  content: {
    flex: 1,
    padding: 16,
  },
});

export default SimpleEnhancedWindow;