/**
 * Universal Autonomy Engine for GIS Platform
 * Enterprise Multi-Agent Orchestration Framework
 */

import { EventEmitter } from 'events';
import * as yaml from 'yaml';
import * as fs from 'fs';
import * as path from 'path';

interface AgentConfig {
  enabled: boolean;
  autonomy_level: number;
  responsibilities: string[];
  decision_threshold: {
    confidence: number;
    risk_tolerance: number;
  };
}

interface DecisionContext {
  action_type: string;
  code_changes?: any;
  spatial_data?: any;
  performance_metrics?: any;
  security_context?: any;
  team_availability?: number;
  similar_past_decisions?: number;
  complexity_score?: number;
  test_coverage?: number;
}

interface Decision {
  action: string;
  confidence: number;
  risk_level: number;
  reasoning: string;
  escalation_required: boolean;
  estimated_impact: string;
  rollback_plan?: string;
}

export class UniversalAutonomyEngine extends EventEmitter {
  private config: any;
  private decisionHistory: Decision[] = [];
  private performanceMetrics: Map<string, number[]> = new Map();
  private teamMaturityScore: number = 0.7; // Default intermediate
  
  constructor(configPath: string = '.agents/config.yaml') {
    super();
    this.loadConfiguration(configPath);
    this.initializeMetrics();
  }
  
  private loadConfiguration(configPath: string): void {
    try {
      const configFile = fs.readFileSync(path.resolve(configPath), 'utf8');
      this.config = yaml.parse(configFile);
      this.teamMaturityScore = this.mapMaturityToScore(this.config.team.maturity);
    } catch (error) {
      console.error('Failed to load agent configuration:', error);
      throw new Error('Configuration loading failed');
    }
  }
  
  private mapMaturityToScore(maturity: string): number {
    const maturityMap = {
      'BEGINNER': 0.5,
      'INTERMEDIATE': 0.7,
      'ADVANCED': 0.9
    };
    return maturityMap[maturity] || 0.7;
  }
  
  private initializeMetrics(): void {
    // Initialize performance tracking for each agent type
    Object.keys(this.config.agents).forEach(agentType => {
      this.performanceMetrics.set(agentType, []);
    });
  }
  
  /**
   * Core decision-making method for autonomous actions
   */
  public async makeDecision(
    agentType: string, 
    context: DecisionContext
  ): Promise<Decision> {
    const agentConfig = this.config.agents[agentType];
    
    if (!agentConfig?.enabled) {
      throw new Error(`Agent ${agentType} is not enabled`);
    }
    
    // Calculate decision factors
    const confidence = this.calculateConfidence(context, agentType);
    const riskLevel = this.assessRisk(context, agentType);
    
    // Apply team maturity adjustments
    const adjustedThreshold = agentConfig.decision_threshold.confidence * this.teamMaturityScore;
    const adjustedRiskTolerance = agentConfig.decision_threshold.risk_tolerance * (1 + (1 - this.teamMaturityScore) * 0.5);
    
    // Generate decision
    const decision: Decision = {
      action: this.determineAction(context, confidence, riskLevel),
      confidence,
      risk_level: riskLevel,
      reasoning: this.generateReasoning(context, confidence, riskLevel),
      escalation_required: this.shouldEscalate(confidence, riskLevel, adjustedThreshold, adjustedRiskTolerance),
      estimated_impact: this.estimateImpact(context, agentType),
      rollback_plan: this.generateRollbackPlan(context, agentType)
    };
    
    // Store decision for learning
    this.decisionHistory.push(decision);
    this.emit('decision_made', { agentType, decision, context });
    
    return decision;
  }
  
  private calculateConfidence(context: DecisionContext, agentType: string): number {
    const factors = {
      similar_past_decisions: context.similar_past_decisions || this.findSimilarDecisions(context, agentType),
      code_complexity: this.assessComplexity(context),
      test_coverage: context.test_coverage || 0.8,
      team_guidelines_match: this.checkGuidelinesCompliance(context, agentType),
      spatial_data_quality: this.assessSpatialDataQuality(context),
      performance_history: this.getAgentPerformanceHistory(agentType)
    };
    
    // Weighted confidence calculation for GIS-specific factors
    const weights = {
      similar_past_decisions: 0.25,
      code_complexity: 0.20,
      test_coverage: 0.20,
      team_guidelines_match: 0.15,
      spatial_data_quality: 0.10,
      performance_history: 0.10
    };
    
    let confidence = 0;
    Object.entries(factors).forEach(([factor, value]) => {
      confidence += (value || 0) * weights[factor];
    });
    
    return Math.min(1.0, Math.max(0.0, confidence));
  }
  
