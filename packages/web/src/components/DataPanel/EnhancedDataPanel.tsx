import React, { useState, useMemo, useCallback } from 'react';
import { 
  Layers, 
  Upload, 
  Search, 
  CheckSquare, 
  Square, 
  Filter,
  MoreVertical,
  Eye,
  EyeOff,
  Download,
  Trash2,
  Info,
  MapPin,
  Database,
  Globe,
  AlertCircle,
  Clock,
  CheckCircle
} from 'lucide-react';

interface DataItem {
  id: string;
  name: string;
  type: 'Vector' | 'Raster' | 'Service' | 'External';
  status: 'loaded' | 'loading' | 'error' | 'offline' | 'processing';
  visible: boolean;
  features?: number;
  size?: string;
  metadata?: {
    crs?: string;
    bounds?: [number, number, number, number];
    lastModified?: string;
    source?: string;
    description?: string;
    tags?: string[];
  };
}

interface EnhancedDataPanelProps {
  items: DataItem[];
  selectedItems?: Set<string>;
  onItemsChange?: (items: DataItem[]) => void;
  onSelectionChange?: (selectedIds: Set<string>) => void;
  onUpload?: (files: File[]) => void;
  onItemAction?: (itemId: string, action: string) => void;
  className?: string;
  allowMultiSelect?: boolean;
  showUpload?: boolean;
  showSearch?: boolean;
  showFilters?: boolean;
}

