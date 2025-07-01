import React, { useMemo, useCallback, useState, useEffect, useRef } from 'react';
import { 
  View, 
  ScrollView, 
  Text, 
  TouchableOpacity, 
  StyleSheet, 
  Dimensions,
  Platform,
  ActivityIndicator,
  Alert
} from 'react-native';
import { FixedSizeList as List } from 'react-window';

// Base component props following our architecture
interface BaseComponentProps {
  className?: string;
  loading?: boolean;
  error?: string;
  onError?: (error: Error) => void;
}

interface DataComponentProps<T> extends BaseComponentProps {
  data: T[];
  onUpdate?: (item: T) => void;
  onDelete?: (id: string) => void;
}

// Feature data interface matching our schema
interface FeatureData {
  id: string;
  layer_id: string;
  properties: Record<string, any>;
  geometry?: any;
  created_at: Date;
  updated_at: Date;
}

// Column definition for flexible table structure
interface ColumnDefinition {
  key: string;
  title: string;
  width?: number;
  minWidth?: number;
  maxWidth?: number;
  sortable?: boolean;
  filterable?: boolean;
  renderCell?: (value: any, row: FeatureData) => React.ReactNode;
  align?: 'left' | 'center' | 'right';
  type?: 'string' | 'number' | 'date' | 'boolean' | 'geometry';
}

// Sort and filter state
interface SortConfig {
  key: string;
  direction: 'asc' | 'desc';
}

interface FilterConfig {
  key: string;
  value: string;
  operator: 'contains' | 'equals' | 'gt' | 'lt' | 'gte' | 'lte';
}

// Main DataTable props
interface DataTableProps extends DataComponentProps<FeatureData> {
  columns: ColumnDefinition[];
  height?: number;
  rowHeight?: number;
  virtualScrolling?: boolean;
  sortable?: boolean;
  filterable?: boolean;
  searchable?: boolean;
  selectable?: boolean;
  multiSelect?: boolean;
  selectedIds?: string[];
  onSelectionChange?: (selectedIds: string[]) => void;
  onSort?: (sortConfig: SortConfig) => void;
  onFilter?: (filters: FilterConfig[]) => void;
  onSearch?: (searchTerm: string) => void;
  onRowPress?: (row: FeatureData) => void;
  onRowLongPress?: (row: FeatureData) => void;
  emptyStateComponent?: React.ComponentType;
  loadingStateComponent?: React.ComponentType;
  errorStateComponent?: React.ComponentType<{ error: string; onRetry?: () => void }>;
  // Mobile-specific props
  mobileBreakpoint?: number;
  cardViewOnMobile?: boolean;
  swipeActions?: {
    left?: Array<{
      label: string;
      color: string;
      onPress: (row: FeatureData) => void;
    }>;
    right?: Array<{
      label: string;
      color: string;
      onPress: (row: FeatureData) => void;
    }>;
  };
}

