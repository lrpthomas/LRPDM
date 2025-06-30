/**
 * Type definitions for the GIS Platform Autonomy System
 */

export enum AutonomyLevel {
  NONE = 'NONE',                       // No autonomy - all decisions require human approval
  ASSISTED = 'ASSISTED',               // AI suggests actions, human approves
  SUPERVISED = 'SUPERVISED',           // AI acts autonomously for low-risk tasks
  MANAGED = 'MANAGED',                 // AI handles most tasks, escalates high-risk
  FULL = 'FULL'                        // Full autonomy within defined boundaries
}

export enum TaskType {
  SPATIAL_ANALYSIS = 'SPATIAL_ANALYSIS',
  DATABASE_OPTIMIZATION = 'DATABASE_OPTIMIZATION',
  INFRASTRUCTURE_SCALING = 'INFRASTRUCTURE_SCALING',
  CODE_GENERATION = 'CODE_GENERATION',
  QUALITY_ASSURANCE = 'QUALITY_ASSURANCE',
  DATA_IMPORT = 'DATA_IMPORT',
  API_INTEGRATION = 'API_INTEGRATION'
}

export enum AgentCapability {
  // Spatial capabilities
  SPATIAL_QUERY_OPTIMIZATION = 'SPATIAL_QUERY_OPTIMIZATION',
  GEOMETRY_PROCESSING = 'GEOMETRY_PROCESSING',
  TILE_GENERATION = 'TILE_GENERATION',
  SPATIAL_INDEXING = 'SPATIAL_INDEXING',
  
  // Database capabilities
  QUERY_ANALYSIS = 'QUERY_ANALYSIS',
  INDEX_MANAGEMENT = 'INDEX_MANAGEMENT',
  PERFORMANCE_TUNING = 'PERFORMANCE_TUNING',
  BACKUP_MANAGEMENT = 'BACKUP_MANAGEMENT',
  
  // Infrastructure capabilities
  KUBERNETES_MANAGEMENT = 'KUBERNETES_MANAGEMENT',
  RESOURCE_MONITORING = 'RESOURCE_MONITORING',
  AUTO_SCALING = 'AUTO_SCALING',
  DEPLOYMENT_AUTOMATION = 'DEPLOYMENT_AUTOMATION',
  
  // Development capabilities
  TYPESCRIPT_GENERATION = 'TYPESCRIPT_GENERATION',
  REACT_COMPONENTS = 'REACT_COMPONENTS',
  API_DESIGN = 'API_DESIGN',
  TEST_GENERATION = 'TEST_GENERATION',
  
  // Quality capabilities
  CODE_REVIEW = 'CODE_REVIEW',
  SECURITY_SCANNING = 'SECURITY_SCANNING',
  PERFORMANCE_TESTING = 'PERFORMANCE_TESTING',
  COMPLIANCE_CHECKING = 'COMPLIANCE_CHECKING'
}

export interface Task {
  id: string;
  type: TaskType;
  subType?: string;
  title: string;
  description: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  environment: 'development' | 'staging' | 'production';
  requester: string;
  createdAt: Date;
  deadline?: Date;
  metadata?: {
    // Spatial metadata
    geometryCount?: number;
    spatialOperations?: string[];
    dataVolume?: number;
    
    // Database metadata
    tableCount?: number;
    indexCount?: number;
    queryComplexity?: number;
    
    // Infrastructure metadata
    nodeCount?: number;
    serviceCount?: number;
    dependencyDepth?: number;
    
    // General metadata
    dataClassification?: 'public' | 'internal' | 'sensitive' | 'restricted';
    irreversible?: boolean;
    financialImpact?: number;
    affectedUsers?: number;
    documentation?: string;
    successCriteria?: string[];
    requiresCompliance?: boolean;
  };
}

export interface Decision {
  taskId: string;
  timestamp: Date;
  autonomous: boolean;
  confidence: number;
  complexity: number;
  risk: number;
  reasoning: string;
  suggestedActions: string[];
  estimatedDuration: number;
  requiredCapabilities: AgentCapability[];
}

export interface AgentProfile {
  id: string;
  name: string;
  type: 'frontend' | 'backend' | 'database' | 'infrastructure' | 'quality';
  capabilities: AgentCapability[];
  autonomyLevel: AutonomyLevel;
  specializations: string[];
  constraints: string[];
  performance: {
    tasksCompleted: number;
    successRate: number;
    averageTime: number;
    lastActive: Date;
  };
}

export interface QualityGate {
  id: string;
  name: string;
  type: 'pre-execution' | 'post-execution' | 'continuous';
  criteria: QualityCriteria[];
  severity: 'INFO' | 'WARNING' | 'ERROR' | 'FATAL';
  automated: boolean;
}

export interface QualityCriteria {
  metric: string;
  operator: 'equals' | 'greater' | 'less' | 'contains' | 'regex';
  threshold: string | number;
  description: string;
}

export interface CommunicationProtocol {
  channel: 'sync' | 'async' | 'event';
  format: 'json' | 'grpc' | 'graphql';
  encryption: boolean;
  authentication: 'jwt' | 'mtls' | 'api-key';
  retryPolicy: {
    maxAttempts: number;
    backoffMultiplier: number;
    initialDelay: number;
  };
}

export interface PerformanceMetric {
  timestamp: Date;
  agentId: string;
  taskId: string;
  metric: string;
  value: number;
  unit: string;
  context?: Record<string, any>;
}

export interface LearningEvent {
  timestamp: Date;
  eventType: 'success' | 'failure' | 'feedback' | 'adjustment';
  agentId: string;
  taskType: TaskType;
  outcome: string;
  learnings: string[];
  adjustments?: {
    parameter: string;
    oldValue: any;
    newValue: any;
  }[];
}