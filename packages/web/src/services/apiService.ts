// API Service Layer for Frontend-Backend Integration
import { Feature } from '../components/DrawingMapComponent/DrawingMapComponent';

const API_BASE_URL = 'http://localhost:8000/api';

// Types for API responses
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface SpatialFeature {
  id: string;
  name?: string;
  geometry: any;
  properties: Record<string, any>;
  created_at?: string;
  updated_at?: string;
}

export interface Dataset {
  id: string;
  name: string;
  description?: string;
  feature_count: number;
  bounds?: number[];
  created_at: string;
}

class ApiService {
  private baseUrl: string;
  private authToken: string | null = null;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
    this.loadAuthToken();
  }

  // Authentication methods
  private loadAuthToken(): void {
    this.authToken = localStorage.getItem('auth_token');
  }

  private saveAuthToken(token: string): void {
    this.authToken = token;
    localStorage.setItem('auth_token', token);
  }

  private clearAuthToken(): void {
    this.authToken = null;
    localStorage.removeItem('auth_token');
  }

  private getHeaders(): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (this.authToken) {
      headers['Authorization'] = `Bearer ${this.authToken}`;
    }

    return headers;
  }

  // Generic API request method
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    try {
      const url = `${this.baseUrl}${endpoint}`;
      const response = await fetch(url, {
        ...options,
        headers: {
          ...this.getHeaders(),
          ...options.headers,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return { success: true, data };
    } catch (error) {
      console.error('API Request Error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  // Authentication API
  async login(email: string, password: string): Promise<ApiResponse<{ token: string; user: any }>> {
    const response = await this.request<{ token: string; user: any }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });

    if (response.success && response.data?.token) {
      this.saveAuthToken(response.data.token);
    }

    return response;
  }

  async register(userData: {
    username: string;
    email: string;
    password: string;
    full_name: string;
  }): Promise<ApiResponse<{ user: any }>> {
    return this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  }

  async logout(): Promise<void> {
    this.clearAuthToken();
  }

  async getCurrentUser(): Promise<ApiResponse<any>> {
    return this.request('/auth/profile');
  }

  // Spatial Features API
  async getFeatures(params?: {
    bbox?: number[];
    limit?: number;
    offset?: number;
  }): Promise<ApiResponse<SpatialFeature[]>> {
    const queryParams = new URLSearchParams();
    
    if (params?.bbox) {
      queryParams.append('bbox', params.bbox.join(','));
    }
    if (params?.limit) {
      queryParams.append('limit', params.limit.toString());
    }
    if (params?.offset) {
      queryParams.append('offset', params.offset.toString());
    }

    const endpoint = `/spatial/features${queryParams.toString() ? `?${queryParams}` : ''}`;
    return this.request(endpoint);
  }

  async saveFeature(feature: Feature): Promise<ApiResponse<SpatialFeature>> {
    const spatialFeature = {
      geometry: feature.geometry,
      properties: feature.properties || {},
      name: feature.properties?.name || `Feature ${Date.now()}`,
    };

    return this.request('/spatial/features', {
      method: 'POST',
      body: JSON.stringify(spatialFeature),
    });
  }

  async updateFeature(
    id: string,
    updates: Partial<SpatialFeature>
  ): Promise<ApiResponse<SpatialFeature>> {
    return this.request(`/spatial/features/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  async deleteFeature(id: string): Promise<ApiResponse<void>> {
    return this.request(`/spatial/features/${id}`, {
      method: 'DELETE',
    });
  }

  async saveMultipleFeatures(features: Feature[]): Promise<ApiResponse<SpatialFeature[]>> {
    const spatialFeatures = features.map(feature => ({
      geometry: feature.geometry,
      properties: feature.properties || {},
      name: feature.properties?.name || `Feature ${Date.now()}`,
    }));

    return this.request('/spatial/features/batch', {
      method: 'POST',
      body: JSON.stringify({ features: spatialFeatures }),
    });
  }

  // Datasets API
  async getDatasets(): Promise<ApiResponse<Dataset[]>> {
    return this.request('/spatial/datasets');
  }

  async createDataset(dataset: {
    name: string;
    description?: string;
  }): Promise<ApiResponse<Dataset>> {
    return this.request('/spatial/datasets', {
      method: 'POST',
      body: JSON.stringify(dataset),
    });
  }

  // File Upload API
  async uploadFile(
    file: File,
    options?: {
      dataset_id?: string;
      preview_only?: boolean;
    }
  ): Promise<ApiResponse<any>> {
    const formData = new FormData();
    formData.append('file', file);
    
    if (options?.dataset_id) {
      formData.append('dataset_id', options.dataset_id);
    }
    if (options?.preview_only) {
      formData.append('preview_only', 'true');
    }

    const headers: HeadersInit = {};
    if (this.authToken) {
      headers['Authorization'] = `Bearer ${this.authToken}`;
    }

    try {
      const response = await fetch(`${this.baseUrl}/data-import/file`, {
        method: 'POST',
        headers,
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return { success: true, data };
    } catch (error) {
      console.error('File Upload Error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Upload failed',
      };
    }
  }

  // Spatial Analysis API
  async performSpatialQuery(query: {
    type: 'proximity' | 'buffer' | 'intersection';
    geometry?: any;
    distance?: number;
    units?: 'meters' | 'kilometers' | 'miles';
    target_layer?: string;
  }): Promise<ApiResponse<SpatialFeature[]>> {
    return this.request('/spatial/query', {
      method: 'POST',
      body: JSON.stringify(query),
    });
  }

  // Health check
  async healthCheck(): Promise<ApiResponse<{ status: string; timestamp: string }>> {
    try {
      const response = await fetch(`${this.baseUrl.replace('/api', '')}/health`);
      if (!response.ok) {
        throw new Error('Health check failed');
      }
      const data = await response.json();
      return { success: true, data };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Health check failed',
      };
    }
  }

  // Check if user is authenticated
  isAuthenticated(): boolean {
    return !!this.authToken;
  }
}

// Create and export singleton instance
export const apiService = new ApiService();

// Export types
export type { SpatialFeature, Dataset, ApiResponse };