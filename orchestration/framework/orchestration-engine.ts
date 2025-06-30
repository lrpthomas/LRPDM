/**
 * Main Orchestration Engine for GIS Platform
 * Coordinates all agents, monitors performance, and manages autonomous decisions
 */

import { EventEmitter } from 'events';
import { Logger } from 'winston';
import { UniversalAutonomyEngine, AutonomyConfig } from '../engines/autonomy/universal-autonomy-engine';
import { CommunicationHub } from '../communication/communication-hub';
import { PerformanceMonitor, PerformanceThresholds } from '../monitoring/performance-monitor';
import { QualityGateExecutor, qualityGatesConfig } from '../quality-gates/quality-gates-config';
import { 
  Task, 
  Decision, 
  AgentProfile, 
  AutonomyLevel,
  TaskType,
  AgentCapability
} from '../types/autonomy';

export interface OrchestrationConfig {
  autonomy: AutonomyConfig;
  performanceThresholds: PerformanceThresholds;
  agents: AgentProfile[];
  globalSettings: {
    maxConcurrentTasks: number;
    defaultTimeout: number;
    retryAttempts: number;
    escalationTimeout: number;
  };
}

export interface TaskExecution {
  taskId: string;
  agentId: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'escalated';
  startTime: Date;
  endTime?: Date;
  result?: any;
  error?: string;
  metrics: {
    duration: number;
    resourceUsage: number;
    confidence: number;
  };
}

export class OrchestrationEngine extends EventEmitter {
  private autonomyEngine: UniversalAutonomyEngine;
  private communicationHub: CommunicationHub;
  private performanceMonitor: PerformanceMonitor;
  private qualityGateExecutor: QualityGateExecutor;
  
  private agents: Map<string, AgentProfile> = new Map();
  private activeTasks: Map<string, TaskExecution> = new Map();
  private taskQueue: Task[] = [];
  private config: OrchestrationConfig;
  private logger: Logger;
  private isRunning: boolean = false;

  constructor(config: OrchestrationConfig, logger: Logger) {
    super();
    this.config = config;
    this.logger = logger;

    // Initialize components
    this.autonomyEngine = new UniversalAutonomyEngine(config.autonomy, logger);
    this.communicationHub = new CommunicationHub(logger);
    this.performanceMonitor = new PerformanceMonitor(logger, config.performanceThresholds);
    this.qualityGateExecutor = new QualityGateExecutor(qualityGatesConfig);

    // Load agents
    config.agents.forEach(agent => {
      this.agents.set(agent.id, agent);
    });

    this.setupEventHandlers();
  }

