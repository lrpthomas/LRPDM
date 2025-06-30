import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Lock, Unlock, Minus, X, Maximize2, Minimize2 } from 'lucide-react';

interface Position {
  x: number;
  y: number;
}

interface Size {
  width: number;
  height: number;
}

interface SnapZone {
  id: string;
  type: 'edge' | 'window' | 'grid';
  bounds: DOMRect;
  magneticStrength: number;
}

interface EnhancedWindowProps {
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
  onMaximize?: () => void;
  className?: string;
  zIndex?: number;
}

export const EnhancedWindow: React.FC<EnhancedWindowProps> = ({
  id,
  title,
  children,
  isLocked = false,
  initialPosition = { x: 100, y: 100 },
  initialSize = { width: 400, height: 300 },
  onMove,
  onResize,
  onLock,
  onClose,
  onMinimize,
  onMaximize,
  className = "",
  zIndex = 1,
}) => {
  // State management
  const [position, setPosition] = useState<Position>(initialPosition);
  const [size, setSize] = useState<Size>(initialSize);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [dragOffset, setDragOffset] = useState<Position>({ x: 0, y: 0 });
  const [snapZones, setSnapZones] = useState<SnapZone[]>([]);
  const [activeSnapZone, setActiveSnapZone] = useState<SnapZone | null>(null);
  
  // Refs
  const windowRef = useRef<HTMLDivElement>(null);
  const titleBarRef = useRef<HTMLDivElement>(null);
  const resizeHandleRef = useRef<HTMLDivElement>(null);
  
  // Constants
  const SNAP_DISTANCE = 15;
  const MIN_WINDOW_SIZE = { width: 200, height: 150 };
  const EDGE_RESIZE_THRESHOLD = 5;

  // Generate snap zones
  const generateSnapZones = useCallback((): SnapZone[] => {
    const zones: SnapZone[] = [];
    const margin = 10;
    
    // Screen edge zones
    zones.push(
      {
        id: 'left-edge',
        type: 'edge',
        bounds: new DOMRect(0, 0, SNAP_DISTANCE, window.innerHeight),
        magneticStrength: 1,
      },
      {
        id: 'right-edge',
        type: 'edge',
        bounds: new DOMRect(
          window.innerWidth - SNAP_DISTANCE,
          0,
          SNAP_DISTANCE,
          window.innerHeight
        ),
        magneticStrength: 1,
      },
      {
        id: 'top-edge',
        type: 'edge',
        bounds: new DOMRect(0, 0, window.innerWidth, SNAP_DISTANCE),
        magneticStrength: 1,
      },
      {
        id: 'bottom-edge',
        type: 'edge',
        bounds: new DOMRect(
          0,
          window.innerHeight - SNAP_DISTANCE,
          window.innerWidth,
          SNAP_DISTANCE
        ),
        magneticStrength: 1,
      }
    );
    
    // Add other window zones (simplified for demo)
    // In real implementation, this would detect other windows
    
    return zones;
  }, []);

  // Apply magnetic snapping
  const applyMagneticSnapping = useCallback((pos: Position): Position => {
    let snappedPos = { ...pos };
    let closestZone: SnapZone | null = null;
    let minDistance = SNAP_DISTANCE;
    
    snapZones.forEach(zone => {
      const windowBounds = {
        left: pos.x,
        top: pos.y,
        right: pos.x + size.width,
        bottom: pos.y + size.height,
      };
      
      let distance = Infinity;
      let adjustedPos = { ...pos };
      
      switch (zone.id) {
        case 'left-edge':
          distance = Math.abs(windowBounds.left);
          if (distance < SNAP_DISTANCE) {
            adjustedPos.x = 0;
          }
          break;
        case 'right-edge':
          distance = Math.abs(windowBounds.right - window.innerWidth);
          if (distance < SNAP_DISTANCE) {
            adjustedPos.x = window.innerWidth - size.width;
          }
          break;
        case 'top-edge':
          distance = Math.abs(windowBounds.top);
          if (distance < SNAP_DISTANCE) {
            adjustedPos.y = 0;
          }
          break;
        case 'bottom-edge':
          distance = Math.abs(windowBounds.bottom - window.innerHeight);
          if (distance < SNAP_DISTANCE) {
            adjustedPos.y = window.innerHeight - size.height;
          }
          break;
      }
      
      if (distance < minDistance) {
        minDistance = distance;
        closestZone = zone;
        snappedPos = adjustedPos;
      }
    });
    
    setActiveSnapZone(closestZone);
    return snappedPos;
  }, [snapZones, size]);

  // Handle mouse down on title bar
  const handleTitleBarMouseDown = useCallback((e: React.MouseEvent) => {
    // Only allow window movement with Ctrl + Click to prevent accidental moves
    if (isLocked || !e.ctrlKey) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    const rect = windowRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    setIsDragging(true);
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
    
    // Prevent text selection during drag
    document.body.style.userSelect = 'none';
    document.body.style.webkitUserSelect = 'none';
    
    // Generate snap zones
    setSnapZones(generateSnapZones());
  }, [isLocked, generateSnapZones]);

  // Handle mouse move during drag
  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging || isLocked) return;
    
    const newPosition = {
      x: e.clientX - dragOffset.x,
      y: e.clientY - dragOffset.y,
    };
    
    // Constrain to viewport bounds
    const constrainedPosition = {
      x: Math.max(0, Math.min(newPosition.x, window.innerWidth - size.width)),
      y: Math.max(0, Math.min(newPosition.y, window.innerHeight - size.height)),
    };
    
    // Apply magnetic snapping
    const snappedPosition = applyMagneticSnapping(constrainedPosition);
    
    setPosition(snappedPosition);
    onMove?.(snappedPosition);
  }, [isDragging, isLocked, dragOffset, size, applyMagneticSnapping, onMove]);

  // Handle mouse up
  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    setIsResizing(false);
    setActiveSnapZone(null);
    
    // Restore text selection
    document.body.style.userSelect = '';
    document.body.style.webkitUserSelect = '';
  }, []);

  // Event listeners
  useEffect(() => {
    if (isDragging || isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, isResizing, handleMouseMove, handleMouseUp]);

  // Handle window controls
  const handleLockToggle = () => {
    onLock?.(!isLocked);
  };

  const handleMinimize = () => {
    setIsMinimized(!isMinimized);
    onMinimize?.();
  };

  const handleMaximize = () => {
    if (isMaximized) {
      setPosition(initialPosition);
      setSize(initialSize);
    } else {
      setPosition({ x: 0, y: 0 });
      setSize({ width: window.innerWidth, height: window.innerHeight });
    }
    setIsMaximized(!isMaximized);
    onMaximize?.();
  };

  const handleClose = () => {
    onClose?.();
  };

  // Resize functionality
  const handleResizeStart = (e: React.MouseEvent) => {
    if (isLocked || isMaximized) return;
    
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);
    
    document.body.style.userSelect = 'none';
  };

  // Double-click to maximize/restore
  const handleTitleBarDoubleClick = () => {
    if (!isLocked) {
      handleMaximize();
    }
  };

  // Render snap zone indicators
  const renderSnapZones = () => {
    if (!isDragging || !activeSnapZone) return null;
    
    return (
      <div
        className="snap-zone active"
        style={{
          left: activeSnapZone.bounds.x,
          top: activeSnapZone.bounds.y,
          width: activeSnapZone.bounds.width,
          height: activeSnapZone.bounds.height,
        }}
      />
    );
  };

  return (
    <>
      {renderSnapZones()}
      <div
        ref={windowRef}
        className={`
          window-container absolute transition-all duration-150
          ${isDragging ? 'dragging' : ''}
          ${className}
        `}
        style={{
          left: position.x,
          top: position.y,
          width: size.width,
          height: isMinimized ? 'auto' : size.height,
          zIndex: isDragging ? 1000 : zIndex,
        }}
      >
        {/* Title Bar */}
        <div
          ref={titleBarRef}
          className={`
            window-titlebar flex items-center justify-between px-4 py-3
            ${isLocked ? 'locked' : ''}
            ${!isLocked ? 'cursor-move' : 'cursor-default'}
          `}
          onMouseDown={handleTitleBarMouseDown}
          onDoubleClick={handleTitleBarDoubleClick}
        >
          <div className="flex items-center space-x-2">
            <h3 className="text-sm font-semibold no-select">
              {title}
            </h3>
            {isDragging && (
              <span className="text-xs text-vgk-gold-light no-select">
                Ctrl+Drag to move
              </span>
            )}
          </div>
          
          <div className="flex items-center space-x-1">
            {/* Lock/Unlock Button */}
            <button
              onClick={handleLockToggle}
              className="p-1 rounded hover:bg-white/10 transition-colors focus-ring"
              title={isLocked ? 'Unlock window (Ctrl+drag to move)' : 'Lock window'}
              type="button"
            >
              {isLocked ? (
                <Lock size={14} className="text-vgk-red" />
              ) : (
                <Unlock size={14} className="text-vgk-gold" />
              )}
            </button>
            
            {/* Minimize Button */}
            <button
              onClick={handleMinimize}
              className="p-1 rounded hover:bg-white/10 transition-colors focus-ring"
              title={isMinimized ? 'Restore' : 'Minimize'}
              type="button"
            >
              {isMinimized ? (
                <Maximize2 size={14} className="text-vgk-gold" />
              ) : (
                <Minus size={14} className="text-vgk-gold" />
              )}
            </button>
            
            {/* Maximize/Restore Button */}
            <button
              onClick={handleMaximize}
              className="p-1 rounded hover:bg-white/10 transition-colors focus-ring"
              title={isMaximized ? 'Restore' : 'Maximize'}
              type="button"
            >
              {isMaximized ? (
                <Minimize2 size={14} className="text-vgk-gold" />
              ) : (
                <Maximize2 size={14} className="text-vgk-gold" />
              )}
            </button>
            
            {/* Close Button */}
            <button
              onClick={handleClose}
              className="p-1 rounded hover:bg-vgk-red/20 transition-colors focus-ring"
              title="Close"
              type="button"
            >
              <X size={14} className="text-vgk-gold hover:text-vgk-red transition-colors" />
            </button>
          </div>
        </div>
        
        {/* Content Area */}
        {!isMinimized && (
          <div className="window-content">
            {children}
          </div>
        )}
        
        {/* Resize Handles */}
        {!isLocked && !isMinimized && !isMaximized && (
          <>
            {/* Corner Resize Handle */}
            <div
              ref={resizeHandleRef}
              className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize"
              style={{
                background: 'linear-gradient(-45deg, transparent 40%, var(--vgk-gold) 40%, var(--vgk-gold) 60%, transparent 60%)',
              }}
              onMouseDown={handleResizeStart}
              title="Resize window"
            />
            
            {/* Edge Resize Handles */}
            <div
              className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-8 h-2 
                         cursor-s-resize opacity-0 hover:opacity-100 transition-opacity"
              style={{ background: 'var(--vgk-gold)' }}
              onMouseDown={handleResizeStart}
            />
            <div
              className="absolute right-0 top-1/2 transform -translate-y-1/2 w-2 h-8 
                         cursor-e-resize opacity-0 hover:opacity-100 transition-opacity"
              style={{ background: 'var(--vgk-gold)' }}
              onMouseDown={handleResizeStart}
            />
          </>
        )}
        
        {/* Visual feedback for Ctrl requirement */}
        {!isDragging && !isLocked && (
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 
                          pointer-events-none opacity-0 hover:opacity-100 transition-opacity
                          bg-black/80 text-white px-2 py-1 rounded text-xs">
            Hold Ctrl + Drag to move
          </div>
        )}
      </div>
    </>
  );
};

export default EnhancedWindow;