import React, { createContext, useContext, useReducer, useCallback, useRef, useEffect } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';

// Window state types
export interface WindowState {
  id: string;
  title: string;
  component: React.ComponentType<any>;
  props?: any;
  position: { x: number; y: number };
  size: { width: number; height: number };
  isMinimized: boolean;
  isMaximized: boolean;
  isCollapsed: boolean;
  isDocked: boolean;
  dockSide?: 'left' | 'right' | 'top' | 'bottom';
  zIndex: number;
  isResizable: boolean;
  isMovable: boolean;
  minSize: { width: number; height: number };
  maxSize: { width: number; height: number };
  isVisible: boolean;
  snapEnabled: boolean;
}

export interface WindowManagerState {
  windows: Record<string, WindowState>;
  activeWindowId: string | null;
  maxZIndex: number;
  snapThreshold: number;
  dockAreas: {
    left: { width: number; occupied: boolean };
    right: { width: number; occupied: boolean };
    top: { height: number; occupied: boolean };
    bottom: { height: number; occupied: boolean };
  };
  settings: {
    enableSnapping: boolean;
    enableDocking: boolean;
    snapThreshold: number;
    animationEnabled: boolean;
    rememberPositions: boolean;
  };
}

// Action types
type WindowAction =
  | { type: 'CREATE_WINDOW'; payload: Partial<WindowState> & { id: string; title: string; component: React.ComponentType<any> } }
  | { type: 'CLOSE_WINDOW'; payload: { id: string } }
  | { type: 'FOCUS_WINDOW'; payload: { id: string } }
  | { type: 'MOVE_WINDOW'; payload: { id: string; position: { x: number; y: number } } }
  | { type: 'RESIZE_WINDOW'; payload: { id: string; size: { width: number; height: number } } }
  | { type: 'MINIMIZE_WINDOW'; payload: { id: string } }
  | { type: 'MAXIMIZE_WINDOW'; payload: { id: string } }
  | { type: 'COLLAPSE_WINDOW'; payload: { id: string } }
  | { type: 'DOCK_WINDOW'; payload: { id: string; side: 'left' | 'right' | 'top' | 'bottom' } }
  | { type: 'UNDOCK_WINDOW'; payload: { id: string } }
  | { type: 'UPDATE_SETTINGS'; payload: Partial<WindowManagerState['settings']> }
  | { type: 'RESTORE_WINDOWS'; payload: { windows: Record<string, WindowState> } };

// Get screen dimensions
const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

// Default window state
const createDefaultWindow = (overrides: Partial<WindowState> & { id: string; title: string; component: React.ComponentType<any> }): WindowState => ({
  id: overrides.id,
  title: overrides.title,
  component: overrides.component,
  props: overrides.props || {},
  position: overrides.position || { x: 100, y: 100 },
  size: overrides.size || { width: 400, height: 300 },
  isMinimized: false,
  isMaximized: false,
  isCollapsed: false,
  isDocked: false,
  dockSide: undefined,
  zIndex: 0,
  isResizable: overrides.isResizable !== false,
  isMovable: overrides.isMovable !== false,
  minSize: overrides.minSize || { width: 200, height: 150 },
  maxSize: overrides.maxSize || { width: screenWidth - 100, height: screenHeight - 100 },
  isVisible: overrides.isVisible !== false,
  snapEnabled: overrides.snapEnabled !== false,
  ...overrides
});

// Initial state
const initialState: WindowManagerState = {
  windows: {},
  activeWindowId: null,
  maxZIndex: 1000,
  snapThreshold: 20,
  dockAreas: {
    left: { width: 300, occupied: false },
    right: { width: 300, occupied: false },
    top: { height: 200, occupied: false },
    bottom: { height: 200, occupied: false }
  },
  settings: {
    enableSnapping: true,
    enableDocking: true,
    snapThreshold: 20,
    animationEnabled: true,
    rememberPositions: true
  }
};

