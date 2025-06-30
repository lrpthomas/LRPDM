/**
 * Performance Monitoring and Adaptive Learning System
 * Tracks agent performance and adjusts behavior based on outcomes
 */

import { EventEmitter } from 'events';
import { Logger } from 'winston';
import { 
  PerformanceMetric, 
  LearningEvent, 
  TaskType, 
  AgentProfile,
  Decision 
} from '../types/autonomy';

export interface PerformanceThresholds {
  taskCompletionTime: {
    excellent: number;
    good: number;
    acceptable: number;
  };
  successRate: {
    excellent: number;
    good: number;
    acceptable: number;
  };
  resourceUsage: {
    cpu: number;
    memory: number;
    network: number;
  };
}

export interface AdaptiveParameters {
  confidenceMultiplier: number;
  complexityThreshold: number;
  riskTolerance: number;
  learningRate: number;
  explorationRate: number;
}

export interface AgentPerformance {
  agentId: string;
  metrics: {
    tasksCompleted: number;
    tasksSuccessful: number;
    tasksFailed: number;
    averageCompletionTime: number;
    averageConfidence: number;
    resourceEfficiency: number;
  };
  trends: {
    successRateTrend: 'improving' | 'stable' | 'declining';
    performanceTrend: 'improving' | 'stable' | 'declining';
    learningVelocity: number;
  };
  recommendations: string[];
}

export class PerformanceMonitor extends EventEmitter {
  private metrics: Map<string, PerformanceMetric[]> = new Map();
  private learningEvents: LearningEvent[] = [];
  private agentPerformance: Map<string, AgentPerformance> = new Map();
  private adaptiveParameters: Map<string, AdaptiveParameters> = new Map();
  private thresholds: PerformanceThresholds;
  private logger: Logger;
  private analysisInterval: NodeJS.Timer;

  constructor(logger: Logger, thresholds: PerformanceThresholds) {
    super();
    this.logger = logger;
    this.thresholds = thresholds;
    this.initializeAdaptiveParameters();
    this.startContinuousAnalysis();
  }

  /**
   * Initialize adaptive parameters for each agent type
   */
  private initializeAdaptiveParameters(): void {
    const defaultParams: AdaptiveParameters = {
      confidenceMultiplier: 1.0,
      complexityThreshold: 50,
      riskTolerance: 30,
      learningRate: 0.1,
      explorationRate: 0.2
    };

    // Set type-specific parameters
    this.adaptiveParameters.set('frontend', {
      ...defaultParams,
      complexityThreshold: 60,
      riskTolerance: 40
    });

    this.adaptiveParameters.set('backend', {
      ...defaultParams,
      complexityThreshold: 70,
      riskTolerance: 25
    });

    this.adaptiveParameters.set('database', {
      ...defaultParams,
      complexityThreshold: 80,
      riskTolerance: 15,
      learningRate: 0.05 // More conservative learning
    });

    this.adaptiveParameters.set('infrastructure', {
      ...defaultParams,
      complexityThreshold: 75,
      riskTolerance: 10,
      explorationRate: 0.1 // Less exploration in production
    });
  }

  /**
   * Record a performance metric
   */
  recordMetric(metric: PerformanceMetric): void {
    const key = `${metric.agentId}_${metric.metric}`;
    
    if (!this.metrics.has(key)) {
      this.metrics.set(key, []);
    }

    const metricArray = this.metrics.get(key)!;
    metricArray.push(metric);

    // Keep only last 1000 metrics per key
    if (metricArray.length > 1000) {
      metricArray.shift();
    }

    // Real-time analysis for critical metrics
    if (this.isCriticalMetric(metric)) {
      this.analyzeMetricInRealTime(metric);
    }

    this.emit('metricRecorded', metric);
  }

  /**
   * Record a learning event
   */
  recordLearningEvent(event: LearningEvent): void {
    this.learningEvents.push(event);

    // Keep only last 5000 events
    if (this.learningEvents.length > 5000) {
      this.learningEvents = this.learningEvents.slice(-5000);
    }

    // Apply learning immediately
    this.applyLearning(event);

    this.emit('learningEventRecorded', event);
    
    this.logger.info('Learning event recorded', {
      agentId: event.agentId,
      eventType: event.eventType,
      taskType: event.taskType
    });
  }