// Performance optimization: memoized row component
const TableRow = React.memo<{
  item: FeatureData;
  index: number;
  columns: ColumnDefinition[];
  isSelected: boolean;
  isMobile: boolean;
  onPress?: (item: FeatureData) => void;
  onLongPress?: (item: FeatureData) => void;
  onSelectionToggle?: (id: string) => void;
  cardView?: boolean;
}>(({ 
  item, 
  index, 
  columns, 
  isSelected, 
  isMobile, 
  onPress, 
  onLongPress, 
  onSelectionToggle,
  cardView = false
}) => {
  const handlePress = useCallback(() => {
    onPress?.(item);
  }, [onPress, item]);

  const handleLongPress = useCallback(() => {
    onLongPress?.(item);
  }, [onLongPress, item]);

  const handleSelectionToggle = useCallback(() => {
    onSelectionToggle?.(item.id);
  }, [onSelectionToggle, item.id]);

  const renderCellValue = useCallback((column: ColumnDefinition, value: any) => {
    if (column.renderCell) {
      return column.renderCell(value, item);
    }

    switch (column.type) {
      case 'date':
        return value ? new Date(value).toLocaleDateString() : '';
      case 'number':
        return typeof value === 'number' ? value.toLocaleString() : value?.toString() || '';
      case 'boolean':
        return value ? '✓' : '✗';
      case 'geometry':
        return value ? 'Geometry Present' : 'No Geometry';
      default:
        return value?.toString() || '';
    }
  }, [item]);

  if (cardView && isMobile) {
    // Card view for mobile devices
    return (
      <TouchableOpacity
        style={[styles.cardRow, isSelected && styles.selectedRow]}
        onPress={handlePress}
        onLongPress={handleLongPress}
        activeOpacity={0.7}
      >
        <View style={styles.cardContent}>
          {columns.slice(0, 3).map((column) => {
            const value = item.properties[column.key] || item[column.key as keyof FeatureData];
            return (
              <View key={column.key} style={styles.cardField}>
                <Text style={styles.cardFieldLabel}>{column.title}</Text>
                <Text style={styles.cardFieldValue}>
                  {renderCellValue(column, value)}
                </Text>
              </View>
            );
          })}
        </View>
        {onSelectionToggle && (
          <TouchableOpacity
            style={styles.selectionButton}
            onPress={handleSelectionToggle}
          >
            <View style={[styles.checkbox, isSelected && styles.checkedBox]}>
              {isSelected && <Text style={styles.checkmark}>✓</Text>}
            </View>
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    );
  }

  // Traditional table row view
  return (
    <TouchableOpacity
      style={[
        styles.tableRow, 
        index % 2 === 0 && styles.evenRow,
        isSelected && styles.selectedRow
      ]}
      onPress={handlePress}
      onLongPress={handleLongPress}
      activeOpacity={0.7}
    >
      {onSelectionToggle && (
        <View style={styles.cellContainer}>
          <TouchableOpacity onPress={handleSelectionToggle}>
            <View style={[styles.checkbox, isSelected && styles.checkedBox]}>
              {isSelected && <Text style={styles.checkmark}>✓</Text>}
            </View>
          </TouchableOpacity>
        </View>
      )}
      
      {columns.map((column) => {
        const value = item.properties[column.key] || item[column.key as keyof FeatureData];
        return (
          <View
            key={column.key}
            style={[
              styles.cellContainer,
              { 
                width: column.width || (isMobile ? 120 : 150),
                minWidth: column.minWidth || (isMobile ? 80 : 100),
                maxWidth: column.maxWidth || (isMobile ? 200 : 300)
              }
            ]}
          >
            <Text
              style={[
                styles.cellText,
                column.align === 'center' && styles.centerAlign,
                column.align === 'right' && styles.rightAlign
              ]}
              numberOfLines={isMobile ? 1 : 2}
              ellipsizeMode="tail"
            >
              {renderCellValue(column, value)}
            </Text>
          </View>
        );
      })}
    </TouchableOpacity>
  );
});

// Main DataTable component
export const DataTable: React.FC<DataTableProps> = ({
  data = [],
  columns = [],
  loading = false,
  error,
  onError,
  height = 400,
  rowHeight = 50,
  virtualScrolling = true,
  sortable = true,
  filterable = false,
  searchable = false,
  selectable = false,
  multiSelect = false,
  selectedIds = [],
  onSelectionChange,
  onSort,
  onFilter,
  onSearch,
  onRowPress,
  onRowLongPress,
  onUpdate,
  onDelete,
  emptyStateComponent: EmptyStateComponent,
  loadingStateComponent: LoadingStateComponent,
  errorStateComponent: ErrorStateComponent,
  mobileBreakpoint = 768,
  cardViewOnMobile = true,
  swipeActions,
  className
}) => {
  // State management
  const [sortConfig, setSortConfig] = useState<SortConfig | null>(null);
  const [filters, setFilters] = useState<FilterConfig[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [screenData, setScreenData] = useState(Dimensions.get('window'));
  
  // Refs for performance
  const listRef = useRef<any>(null);

  // Determine if we're on mobile
  const isMobile = screenData.width < mobileBreakpoint;
  const useCardView = cardViewOnMobile && isMobile;

  // Listen for screen size changes
  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setScreenData(window);
    });

    return () => subscription?.remove();
  }, []);

  // Process data (sort, filter, search)
  const processedData = useMemo(() => {
    let result = [...data];

    // Apply search
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      result = result.filter(item =>
        columns.some(column => {
          const value = item.properties[column.key] || item[column.key as keyof FeatureData];
          return value?.toString().toLowerCase().includes(searchLower);
        })
      );
    }

    // Apply filters
    filters.forEach(filter => {
      result = result.filter(item => {
        const value = item.properties[filter.key] || item[filter.key as keyof FeatureData];
        
        switch (filter.operator) {
          case 'contains':
            return value?.toString().toLowerCase().includes(filter.value.toLowerCase());
          case 'equals':
            return value?.toString() === filter.value;
          case 'gt':
            return Number(value) > Number(filter.value);
          case 'lt':
            return Number(value) < Number(filter.value);
          case 'gte':
            return Number(value) >= Number(filter.value);
          case 'lte':
            return Number(value) <= Number(filter.value);
          default:
            return true;
        }
      });
    });

    // Apply sorting
    if (sortConfig) {
      result.sort((a, b) => {
        const aValue = a.properties[sortConfig.key] || a[sortConfig.key as keyof FeatureData];
        const bValue = b.properties[sortConfig.key] || b[sortConfig.key as keyof FeatureData];
        
        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return result;
  }, [data, searchTerm, filters, sortConfig, columns]);

  // Handle sorting
  const handleSort = useCallback((columnKey: string) => {
    if (!sortable) return;

    const newSortConfig: SortConfig = {
      key: columnKey,
      direction: 
        sortConfig?.key === columnKey && sortConfig.direction === 'asc' 
          ? 'desc' 
          : 'asc'
    };

    setSortConfig(newSortConfig);
    onSort?.(newSortConfig);
  }, [sortable, sortConfig, onSort]);

  // Handle selection
  const handleSelectionToggle = useCallback((id: string) => {
    if (!selectable) return;

    let newSelectedIds: string[];
    
    if (multiSelect) {
      newSelectedIds = selectedIds.includes(id)
        ? selectedIds.filter(selectedId => selectedId !== id)
        : [...selectedIds, id];
    } else {
      newSelectedIds = selectedIds.includes(id) ? [] : [id];
    }

    onSelectionChange?.(newSelectedIds);
  }, [selectable, multiSelect, selectedIds, onSelectionChange]);

  // Render methods
  const renderTableHeader = () => {
    if (useCardView) return null;

    return (
      <View style={styles.headerRow}>
        {selectable && (
          <View style={styles.cellContainer}>
            <Text style={styles.headerText}>Select</Text>
          </View>
        )}
        
        {columns.map((column) => (
          <TouchableOpacity
            key={column.key}
            style={[
              styles.cellContainer,
              styles.headerCell,
              { 
                width: column.width || (isMobile ? 120 : 150),
                minWidth: column.minWidth || (isMobile ? 80 : 100),
                maxWidth: column.maxWidth || (isMobile ? 200 : 300)
              }
            ]}
            onPress={() => column.sortable !== false && handleSort(column.key)}
            disabled={!sortable || column.sortable === false}
          >
            <Text style={styles.headerText}>
              {column.title}
              {sortConfig?.key === column.key && (
                <Text style={styles.sortIndicator}>
                  {sortConfig.direction === 'asc' ? ' ↑' : ' ↓'}
                </Text>
              )}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  const renderRow = useCallback(({ item, index }: { item: FeatureData; index: number }) => (
    <TableRow
      item={item}
      index={index}
      columns={columns}
      isSelected={selectedIds.includes(item.id)}
      isMobile={isMobile}
      onPress={onRowPress}
      onLongPress={onRowLongPress}
      onSelectionToggle={selectable ? handleSelectionToggle : undefined}
      cardView={useCardView}
    />
  ), [
    columns, 
    selectedIds, 
    isMobile, 
    onRowPress, 
    onRowLongPress, 
    selectable, 
    handleSelectionToggle, 
    useCardView
  ]);

  // Error handling
  useEffect(() => {
    if (error && onError) {
      onError(new Error(error));
    }
  }, [error, onError]);

  // Loading state
  if (loading) {
    if (LoadingStateComponent) {
      return <LoadingStateComponent />;
    }
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.statusText}>Loading data...</Text>
      </View>
    );
  }

  // Error state
  if (error) {
    if (ErrorStateComponent) {
      return <ErrorStateComponent error={error} onRetry={() => window.location.reload()} />;
    }
    return (
      <View style={[styles.container, styles.centerContent]}>
        <Text style={styles.errorText}>Error: {error}</Text>
        <TouchableOpacity 
          style={styles.retryButton}
          onPress={() => window.location.reload()}
        >
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Empty state
  if (processedData.length === 0) {
    if (EmptyStateComponent) {
      return <EmptyStateComponent />;
    }
    return (
      <View style={[styles.container, styles.centerContent]}>
        <Text style={styles.emptyText}>
          {data.length === 0 ? 'No data available' : 'No results found'}
        </Text>
      </View>
    );
  }

  // Main render
  return (
    <View style={[styles.container, { height }, className && { className }]}>
      {renderTableHeader()}
      
      {virtualScrolling && processedData.length > 50 ? (
        // Virtual scrolling for large datasets (performance requirement)
        <List
          ref={listRef}
          height={height - (useCardView ? 0 : 40)}
          itemCount={processedData.length}
          itemSize={useCardView ? (isMobile ? 120 : 80) : rowHeight}
          itemData={processedData}
          overscanCount={5}
        >
          {({ index, style, data: listData }) => (
            <div style={style}>
              {renderRow({ item: listData[index], index })}
            </div>
          )}
        </List>
      ) : (
        // Regular scrolling for smaller datasets
        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={true}
          showsHorizontalScrollIndicator={!useCardView}
          horizontal={!useCardView && !isMobile}
        >
          {processedData.map((item, index) => (
            <View key={item.id}>
              {renderRow({ item, index })}
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
};

// Styles optimized for both web and mobile
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e1e5e9',
    overflow: 'hidden',
    ...Platform.select({
      web: {
        userSelect: 'none',
      },
    }),
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  headerRow: {
    flexDirection: 'row',
    backgroundColor: '#f8f9fa',
    borderBottomWidth: 2,
    borderBottomColor: '#e1e5e9',
    minHeight: 40,
  },
  headerCell: {
    paddingVertical: 10,
  },
  cellContainer: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    justifyContent: 'center',
    borderRightWidth: 1,
    borderRightColor: '#e1e5e9',
  },
  headerText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#495057',
  },
  sortIndicator: {
    fontSize: 12,
    color: '#007AFF',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e1e5e9',
    minHeight: 50,
    backgroundColor: '#ffffff',
  },
  evenRow: {
    backgroundColor: '#f8f9fa',
  },
  selectedRow: {
    backgroundColor: '#e3f2fd',
  },
  cellText: {
    fontSize: 14,
    color: '#495057',
  },
  centerAlign: {
    textAlign: 'center',
  },
  rightAlign: {
    textAlign: 'right',
  },
  cardRow: {
    margin: 8,
    padding: 16,
    backgroundColor: '#ffffff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e1e5e9',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  cardContent: {
    flex: 1,
  },
  cardField: {
    marginBottom: 8,
  },
  cardFieldLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6c757d',
    marginBottom: 2,
  },
  cardFieldValue: {
    fontSize: 14,
    color: '#495057',
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderColor: '#6c757d',
    borderRadius: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkedBox: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  checkmark: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  selectionButton: {
    position: 'absolute',
    top: 16,
    right: 16,
  },
  scrollView: {
    flex: 1,
  },
  statusText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6c757d',
  },
  errorText: {
    fontSize: 16,
    color: '#dc3545',
    textAlign: 'center',
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 16,
    color: '#6c757d',
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 6,
  },
  retryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default DataTable;