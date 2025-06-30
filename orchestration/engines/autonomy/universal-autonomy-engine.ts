/**
 * Universal Autonomy Engine for GIS Platform
 * Provides autonomous decision-making capabilities for routine tasks
 */

import { EventEmitter } from 'events';
import { Logger } from 'winston';
import { AgentCapability, AutonomyLevel, Decision, Task, TaskType } from '../../types/autonomy';

export interface AutonomyConfig {
  level: AutonomyLevel;
  capabilities: AgentCapability[];
  decisionThresholds: {
    confidence: number;
    complexity: number;
    risk: number;
  };
  humanInterventionRules: {
    alwaysRequireFor: TaskType[];
    complexityThreshold: number;
    riskThreshold: number;
  };
}

export class UniversalAutonomyEngine extends EventEmitter {
  private config: AutonomyConfig;
  private logger: Logger;
  private decisionHistory: Decision[] = [];
  private learningModel: Map<string, number> = new Map();

  constructor(config: AutonomyConfig, logger: Logger) {
    super();
    this.config = config;
    this.logger = logger;
    this.initializeLearningModel();
  }

  /**
   * Evaluate if a task can be handled autonomously
   */
  async evaluateAutonomy(task: Task): Promise<Decision> {
    const startTime = Date.now();
    
    // Calculate task metrics
    const complexity = this.calculateComplexity(task);
    const risk = this.calculateRisk(task);
    const confidence = this.calculateConfidence(task);
    
    // Check if human intervention is required
    const requiresHuman = this.requiresHumanIntervention(task, complexity, risk);
    
    // Make decision
    const decision: Decision = {
      taskId: task.id,
      timestamp: new Date(),
      autonomous: !requiresHuman && this.meetsAutonomyThresholds(confidence, complexity, risk),
      confidence,
      complexity,
      risk,
      reasoning: this.generateReasoning(task, confidence, complexity, risk, requiresHuman),
      suggestedActions: this.generateSuggestedActions(task),
      estimatedDuration: this.estimateTaskDuration(task),
      requiredCapabilities: this.identifyRequiredCapabilities(task)
    };

    // Log decision
    this.logDecision(decision);
    
    // Update learning model
    this.updateLearningModel(task, decision);
    
    // Emit decision event
    this.emit('decision', decision);
    
    const duration = Date.now() - startTime;
    this.logger.info(`Autonomy evaluation completed in ${duration}ms`, {
      taskId: task.id,
      autonomous: decision.autonomous,
      confidence: decision.confidence
    });

    return decision;
  }

  /**
   * Calculate task complexity based on multiple factors
   */
  private calculateComplexity(task: Task): number {
    let complexity = 0;

    // Spatial complexity factors
    if (task.type === TaskType.SPATIAL_ANALYSIS) {
      complexity += task.metadata?.geometryCount || 0;
      complexity += (task.metadata?.spatialOperations || []).length * 10;
      complexity += task.metadata?.dataVolume ? Math.log10(task.metadata.dataVolume) : 0;
    }

    // Database complexity factors
    if (task.type === TaskType.DATABASE_OPTIMIZATION) {
      complexity += task.metadata?.tableCount || 0;
      complexity += task.metadata?.indexCount || 0;
      complexity += task.metadata?.queryComplexity || 0;
    }

    // Infrastructure complexity factors
    if (task.type === TaskType.INFRASTRUCTURE_SCALING) {
      complexity += task.metadata?.nodeCount || 0;
      complexity += task.metadata?.serviceCount || 0;
      complexity += task.metadata?.dependencyDepth || 0;
    }

    // Normalize to 0-100 scale
    return Math.min(100, complexity);
  }

  /**
   * Calculate risk assessment for the task
   */
  private calculateRisk(task: Task): number {
    let risk = 0;

    // Production impact
    if (task.environment === 'production') {
      risk += 30;
    }

    // Data sensitivity
    if (task.metadata?.dataClassification === 'sensitive') {
      risk += 20;
    }

    // Irreversible operations
    if (task.metadata?.irreversible) {
      risk += 25;
    }

    // Financial impact
    if (task.metadata?.financialImpact) {
      risk += Math.min(25, task.metadata.financialImpact / 1000);
    }

    // User impact
    if (task.metadata?.affectedUsers) {
      risk += Math.min(20, Math.log10(task.metadata.affectedUsers) * 5);
    }

    return Math.min(100, risk);
  }