  private assessRisk(context: DecisionContext, agentType: string): number {
    const riskFactors = {
      change_scope: this.assessChangeScope(context),
      production_impact: this.assessProductionImpact(context),
      security_implications: this.assessSecurityImplications(context),
      spatial_data_integrity: this.assessSpatialDataIntegrity(context),
      rollback_complexity: this.assessRollbackComplexity(context),
      team_availability: 1 - (context.team_availability || 0.8)
    };
    
    // Higher values = higher risk
    const weights = {
      change_scope: 0.20,
      production_impact: 0.25,
      security_implications: 0.20,
      spatial_data_integrity: 0.15,
      rollback_complexity: 0.10,
      team_availability: 0.10
    };
    
    let risk = 0;
    Object.entries(riskFactors).forEach(([factor, value]) => {
      risk += (value || 0) * weights[factor];
    });
    
    return Math.min(1.0, Math.max(0.0, risk));
  }
  
  private determineAction(context: DecisionContext, confidence: number, riskLevel: number): string {
    if (confidence >= 0.9 && riskLevel <= 0.2) {
      return 'EXECUTE_AUTONOMOUSLY';
    } else if (confidence >= 0.8 && riskLevel <= 0.3) {
      return 'EXECUTE_WITH_NOTIFICATION';
    } else if (confidence >= 0.7 && riskLevel <= 0.4) {
      return 'PROPOSE_WITH_APPROVAL';
    } else {
      return 'ESCALATE_TO_HUMAN';
    }
  }
  
  private shouldEscalate(
    confidence: number, 
    riskLevel: number, 
    threshold: number, 
    riskTolerance: number
  ): boolean {
    return confidence < threshold || riskLevel > riskTolerance;
  }
  
  private generateReasoning(context: DecisionContext, confidence: number, riskLevel: number): string {
    const reasons = [];
    
    if (confidence >= 0.8) {
      reasons.push('High confidence based on historical patterns');
    }
    if (riskLevel <= 0.3) {
      reasons.push('Low risk assessment for this operation');
    }
    if (context.test_coverage && context.test_coverage >= 0.9) {
      reasons.push('Excellent test coverage provides safety net');
    }
    if (context.spatial_data && this.assessSpatialDataQuality(context) >= 0.8) {
      reasons.push('Spatial data quality is within acceptable parameters');
    }
    
    return reasons.join('; ') || 'Standard decision-making criteria applied';
  }
  
  private estimateImpact(context: DecisionContext, agentType: string): string {
    const impacts = [];
    
    if (agentType === 'frontend_ui_agent') {
      impacts.push('UI/UX improvements', 'Map rendering optimization');
    } else if (agentType === 'backend_api_agent') {
      impacts.push('API performance enhancement', 'Spatial query optimization');
    } else if (agentType === 'postgis_optimization_agent') {
      impacts.push('Database performance improvement', 'Spatial indexing optimization');
    }
    
    return impacts.join(', ') || 'General system improvement';
  }
  
  private generateRollbackPlan(context: DecisionContext, agentType: string): string {
    const rollbackSteps = [
      'Create automated backup of current state',
      'Document changes for quick reversal',
      'Implement monitoring for immediate issue detection',
      'Prepare manual rollback procedures'
    ];
    
    if (agentType === 'postgis_optimization_agent') {
      rollbackSteps.push('Backup spatial indexes before modification');
    }
    
    return rollbackSteps.join('; ');
  }
  
  // GIS-specific assessment methods
  private assessSpatialDataQuality(context: DecisionContext): number {
    if (!context.spatial_data) return 0.8; // Default assumption
    
    const qualityFactors = {
      geometry_validity: context.spatial_data.geometry_validity || 0.9,
      coordinate_precision: context.spatial_data.coordinate_precision || 0.85,
      spatial_reference_consistency: context.spatial_data.srs_consistency || 0.9,
      data_completeness: context.spatial_data.completeness || 0.8
    };
    
    return Object.values(qualityFactors).reduce((sum, val) => sum + val, 0) / 4;
  }
  