// Reducer
const windowManagerReducer = (state: WindowManagerState, action: WindowAction): WindowManagerState => {
  switch (action.type) {
    case 'CREATE_WINDOW': {
      const newWindow = createDefaultWindow(action.payload);
      newWindow.zIndex = state.maxZIndex + 1;
      
      return {
        ...state,
        windows: {
          ...state.windows,
          [newWindow.id]: newWindow
        },
        activeWindowId: newWindow.id,
        maxZIndex: state.maxZIndex + 1
      };
    }

    case 'CLOSE_WINDOW': {
      const { [action.payload.id]: removedWindow, ...remainingWindows } = state.windows;
      return {
        ...state,
        windows: remainingWindows,
        activeWindowId: state.activeWindowId === action.payload.id 
          ? Object.keys(remainingWindows)[0] || null 
          : state.activeWindowId
      };
    }

    case 'FOCUS_WINDOW': {
      const window = state.windows[action.payload.id];
      if (!window) return state;

      return {
        ...state,
        windows: {
          ...state.windows,
          [action.payload.id]: {
            ...window,
            zIndex: state.maxZIndex + 1
          }
        },
        activeWindowId: action.payload.id,
        maxZIndex: state.maxZIndex + 1
      };
    }

    case 'MOVE_WINDOW': {
      const window = state.windows[action.payload.id];
      if (!window || !window.isMovable) return state;

      let { x, y } = action.payload.position;

      // Apply snapping if enabled
      if (state.settings.enableSnapping && window.snapEnabled) {
        const snapThreshold = state.settings.snapThreshold;
        
        // Snap to screen edges
        if (x < snapThreshold) x = 0;
        if (y < snapThreshold) y = 0;
        if (x + window.size.width > screenWidth - snapThreshold) {
          x = screenWidth - window.size.width;
        }
        if (y + window.size.height > screenHeight - snapThreshold) {
          y = screenHeight - window.size.height;
        }

        // Snap to other windows
        Object.values(state.windows).forEach(otherWindow => {
          if (otherWindow.id === window.id || !otherWindow.isVisible) return;

          const otherRight = otherWindow.position.x + otherWindow.size.width;
          const otherBottom = otherWindow.position.y + otherWindow.size.height;
          const windowRight = x + window.size.width;
          const windowBottom = y + window.size.height;

          // Horizontal snapping
          if (Math.abs(x - otherRight) < snapThreshold) x = otherRight;
          if (Math.abs(windowRight - otherWindow.position.x) < snapThreshold) {
            x = otherWindow.position.x - window.size.width;
          }

          // Vertical snapping
          if (Math.abs(y - otherBottom) < snapThreshold) y = otherBottom;
          if (Math.abs(windowBottom - otherWindow.position.y) < snapThreshold) {
            y = otherWindow.position.y - window.size.height;
          }
        });
      }

      return {
        ...state,
        windows: {
          ...state.windows,
          [action.payload.id]: {
            ...window,
            position: { x, y }
          }
        }
      };
    }

    case 'RESIZE_WINDOW': {
      const window = state.windows[action.payload.id];
      if (!window || !window.isResizable) return state;

      const { width, height } = action.payload.size;
      
      // Constrain to min/max sizes
      const constrainedWidth = Math.max(
        window.minSize.width,
        Math.min(window.maxSize.width, width)
      );
      const constrainedHeight = Math.max(
        window.minSize.height,
        Math.min(window.maxSize.height, height)
      );

      return {
        ...state,
        windows: {
          ...state.windows,
          [action.payload.id]: {
            ...window,
            size: { width: constrainedWidth, height: constrainedHeight }
          }
        }
      };
    }

    case 'MINIMIZE_WINDOW': {
      const window = state.windows[action.payload.id];
      if (!window) return state;

      return {
        ...state,
        windows: {
          ...state.windows,
          [action.payload.id]: {
            ...window,
            isMinimized: !window.isMinimized,
            isMaximized: false
          }
        }
      };
    }

    case 'MAXIMIZE_WINDOW': {
      const window = state.windows[action.payload.id];
      if (!window) return state;

      if (window.isMaximized) {
        // Restore to previous size
        return {
          ...state,
          windows: {
            ...state.windows,
            [action.payload.id]: {
              ...window,
              isMaximized: false,
              isMinimized: false,
              position: window.position,
              size: window.size
            }
          }
        };
      } else {
        // Maximize
        return {
          ...state,
          windows: {
            ...state.windows,
            [action.payload.id]: {
              ...window,
              isMaximized: true,
              isMinimized: false,
              position: { x: 0, y: 0 },
              size: { width: screenWidth, height: screenHeight }
            }
          }
        };
      }
    }

    case 'COLLAPSE_WINDOW': {
      const window = state.windows[action.payload.id];
      if (!window) return state;

      return {
        ...state,
        windows: {
          ...state.windows,
          [action.payload.id]: {
            ...window,
            isCollapsed: !window.isCollapsed
          }
        }
      };
    }

    case 'DOCK_WINDOW': {
      const window = state.windows[action.payload.id];
      const { side } = action.payload;
      
      if (!window || !state.settings.enableDocking) return state;

      let position: { x: number; y: number };
      let size: { width: number; height: number };

      switch (side) {
        case 'left':
          position = { x: 0, y: 0 };
          size = { width: state.dockAreas.left.width, height: screenHeight };
          break;
        case 'right':
          position = { x: screenWidth - state.dockAreas.right.width, y: 0 };
          size = { width: state.dockAreas.right.width, height: screenHeight };
          break;
        case 'top':
          position = { x: 0, y: 0 };
          size = { width: screenWidth, height: state.dockAreas.top.height };
          break;
        case 'bottom':
          position = { x: 0, y: screenHeight - state.dockAreas.bottom.height };
          size = { width: screenWidth, height: state.dockAreas.bottom.height };
          break;
      }

      return {
        ...state,
        windows: {
          ...state.windows,
          [action.payload.id]: {
            ...window,
            isDocked: true,
            dockSide: side,
            position,
            size,
            isMaximized: false,
            isMinimized: false
          }
        },
        dockAreas: {
          ...state.dockAreas,
          [side]: { ...state.dockAreas[side], occupied: true }
        }
      };
    }

    case 'UNDOCK_WINDOW': {
      const window = state.windows[action.payload.id];
      if (!window || !window.isDocked) return state;

      const dockSide = window.dockSide!;

      return {
        ...state,
        windows: {
          ...state.windows,
          [action.payload.id]: {
            ...window,
            isDocked: false,
            dockSide: undefined,
            position: { x: 100, y: 100 }, // Reset to default position
            size: { width: 400, height: 300 } // Reset to default size
          }
        },
        dockAreas: {
          ...state.dockAreas,
          [dockSide]: { ...state.dockAreas[dockSide], occupied: false }
        }
      };
    }

    case 'UPDATE_SETTINGS': {
      return {
        ...state,
        settings: {
          ...state.settings,
          ...action.payload
        }
      };
    }

    case 'RESTORE_WINDOWS': {
      return {
        ...state,
        windows: action.payload.windows
      };
    }

    default:
      return state;
  }
};