  /**
   * Calculate confidence based on historical performance
   */
  private calculateConfidence(task: Task): number {
    const taskTypeKey = `${task.type}_${task.subType || 'general'}`;
    const historicalSuccess = this.learningModel.get(taskTypeKey) || 0.5;
    
    let confidence = historicalSuccess * 100;

    // Boost confidence for well-documented tasks
    if (task.metadata?.documentation) {
      confidence += 10;
    }

    // Boost confidence for tasks with clear success criteria
    if (task.metadata?.successCriteria?.length > 0) {
      confidence += 15;
    }

    // Reduce confidence for new task types
    if (!this.learningModel.has(taskTypeKey)) {
      confidence *= 0.7;
    }

    return Math.min(100, Math.max(0, confidence));
  }

  /**
   * Check if human intervention is required
   */
  private requiresHumanIntervention(task: Task, complexity: number, risk: number): boolean {
    // Always require human for specific task types
    if (this.config.humanInterventionRules.alwaysRequireFor.includes(task.type)) {
      return true;
    }

    // Check complexity threshold
    if (complexity > this.config.humanInterventionRules.complexityThreshold) {
      return true;
    }

    // Check risk threshold
    if (risk > this.config.humanInterventionRules.riskThreshold) {
      return true;
    }

    // Check for regulatory compliance requirements
    if (task.metadata?.requiresCompliance) {
      return true;
    }

    return false;
  }

  /**
   * Check if task meets autonomy thresholds
   */
  private meetsAutonomyThresholds(confidence: number, complexity: number, risk: number): boolean {
    return (
      confidence >= this.config.decisionThresholds.confidence &&
      complexity <= this.config.decisionThresholds.complexity &&
      risk <= this.config.decisionThresholds.risk
    );
  }

  /**
   * Generate reasoning for the decision
   */
  private generateReasoning(
    task: Task,
    confidence: number,
    complexity: number,
    risk: number,
    requiresHuman: boolean
  ): string {
    const reasons = [];

    if (requiresHuman) {
      if (this.config.humanInterventionRules.alwaysRequireFor.includes(task.type)) {
        reasons.push(`Task type '${task.type}' always requires human intervention per policy`);
      }
      if (complexity > this.config.humanInterventionRules.complexityThreshold) {
        reasons.push(`Complexity score (${complexity.toFixed(1)}) exceeds threshold`);
      }
      if (risk > this.config.humanInterventionRules.riskThreshold) {
        reasons.push(`Risk score (${risk.toFixed(1)}) exceeds threshold`);
      }
    } else {
      if (confidence >= this.config.decisionThresholds.confidence) {
        reasons.push(`High confidence (${confidence.toFixed(1)}%) based on historical success`);
      }
      if (complexity <= this.config.decisionThresholds.complexity) {
        reasons.push(`Manageable complexity (${complexity.toFixed(1)})`);
      }
      if (risk <= this.config.decisionThresholds.risk) {
        reasons.push(`Acceptable risk level (${risk.toFixed(1)})`);
      }
    }

    return reasons.join('; ');
  }

  /**
   * Generate suggested actions for the task
   */
  private generateSuggestedActions(task: Task): string[] {
    const actions = [];

    switch (task.type) {
      case TaskType.SPATIAL_ANALYSIS:
        actions.push('Validate input geometries');
        actions.push('Create spatial indexes if missing');
        actions.push('Optimize query with ST_DWithin');
        actions.push('Cache results in Redis');
        break;
      
      case TaskType.DATABASE_OPTIMIZATION:
        actions.push('Analyze table statistics');
        actions.push('Review query execution plans');
        actions.push('Create appropriate indexes');
        actions.push('Schedule vacuum operations');
        break;
      
      case TaskType.INFRASTRUCTURE_SCALING:
        actions.push('Monitor current resource usage');
        actions.push('Implement horizontal pod autoscaling');
        actions.push('Configure resource limits');
        actions.push('Set up monitoring alerts');
        break;
      
      case TaskType.CODE_GENERATION:
        actions.push('Generate TypeScript interfaces');
        actions.push('Create unit tests');
        actions.push('Add JSDoc documentation');
        actions.push('Implement error handling');
        break;
      
      case TaskType.QUALITY_ASSURANCE:
        actions.push('Run automated test suites');
        actions.push('Perform code coverage analysis');
        actions.push('Execute performance benchmarks');
        actions.push('Generate quality reports');
        break;
    }

    return actions;
  }

