import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, Pressable, TextInput, ScrollView, Platform } from 'react-native';

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

interface SimpleEnhancedDataPanelProps {
  items: DataItem[];
  selectedItems?: Set<string>;
  onItemsChange?: (items: DataItem[]) => void;
  onSelectionChange?: (selectedIds: Set<string>) => void;
  onUpload?: (files: File[]) => void;
  onItemAction?: (itemId: string, action: string) => void;
}

export const SimpleEnhancedDataPanel: React.FC<SimpleEnhancedDataPanelProps> = ({
  items,
  selectedItems: externalSelectedItems,
  onSelectionChange,
  onUpload,
  onItemAction,
}) => {
  const [internalSelectedItems, setInternalSelectedItems] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | DataItem['type']>('all');

  const selectedItems = externalSelectedItems || internalSelectedItems;
  const setSelectedItems = onSelectionChange || setInternalSelectedItems;

  // Filter and search logic
  const filteredItems = useMemo(() => {
    return items.filter(item => {
      const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           item.metadata?.description?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesTypeFilter = filterType === 'all' || item.type === filterType;
      
      return matchesSearch && matchesTypeFilter;
    });
  }, [items, searchTerm, filterType]);

  const isAllSelected = filteredItems.length > 0 && 
    filteredItems.every(item => selectedItems.has(item.id));

  const handleSelectAll = () => {
    const newSelected = new Set(selectedItems);
    
    if (isAllSelected) {
      filteredItems.forEach(item => newSelected.delete(item.id));
    } else {
      filteredItems.forEach(item => newSelected.add(item.id));
    }
    
    setSelectedItems(newSelected);
  };

  const handleItemSelect = (id: string) => {
    const newSelected = new Set(selectedItems);
    
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    
    setSelectedItems(newSelected);
  };

  const handleFileUpload = () => {
    // Create a file input element for web
    if (Platform.OS === 'web' && onUpload) {
      const input = document.createElement('input');
      input.type = 'file';
      input.multiple = true;
      input.accept = '.shp,.geojson,.kml,.gpx,.csv,.tiff,.tif,.png,.jpg,.jpeg,.zip';
      
      input.onchange = (e) => {
        const files = Array.from((e.target as HTMLInputElement).files || []);
        onUpload(files as any);
      };
      
      input.click();
    }
  };

  const getStatusIcon = (status: DataItem['status']) => {
    switch (status) {
      case 'loaded': return '✅';
      case 'loading': return '⏳';
      case 'error': return '❌';
      case 'offline': return '📴';
      case 'processing': return '🔄';
      default: return '❓';
    }
  };

  const getTypeIcon = (type: DataItem['type']) => {
    switch (type) {
      case 'Vector': return '📍';
      case 'Raster': return '🗺️';
      case 'Service': return '🌐';
      case 'External': return '💾';
      default: return '📄';
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.title}>📊 Data Layers</Text>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{items.length} items</Text>
          </View>
        </View>
        
        <View style={styles.headerRight}>
          <Pressable onPress={handleSelectAll} style={styles.selectAllButton}>
            <Text style={styles.selectAllText}>
              {isAllSelected ? '☑️ Deselect All' : '☐ Select All'}
            </Text>
          </Pressable>
          
          <Pressable onPress={handleFileUpload} style={styles.uploadButton}>
            <Text style={styles.uploadText}>📤 Add Data</Text>
          </Pressable>
        </View>
      </View>

      {/* Search and Filters */}
      <View style={styles.searchSection}>
        <TextInput
          style={styles.searchInput}
          placeholder="🔍 Search layers..."
          value={searchTerm}
          onChangeText={setSearchTerm}
        />
        
        <View style={styles.filterRow}>
          <Text style={styles.filterLabel}>Type:</Text>
          <Pressable
            style={[styles.filterButton, filterType === 'all' && styles.activeFilter]}
            onPress={() => setFilterType('all')}
          >
            <Text style={styles.filterText}>All</Text>
          </Pressable>
          <Pressable
            style={[styles.filterButton, filterType === 'Vector' && styles.activeFilter]}
            onPress={() => setFilterType('Vector')}
          >
            <Text style={styles.filterText}>Vector</Text>
          </Pressable>
          <Pressable
            style={[styles.filterButton, filterType === 'Raster' && styles.activeFilter]}
            onPress={() => setFilterType('Raster')}
          >
            <Text style={styles.filterText}>Raster</Text>
          </Pressable>
        </View>
      </View>

      {/* Data List */}
      <ScrollView style={styles.scrollView}>
        {filteredItems.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>No layers found</Text>
            <Text style={styles.emptySubtitle}>
              {searchTerm || filterType !== 'all'
                ? 'Try adjusting your search or filter criteria'
                : 'Upload some data to get started'
              }
            </Text>
            {(!searchTerm && filterType === 'all') && (
              <Pressable style={styles.emptyUploadButton} onPress={handleFileUpload}>
                <Text style={styles.emptyUploadText}>📤 Upload Data</Text>
              </Pressable>
            )}
          </View>
        ) : (
          filteredItems.map((item) => (
            <Pressable
              key={item.id}
              style={[
                styles.dataItem,
                selectedItems.has(item.id) && styles.selectedItem,
                item.status === 'error' && styles.errorItem,
              ]}
              onPress={() => handleItemSelect(item.id)}
            >
              <View style={styles.itemHeader}>
                <View style={styles.itemTitle}>
                  <Text style={styles.typeIcon}>{getTypeIcon(item.type)}</Text>
                  <Text style={styles.itemName}>{item.name}</Text>
                  <Text style={styles.statusIcon}>{getStatusIcon(item.status)}</Text>
                </View>
                
                <View style={styles.itemControls}>
                  <Pressable
                    onPress={() => onItemAction?.(item.id, item.visible ? 'hide' : 'show')}
                    style={styles.visibilityButton}
                  >
                    <Text style={styles.visibilityIcon}>
                      {item.visible ? '👁️' : '🙈'}
                    </Text>
                  </Pressable>
                  
                  <View style={styles.checkbox}>
                    <Text style={styles.checkboxIcon}>
                      {selectedItems.has(item.id) ? '☑️' : '☐'}
                    </Text>
                  </View>
                </View>
              </View>
              
              <View style={styles.itemMeta}>
                <Text style={styles.metaText}>{item.type}</Text>
                {item.features !== undefined && (
                  <Text style={styles.metaText}>{item.features.toLocaleString()} features</Text>
                )}
                {item.size && (
                  <Text style={styles.metaText}>{item.size}</Text>
                )}
              </View>
              
              {item.metadata?.tags && item.metadata.tags.length > 0 && (
                <View style={styles.tagsContainer}>
                  {item.metadata.tags.slice(0, 3).map((tag, index) => (
                    <View key={index} style={styles.tag}>
                      <Text style={styles.tagText}>{tag}</Text>
                    </View>
                  ))}
                </View>
              )}
            </Pressable>
          ))
        )}
      </ScrollView>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>
          {selectedItems.size} of {filteredItems.length} layers selected
        </Text>
        {selectedItems.size > 0 && (
          <View style={styles.footerActions}>
            <Pressable 
              onPress={() => onItemAction?.('selected', 'export')}
              style={styles.footerButton}
            >
              <Text style={styles.footerButtonText}>📤 Export</Text>
            </Pressable>
            <Pressable 
              onPress={() => onItemAction?.('selected', 'remove')}
              style={styles.footerButtonDanger}
            >
              <Text style={styles.footerButtonText}>🗑️ Remove</Text>
            </Pressable>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E1E5E9',
    borderRadius: 8,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E1E5E9',
    backgroundColor: '#FEFEFE',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333F42',
    marginRight: 8,
  },
  badge: {
    backgroundColor: '#B4975A',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  badgeText: {
    color: '#000000',
    fontSize: 10,
    fontWeight: '600',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  selectAllButton: {
    marginRight: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  selectAllText: {
    fontSize: 12,
    color: '#4A565A',
  },
  uploadButton: {
    backgroundColor: '#B4975A',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  uploadText: {
    color: '#000000',
    fontSize: 12,
    fontWeight: '600',
  },
  searchSection: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E1E5E9',
    backgroundColor: '#FEFEFE',
  },
  searchInput: {
    borderWidth: 1,
    borderColor: '#E1E5E9',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    backgroundColor: '#FFFFFF',
    marginBottom: 12,
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  filterLabel: {
    fontSize: 12,
    color: '#4A565A',
    marginRight: 8,
  },
  filterButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    backgroundColor: '#F7F7F7',
    marginRight: 4,
  },
  activeFilter: {
    backgroundColor: '#B4975A',
  },
  filterText: {
    fontSize: 10,
    color: '#333F42',
  },
  scrollView: {
    flex: 1,
  },
  emptyState: {
    padding: 32,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333F42',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 12,
    color: '#4A565A',
    textAlign: 'center',
    marginBottom: 16,
  },
  emptyUploadButton: {
    backgroundColor: '#B4975A',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  emptyUploadText: {
    color: '#000000',
    fontSize: 12,
    fontWeight: '600',
  },
  dataItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E1E5E9',
    borderLeftWidth: 3,
    borderLeftColor: 'transparent',
  },
  selectedItem: {
    backgroundColor: 'rgba(180, 151, 90, 0.1)',
    borderLeftColor: '#B4975A',
    borderLeftWidth: 4,
  },
  errorItem: {
    backgroundColor: 'rgba(200, 16, 46, 0.05)',
    borderLeftColor: '#C8102E',
    borderLeftWidth: 4,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  itemTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  typeIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  itemName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#000000',
    flex: 1,
  },
  statusIcon: {
    fontSize: 14,
    marginLeft: 8,
  },
  itemControls: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  visibilityButton: {
    padding: 4,
    marginRight: 8,
  },
  visibilityIcon: {
    fontSize: 14,
  },
  checkbox: {
    padding: 4,
  },
  checkboxIcon: {
    fontSize: 16,
  },
  itemMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 8,
  },
  metaText: {
    fontSize: 12,
    color: '#4A565A',
    marginRight: 16,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  tag: {
    backgroundColor: 'rgba(74, 86, 90, 0.1)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    marginRight: 4,
    marginBottom: 4,
  },
  tagText: {
    fontSize: 10,
    color: '#4A565A',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: '#E1E5E9',
    backgroundColor: '#FEFEFE',
  },
  footerText: {
    fontSize: 12,
    color: '#4A565A',
  },
  footerActions: {
    flexDirection: 'row',
  },
  footerButton: {
    marginLeft: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  footerButtonDanger: {
    marginLeft: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  footerButtonText: {
    fontSize: 10,
    fontWeight: '500',
  },
});

export default SimpleEnhancedDataPanel;