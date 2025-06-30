/**
 * Team Communication Hub for GIS Platform
 * Enterprise Multi-Agent Orchestration Framework
 */

import { EventEmitter } from 'events';
import { WebSocket } from 'ws';

interface AgentMessage {
  id: string;
  agentType: string;
  messageType: 'INFO' | 'WARNING' | 'ACTION_REQUIRED' | 'CRITICAL' | 'SUCCESS';
  title: string;
  content: string;
  timestamp: Date;
  metadata?: {
    codeChanges?: string[];
    performance_impact?: number;
    estimated_fix_time?: string;
    requires_approval?: boolean;
    spatial_components?: boolean;
  };
  actions?: {
    id: string;
    label: string;
    type: 'APPROVE' | 'REJECT' | 'MODIFY' | 'ESCALATE';
  }[];
}

interface TeamMember {
  id: string;
  name: string;
  role: string;
  availability: 'AVAILABLE' | 'BUSY' | 'OFFLINE';
  expertise: string[];
  notification_preferences: {
    slack?: boolean;
    email?: boolean;
    sms?: boolean;
    push?: boolean;
  };
  timezone: string;
}

interface NotificationRoute {
  channel: 'SLACK' | 'EMAIL' | 'SMS' | 'PUSH' | 'DASHBOARD';
  priority: number;
  delay_minutes?: number;
  batch_eligible?: boolean;
}

interface CommunicationConfig {
  team_preferences: {
    primary_channel: string;
    batch_notifications: boolean;
    quiet_hours: { start: string; end: string; timezone: string };
  };
  escalation_rules: {
    no_response_timeout: number; // minutes
    escalation_chain: string[]; // role hierarchy
  };
  message_routing: {
    INFO: NotificationRoute[];
    WARNING: NotificationRoute[];
    ACTION_REQUIRED: NotificationRoute[];
    CRITICAL: NotificationRoute[];
  };
}

export class TeamCommunicationHub extends EventEmitter {
  private teamMembers: Map<string, TeamMember> = new Map();
  private messageQueue: AgentMessage[] = [];
  private batchedMessages: Map<string, AgentMessage[]> = new Map();
  private config: CommunicationConfig;
  private wsClients: Set<WebSocket> = new Set();
  
  constructor(config: CommunicationConfig) {
    super();
    this.config = config;
    this.initializeBatchProcessor();
  }
  
  /**
   * Register team members for targeted communication
   */
  public registerTeamMember(member: TeamMember): void {
    this.teamMembers.set(member.id, member);
    this.emit('team_member_registered', member);
  }
  
  /**
   * Main entry point for agent communication
   */
  public async notifyTeam(message: AgentMessage): Promise<void> {
    this.emit('message_received', message);
    
    // Route message based on type and urgency
    const routes = this.determineOptimalRoutes(message);
    
    if (message.messageType === 'CRITICAL') {
      await this.sendImmediate(message, routes);
    } else if (this.shouldBatch(message)) {
      this.addToBatch(message);
    } else {
      await this.sendWithDelay(message, routes);
    }
    
    // Store message for dashboard and audit
    this.messageQueue.push(message);
    this.trimMessageQueue();
  }
  
  /**
   * Real-time dashboard notifications via WebSocket
   */
  public addWebSocketClient(ws: WebSocket): void {
    this.wsClients.add(ws);
    
    ws.on('close', () => {
      this.wsClients.delete(ws);
    });
    
    // Send recent messages to new client
    const recentMessages = this.messageQueue.slice(-20);
    ws.send(JSON.stringify({
      type: 'INITIAL_STATE',
      messages: recentMessages
    }));
  }
  
  /**
   * Handle team member responses to agent messages
   */
  public async handleTeamResponse(messageId: string, response: {
    action: string;
    feedback?: string;
    member_id: string;
  }): Promise<void> {
    const message = this.messageQueue.find(m => m.id === messageId);
    if (!message) {
      throw new Error(`Message ${messageId} not found`);
    }
    
    this.emit('team_response', { message, response });
    
    // Route response back to the appropriate agent
    this.notifyAgent(message.agentType, {
      type: 'HUMAN_RESPONSE',
      original_message: message,
      response
    });
  }
  