// Context
const WindowManagerContext = createContext<{
  state: WindowManagerState;
  dispatch: React.Dispatch<WindowAction>;
} | null>(null);

// Provider component
export const WindowManagerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(windowManagerReducer, initialState);

  // Load saved window positions on mount
  useEffect(() => {
    if (state.settings.rememberPositions) {
      try {
        const savedWindows = localStorage.getItem('windowManager.windows');
        if (savedWindows) {
          const windows = JSON.parse(savedWindows);
          dispatch({ type: 'RESTORE_WINDOWS', payload: { windows } });
        }
      } catch (error) {
        console.warn('Failed to load saved window positions:', error);
      }
    }
  }, []);

  // Save window positions when they change
  useEffect(() => {
    if (state.settings.rememberPositions) {
      try {
        localStorage.setItem('windowManager.windows', JSON.stringify(state.windows));
      } catch (error) {
        console.warn('Failed to save window positions:', error);
      }
    }
  }, [state.windows, state.settings.rememberPositions]);

  return (
    <WindowManagerContext.Provider value={{ state, dispatch }}>
      {children}
    </WindowManagerContext.Provider>
  );
};

// Hook to use window manager
export const useWindowManager = () => {
  const context = useContext(WindowManagerContext);
  if (!context) {
    throw new Error('useWindowManager must be used within WindowManagerProvider');
  }

  const { state, dispatch } = context;

  const createWindow = useCallback((windowData: Partial<WindowState> & { 
    id: string; 
    title: string; 
    component: React.ComponentType<any> 
  }) => {
    dispatch({ type: 'CREATE_WINDOW', payload: windowData });
  }, [dispatch]);

  const closeWindow = useCallback((id: string) => {
    dispatch({ type: 'CLOSE_WINDOW', payload: { id } });
  }, [dispatch]);

  const focusWindow = useCallback((id: string) => {
    dispatch({ type: 'FOCUS_WINDOW', payload: { id } });
  }, [dispatch]);

  const moveWindow = useCallback((id: string, position: { x: number; y: number }) => {
    dispatch({ type: 'MOVE_WINDOW', payload: { id, position } });
  }, [dispatch]);

  const resizeWindow = useCallback((id: string, size: { width: number; height: number }) => {
    dispatch({ type: 'RESIZE_WINDOW', payload: { id, size } });
  }, [dispatch]);

  const minimizeWindow = useCallback((id: string) => {
    dispatch({ type: 'MINIMIZE_WINDOW', payload: { id } });
  }, [dispatch]);

  const maximizeWindow = useCallback((id: string) => {
    dispatch({ type: 'MAXIMIZE_WINDOW', payload: { id } });
  }, [dispatch]);

  const collapseWindow = useCallback((id: string) => {
    dispatch({ type: 'COLLAPSE_WINDOW', payload: { id } });
  }, [dispatch]);

  const dockWindow = useCallback((id: string, side: 'left' | 'right' | 'top' | 'bottom') => {
    dispatch({ type: 'DOCK_WINDOW', payload: { id, side } });
  }, [dispatch]);

  const undockWindow = useCallback((id: string) => {
    dispatch({ type: 'UNDOCK_WINDOW', payload: { id } });
  }, [dispatch]);

  const updateSettings = useCallback((settings: Partial<WindowManagerState['settings']>) => {
    dispatch({ type: 'UPDATE_SETTINGS', payload: settings });
  }, [dispatch]);

  return {
    state,
    createWindow,
    closeWindow,
    focusWindow,
    moveWindow,
    resizeWindow,
    minimizeWindow,
    maximizeWindow,
    collapseWindow,
    dockWindow,
    undockWindow,
    updateSettings
  };
};

export default WindowManagerProvider;