  /**
   * Apply learning from an event
   */
  private applyLearning(event: LearningEvent): void {
    const agentType = this.getAgentType(event.agentId);
    const params = this.adaptiveParameters.get(agentType);
    
    if (!params) return;

    switch (event.eventType) {
      case 'success':
        // Increase confidence and complexity threshold
        params.confidenceMultiplier = Math.min(1.5, params.confidenceMultiplier + 0.05);
        params.complexityThreshold = Math.min(90, params.complexityThreshold + 2);
        break;
        
      case 'failure':
        // Decrease confidence and be more conservative
        params.confidenceMultiplier = Math.max(0.5, params.confidenceMultiplier - 0.1);
        params.riskTolerance = Math.max(5, params.riskTolerance - 5);
        break;
        
      case 'feedback':
        // Adjust based on human feedback
        if (event.outcome === 'positive') {
          params.learningRate = Math.min(0.3, params.learningRate + 0.02);
        } else {
          params.explorationRate = Math.max(0.05, params.explorationRate - 0.02);
        }
        break;
        
      case 'adjustment':
        // Apply specific adjustments
        if (event.adjustments) {
          for (const adjustment of event.adjustments) {
            if (params.hasOwnProperty(adjustment.parameter)) {
              (params as any)[adjustment.parameter] = adjustment.newValue;
            }
          }
        }
        break;
    }

    this.adaptiveParameters.set(agentType, params);
    this.emit('parametersAdjusted', { agentType, params });
  }

  /**
   * Analyze task performance
   */
  analyzeTaskPerformance(
    agentId: string,
    taskId: string,
    decision: Decision,
    outcome: 'success' | 'failure',
    duration: number
  ): void {
    // Record performance metrics
    this.recordMetric({
      timestamp: new Date(),
      agentId,
      taskId,
      metric: 'task_duration',
      value: duration,
      unit: 'ms'
    });

    this.recordMetric({
      timestamp: new Date(),
      agentId,
      taskId,
      metric: 'task_outcome',
      value: outcome === 'success' ? 1 : 0,
      unit: 'boolean'
    });

    this.recordMetric({
      timestamp: new Date(),
      agentId,
      taskId,
      metric: 'decision_confidence',
      value: decision.confidence,
      unit: 'percentage'
    });

    // Generate learning event
    const learnings = this.generateLearnings(decision, outcome, duration);
    
    this.recordLearningEvent({
      timestamp: new Date(),
      eventType: outcome,
      agentId,
      taskType: TaskType.SPATIAL_ANALYSIS, // This should come from the task
      outcome: outcome,
      learnings,
      adjustments: this.generateAdjustments(decision, outcome, duration)
    });

    // Update agent performance profile
    this.updateAgentPerformance(agentId, outcome, duration, decision.confidence);
  }

  /**
   * Generate learnings from task outcome
   */
  private generateLearnings(
    decision: Decision,
    outcome: 'success' | 'failure',
    duration: number
  ): string[] {
    const learnings: string[] = [];

    if (outcome === 'success') {
      if (duration < this.thresholds.taskCompletionTime.excellent) {
        learnings.push('Task completed faster than expected - confidence threshold may be too conservative');
      }
      if (decision.confidence > 90) {
        learnings.push('High confidence prediction was accurate');
      }
    } else {
      if (decision.confidence > 80) {
        learnings.push('High confidence prediction was incorrect - review decision criteria');
      }
      if (decision.complexity > 70) {
        learnings.push('Complex task failed - consider human intervention for similar tasks');
      }
      if (decision.risk > 50) {
        learnings.push('High-risk task failed - adjust risk tolerance');
      }
    }

    return learnings;
  }

  /**
   * Generate parameter adjustments based on outcome
   */
  private generateAdjustments(
    decision: Decision,
    outcome: 'success' | 'failure',
    duration: number
  ): Array<{ parameter: string; oldValue: any; newValue: any }> | undefined {
    const adjustments = [];

    if (outcome === 'failure' && decision.confidence > 80) {
      // Overconfident failure - reduce confidence multiplier
      adjustments.push({
        parameter: 'confidenceMultiplier',
        oldValue: 1.0,
        newValue: 0.9
      });
    }

    if (outcome === 'success' && duration < this.thresholds.taskCompletionTime.excellent) {
      // Fast success - can handle more complexity
      adjustments.push({
        parameter: 'complexityThreshold',
        oldValue: 50,
        newValue: 55
      });
    }

    return adjustments.length > 0 ? adjustments : undefined;
  }