  /**
   * Intelligent message routing based on content and team state
   */
  private determineOptimalRoutes(message: AgentMessage): NotificationRoute[] {
    const baseRoutes = this.config.message_routing[message.messageType] || [];
    
    const factors = {
      teamAvailability: this.getTeamAvailability(),
      messageUrgency: this.calculateUrgency(message),
      spatialComplexity: message.metadata?.spatial_components ? 0.8 : 0.2,
      requiresExpertise: this.requiresSpecializedExpertise(message),
      currentWorkload: this.assessTeamWorkload()
    };
    
    // Adjust routes based on current conditions
    return baseRoutes.map(route => ({
      ...route,
      priority: route.priority * this.calculateRoutePriority(factors),
      delay_minutes: this.calculateOptimalDelay(route, factors)
    })).sort((a, b) => b.priority - a.priority);
  }
  
  /**
   * Send immediate notifications for critical issues
   */
  private async sendImmediate(message: AgentMessage, routes: NotificationRoute[]): Promise<void> {
    const promises = routes.map(route => this.sendViaChannel(message, route));
    await Promise.all(promises);
    
    // Also broadcast to all connected WebSocket clients
    this.broadcastToWebSockets({
      type: 'CRITICAL_MESSAGE',
      message
    });
  }
  
  /**
   * Send with strategic delay to minimize interruption
   */
  private async sendWithDelay(message: AgentMessage, routes: NotificationRoute[]): Promise<void> {
    for (const route of routes) {
      const delay = route.delay_minutes || 0;
      
      setTimeout(async () => {
        await this.sendViaChannel(message, route);
      }, delay * 60 * 1000);
    }
    
    // Immediate dashboard notification
    this.broadcastToWebSockets({
      type: 'MESSAGE',
      message
    });
  }
  
  /**
   * Channel-specific message delivery
   */
  private async sendViaChannel(message: AgentMessage, route: NotificationRoute): Promise<void> {
    try {
      switch (route.channel) {
        case 'SLACK':
          await this.sendSlackMessage(message);
          break;
        case 'EMAIL':
          await this.sendEmailMessage(message);
          break;
        case 'SMS':
          await this.sendSMSMessage(message);
          break;
        case 'PUSH':
          await this.sendPushNotification(message);
          break;
        case 'DASHBOARD':
          this.broadcastToWebSockets({ type: 'MESSAGE', message });
          break;
      }
      
      this.emit('message_sent', { message, route });
    } catch (error) {
      this.emit('message_send_failed', { message, route, error });
    }
  }
  
  /**
   * Slack integration for team notifications
   */
  private async sendSlackMessage(message: AgentMessage): Promise<void> {
    const slackPayload = {
      text: `🤖 ${message.agentType}: ${message.title}`,
      attachments: [
        {
          color: this.getSlackColor(message.messageType),
          fields: [
            {
              title: 'Details',
              value: message.content,
              short: false
            },
            {
              title: 'Timestamp',
              value: message.timestamp.toISOString(),
              short: true
            }
          ],
          actions: message.actions?.map(action => ({
            name: action.id,
            text: action.label,
            type: 'button',
            value: action.id
          })) || []
        }
      ]
    };
    
    // Simulate Slack API call - replace with actual implementation
    console.log('Slack message sent:', slackPayload);
  }
  
  /**
   * Email notifications for important updates
   */
  private async sendEmailMessage(message: AgentMessage): Promise<void> {
    const emailContent = {
      to: this.getRelevantTeamEmails(message),
      subject: `GIS Platform Agent: ${message.title}`,
      html: this.generateEmailHTML(message),
      priority: message.messageType === 'CRITICAL' ? 'high' : 'normal'
    };
    
    console.log('Email sent:', emailContent);
  }
  
