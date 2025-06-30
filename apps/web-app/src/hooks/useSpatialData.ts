// React Hook for Spatial Data Management
import { useState, useEffect, useCallback } from 'react';
import { apiService, SpatialFeature, ApiResponse } from '../services/apiService';
import { Feature } from '../components/DrawingMapComponent/DrawingMapComponent';

interface UseSpatialDataOptions {
  autoLoad?: boolean;
  bbox?: number[];
  limit?: number;
}

interface SpatialDataState {
  features: SpatialFeature[];
  loading: boolean;
  error: string | null;
  lastUpdated: Date | null;
}

export const useSpatialData = (options: UseSpatialDataOptions = {}) => {
  const { autoLoad = true, bbox, limit = 1000 } = options;

  const [state, setState] = useState<SpatialDataState>({
    features: [],
    loading: false,
    error: null,
    lastUpdated: null,
  });

  const [pendingFeatures, setPendingFeatures] = useState<Feature[]>([]);

  // Load features from backend
  const loadFeatures = useCallback(async (params?: {
    bbox?: number[];
    limit?: number;
    offset?: number;
  }) => {
    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const response = await apiService.getFeatures(params);
      
      if (response.success && response.data) {
        setState(prev => ({
          ...prev,
          features: response.data || [],
          loading: false,
          lastUpdated: new Date(),
        }));
      } else {
        setState(prev => ({
          ...prev,
          loading: false,
          error: response.error || 'Failed to load features',
        }));
      }
    } catch (error) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }));
    }
  }, []);

  // Save a single feature
  const saveFeature = useCallback(async (feature: Feature): Promise<boolean> => {
    try {
      const response = await apiService.saveFeature(feature);
      
      if (response.success && response.data) {
        setState(prev => ({
          ...prev,
          features: [...prev.features, response.data!],
          lastUpdated: new Date(),
        }));
        
        // Remove from pending if it was there
        setPendingFeatures(prev => 
          prev.filter(f => f.id !== feature.id)
        );
        
        return true;
      } else {
        console.error('Failed to save feature:', response.error);
        return false;
      }
    } catch (error) {
      console.error('Error saving feature:', error);
      return false;
    }
  }, []);

  // Save multiple features at once
  const saveMultipleFeatures = useCallback(async (features: Feature[]): Promise<number> => {
    if (features.length === 0) return 0;

    try {
      const response = await apiService.saveMultipleFeatures(features);
      
      if (response.success && response.data) {
        setState(prev => ({
          ...prev,
          features: [...prev.features, ...response.data!],
          lastUpdated: new Date(),
        }));
        
        // Clear pending features that were saved
        const savedIds = response.data.map(f => f.id);
        setPendingFeatures(prev => 
          prev.filter(f => !savedIds.includes(f.id))
        );
        
        return response.data.length;
      } else {
        console.error('Failed to save features:', response.error);
        return 0;
      }
    } catch (error) {
      console.error('Error saving features:', error);
      return 0;
    }
  }, []);

  // Update an existing feature
  const updateFeature = useCallback(async (
    id: string, 
    updates: Partial<SpatialFeature>
  ): Promise<boolean> => {
    try {
      const response = await apiService.updateFeature(id, updates);
      
      if (response.success && response.data) {
        setState(prev => ({
          ...prev,
          features: prev.features.map(f => 
            f.id === id ? { ...f, ...response.data! } : f
          ),
          lastUpdated: new Date(),
        }));
        return true;
      } else {
        console.error('Failed to update feature:', response.error);
        return false;
      }
    } catch (error) {
      console.error('Error updating feature:', error);
      return false;
    }
  }, []);

  // Delete a feature
  const deleteFeature = useCallback(async (id: string): Promise<boolean> => {
    try {
      const response = await apiService.deleteFeature(id);
      
      if (response.success) {
        setState(prev => ({
          ...prev,
          features: prev.features.filter(f => f.id !== id),
          lastUpdated: new Date(),
        }));
        return true;
      } else {
        console.error('Failed to delete feature:', response.error);
        return false;
      }
    } catch (error) {
      console.error('Error deleting feature:', error);
      return false;
    }
  }, []);

  // Add feature to pending list (for offline use or batch saving)
  const addPendingFeature = useCallback((feature: Feature) => {
    setPendingFeatures(prev => {
      const existingIndex = prev.findIndex(f => f.id === feature.id);
      if (existingIndex >= 0) {
        // Update existing pending feature
        const updated = [...prev];
        updated[existingIndex] = feature;
        return updated;
      } else {
        // Add new pending feature
        return [...prev, feature];
      }
    });
  }, []);

  // Save all pending features
  const savePendingFeatures = useCallback(async (): Promise<number> => {
    if (pendingFeatures.length === 0) return 0;
    return await saveMultipleFeatures(pendingFeatures);
  }, [pendingFeatures, saveMultipleFeatures]);

  // Clear all pending features
  const clearPendingFeatures = useCallback(() => {
    setPendingFeatures([]);
  }, []);

  // Refresh data
  const refresh = useCallback(() => {
    loadFeatures({ bbox, limit });
  }, [loadFeatures, bbox, limit]);

  // Auto-load on mount
  useEffect(() => {
    if (autoLoad) {
      loadFeatures({ bbox, limit });
    }
  }, [autoLoad, loadFeatures, bbox, limit]);

  // Convert SpatialFeature to Feature format for map rendering
  const getFeaturesForMap = useCallback((): Feature[] => {
    const dbFeatures: Feature[] = state.features.map(sf => ({
      id: sf.id,
      type: 'Feature',
      geometry: sf.geometry,
      properties: {
        ...sf.properties,
        name: sf.name,
        source: 'database',
        created_at: sf.created_at,
        updated_at: sf.updated_at,
      },
    }));

    const pendingMapped: Feature[] = pendingFeatures.map(f => ({
      ...f,
      properties: {
        ...f.properties,
        source: 'pending',
        isPending: true,
      },
    }));

    return [...dbFeatures, ...pendingMapped];
  }, [state.features, pendingFeatures]);

  return {
    // State
    features: state.features,
    loading: state.loading,
    error: state.error,
    lastUpdated: state.lastUpdated,
    pendingFeatures,
    hasPendingFeatures: pendingFeatures.length > 0,
    
    // Actions
    loadFeatures,
    saveFeature,
    saveMultipleFeatures,
    updateFeature,
    deleteFeature,
    addPendingFeature,
    savePendingFeatures,
    clearPendingFeatures,
    refresh,
    
    // Helpers
    getFeaturesForMap,
    totalFeatureCount: state.features.length + pendingFeatures.length,
  };
};

export default useSpatialData;