  /**
   * Update agent performance profile
   */
  private updateAgentPerformance(
    agentId: string,
    outcome: 'success' | 'failure',
    duration: number,
    confidence: number
  ): void {
    if (!this.agentPerformance.has(agentId)) {
      this.agentPerformance.set(agentId, {
        agentId,
        metrics: {
          tasksCompleted: 0,
          tasksSuccessful: 0,
          tasksFailed: 0,
          averageCompletionTime: 0,
          averageConfidence: 0,
          resourceEfficiency: 100
        },
        trends: {
          successRateTrend: 'stable',
          performanceTrend: 'stable',
          learningVelocity: 0
        },
        recommendations: []
      });
    }

    const performance = this.agentPerformance.get(agentId)!;
    
    // Update metrics
    performance.metrics.tasksCompleted++;
    if (outcome === 'success') {
      performance.metrics.tasksSuccessful++;
    } else {
      performance.metrics.tasksFailed++;
    }

    // Update moving averages
    const alpha = 0.1; // Smoothing factor
    performance.metrics.averageCompletionTime = 
      alpha * duration + (1 - alpha) * performance.metrics.averageCompletionTime;
    performance.metrics.averageConfidence = 
      alpha * confidence + (1 - alpha) * performance.metrics.averageConfidence;

    // Calculate trends
    performance.trends = this.calculateTrends(agentId);
    
    // Generate recommendations
    performance.recommendations = this.generateRecommendations(performance);

    this.agentPerformance.set(agentId, performance);
  }

  /**
   * Calculate performance trends
   */
  private calculateTrends(agentId: string): AgentPerformance['trends'] {
    const recentMetrics = this.getRecentMetrics(agentId, 100);
    
    // Calculate success rate trend
    const successRates = this.calculateWindowedSuccessRates(recentMetrics, 20);
    const successTrend = this.calculateTrend(successRates);

    // Calculate performance trend
    const completionTimes = recentMetrics
      .filter(m => m.metric === 'task_duration')
      .map(m => m.value);
    const performanceTrend = this.calculateTrend(completionTimes.reverse()); // Reverse because lower is better

    // Calculate learning velocity
    const learningVelocity = this.calculateLearningVelocity(agentId);

    return {
      successRateTrend: successTrend > 0.02 ? 'improving' : successTrend < -0.02 ? 'declining' : 'stable',
      performanceTrend: performanceTrend > 0.02 ? 'improving' : performanceTrend < -0.02 ? 'declining' : 'stable',
      learningVelocity
    };
  }

  /**
   * Calculate windowed success rates
   */
  private calculateWindowedSuccessRates(metrics: PerformanceMetric[], windowSize: number): number[] {
    const outcomes = metrics.filter(m => m.metric === 'task_outcome');
    const rates: number[] = [];

    for (let i = windowSize; i <= outcomes.length; i++) {
      const window = outcomes.slice(i - windowSize, i);
      const successCount = window.filter(m => m.value === 1).length;
      rates.push(successCount / windowSize);
    }

    return rates;
  }

  /**
   * Calculate trend slope
   */
  private calculateTrend(values: number[]): number {
    if (values.length < 2) return 0;

    // Simple linear regression
    const n = values.length;
    const sumX = (n * (n - 1)) / 2;
    const sumY = values.reduce((a, b) => a + b, 0);
    const sumXY = values.reduce((sum, y, x) => sum + x * y, 0);
    const sumX2 = (n * (n - 1) * (2 * n - 1)) / 6;

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    return slope;
  }

  /**
   * Calculate learning velocity
   */
  private calculateLearningVelocity(agentId: string): number {
    const recentLearning = this.learningEvents
      .filter(e => e.agentId === agentId)
      .slice(-50);

    if (recentLearning.length < 10) return 0;

    const successRate = recentLearning.filter(e => e.eventType === 'success').length / recentLearning.length;
    const adjustmentRate = recentLearning.filter(e => e.adjustments && e.adjustments.length > 0).length / recentLearning.length;

    return successRate * (1 - adjustmentRate); // High success with low adjustments = fast learning
  }