  /**
   * Start the orchestration engine
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      throw new Error('Orchestration engine is already running');
    }

    this.logger.info('Starting GIS Platform Orchestration Engine');

    try {
      // Validate configuration
      await this.validateConfiguration();

      // Initialize components
      await this.initializeComponents();

      // Start processing tasks
      this.startTaskProcessor();

      this.isRunning = true;
      this.emit('started');
      
      this.logger.info('Orchestration engine started successfully', {
        agentCount: this.agents.size,
        autonomyLevel: this.config.autonomy.level
      });

    } catch (error) {
      this.logger.error('Failed to start orchestration engine', { error });
      throw error;
    }
  }

  /**
   * Stop the orchestration engine
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    this.logger.info('Stopping orchestration engine');

    // Complete active tasks
    await this.completeActiveTasks();

    // Stop components
    this.performanceMonitor.stop();

    this.isRunning = false;
    this.emit('stopped');
    
    this.logger.info('Orchestration engine stopped');
  }

  /**
   * Submit a task for execution
   */
  async submitTask(task: Task): Promise<string> {
    this.logger.info('Task submitted', {
      taskId: task.id,
      type: task.type,
      priority: task.priority
    });

    // Validate task
    this.validateTask(task);

    // Add to queue
    this.taskQueue.push(task);
    
    // Sort by priority
    this.taskQueue.sort((a, b) => {
      const priorityOrder = { 'CRITICAL': 0, 'HIGH': 1, 'MEDIUM': 2, 'LOW': 3 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });

    this.emit('taskSubmitted', task);
    
    // Trigger immediate processing
    setImmediate(() => this.processNextTask());

    return task.id;
  }

  /**
   * Get task status
   */
  getTaskStatus(taskId: string): TaskExecution | undefined {
    return this.activeTasks.get(taskId);
  }

  /**
   * Get system status
   */
  getSystemStatus(): {
    status: 'healthy' | 'degraded' | 'critical';
    agents: Array<{ id: string; status: string; tasksActive: number }>;
    performance: any;
    queueDepth: number;
    activeTasks: number;
  } {
    const performanceSummary = this.performanceMonitor.getSystemPerformanceSummary();
    
    let systemStatus: 'healthy' | 'degraded' | 'critical' = 'healthy';
    if (performanceSummary.systemHealth < 50) {
      systemStatus = 'critical';
    } else if (performanceSummary.systemHealth < 80) {
      systemStatus = 'degraded';
    }

    const agentStatuses = Array.from(this.agents.values()).map(agent => ({
      id: agent.id,
      status: this.getAgentStatus(agent.id),
      tasksActive: this.getActiveTasksForAgent(agent.id).length
    }));

    return {
      status: systemStatus,
      agents: agentStatuses,
      performance: performanceSummary,
      queueDepth: this.taskQueue.length,
      activeTasks: this.activeTasks.size
    };
  }

  /**
   * Update agent configuration
   */
  async updateAgentConfig(agentId: string, updates: Partial<AgentProfile>): Promise<void> {
    const agent = this.agents.get(agentId);
    if (!agent) {
      throw new Error(`Agent ${agentId} not found`);
    }

    const updatedAgent = { ...agent, ...updates };
    this.agents.set(agentId, updatedAgent);

    this.logger.info('Agent configuration updated', { agentId, updates });
    this.emit('agentConfigUpdated', { agentId, config: updatedAgent });
  }

  /**
   * Set up event handlers for components
   */
  private setupEventHandlers(): void {
    // Autonomy engine events
    this.autonomyEngine.on('decision', (decision: Decision) => {
      this.handleAutonomyDecision(decision);
    });

    // Communication hub events
    this.communicationHub.on('taskRequest', ({ agentId, task }) => {
      this.handleAgentTaskRequest(agentId, task);
    });

    this.communicationHub.on('decisionMade', ({ agentId, decision }) => {
      this.handleAgentDecision(agentId, decision);
    });

    // Performance monitor events
    this.performanceMonitor.on('criticalAlert', (alert) => {
      this.handleCriticalAlert(alert);
    });

    this.performanceMonitor.on('analysisComplete', (analysis) => {
      this.handlePerformanceAnalysis(analysis);
    });
  }

  /**
   * Validate configuration on startup
   */
  private async validateConfiguration(): Promise<void> {
    // Validate agents have required capabilities
    for (const agent of this.config.agents) {
      if (agent.capabilities.length === 0) {
        throw new Error(`Agent ${agent.id} has no capabilities defined`);
      }
    }

    // Validate autonomy thresholds
    const thresholds = this.config.autonomy.decisionThresholds;
    if (thresholds.confidence < 0 || thresholds.confidence > 100) {
      throw new Error('Invalid confidence threshold');
    }

    this.logger.info('Configuration validation passed');
  }

  /**
   * Initialize all components
   */
  private async initializeComponents(): Promise<void> {
    // Initialize communication channels for agents
    for (const agent of this.config.agents) {
      this.communicationHub.createChannel({
        id: `agent-${agent.id}`,
        type: 'agent-to-agent',
        protocol: {
          channel: 'async',
          format: 'json',
          encryption: true,
          authentication: 'jwt',
          retryPolicy: {
            maxAttempts: 3,
            backoffMultiplier: 2,
            initialDelay: 1000
          }
        },
        participants: [agent.id],
        priority: 'medium'
      });
    }

    this.logger.info('Components initialized');
  }

  /**
   * Start the task processor loop
   */
  private startTaskProcessor(): void {
    const processLoop = async () => {
      if (!this.isRunning) return;

      try {
        await this.processNextTask();
      } catch (error) {
        this.logger.error('Error in task processor', { error });
      }

      // Continue processing
      setTimeout(processLoop, 1000);
    };

    // Start the loop
    setImmediate(processLoop);
  }

  /**
   * Process the next task in the queue
   */
  private async processNextTask(): Promise<void> {
    if (this.taskQueue.length === 0) return;
    if (this.activeTasks.size >= this.config.globalSettings.maxConcurrentTasks) return;

    const task = this.taskQueue.shift()!;

    try {
      // Get autonomy decision
      const decision = await this.autonomyEngine.evaluateAutonomy(task);
      
      if (decision.autonomous) {
        // Execute autonomously
        await this.executeTaskAutonomously(task, decision);
      } else {
        // Escalate to human
        await this.escalateTaskToHuman(task, decision);
      }

    } catch (error) {
      this.logger.error('Failed to process task', {
        taskId: task.id,
        error: error.message
      });
      
      this.emit('taskFailed', { task, error });
    }
  }

  /**
   * Execute task autonomously
   */
  private async executeTaskAutonomously(task: Task, decision: Decision): Promise<void> {
    // Find best agent for the task
    const agent = this.findBestAgent(task, decision.requiredCapabilities);
    if (!agent) {
      throw new Error(`No suitable agent found for task ${task.id}`);
    }

    // Create task execution
    const execution: TaskExecution = {
      taskId: task.id,
      agentId: agent.id,
      status: 'pending',
      startTime: new Date(),
      metrics: {
        duration: 0,
        resourceUsage: 0,
        confidence: decision.confidence
      }
    };

    this.activeTasks.set(task.id, execution);
    this.emit('taskStarted', { task, agent: agent.id });

    try {
      // Execute quality gates (pre-execution)
      const preGateResults = await this.qualityGateExecutor.executeAllGates(
        'pre-execution',
        { task, agent }
      );

      if (!preGateResults.overallPassed) {
        throw new Error('Pre-execution quality gates failed');
      }

      // Update status
      execution.status = 'running';
      
      // Execute the task
      const result = await this.executeTaskOnAgent(task, agent);
      
      // Execute quality gates (post-execution)
      const postGateResults = await this.qualityGateExecutor.executeAllGates(
        'post-execution',
        { task, agent, result }
      );

      if (!postGateResults.overallPassed) {
        throw new Error('Post-execution quality gates failed');
      }

      // Complete execution
      execution.status = 'completed';
      execution.endTime = new Date();
      execution.result = result;
      execution.metrics.duration = execution.endTime.getTime() - execution.startTime.getTime();

      // Record performance metrics
      this.performanceMonitor.analyzeTaskPerformance(
        agent.id,
        task.id,
        decision,
        'success',
        execution.metrics.duration
      );

      this.emit('taskCompleted', { task, execution });

    } catch (error) {
      // Handle failure
      execution.status = 'failed';
      execution.endTime = new Date();
      execution.error = error.message;
      execution.metrics.duration = execution.endTime.getTime() - execution.startTime.getTime();

      // Record performance metrics
      this.performanceMonitor.analyzeTaskPerformance(
        agent.id,
        task.id,
        decision,
        'failure',
        execution.metrics.duration
      );

      this.emit('taskFailed', { task, execution, error });
      
      // Determine if we should retry or escalate
      if (this.shouldRetryTask(task, execution)) {
        this.retryTask(task);
      } else {
        await this.escalateTaskToHuman(task, decision);
      }
    }
  }

  /**
   * Execute task on a specific agent
   */
  private async executeTaskOnAgent(task: Task, agent: AgentProfile): Promise<any> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Task execution timeout'));
      }, this.config.globalSettings.defaultTimeout);

      // Send task to agent via communication hub
      this.communicationHub.sendMessage({
        id: `task-${task.id}-${Date.now()}`,
        channelId: `agent-${agent.id}`,
        sender: 'orchestration-engine',
        recipients: [agent.id],
        type: 'task',
        priority: task.priority.toLowerCase() as any,
        content: task,
        timestamp: new Date(),
        requiresAck: true,
        metadata: {
          taskId: task.id
        }
      });

      // Listen for response
      const responseHandler = (response: any) => {
        if (response.taskId === task.id) {
          clearTimeout(timeout);
          this.removeListener('taskResponse', responseHandler);
          
          if (response.success) {
            resolve(response.result);
          } else {
            reject(new Error(response.error));
          }
        }
      };

      this.on('taskResponse', responseHandler);
    });
  }

  /**
   * Escalate task to human operators
   */
  private async escalateTaskToHuman(task: Task, decision: Decision): Promise<void> {
    this.logger.warn('Task escalated to human', {
      taskId: task.id,
      reason: decision.reasoning
    });

    // Send escalation message
    await this.communicationHub.sendMessage({
      id: `escalation-${task.id}-${Date.now()}`,
      channelId: 'human-escalation',
      sender: 'orchestration-engine',
      recipients: ['human-operators'],
      type: 'escalation',
      priority: 'high',
      content: {
        task,
        decision,
        reason: decision.reasoning,
        suggestedActions: decision.suggestedActions
      },
      timestamp: new Date(),
      requiresAck: true,
      metadata: {
        taskId: task.id
      }
    });

    // Mark as escalated
    const execution: TaskExecution = {
      taskId: task.id,
      agentId: 'human',
      status: 'escalated',
      startTime: new Date(),
      metrics: {
        duration: 0,
        resourceUsage: 0,
        confidence: decision.confidence
      }
    };

    this.activeTasks.set(task.id, execution);
    this.emit('taskEscalated', { task, decision });
  }

  /**
   * Find the best agent for a task
   */
  private findBestAgent(task: Task, requiredCapabilities: AgentCapability[]): AgentProfile | null {
    const candidateAgents = Array.from(this.agents.values()).filter(agent => {
      // Check if agent has required capabilities
      const hasCapabilities = requiredCapabilities.every(cap => 
        agent.capabilities.includes(cap)
      );
      
      // Check if agent is not overloaded
      const activeTasks = this.getActiveTasksForAgent(agent.id);
      const isAvailable = activeTasks.length < 5; // Max 5 concurrent tasks per agent
      
      return hasCapabilities && isAvailable;
    });

    if (candidateAgents.length === 0) return null;

    // Select agent with best performance
    return candidateAgents.reduce((best, current) => {
      return current.performance.successRate > best.performance.successRate ? current : best;
    });
  }

  /**
   * Get active tasks for a specific agent
   */
  private getActiveTasksForAgent(agentId: string): TaskExecution[] {
    return Array.from(this.activeTasks.values()).filter(
      execution => execution.agentId === agentId && 
      (execution.status === 'running' || execution.status === 'pending')
    );
  }

  /**
   * Get agent status
   */
  private getAgentStatus(agentId: string): string {
    const activeTasks = this.getActiveTasksForAgent(agentId);
    const performance = this.performanceMonitor.getAgentPerformanceReport(agentId);
    
    if (!performance) return 'unknown';
    
    const successRate = performance.metrics.tasksSuccessful / performance.metrics.tasksCompleted;
    
    if (successRate > 0.9 && activeTasks.length < 3) return 'healthy';
    if (successRate > 0.8 && activeTasks.length < 5) return 'busy';
    if (successRate > 0.7) return 'degraded';
    return 'critical';
  }

  /**
   * Validate task before processing
   */
  private validateTask(task: Task): void {
    if (!task.id || !task.type || !task.title) {
      throw new Error('Invalid task: missing required fields');
    }

    if (task.deadline && task.deadline < new Date()) {
      throw new Error('Task deadline has already passed');
    }
  }

  /**
   * Determine if task should be retried
   */
  private shouldRetryTask(task: Task, execution: TaskExecution): boolean {
    // Don't retry if already retried too many times
    const retryCount = (task.metadata as any)?.retryCount || 0;
    if (retryCount >= this.config.globalSettings.retryAttempts) {
      return false;
    }

    // Don't retry critical priority tasks
    if (task.priority === 'CRITICAL') {
      return false;
    }

    // Don't retry if error suggests systemic issue
    if (execution.error?.includes('timeout') || execution.error?.includes('unavailable')) {
      return true;
    }

    return false;
  }

  /**
   * Retry a failed task
   */
  private retryTask(task: Task): void {
    const retryCount = ((task.metadata as any)?.retryCount || 0) + 1;
    task.metadata = { ...task.metadata, retryCount };
    
    // Add back to queue with lower priority
    const retryTask = { ...task, priority: 'LOW' as const };
    this.taskQueue.push(retryTask);
    
    this.logger.info('Task queued for retry', {
      taskId: task.id,
      retryCount
    });
  }

  /**
   * Complete all active tasks (for shutdown)
   */
  private async completeActiveTasks(): Promise<void> {
    const activeTaskIds = Array.from(this.activeTasks.keys());
    
    if (activeTaskIds.length === 0) return;

    this.logger.info(`Completing ${activeTaskIds.length} active tasks`);

    // Wait for tasks to complete or timeout
    const timeout = 30000; // 30 seconds
    const startTime = Date.now();

    while (this.activeTasks.size > 0 && Date.now() - startTime < timeout) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // Force complete remaining tasks
    this.activeTasks.clear();
  }

  /**
   * Handle autonomy decision
   */
  private handleAutonomyDecision(decision: Decision): void {
    this.logger.debug('Autonomy decision made', {
      taskId: decision.taskId,
      autonomous: decision.autonomous,
      confidence: decision.confidence
    });
  }

  /**
   * Handle agent task request
   */
  private handleAgentTaskRequest(agentId: string, task: any): void {
    this.logger.debug('Agent task request', { agentId, taskId: task.id });
  }

  /**
   * Handle agent decision
   */
  private handleAgentDecision(agentId: string, decision: any): void {
    this.emit('taskResponse', {
      taskId: decision.taskId,
      success: decision.success,
      result: decision.result,
      error: decision.error
    });
  }

  /**
   * Handle critical alert
   */
  private handleCriticalAlert(alert: any): void {
    this.logger.error('Critical alert received', alert);
    this.emit('criticalAlert', alert);
  }

  /**
   * Handle performance analysis
   */
  private handlePerformanceAnalysis(analysis: any): void {
    this.logger.info('Performance analysis completed', {
      overallHealth: analysis.overallHealth,
      alerts: analysis.alerts?.length || 0
    });
    
    this.emit('performanceAnalysis', analysis);
  }
}