export const EnhancedDataPanel: React.FC<EnhancedDataPanelProps> = ({
  items,
  selectedItems: externalSelectedItems,
  onItemsChange,
  onSelectionChange,
  onUpload,
  onItemAction,
  className = "",
  allowMultiSelect = true,
  showUpload = true,
  showSearch = true,
  showFilters = true,
}) => {
  // State management
  const [internalSelectedItems, setInternalSelectedItems] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | DataItem['type']>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | DataItem['status']>('all');
  const [sortBy, setSortBy] = useState<'name' | 'type' | 'modified' | 'size'>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [showContextMenu, setShowContextMenu] = useState<{itemId: string, x: number, y: number} | null>(null);

  // Use external selection if provided, otherwise use internal
  const selectedItems = externalSelectedItems || internalSelectedItems;
  const setSelectedItems = onSelectionChange || setInternalSelectedItems;

  // Filter and search logic
  const filteredAndSortedItems = useMemo(() => {
    let filtered = items.filter(item => {
      const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           item.metadata?.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           item.metadata?.tags?.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesTypeFilter = filterType === 'all' || item.type === filterType;
      const matchesStatusFilter = filterStatus === 'all' || item.status === filterStatus;
      
      return matchesSearch && matchesTypeFilter && matchesStatusFilter;
    });

    // Sort items
    filtered.sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'type':
          comparison = a.type.localeCompare(b.type);
          break;
        case 'modified':
          const aDate = new Date(a.metadata?.lastModified || 0);
          const bDate = new Date(b.metadata?.lastModified || 0);
          comparison = aDate.getTime() - bDate.getTime();
          break;
        case 'size':
          const aFeatures = a.features || 0;
          const bFeatures = b.features || 0;
          comparison = aFeatures - bFeatures;
          break;
      }
      
      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return filtered;
  }, [items, searchTerm, filterType, filterStatus, sortBy, sortDirection]);

  // Selection logic
  const isAllSelected = filteredAndSortedItems.length > 0 && 
    filteredAndSortedItems.every(item => selectedItems.has(item.id));
  
  const isSomeSelected = filteredAndSortedItems.some(item => selectedItems.has(item.id));

  const handleSelectAll = useCallback(() => {
    const newSelected = new Set(selectedItems);
    
    if (isAllSelected) {
      // Deselect all filtered items
      filteredAndSortedItems.forEach(item => newSelected.delete(item.id));
    } else {
      // Select all filtered items
      filteredAndSortedItems.forEach(item => newSelected.add(item.id));
    }
    
    setSelectedItems(newSelected);
  }, [selectedItems, isAllSelected, filteredAndSortedItems, setSelectedItems]);

  const handleItemSelect = useCallback((id: string, ctrlKey: boolean = false) => {
    if (!allowMultiSelect) {
      setSelectedItems(new Set([id]));
      return;
    }

    const newSelected = new Set(selectedItems);
    
    if (ctrlKey) {
      // Toggle selection with Ctrl
      if (newSelected.has(id)) {
        newSelected.delete(id);
      } else {
        newSelected.add(id);
      }
    } else {
      // Single selection without Ctrl
      newSelected.clear();
      newSelected.add(id);
    }
    
    setSelectedItems(newSelected);
  }, [selectedItems, allowMultiSelect, setSelectedItems]);

  // File upload handling
  const handleFileUpload = useCallback(() => {
    if (!onUpload) return;
    
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;
    input.accept = '.shp,.geojson,.kml,.gpx,.csv,.tiff,.tif,.png,.jpg,.jpeg,.zip';
    
    input.onchange = (e) => {
      const files = Array.from((e.target as HTMLInputElement).files || []);
      onUpload(files);
    };
    
    input.click();
  }, [onUpload]);

  // Context menu handling
  const handleContextMenu = useCallback((e: React.MouseEvent, itemId: string) => {
    e.preventDefault();
    setShowContextMenu({
      itemId,
      x: e.clientX,
      y: e.clientY,
    });
  }, []);

  const handleContextMenuAction = useCallback((action: string) => {
    if (showContextMenu) {
      onItemAction?.(showContextMenu.itemId, action);
      setShowContextMenu(null);
    }
  }, [showContextMenu, onItemAction]);

  // Status icon and color mapping
  const getStatusIcon = (status: DataItem['status']) => {
    switch (status) {
      case 'loaded':
        return <CheckCircle size={14} className="text-vgk-gold" />;
      case 'loading':
        return <Clock size={14} className="text-vgk-steel-light animate-spin" />;
      case 'error':
        return <AlertCircle size={14} className="text-vgk-red" />;
      case 'offline':
        return <AlertCircle size={14} className="text-gray-400" />;
      case 'processing':
        return <Clock size={14} className="text-vgk-gold animate-pulse" />;
      default:
        return <AlertCircle size={14} className="text-gray-400" />;
    }
  };

  const getTypeIcon = (type: DataItem['type']) => {
    switch (type) {
      case 'Vector':
        return <MapPin size={16} className="text-vgk-gold" />;
      case 'Raster':
        return <Layers size={16} className="text-vgk-steel-light" />;
      case 'Service':
        return <Globe size={16} className="text-vgk-red" />;
      case 'External':
        return <Database size={16} className="text-vgk-steel-light" />;
      default:
        return <Layers size={16} className="text-gray-400" />;
    }
  };

  return (
    <div className={`data-panel flex flex-col min-h-0 bg-surface-card border border-border-subtle rounded-lg overflow-hidden ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border-subtle bg-surface-elevated">
        <div className="flex items-center space-x-2">
          <Layers size={20} className="text-vgk-steel-gray" />
          <h3 className="text-heading-3">Data Layers</h3>
          <span className="status-badge loaded">
            {items.length} items
          </span>
        </div>
        
        <div className="flex items-center space-x-2">
          {allowMultiSelect && (
            <button
              onClick={handleSelectAll}
              className="btn-ghost text-sm px-3 py-1 flex items-center space-x-1"
              title={isAllSelected ? 'Deselect all items' : 'Select all visible items'}
            >
              {isAllSelected ? (
                <CheckSquare size={16} className="text-vgk-gold" />
              ) : isSomeSelected ? (
                <div className="w-4 h-4 border-2 border-vgk-gold bg-vgk-gold/50 rounded-sm" />
              ) : (
                <Square size={16} className="text-vgk-steel-light" />
              )}
              <span>{isAllSelected ? 'Deselect All' : 'Select All'}</span>
            </button>
          )}
          
          {showUpload && (
            <button 
              className="btn-primary text-sm px-3 py-1 flex items-center space-x-1"
              onClick={handleFileUpload}
              title="Upload new data files"
            >
              <Upload size={16} />
              <span>Add Data</span>
            </button>
          )}
        </div>
      </div>

      {/* Search and Filters */}
      {(showSearch || showFilters) && (
        <div className="p-4 border-b border-border-subtle space-y-3 bg-surface-elevated">
          {showSearch && (
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-vgk-steel-light" />
              <input
                type="text"
                placeholder="Search layers, descriptions, tags..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input-field w-full pl-10 pr-4"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-vgk-steel-light hover:text-vgk-red"
                >
                  ×
                </button>
              )}
            </div>
          )}
          
          {showFilters && (
            <div className="flex flex-wrap gap-2">
              {/* Type Filter */}
              <div className="flex items-center space-x-1">
                <Filter size={14} className="text-vgk-steel-light" />
                <span className="text-caption">Type:</span>
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value as any)}
                  className="input-field text-sm py-1 px-2 min-w-0"
                >
                  <option value="all">All</option>
                  <option value="Vector">Vector</option>
                  <option value="Raster">Raster</option>
                  <option value="Service">Service</option>
                  <option value="External">External</option>
                </select>
              </div>
              
              {/* Status Filter */}
              <div className="flex items-center space-x-1">
                <span className="text-caption">Status:</span>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value as any)}
                  className="input-field text-sm py-1 px-2 min-w-0"
                >
                  <option value="all">All</option>
                  <option value="loaded">Loaded</option>
                  <option value="loading">Loading</option>
                  <option value="error">Error</option>
                  <option value="offline">Offline</option>
                </select>
              </div>
              
              {/* Sort Options */}
              <div className="flex items-center space-x-1">
                <span className="text-caption">Sort:</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="input-field text-sm py-1 px-2 min-w-0"
                >
                  <option value="name">Name</option>
                  <option value="type">Type</option>
                  <option value="modified">Modified</option>
                  <option value="size">Size</option>
                </select>
                <button
                  onClick={() => setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')}
                  className="btn-ghost p-1"
                  title={`Sort ${sortDirection === 'asc' ? 'descending' : 'ascending'}`}
                >
                  {sortDirection === 'asc' ? '↑' : '↓'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Data List */}
      <div className="flex-1 overflow-y-auto">
        {filteredAndSortedItems.length === 0 ? (
          <div className="p-8 text-center text-text-muted">
            <Layers size={48} className="mx-auto mb-4 text-vgk-steel-light opacity-50" />
            <p className="text-lg font-medium mb-2">No layers found</p>
            <p className="text-caption">
              {searchTerm || filterType !== 'all' || filterStatus !== 'all'
                ? 'Try adjusting your search or filter criteria'
                : 'Upload some data to get started'
              }
            </p>
            {(!searchTerm && filterType === 'all' && filterStatus === 'all') && showUpload && (
              <button 
                className="btn-primary mt-4"
                onClick={handleFileUpload}
              >
                <Upload size={16} />
                Upload Data
              </button>
            )}
          </div>
        ) : (
          filteredAndSortedItems.map((item) => (
            <div
              key={item.id}
              className={`
                data-item cursor-pointer px-4 py-3 border-b border-border-subtle 
                last:border-b-0 transition-all duration-150
                ${selectedItems.has(item.id)
                  ? 'selected bg-vgk-gold/10 border-l-4 border-l-vgk-gold'
                  : 'hover:bg-vgk-gold/5 hover:border-l-2 hover:border-l-vgk-gold'
                }
                ${item.status === 'error' 
                  ? 'error bg-vgk-red/5 border-l-2 border-l-vgk-red' 
                  : ''
                }
              `}
              onClick={(e) => handleItemSelect(item.id, e.ctrlKey)}
              onContextMenu={(e) => handleContextMenu(e, item.id)}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0 space-y-2">
                  {/* Header Row */}
                  <div className="flex items-center space-x-2">
                    {getTypeIcon(item.type)}
                    <h4 className="font-medium text-text-primary truncate flex-1">
                      {item.name}
                    </h4>
                    {getStatusIcon(item.status)}
                    <span className={`status-badge ${item.status}`}>
                      {item.status}
                    </span>
                  </div>
                  
                  {/* Metadata Row */}
                  <div className="flex items-center space-x-4 text-caption text-text-muted">
                    <span className="font-medium">{item.type}</span>
                    {item.features !== undefined && (
                      <span>{item.features.toLocaleString()} features</span>
                    )}
                    {item.size && (
                      <span>{item.size}</span>
                    )}
                    {item.metadata?.crs && (
                      <span title="Coordinate Reference System">{item.metadata.crs}</span>
                    )}
                  </div>
                  
                  {/* Tags */}
                  {item.metadata?.tags && item.metadata.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {item.metadata.tags.map((tag, index) => (
                        <span
                          key={index}
                          className="px-2 py-1 bg-vgk-steel-light/10 text-vgk-steel-light text-micro rounded-full"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                  
                  {/* Last Modified */}
                  {item.metadata?.lastModified && (
                    <div className="text-micro text-text-muted">
                      Modified: {new Date(item.metadata.lastModified).toLocaleDateString()}
                    </div>
                  )}
                </div>
                
                <div className="flex items-center space-x-2 ml-4">
                  {/* Visibility Toggle */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onItemAction?.(item.id, item.visible ? 'hide' : 'show');
                    }}
                    className="p-1 rounded hover:bg-vgk-gold/10 transition-colors"
                    title={item.visible ? 'Hide layer' : 'Show layer'}
                  >
                    {item.visible ? (
                      <Eye size={14} className="text-vgk-gold" />
                    ) : (
                      <EyeOff size={14} className="text-vgk-steel-light" />
                    )}
                  </button>
                  
                  {/* Selection Checkbox */}
                  {allowMultiSelect && (
                    <input
                      type="checkbox"
                      checked={selectedItems.has(item.id)}
                      onChange={(e) => {
                        e.stopPropagation();
                        handleItemSelect(item.id, true);
                      }}
                      className="w-4 h-4 accent-vgk-gold rounded focus-ring"
                    />
                  )}
                  
                  {/* More Actions */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleContextMenu(e, item.id);
                    }}
                    className="p-1 rounded hover:bg-vgk-gold/10 transition-colors"
                    title="More actions"
                  >
                    <MoreVertical size={14} className="text-vgk-steel-light" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-border-subtle bg-surface-elevated">
        <div className="flex items-center justify-between text-caption text-text-muted">
          <span>
            {selectedItems.size} of {filteredAndSortedItems.length} layers selected
            {filteredAndSortedItems.length !== items.length && 
              ` (${items.length} total)`
            }
          </span>
          {selectedItems.size > 0 && (
            <div className="flex space-x-2">
              <button 
                onClick={() => onItemAction?.('selected', 'export')}
                className="text-vgk-gold hover:text-vgk-gold-dark font-medium transition-colors"
                title="Export selected layers"
              >
                <Download size={14} className="inline mr-1" />
                Export
              </button>
              <button 
                onClick={() => onItemAction?.('selected', 'remove')}
                className="text-vgk-red hover:text-vgk-red-dark font-medium transition-colors"
                title="Remove selected layers"
              >
                <Trash2 size={14} className="inline mr-1" />
                Remove
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Context Menu */}
      {showContextMenu && (
        <>
          <div
            className="fixed inset-0 z-50"
            onClick={() => setShowContextMenu(null)}
          />
          <div
            className="fixed z-50 bg-surface-card border border-border-strong rounded-lg shadow-lg py-2 min-w-48"
            style={{
              left: showContextMenu.x,
              top: showContextMenu.y,
            }}
          >
            <button
              onClick={() => handleContextMenuAction('info')}
              className="w-full px-4 py-2 text-left hover:bg-vgk-gold/10 transition-colors flex items-center space-x-2"
            >
              <Info size={14} />
              <span>Layer Information</span>
            </button>
            <button
              onClick={() => handleContextMenuAction('export')}
              className="w-full px-4 py-2 text-left hover:bg-vgk-gold/10 transition-colors flex items-center space-x-2"
            >
              <Download size={14} />
              <span>Export Layer</span>
            </button>
            <button
              onClick={() => handleContextMenuAction('duplicate')}
              className="w-full px-4 py-2 text-left hover:bg-vgk-gold/10 transition-colors flex items-center space-x-2"
            >
              <Layers size={14} />
              <span>Duplicate Layer</span>
            </button>
            <hr className="my-2 border-border-subtle" />
            <button
              onClick={() => handleContextMenuAction('remove')}
              className="w-full px-4 py-2 text-left hover:bg-vgk-red/10 text-vgk-red transition-colors flex items-center space-x-2"
            >
              <Trash2 size={14} />
              <span>Remove Layer</span>
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default EnhancedDataPanel;