  /**
   * SMS for critical alerts when immediate attention is needed
   */
  private async sendSMSMessage(message: AgentMessage): Promise<void> {
    if (message.messageType !== 'CRITICAL') return;
    
    const smsContent = {
      to: this.getOnCallNumbers(),
      message: `CRITICAL: ${message.title} - Check GIS Platform dashboard for details`
    };
    
    console.log('SMS sent:', smsContent);
  }
  
  /**
   * Push notifications for mobile team members
   */
  private async sendPushNotification(message: AgentMessage): Promise<void> {
    const pushPayload = {
      title: `GIS Platform: ${message.agentType}`,
      body: message.title,
      data: {
        messageId: message.id,
        agentType: message.agentType,
        messageType: message.messageType
      }
    };
    
    console.log('Push notification sent:', pushPayload);
  }
  
  /**
   * Broadcast to all connected WebSocket clients
   */
  private broadcastToWebSockets(data: any): void {
    const message = JSON.stringify(data);
    this.wsClients.forEach(ws => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(message);
      }
    });
  }
  
  /**
   * Batching system for non-urgent notifications
   */
  private initializeBatchProcessor(): void {
    setInterval(() => {
      this.processBatchedMessages();
    }, 15 * 60 * 1000); // Process batches every 15 minutes
  }
  
  private shouldBatch(message: AgentMessage): boolean {
    return this.config.team_preferences.batch_notifications &&
           ['INFO', 'WARNING'].includes(message.messageType) &&
           !this.isInQuietHours();
  }
  
  private addToBatch(message: AgentMessage): void {
    const batchKey = `${message.messageType}_${this.getBatchTimeWindow()}`;
    
    if (!this.batchedMessages.has(batchKey)) {
      this.batchedMessages.set(batchKey, []);
    }
    
    this.batchedMessages.get(batchKey)!.push(message);
  }
  
  private async processBatchedMessages(): Promise<void> {
    for (const [batchKey, messages] of this.batchedMessages.entries()) {
      if (messages.length > 0) {
        await this.sendBatchDigest(messages);
        this.batchedMessages.set(batchKey, []);
      }
    }
  }
  
  private async sendBatchDigest(messages: AgentMessage[]): Promise<void> {
    const digest = {
      id: `batch_${Date.now()}`,
      agentType: 'SYSTEM',
      messageType: 'INFO' as const,
      title: `Daily Digest: ${messages.length} Updates`,
      content: this.generateDigestContent(messages),
      timestamp: new Date(),
      metadata: {
        batch_size: messages.length,
        message_types: this.summarizeMessageTypes(messages)
      }
    };
    
    await this.sendViaChannel(digest, {
      channel: this.config.team_preferences.primary_channel as any,
      priority: 0.5
    });
  }
  
  /**
   * Agent response routing
   */
  private notifyAgent(agentType: string, notification: any): void {
    this.emit('agent_notification', { agentType, notification });
  }
  
  // Utility methods
  private getTeamAvailability(): number {
    const availableMembers = Array.from(this.teamMembers.values())
      .filter(member => member.availability === 'AVAILABLE').length;
    
    return this.teamMembers.size > 0 ? availableMembers / this.teamMembers.size : 0.5;
  }
  
  private calculateUrgency(message: AgentMessage): number {
    const urgencyMap = {
      'CRITICAL': 1.0,
      'ACTION_REQUIRED': 0.8,
      'WARNING': 0.6,
      'INFO': 0.3,
      'SUCCESS': 0.2
    };
    
    return urgencyMap[message.messageType];
  }
  
  private requiresSpecializedExpertise(message: AgentMessage): boolean {
    const spatialKeywords = ['postgis', 'spatial', 'geometry', 'coordinate', 'map', 'gis'];
    const content = (message.title + ' ' + message.content).toLowerCase();
    
    return spatialKeywords.some(keyword => content.includes(keyword));
  }
  
  private assessTeamWorkload(): number {
    const busyMembers = Array.from(this.teamMembers.values())
      .filter(member => member.availability === 'BUSY').length;
    
    return this.teamMembers.size > 0 ? busyMembers / this.teamMembers.size : 0.5;
  }
  
  private calculateRoutePriority(factors: any): number {
    return Math.min(1.0, 
      factors.messageUrgency + 
      (1 - factors.teamAvailability) * 0.3 + 
      factors.spatialComplexity * 0.2
    );
  }
  
  private calculateOptimalDelay(route: NotificationRoute, factors: any): number {
    if (factors.teamAvailability < 0.3) {
      return (route.delay_minutes || 0) * 1.5; // Delay more when team is busy
    }
    
    return route.delay_minutes || 0;
  }
  
  private getSlackColor(messageType: string): string {
    const colorMap = {
      'CRITICAL': 'danger',
      'ACTION_REQUIRED': 'warning',
      'WARNING': 'warning',
      'INFO': 'good',
      'SUCCESS': 'good'
    };
    
    return colorMap[messageType] || 'good';
  }
  
  private getRelevantTeamEmails(message: AgentMessage): string[] {
    // Filter team members based on expertise and availability
    return Array.from(this.teamMembers.values())
      .filter(member => this.isRelevantForMember(member, message))
      .map(member => `${member.name}@company.com`);
  }
  
  private isRelevantForMember(member: TeamMember, message: AgentMessage): boolean {
    if (message.messageType === 'CRITICAL') return true;
    
    if (message.metadata?.spatial_components) {
      return member.expertise.some(skill => 
        ['gis', 'spatial', 'postgis', 'mapping'].includes(skill.toLowerCase())
      );
    }
    
    return member.availability === 'AVAILABLE';
  }
  
  private getOnCallNumbers(): string[] {
    return Array.from(this.teamMembers.values())
      .filter(member => member.role === 'on-call')
      .map(member => '+1234567890'); // Placeholder
  }
  
  private generateEmailHTML(message: AgentMessage): string {
    return `
      <html>
        <body>
          <h2>🤖 GIS Platform Agent Update</h2>
          <h3>${message.title}</h3>
          <p><strong>Agent:</strong> ${message.agentType}</p>
          <p><strong>Type:</strong> ${message.messageType}</p>
          <p><strong>Time:</strong> ${message.timestamp.toISOString()}</p>
          <div>
            <h4>Details:</h4>
            <p>${message.content}</p>
          </div>
          ${message.actions ? `
            <div>
              <h4>Available Actions:</h4>
              <ul>
                ${message.actions.map(action => `<li>${action.label}</li>`).join('')}
              </ul>
            </div>
          ` : ''}
        </body>
      </html>
    `;
  }
  
  private isInQuietHours(): boolean {
    const now = new Date();
    const quietStart = this.config.team_preferences.quiet_hours?.start;
    const quietEnd = this.config.team_preferences.quiet_hours?.end;
    
    if (!quietStart || !quietEnd) return false;
    
    // Simplified quiet hours check - in production, handle timezone properly
    const currentHour = now.getHours();
    const startHour = parseInt(quietStart.split(':')[0]);
    const endHour = parseInt(quietEnd.split(':')[0]);
    
    return currentHour >= startHour || currentHour <= endHour;
  }
  
  private getBatchTimeWindow(): string {
    const now = new Date();
    return `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}-${Math.floor(now.getHours() / 4)}`;
  }
  
  private generateDigestContent(messages: AgentMessage[]): string {
    const summary = messages.reduce((acc, msg) => {
      acc[msg.agentType] = (acc[msg.agentType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    return `Agent Activity Summary:\n${Object.entries(summary)
      .map(([agent, count]) => `• ${agent}: ${count} updates`)
      .join('\n')}`;
  }
  
  private summarizeMessageTypes(messages: AgentMessage[]): Record<string, number> {
    return messages.reduce((acc, msg) => {
      acc[msg.messageType] = (acc[msg.messageType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }
  
  private trimMessageQueue(): void {
    if (this.messageQueue.length > 1000) {
      this.messageQueue = this.messageQueue.slice(-500); // Keep last 500 messages
    }
  }
}

export default TeamCommunicationHub;