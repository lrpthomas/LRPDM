import React, { useState, useMemo } from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { DataTable, ColumnDefinition, FeatureData, commonColumns } from './index';

// Example usage component
export const DataTableExample: React.FC = () => {
  // Mock data that would come from your API
  const [features, setFeatures] = useState<FeatureData[]>([
    {
      id: '1',
      layer_id: 'layer-1',
      properties: {
        name: 'Location A',
        description: 'Sample point location',
        category: 'Restaurant',
        rating: 4.5,
        population: 15000
      },
      geometry: { type: 'Point', coordinates: [-74.006, 40.7128] },
      created_at: new Date('2024-01-15'),
      updated_at: new Date('2024-01-20')
    },
    {
      id: '2',
      layer_id: 'layer-1',
      properties: {
        name: 'Location B',
        description: 'Another sample location',
        category: 'Park',
        rating: 4.2,
        population: 25000
      },
      geometry: { type: 'Point', coordinates: [-74.007, 40.7135] },
      created_at: new Date('2024-01-16'),
      updated_at: new Date('2024-01-21')
    },
    // Add more mock data...
    ...Array.from({ length: 100 }, (_, i) => ({
      id: `feature-${i + 3}`,
      layer_id: 'layer-1',
      properties: {
        name: `Feature ${i + 3}`,
        description: `Generated feature ${i + 3}`,
        category: ['Restaurant', 'Park', 'Shop', 'Office'][i % 4],
        rating: Math.round((Math.random() * 5) * 10) / 10,
        population: Math.floor(Math.random() * 100000)
      },
      geometry: { 
        type: 'Point', 
        coordinates: [
          -74.006 + (Math.random() - 0.5) * 0.1,
          40.7128 + (Math.random() - 0.5) * 0.1
        ] 
      },
      created_at: new Date(2024, 0, Math.floor(Math.random() * 30) + 1),
      updated_at: new Date(2024, 0, Math.floor(Math.random() * 30) + 1)
    }))
  ]);

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  // Define columns with custom renderers
  const columns: ColumnDefinition[] = useMemo(() => [
    commonColumns.id,
    {
      ...commonColumns.name,
      renderCell: (value: string, row: FeatureData) => (
        <Text style={styles.nameCell}>
          {value}
          {row.properties.category && (
            <Text style={styles.categoryBadge}> • {row.properties.category}</Text>
          )}
        </Text>
      )
    },
    commonColumns.description,
    {
      key: 'rating',
      title: 'Rating',
      width: 100,
      sortable: true,
      type: 'number',
      align: 'center',
      renderCell: (value: number) => (
        <Text style={styles.ratingCell}>
          {'★'.repeat(Math.floor(value))} {value?.toFixed(1)}
        </Text>
      )
    },
    {
      key: 'population',
      title: 'Population',
      width: 120,
      sortable: true,
      type: 'number',
      align: 'right',
      renderCell: (value: number) => (
        <Text style={styles.numberCell}>
          {value?.toLocaleString()}
        </Text>
      )
    },
    commonColumns.geometry,
    commonColumns.created_at,
    {
      key: 'actions',
      title: 'Actions',
      width: 100,
      sortable: false,
      align: 'center',
      renderCell: (_, row: FeatureData) => (
        <View style={styles.actionsCell}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleEdit(row)}
          >
            <Text style={styles.actionButtonText}>Edit</Text>
          </TouchableOpacity>
        </View>
      )
    }
  ], []);

  // Event handlers
  const handleRowPress = (row: FeatureData) => {
    console.log('Row pressed:', row.properties.name);
    // Navigate to detail view or show modal
  };

  const handleRowLongPress = (row: FeatureData) => {
    console.log('Row long pressed:', row.properties.name);
    // Show context menu
  };

  const handleSelectionChange = (newSelectedIds: string[]) => {
    setSelectedIds(newSelectedIds);
    console.log('Selection changed:', newSelectedIds);
  };

  const handleEdit = (row: FeatureData) => {
    console.log('Edit feature:', row.properties.name);
    // Show edit modal or navigate to edit page
  };

  const handleDelete = (id: string) => {
    console.log('Delete feature:', id);
    setFeatures(prev => prev.filter(f => f.id !== id));
  };

  const handleUpdate = (item: FeatureData) => {
    console.log('Update feature:', item.properties.name);
    setFeatures(prev => prev.map(f => f.id === item.id ? item : f));
  };

  const handleSort = (sortConfig: any) => {
    console.log('Sort:', sortConfig);
    // Sorting is handled internally by the component
  };

  const handleBulkDelete = () => {
    if (selectedIds.length === 0) return;
    
    setFeatures(prev => prev.filter(f => !selectedIds.includes(f.id)));
    setSelectedIds([]);
  };

  const handleRefresh = () => {
    setLoading(true);
    // Simulate API call
    setTimeout(() => {
      setLoading(false);
      console.log('Data refreshed');
    }, 2000);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Feature Data Table</Text>
        
        <View style={styles.toolbar}>
          <TouchableOpacity
            style={styles.toolbarButton}
            onPress={handleRefresh}
          >
            <Text style={styles.toolbarButtonText}>Refresh</Text>
          </TouchableOpacity>
          
          {selectedIds.length > 0 && (
            <TouchableOpacity
              style={[styles.toolbarButton, styles.deleteButton]}
              onPress={handleBulkDelete}
            >
              <Text style={styles.deleteButtonText}>
                Delete ({selectedIds.length})
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <DataTable
        data={features}
        columns={columns}
        loading={loading}
        height={600}
        virtualScrolling={true}
        sortable={true}
        selectable={true}
        multiSelect={true}
        selectedIds={selectedIds}
        onSelectionChange={handleSelectionChange}
        onRowPress={handleRowPress}
        onRowLongPress={handleRowLongPress}
        onSort={handleSort}
        onUpdate={handleUpdate}
        onDelete={handleDelete}
        cardViewOnMobile={true}
        mobileBreakpoint={768}
        swipeActions={{
          right: [
            {
              label: 'Edit',
              color: '#007AFF',
              onPress: handleEdit
            },
            {
              label: 'Delete',
              color: '#FF3B30',
              onPress: (row) => handleDelete(row.id)
            }
          ]
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f5f5f5',
  },
  header: {
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#333',
  },
  toolbar: {
    flexDirection: 'row',
    gap: 12,
  },
  toolbarButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  toolbarButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  deleteButton: {
    backgroundColor: '#FF3B30',
  },
  deleteButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  nameCell: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  categoryBadge: {
    fontSize: 12,
    color: '#666',
    fontWeight: 'normal',
  },
  ratingCell: {
    fontSize: 12,
    color: '#FF9500',
  },
  numberCell: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  actionsCell: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  actionButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  actionButtonText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
});

export default DataTableExample;