#!/usr/bin/env node

/**
 * Startup script for GIS Platform Enterprise Multi-Agent Orchestration Framework
 */

import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';
import { createLogger, format, transports } from 'winston';
import { OrchestrationEngine, OrchestrationConfig } from '../framework/orchestration-engine';
import { 
  AutonomyLevel,
  TaskType,
  AgentCapability
} from '../types/autonomy';

// Environment configuration
const NODE_ENV = process.env.NODE_ENV || 'development';
const LOG_LEVEL = process.env.LOG_LEVEL || 'info';
const CONFIG_PATH = process.env.CONFIG_PATH || path.join(__dirname, '../configs/orchestration-config.yaml');

// Logger setup
const logger = createLogger({
  level: LOG_LEVEL,
  format: format.combine(
    format.timestamp(),
    format.errors({ stack: true }),
    format.json()
  ),
  defaultMeta: { service: 'gis-orchestration' },
  transports: [
    new transports.File({ filename: 'logs/error.log', level: 'error' }),
    new transports.File({ filename: 'logs/combined.log' }),
    new transports.Console({
      format: format.combine(
        format.colorize(),
        format.simple()
      )
    })
  ]
});

/**
 * Load configuration from YAML file
 */
function loadConfiguration(): OrchestrationConfig {
  try {
    if (!fs.existsSync(CONFIG_PATH)) {
      throw new Error(`Configuration file not found: ${CONFIG_PATH}`);
    }

    const configFile = fs.readFileSync(CONFIG_PATH, 'utf8');
    const yamlConfig = yaml.load(configFile) as any;
    
    // Transform YAML config to TypeScript config
    const config: OrchestrationConfig = {
      autonomy: {
        level: yamlConfig.spec.autonomy.level as AutonomyLevel,
        capabilities: [], // Will be populated from agents
        decisionThresholds: yamlConfig.spec.autonomy.decisionThresholds,
        humanInterventionRules: {
          alwaysRequireFor: yamlConfig.spec.autonomy.humanInterventionRules.alwaysRequireFor.map(
            (t: string) => t as TaskType
          ),
          complexityThreshold: yamlConfig.spec.autonomy.humanInterventionRules.complexityThreshold,
          riskThreshold: yamlConfig.spec.autonomy.humanInterventionRules.riskThreshold
        }
      },
      performanceThresholds: yamlConfig.spec.performanceThresholds,
      agents: yamlConfig.spec.agents.map((agent: any) => ({
        id: agent.id,
        name: agent.name,
        type: agent.type,
        capabilities: agent.capabilities.map((c: string) => c as AgentCapability),
        autonomyLevel: agent.autonomyLevel as AutonomyLevel,
        specializations: agent.specializations,
        constraints: agent.constraints,
        performance: {
          tasksCompleted: agent.performance.tasksCompleted,
          successRate: agent.performance.successRate,
          averageTime: agent.performance.averageTime,
          lastActive: new Date(agent.performance.lastActive)
        }
      })),
      globalSettings: yamlConfig.spec.globalSettings
    };

    // Validate configuration
    validateConfiguration(config);
    
    return config;
    
  } catch (error) {
    logger.error('Failed to load configuration', { error: error.message });
    throw error;
  }
}

/**
 * Validate configuration
 */
function validateConfiguration(config: OrchestrationConfig): void {
  // Validate autonomy level
  if (!Object.values(AutonomyLevel).includes(config.autonomy.level)) {
    throw new Error(`Invalid autonomy level: ${config.autonomy.level}`);
  }

  // Validate agents
  if (config.agents.length === 0) {
    throw new Error('No agents configured');
  }

  // Validate thresholds
  const thresholds = config.autonomy.decisionThresholds;
  if (thresholds.confidence < 0 || thresholds.confidence > 100) {
    throw new Error('Invalid confidence threshold (must be 0-100)');
  }

  logger.info('Configuration validation passed', {
    agentCount: config.agents.length,
    autonomyLevel: config.autonomy.level
  });
}

/**
 * Setup signal handlers for graceful shutdown
 */
function setupSignalHandlers(engine: OrchestrationEngine): void {
  const shutdown = async (signal: string) => {
    logger.info(`Received ${signal}, shutting down gracefully`);
    
    try {
      await engine.stop();
      logger.info('Orchestration engine stopped successfully');
      process.exit(0);
    } catch (error) {
      logger.error('Error during shutdown', { error: error.message });
      process.exit(1);
    }
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGQUIT', () => shutdown('SIGQUIT'));
}

/**
 * Setup health check endpoint
 */
function setupHealthCheck(engine: OrchestrationEngine): void {
  const express = require('express');
  const app = express();
  const port = process.env.HEALTH_CHECK_PORT || 8080;

  app.get('/health', (req: any, res: any) => {
    const status = engine.getSystemStatus();
    
    res.json({
      status: status.status,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      agents: status.agents.length,
      activeTasks: status.activeTasks,
      queueDepth: status.queueDepth
    });
  });

  app.get('/metrics', (req: any, res: any) => {
    const status = engine.getSystemStatus();
    res.json(status.performance);
  });

  app.listen(port, () => {
    logger.info(`Health check endpoint available at http://localhost:${port}/health`);
  });
}

/**
 * Create log directories
 */
function createLogDirectories(): void {
  const logDir = path.join(__dirname, '../logs');
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }
}

/**
 * Print startup banner
 */
function printBanner(): void {
  const banner = `
╔══════════════════════════════════════════════════════════════╗
║                                                              ║
║   GIS Platform Enterprise Multi-Agent Orchestration         ║
║   Framework v1.0.0                                          ║
║                                                              ║
║   Environment: ${NODE_ENV.padEnd(8)}                                      ║
║   Log Level:   ${LOG_LEVEL.padEnd(8)}                                      ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
`;
  console.log(banner);
}

/**
 * Main startup function
 */
async function main(): Promise<void> {
  try {
    // Print banner
    printBanner();

    // Create log directories
    createLogDirectories();

    logger.info('Starting GIS Platform Orchestration Framework', {
      environment: NODE_ENV,
      logLevel: LOG_LEVEL,
      configPath: CONFIG_PATH
    });

    // Load configuration
    const config = loadConfiguration();
    logger.info('Configuration loaded successfully');

    // Create orchestration engine
    const engine = new OrchestrationEngine(config, logger);

    // Setup signal handlers
    setupSignalHandlers(engine);

    // Setup health check
    setupHealthCheck(engine);

    // Start the engine
    await engine.start();

    logger.info('GIS Platform Orchestration Framework started successfully', {
      agentCount: config.agents.length,
      autonomyLevel: config.autonomy.level,
      pid: process.pid
    });

    // Log system status periodically
    setInterval(() => {
      const status = engine.getSystemStatus();
      logger.info('System status update', {
        status: status.status,
        activeAgents: status.agents.filter(a => a.status === 'healthy').length,
        totalAgents: status.agents.length,
        activeTasks: status.activeTasks,
        queueDepth: status.queueDepth
      });
    }, 60000); // Every minute

  } catch (error) {
    logger.error('Failed to start orchestration framework', {
      error: error.message,
      stack: error.stack
    });
    process.exit(1);
  }
}

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception', { error: error.message, stack: error.stack });
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled rejection', { reason, promise });
  process.exit(1);
});

// Start the application
if (require.main === module) {
  main().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export { main };