  private assessSpatialDataIntegrity(context: DecisionContext): number {
    if (!context.spatial_data) return 0.3; // Medium risk without spatial context
    
    const integrityRisks = {
      topology_changes: context.spatial_data.topology_changes ? 0.7 : 0.2,
      coordinate_system_changes: context.spatial_data.crs_changes ? 0.8 : 0.1,
      bulk_data_operations: context.spatial_data.bulk_operations ? 0.6 : 0.2,
      cross_layer_dependencies: context.spatial_data.cross_dependencies ? 0.5 : 0.1
    };
    
    return Math.max(...Object.values(integrityRisks));
  }
  
  // Helper methods
  private findSimilarDecisions(context: DecisionContext, agentType: string): number {
    const similarDecisions = this.decisionHistory.filter(decision => 
      decision.action === context.action_type
    );
    
    if (similarDecisions.length === 0) return 0.5;
    
    const successRate = similarDecisions.filter(d => d.confidence >= 0.8).length / similarDecisions.length;
    return Math.min(1.0, successRate + 0.1); // Slight optimism bias
  }
  
  private assessComplexity(context: DecisionContext): number {
    const complexity = context.complexity_score || 0.5;
    return 1 - complexity; // Higher complexity = lower confidence contribution
  }
  
  private checkGuidelinesCompliance(context: DecisionContext, agentType: string): number {
    // Simulate guidelines checking - in real implementation, this would
    // analyze code against team standards, architectural patterns, etc.
    return 0.85; // Default good compliance
  }
  
  private getAgentPerformanceHistory(agentType: string): number {
    const history = this.performanceMetrics.get(agentType) || [];
    if (history.length === 0) return 0.7; // Default neutral performance
    
    const recentPerformance = history.slice(-10); // Last 10 decisions
    return recentPerformance.reduce((sum, val) => sum + val, 0) / recentPerformance.length;
  }
  
  private assessChangeScope(context: DecisionContext): number {
    // Assess the scope of changes - more files/lines = higher risk
    const scope = context.code_changes?.files_modified || 1;
    return Math.min(1.0, scope / 10); // Risk increases with scope
  }
  
  private assessProductionImpact(context: DecisionContext): number {
    // Assess potential production impact
    if (context.action_type?.includes('production')) return 0.8;
    if (context.action_type?.includes('database')) return 0.7;
    if (context.action_type?.includes('api')) return 0.6;
    return 0.3; // Default low impact
  }
  
  private assessSecurityImplications(context: DecisionContext): number {
    if (context.security_context?.authentication_changes) return 0.8;
    if (context.security_context?.permission_changes) return 0.7;
    if (context.security_context?.data_access_changes) return 0.6;
    return 0.2; // Default low security risk
  }
  
  private assessRollbackComplexity(context: DecisionContext): number {
    if (context.action_type?.includes('migration')) return 0.8;
    if (context.action_type?.includes('schema')) return 0.7;
    if (context.action_type?.includes('infrastructure')) return 0.6;
    return 0.3; // Default moderate rollback complexity
  }
  
  /**
   * Learn from decision outcomes to improve future decisions
   */
  public recordDecisionOutcome(decisionId: string, outcome: {
    success: boolean;
    performance_impact: number;
    user_satisfaction: number;
    issues_encountered: string[];
  }): void {
    // Update team maturity based on successful autonomous decisions
    if (outcome.success && outcome.performance_impact > 0) {
      this.teamMaturityScore = Math.min(1.0, this.teamMaturityScore + 0.01);
    }
    
    this.emit('decision_outcome', { decisionId, outcome });
  }
  
  /**
   * Get current autonomy status for all agents
   */
  public getAutonomyStatus(): any {
    return {
      team_maturity: this.teamMaturityScore,
      current_phase: this.config.autonomy_progression.current_phase,
      agent_performance: Object.keys(this.config.agents).reduce((acc, agentType) => {
        acc[agentType] = {
          enabled: this.config.agents[agentType].enabled,
          autonomy_level: this.config.agents[agentType].autonomy_level,
          recent_performance: this.getAgentPerformanceHistory(agentType)
        };
        return acc;
      }, {})
    };
  }
}

export default UniversalAutonomyEngine;