  /**
   * Generate recommendations for agent improvement
   */
  private generateRecommendations(performance: AgentPerformance): string[] {
    const recommendations: string[] = [];

    // Success rate recommendations
    const successRate = performance.metrics.tasksSuccessful / performance.metrics.tasksCompleted;
    if (successRate < this.thresholds.successRate.acceptable) {
      recommendations.push('Consider additional training or reducing task complexity');
    }

    // Performance recommendations
    if (performance.metrics.averageCompletionTime > this.thresholds.taskCompletionTime.acceptable) {
      recommendations.push('Optimize algorithms or increase resource allocation');
    }

    // Confidence recommendations
    if (performance.metrics.averageConfidence < 70) {
      recommendations.push('Review decision criteria and improve confidence calculations');
    } else if (performance.metrics.averageConfidence > 95 && successRate < 0.9) {
      recommendations.push('Overconfidence detected - calibrate confidence thresholds');
    }

    // Trend-based recommendations
    if (performance.trends.successRateTrend === 'declining') {
      recommendations.push('Investigate recent failures and adjust parameters');
    }

    if (performance.trends.learningVelocity < 0.3) {
      recommendations.push('Increase exploration rate to accelerate learning');
    }

    return recommendations;
  }

  /**
   * Start continuous performance analysis
   */
  private startContinuousAnalysis(): void {
    this.analysisInterval = setInterval(() => {
      this.performComprehensiveAnalysis();
    }, 60000); // Every minute
  }

  /**
   * Perform comprehensive analysis of all agents
   */
  private performComprehensiveAnalysis(): void {
    const analysis = {
      timestamp: new Date(),
      overallHealth: this.calculateOverallHealth(),
      agentStatuses: this.getAgentStatuses(),
      systemRecommendations: this.generateSystemRecommendations(),
      alerts: this.generateAlerts()
    };

    this.emit('analysisComplete', analysis);

    // Log summary
    this.logger.info('Performance analysis completed', {
      overallHealth: analysis.overallHealth,
      activeAgents: analysis.agentStatuses.length,
      alerts: analysis.alerts.length
    });
  }

  /**
   * Calculate overall system health
   */
  private calculateOverallHealth(): number {
    const performances = Array.from(this.agentPerformance.values());
    
    if (performances.length === 0) return 100;

    const avgSuccessRate = performances.reduce((sum, p) => 
      sum + (p.metrics.tasksSuccessful / p.metrics.tasksCompleted), 0
    ) / performances.length;

    const avgEfficiency = performances.reduce((sum, p) => 
      sum + p.metrics.resourceEfficiency, 0
    ) / performances.length;

    return (avgSuccessRate * 50 + avgEfficiency * 0.5);
  }

  /**
   * Get current status of all agents
   */
  private getAgentStatuses(): Array<{
    agentId: string;
    status: 'healthy' | 'degraded' | 'critical';
    successRate: number;
    lastActive: Date;
  }> {
    return Array.from(this.agentPerformance.entries()).map(([agentId, performance]) => {
      const successRate = performance.metrics.tasksSuccessful / performance.metrics.tasksCompleted;
      
      let status: 'healthy' | 'degraded' | 'critical';
      if (successRate >= this.thresholds.successRate.good) {
        status = 'healthy';
      } else if (successRate >= this.thresholds.successRate.acceptable) {
        status = 'degraded';
      } else {
        status = 'critical';
      }

      return {
        agentId,
        status,
        successRate,
        lastActive: new Date() // This should come from actual activity tracking
      };
    });
  }

  /**
   * Generate system-wide recommendations
   */
  private generateSystemRecommendations(): string[] {
    const recommendations: string[] = [];
    const performances = Array.from(this.agentPerformance.values());

    // Check for systemic issues
    const avgSuccessRate = performances.reduce((sum, p) => 
      sum + (p.metrics.tasksSuccessful / p.metrics.tasksCompleted), 0
    ) / performances.length;

    if (avgSuccessRate < 0.8) {
      recommendations.push('System-wide success rate below target - consider reviewing task assignment logic');
    }

    // Check for resource constraints
    const avgEfficiency = performances.reduce((sum, p) => 
      sum + p.metrics.resourceEfficiency, 0
    ) / performances.length;

    if (avgEfficiency < 70) {
      recommendations.push('Resource efficiency low - consider scaling infrastructure');
    }

    // Check learning velocity
    const avgLearningVelocity = performances.reduce((sum, p) => 
      sum + p.trends.learningVelocity, 0
    ) / performances.length;

    if (avgLearningVelocity < 0.5) {
      recommendations.push('Learning velocity low - increase training data or adjust learning parameters');
    }

    return recommendations;
  }