  /**
   * Estimate task duration based on complexity and type
   */
  private estimateTaskDuration(task: Task): number {
    const baseTime = {
      [TaskType.SPATIAL_ANALYSIS]: 300000, // 5 minutes
      [TaskType.DATABASE_OPTIMIZATION]: 600000, // 10 minutes
      [TaskType.INFRASTRUCTURE_SCALING]: 900000, // 15 minutes
      [TaskType.CODE_GENERATION]: 120000, // 2 minutes
      [TaskType.QUALITY_ASSURANCE]: 1800000, // 30 minutes
      [TaskType.DATA_IMPORT]: 600000, // 10 minutes
      [TaskType.API_INTEGRATION]: 300000 // 5 minutes
    };

    const base = baseTime[task.type] || 300000;
    const complexityMultiplier = 1 + (this.calculateComplexity(task) / 100);
    
    return Math.round(base * complexityMultiplier);
  }

  /**
   * Identify required capabilities for the task
   */
  private identifyRequiredCapabilities(task: Task): AgentCapability[] {
    const capabilities: AgentCapability[] = [];

    switch (task.type) {
      case TaskType.SPATIAL_ANALYSIS:
        capabilities.push(
          AgentCapability.SPATIAL_QUERY_OPTIMIZATION,
          AgentCapability.GEOMETRY_PROCESSING,
          AgentCapability.INDEX_MANAGEMENT
        );
        break;
      
      case TaskType.DATABASE_OPTIMIZATION:
        capabilities.push(
          AgentCapability.QUERY_ANALYSIS,
          AgentCapability.INDEX_MANAGEMENT,
          AgentCapability.PERFORMANCE_TUNING
        );
        break;
      
      case TaskType.INFRASTRUCTURE_SCALING:
        capabilities.push(
          AgentCapability.KUBERNETES_MANAGEMENT,
          AgentCapability.RESOURCE_MONITORING,
          AgentCapability.AUTO_SCALING
        );
        break;
      
      case TaskType.CODE_GENERATION:
        capabilities.push(
          AgentCapability.TYPESCRIPT_GENERATION,
          AgentCapability.REACT_COMPONENTS,
          AgentCapability.API_DESIGN
        );
        break;
    }

    return capabilities;
  }

  /**
   * Initialize learning model with baseline values
   */
  private initializeLearningModel(): void {
    // Set baseline success rates for different task types
    this.learningModel.set('SPATIAL_ANALYSIS_general', 0.85);
    this.learningModel.set('DATABASE_OPTIMIZATION_index', 0.90);
    this.learningModel.set('DATABASE_OPTIMIZATION_query', 0.80);
    this.learningModel.set('INFRASTRUCTURE_SCALING_horizontal', 0.75);
    this.learningModel.set('CODE_GENERATION_component', 0.95);
    this.learningModel.set('QUALITY_ASSURANCE_testing', 0.88);
  }

  /**
   * Update learning model based on task outcomes
   */
  private updateLearningModel(task: Task, decision: Decision): void {
    const taskTypeKey = `${task.type}_${task.subType || 'general'}`;
    const currentRate = this.learningModel.get(taskTypeKey) || 0.5;
    
    // This will be updated based on actual task outcomes
    // For now, we'll simulate a slight improvement
    const newRate = currentRate * 0.95 + decision.confidence / 100 * 0.05;
    this.learningModel.set(taskTypeKey, newRate);
  }

  /**
   * Log decision for audit trail
   */
  private logDecision(decision: Decision): void {
    this.decisionHistory.push(decision);
    
    // Keep only last 1000 decisions in memory
    if (this.decisionHistory.length > 1000) {
      this.decisionHistory = this.decisionHistory.slice(-1000);
    }

    this.logger.info('Autonomy decision made', {
      taskId: decision.taskId,
      autonomous: decision.autonomous,
      confidence: decision.confidence,
      complexity: decision.complexity,
      risk: decision.risk
    });
  }

  /**
   * Get decision history for analysis
   */
  getDecisionHistory(limit?: number): Decision[] {
    if (limit) {
      return this.decisionHistory.slice(-limit);
    }
    return [...this.decisionHistory];
  }

  /**
   * Get current autonomy level
   */
  getAutonomyLevel(): AutonomyLevel {
    return this.config.level;
  }

  /**
   * Update autonomy level dynamically
   */
  setAutonomyLevel(level: AutonomyLevel): void {
    this.config.level = level;
    this.emit('autonomyLevelChanged', level);
    this.logger.info(`Autonomy level changed to: ${level}`);
  }
}