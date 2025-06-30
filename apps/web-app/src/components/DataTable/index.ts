export { DataTable } from './DataTable';
export type { 
  ColumnDefinition,
  DataTableProps,
  FeatureData,
  SortConfig,
  FilterConfig
} from './DataTable';

// Re-export common column configurations
export const commonColumns = {
  id: {
    key: 'id',
    title: 'ID',
    width: 100,
    sortable: true,
    type: 'string' as const
  },
  name: {
    key: 'name',
    title: 'Name',
    width: 200,
    sortable: true,
    filterable: true,
    type: 'string' as const
  },
  description: {
    key: 'description',
    title: 'Description',
    width: 300,
    sortable: true,
    filterable: true,
    type: 'string' as const
  },
  geometry: {
    key: 'geometry',
    title: 'Geometry',
    width: 120,
    sortable: false,
    type: 'geometry' as const,
    align: 'center' as const
  },
  created_at: {
    key: 'created_at',
    title: 'Created',
    width: 150,
    sortable: true,
    type: 'date' as const
  },
  updated_at: {
    key: 'updated_at',
    title: 'Updated',
    width: 150,
    sortable: true,
    type: 'date' as const
  }
};