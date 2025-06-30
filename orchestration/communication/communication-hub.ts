/**
 * Team Communication Optimization Hub
 * Manages inter-agent communication and human-agent collaboration
 */

import { EventEmitter } from 'events';
import { WebSocket } from 'ws';
import { Logger } from 'winston';
import { AgentProfile, CommunicationProtocol, Task, Decision } from '../types/autonomy';

export interface CommunicationChannel {
  id: string;
  type: 'agent-to-agent' | 'agent-to-human' | 'broadcast' | 'escalation';
  protocol: CommunicationProtocol;
  participants: string[];
  priority: 'low' | 'medium' | 'high' | 'critical';
  metadata?: Record<string, any>;
}

export interface Message {
  id: string;
  channelId: string;
  sender: string;
  recipients: string[];
  type: 'task' | 'decision' | 'query' | 'response' | 'notification' | 'escalation';
  priority: 'low' | 'medium' | 'high' | 'critical';
  content: any;
  timestamp: Date;
  requiresAck: boolean;
  ttl?: number; // Time to live in milliseconds
  metadata?: {
    taskId?: string;
    decisionId?: string;
    correlationId?: string;
    retryCount?: number;
  };
}

export interface CommunicationMetrics {
  messagesSent: number;
  messagesReceived: number;
  averageResponseTime: number;
  failedDeliveries: number;
  activeChannels: number;
  queueDepth: number;
}

export class CommunicationHub extends EventEmitter {
  private channels: Map<string, CommunicationChannel> = new Map();
  private messageQueue: Map<string, Message[]> = new Map();
  private websocketClients: Map<string, WebSocket> = new Map();
  private messageHistory: Message[] = [];
  private metrics: CommunicationMetrics;
  private logger: Logger;

  constructor(logger: Logger) {
    super();
    this.logger = logger;
    this.metrics = {
      messagesSent: 0,
      messagesReceived: 0,
      averageResponseTime: 0,
      failedDeliveries: 0,
      activeChannels: 0,
      queueDepth: 0
    };
    this.initializeDefaultChannels();
  }

  /**
   * Initialize default communication channels
   */
  private initializeDefaultChannels(): void {
    // Agent coordination channel
    this.createChannel({
      id: 'agent-coordination',
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
      participants: ['*'], // All agents
      priority: 'medium'
    });

    // Human escalation channel
    this.createChannel({
      id: 'human-escalation',
      type: 'escalation',
      protocol: {
        channel: 'sync',
        format: 'json',
        encryption: true,
        authentication: 'jwt',
        retryPolicy: {
          maxAttempts: 5,
          backoffMultiplier: 1.5,
          initialDelay: 500
        }
      },
      participants: ['human-operators'],
      priority: 'high'
    });

    // Broadcast channel for system-wide notifications
    this.createChannel({
      id: 'system-broadcast',
      type: 'broadcast',
      protocol: {
        channel: 'event',
        format: 'json',
        encryption: false,
        authentication: 'api-key',
        retryPolicy: {
          maxAttempts: 1,
          backoffMultiplier: 1,
          initialDelay: 0
        }
      },
      participants: ['*'],
      priority: 'low'
    });
  }

  /**
   * Create a new communication channel
   */
  createChannel(channel: CommunicationChannel): void {
    this.channels.set(channel.id, channel);
    this.messageQueue.set(channel.id, []);
    this.metrics.activeChannels++;
    
    this.logger.info('Communication channel created', {
      channelId: channel.id,
      type: channel.type,
      participants: channel.participants.length
    });

    this.emit('channelCreated', channel);
  }

  /**
   * Send a message through the communication hub
   */
  async sendMessage(message: Message): Promise<void> {
    const startTime = Date.now();
    
    try {
      // Validate channel exists
      const channel = this.channels.get(message.channelId);
      if (!channel) {
        throw new Error(`Channel ${message.channelId} not found`);
      }

      // Add to message history
      this.messageHistory.push(message);
      this.metrics.messagesSent++;

      // Route message based on channel type
      switch (channel.type) {
        case 'agent-to-agent':
          await this.routeAgentMessage(message, channel);
          break;
        case 'agent-to-human':
          await this.routeHumanMessage(message, channel);
          break;
        case 'broadcast':
          await this.broadcastMessage(message, channel);
          break;
        case 'escalation':
          await this.escalateMessage(message, channel);
          break;
      }

      // Update metrics
      const responseTime = Date.now() - startTime;
      this.updateAverageResponseTime(responseTime);

      this.emit('messageSent', message);
      
    } catch (error) {
      this.metrics.failedDeliveries++;
      this.logger.error('Failed to send message', {
        messageId: message.id,
        error: error.message
      });
      
      // Retry if configured
      if (message.metadata?.retryCount < 3) {
        message.metadata = {
          ...message.metadata,
          retryCount: (message.metadata?.retryCount || 0) + 1
        };
        
        // Add to retry queue
        setTimeout(() => this.sendMessage(message), 5000);
      } else {
        this.emit('messageDeliveryFailed', message);
      }
    }
  }