  /**
   * Generate alerts for critical conditions
   */
  private generateAlerts(): Array<{
    severity: 'warning' | 'error' | 'critical';
    message: string;
    agentId?: string;
    metric?: string;
  }> {
    const alerts: Array<{
      severity: 'warning' | 'error' | 'critical';
      message: string;
      agentId?: string;
      metric?: string;
    }> = [];

    // Check each agent
    for (const [agentId, performance] of this.agentPerformance) {
      const successRate = performance.metrics.tasksSuccessful / performance.metrics.tasksCompleted;

      if (successRate < 0.5) {
        alerts.push({
          severity: 'critical',
          message: `Agent ${agentId} success rate critically low`,
          agentId
        });
      }

      if (performance.trends.successRateTrend === 'declining' && successRate < 0.7) {
        alerts.push({
          severity: 'error',
          message: `Agent ${agentId} performance declining rapidly`,
          agentId
        });
      }
    }

    // Check system-wide metrics
    const overallHealth = this.calculateOverallHealth();
    if (overallHealth < 50) {
      alerts.push({
        severity: 'critical',
        message: 'Overall system health critical'
      });
    }

    return alerts;
  }

  /**
   * Check if metric is critical
   */
  private isCriticalMetric(metric: PerformanceMetric): boolean {
    return metric.metric === 'task_outcome' || 
           metric.metric === 'error_rate' ||
           metric.metric === 'response_time' && metric.value > 5000;
  }

  /**
   * Analyze metric in real-time for immediate action
   */
  private analyzeMetricInRealTime(metric: PerformanceMetric): void {
    if (metric.metric === 'error_rate' && metric.value > 0.1) {
      this.emit('criticalAlert', {
        type: 'high_error_rate',
        agentId: metric.agentId,
        value: metric.value
      });
    }

    if (metric.metric === 'response_time' && metric.value > 10000) {
      this.emit('criticalAlert', {
        type: 'slow_response',
        agentId: metric.agentId,
        value: metric.value
      });
    }
  }

  /**
   * Get recent metrics for an agent
   */
  private getRecentMetrics(agentId: string, limit: number): PerformanceMetric[] {
    const allMetrics: PerformanceMetric[] = [];
    
    for (const [key, metrics] of this.metrics) {
      if (key.startsWith(agentId)) {
        allMetrics.push(...metrics);
      }
    }

    return allMetrics
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  /**
   * Get agent type from ID
   */
  private getAgentType(agentId: string): string {
    // Extract type from agent ID pattern
    const match = agentId.match(/^(\w+)-/);
    return match ? match[1] : 'general';
  }

  /**
   * Get current adaptive parameters for an agent
   */
  getAdaptiveParameters(agentType: string): AdaptiveParameters | undefined {
    return this.adaptiveParameters.get(agentType);
  }

  /**
   * Get performance report for an agent
   */
  getAgentPerformanceReport(agentId: string): AgentPerformance | undefined {
    return this.agentPerformance.get(agentId);
  }

  /**
   * Get system performance summary
   */
  getSystemPerformanceSummary(): {
    totalAgents: number;
    healthyAgents: number;
    degradedAgents: number;
    criticalAgents: number;
    overallSuccessRate: number;
    overallEfficiency: number;
    systemHealth: number;
  } {
    const statuses = this.getAgentStatuses();
    const performances = Array.from(this.agentPerformance.values());

    const healthyAgents = statuses.filter(s => s.status === 'healthy').length;
    const degradedAgents = statuses.filter(s => s.status === 'degraded').length;
    const criticalAgents = statuses.filter(s => s.status === 'critical').length;

    const overallSuccessRate = performances.length > 0
      ? performances.reduce((sum, p) => 
          sum + (p.metrics.tasksSuccessful / p.metrics.tasksCompleted), 0
        ) / performances.length
      : 0;

    const overallEfficiency = performances.length > 0
      ? performances.reduce((sum, p) => sum + p.metrics.resourceEfficiency, 0) / performances.length
      : 100;

    return {
      totalAgents: statuses.length,
      healthyAgents,
      degradedAgents,
      criticalAgents,
      overallSuccessRate,
      overallEfficiency,
      systemHealth: this.calculateOverallHealth()
    };
  }

  /**
   * Stop performance monitoring
   */
  stop(): void {
    if (this.analysisInterval) {
      clearInterval(this.analysisInterval);
    }
  }
}