  /**
   * Route message between agents
   */
  private async routeAgentMessage(message: Message, channel: CommunicationChannel): Promise<void> {
    // Check if recipients are online
    const onlineRecipients = message.recipients.filter(r => 
      this.websocketClients.has(r) && 
      this.websocketClients.get(r)?.readyState === WebSocket.OPEN
    );

    const offlineRecipients = message.recipients.filter(r => 
      !onlineRecipients.includes(r)
    );

    // Send to online recipients
    for (const recipient of onlineRecipients) {
      const ws = this.websocketClients.get(recipient);
      if (ws) {
        ws.send(JSON.stringify({
          type: 'message',
          data: message
        }));
      }
    }

    // Queue for offline recipients
    for (const recipient of offlineRecipients) {
      this.queueMessage(recipient, message);
    }

    this.logger.debug('Agent message routed', {
      messageId: message.id,
      onlineRecipients: onlineRecipients.length,
      queuedRecipients: offlineRecipients.length
    });
  }

  /**
   * Route message to human operators
   */
  private async routeHumanMessage(message: Message, channel: CommunicationChannel): Promise<void> {
    // Transform message for human consumption
    const humanReadableMessage = this.formatMessageForHuman(message);

    // Send through configured human channels
    if (channel.metadata?.slackChannel) {
      await this.sendSlackMessage(channel.metadata.slackChannel, humanReadableMessage);
    }

    if (channel.metadata?.emailList) {
      await this.sendEmailNotification(channel.metadata.emailList, humanReadableMessage);
    }

    // Also send through WebSocket if human operator is connected
    const humanOperators = Array.from(this.websocketClients.keys())
      .filter(clientId => clientId.startsWith('human-'));

    for (const operator of humanOperators) {
      const ws = this.websocketClients.get(operator);
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          type: 'human-message',
          data: humanReadableMessage
        }));
      }
    }
  }

  /**
   * Broadcast message to all participants
   */
  private async broadcastMessage(message: Message, channel: CommunicationChannel): Promise<void> {
    // Get all connected clients
    const allClients = Array.from(this.websocketClients.entries());
    
    for (const [clientId, ws] of allClients) {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          type: 'broadcast',
          data: message
        }));
      }
    }

    // Also emit as event for local subscribers
    this.emit('broadcast', message);

    this.logger.info('Message broadcasted', {
      messageId: message.id,
      recipientCount: allClients.length
    });
  }

  /**
   * Escalate message to higher priority channel
   */
  private async escalateMessage(message: Message, channel: CommunicationChannel): Promise<void> {
    // Mark as escalation
    message.priority = 'critical';
    message.type = 'escalation';

    // Send to all escalation handlers
    await this.routeHumanMessage(message, channel);

    // Trigger escalation protocols
    if (channel.metadata?.pagerDuty) {
      await this.triggerPagerDuty(message);
    }

    // Log escalation
    this.logger.warn('Message escalated', {
      messageId: message.id,
      originalPriority: message.priority,
      reason: message.content.reason || 'Automated escalation'
    });

    this.emit('messageEscalated', message);
  }

  /**
   * Queue message for offline recipient
   */
  private queueMessage(recipient: string, message: Message): void {
    if (!this.messageQueue.has(recipient)) {
      this.messageQueue.set(recipient, []);
    }

    const queue = this.messageQueue.get(recipient)!;
    queue.push(message);

    // Limit queue size
    if (queue.length > 100) {
      queue.shift(); // Remove oldest message
    }

    this.metrics.queueDepth = Array.from(this.messageQueue.values())
      .reduce((sum, q) => sum + q.length, 0);
  }

  /**
   * Handle agent connection
   */
  handleAgentConnection(agentId: string, websocket: WebSocket): void {
    this.websocketClients.set(agentId, websocket);

    // Send queued messages
    const queue = this.messageQueue.get(agentId);
    if (queue && queue.length > 0) {
      for (const message of queue) {
        websocket.send(JSON.stringify({
          type: 'queued-message',
          data: message
        }));
      }
      this.messageQueue.set(agentId, []);
    }

    // Setup message handlers
    websocket.on('message', (data) => {
      try {
        const parsed = JSON.parse(data.toString());
        this.handleIncomingMessage(agentId, parsed);
      } catch (error) {
        this.logger.error('Failed to parse message', { agentId, error });
      }
    });

    websocket.on('close', () => {
      this.websocketClients.delete(agentId);
      this.emit('agentDisconnected', agentId);
    });

    this.emit('agentConnected', agentId);
    this.logger.info('Agent connected', { agentId });
  }

  /**
   * Handle incoming message from agent
   */
  private handleIncomingMessage(agentId: string, message: any): void {
    this.metrics.messagesReceived++;

    switch (message.type) {
      case 'task-request':
        this.emit('taskRequest', { agentId, task: message.data });
        break;
      case 'decision-notification':
        this.emit('decisionMade', { agentId, decision: message.data });
        break;
      case 'query':
        this.handleQuery(agentId, message.data);
        break;
      case 'response':
        this.handleResponse(agentId, message.data);
        break;
      case 'heartbeat':
        // Update agent last seen timestamp
        this.emit('agentHeartbeat', agentId);
        break;
    }
  }

  /**
   * Handle query from agent
   */
  private async handleQuery(agentId: string, query: any): Promise<void> {
    // Route query to appropriate handler based on type
    switch (query.type) {
      case 'capability-check':
        // Check if another agent has required capability
        const capableAgents = await this.findAgentsWithCapability(query.capability);
        this.sendResponse(agentId, query.id, { agents: capableAgents });
        break;
      case 'task-status':
        // Query task status from task manager
        this.emit('taskStatusQuery', { agentId, taskId: query.taskId });
        break;
      case 'resource-availability':
        // Check resource availability
        this.emit('resourceQuery', { agentId, resource: query.resource });
        break;
    }
  }

  /**
   * Handle response from agent
   */
  private handleResponse(agentId: string, response: any): void {
    // Match response to original query
    if (response.correlationId) {
      this.emit('queryResponse', {
        agentId,
        correlationId: response.correlationId,
        data: response.data
      });
    }
  }

  /**
   * Send response to agent
   */
  private sendResponse(agentId: string, queryId: string, data: any): void {
    const ws = this.websocketClients.get(agentId);
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'response',
        queryId,
        data
      }));
    }
  }

  /**
   * Find agents with specific capability
   */
  private async findAgentsWithCapability(capability: string): Promise<string[]> {
    // This would query the agent registry
    // For now, return mock data
    return ['agent-1', 'agent-2'];
  }

  /**
   * Format message for human consumption
   */
  private formatMessageForHuman(message: Message): any {
    return {
      id: message.id,
      priority: message.priority,
      type: message.type,
      sender: message.sender,
      timestamp: message.timestamp,
      summary: this.generateMessageSummary(message),
      content: message.content,
      actions: this.generateSuggestedActions(message)
    };
  }

  /**
   * Generate human-readable message summary
   */
  private generateMessageSummary(message: Message): string {
    switch (message.type) {
      case 'task':
        return `New task assigned: ${message.content.title}`;
      case 'decision':
        return `Decision required: ${message.content.description}`;
      case 'escalation':
        return `URGENT: ${message.content.reason}`;
      case 'notification':
        return message.content.summary || 'System notification';
      default:
        return 'Message from ' + message.sender;
    }
  }

  /**
   * Generate suggested actions for human operators
   */
  private generateSuggestedActions(message: Message): string[] {
    const actions = [];

    switch (message.type) {
      case 'escalation':
        actions.push('Review escalation details');
        actions.push('Approve or deny requested action');
        actions.push('Provide manual intervention');
        break;
      case 'decision':
        actions.push('Review decision context');
        actions.push('Approve autonomous action');
        actions.push('Modify and approve');
        actions.push('Reject and provide guidance');
        break;
      case 'task':
        actions.push('Assign to agent');
        actions.push('Mark as priority');
        actions.push('Defer to later');
        break;
    }

    return actions;
  }

  /**
   * Send Slack message
   */
  private async sendSlackMessage(channel: string, message: any): Promise<void> {
    // Implement Slack webhook integration
    this.logger.info('Slack message sent', { channel });
  }

  /**
   * Send email notification
   */
  private async sendEmailNotification(recipients: string[], message: any): Promise<void> {
    // Implement email service integration
    this.logger.info('Email notification sent', { recipients: recipients.length });
  }

  /**
   * Trigger PagerDuty alert
   */
  private async triggerPagerDuty(message: Message): Promise<void> {
    // Implement PagerDuty integration
    this.logger.warn('PagerDuty alert triggered', { messageId: message.id });
  }

  /**
   * Update average response time metric
   */
  private updateAverageResponseTime(responseTime: number): void {
    const alpha = 0.1; // Exponential moving average factor
    this.metrics.averageResponseTime = 
      alpha * responseTime + (1 - alpha) * this.metrics.averageResponseTime;
  }

  /**
   * Get communication metrics
   */
  getMetrics(): CommunicationMetrics {
    return { ...this.metrics };
  }

  /**
   * Get message history
   */
  getMessageHistory(filters?: {
    channelId?: string;
    type?: string;
    priority?: string;
    startTime?: Date;
    endTime?: Date;
    limit?: number;
  }): Message[] {
    let history = [...this.messageHistory];

    if (filters) {
      if (filters.channelId) {
        history = history.filter(m => m.channelId === filters.channelId);
      }
      if (filters.type) {
        history = history.filter(m => m.type === filters.type);
      }
      if (filters.priority) {
        history = history.filter(m => m.priority === filters.priority);
      }
      if (filters.startTime) {
        history = history.filter(m => m.timestamp >= filters.startTime!);
      }
      if (filters.endTime) {
        history = history.filter(m => m.timestamp <= filters.endTime!);
      }
      if (filters.limit) {
        history = history.slice(-filters.limit);
      }
    }

    return history;
  }
}