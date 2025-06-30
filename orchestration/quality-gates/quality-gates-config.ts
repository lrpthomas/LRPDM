/**
 * Quality Gates Configuration for GIS Platform
 * Automated review protocols and quality assurance checks
 */

import { QualityGate, QualityCriteria } from '../types/autonomy';

export interface QualityGateConfig {
  gates: QualityGate[];
  globalSettings: {
    failureStrategy: 'abort' | 'escalate' | 'retry' | 'warn';
    retryAttempts: number;
    retryDelay: number;
    notificationChannels: string[];
  };
}

export const qualityGatesConfig: QualityGateConfig = {
  gates: [
    // Code Quality Gates
    {
      id: 'code-quality-typescript',
      name: 'TypeScript Compilation',
      type: 'pre-execution',
      criteria: [
        {
          metric: 'typescript_errors',
          operator: 'equals',
          threshold: 0,
          description: 'No TypeScript compilation errors'
        },
        {
          metric: 'strict_mode',
          operator: 'equals',
          threshold: 'true',
          description: 'TypeScript strict mode enabled'
        }
      ],
      severity: 'FATAL',
      automated: true
    },
    {
      id: 'code-quality-linting',
      name: 'ESLint Standards',
      type: 'pre-execution',
      criteria: [
        {
          metric: 'eslint_errors',
          operator: 'equals',
          threshold: 0,
          description: 'No ESLint errors'
        },
        {
          metric: 'eslint_warnings',
          operator: 'less',
          threshold: 5,
          description: 'Maximum 5 ESLint warnings'
        }
      ],
      severity: 'ERROR',
      automated: true
    },
    {
      id: 'code-coverage',
      name: 'Test Coverage Requirements',
      type: 'post-execution',
      criteria: [
        {
          metric: 'line_coverage',
          operator: 'greater',
          threshold: 80,
          description: 'Minimum 80% line coverage'
        },
        {
          metric: 'branch_coverage',
          operator: 'greater',
          threshold: 75,
          description: 'Minimum 75% branch coverage'
        },
        {
          metric: 'function_coverage',
          operator: 'greater',
          threshold: 80,
          description: 'Minimum 80% function coverage'
        }
      ],
      severity: 'ERROR',
      automated: true
    },

    // Security Gates
    {
      id: 'security-dependencies',
      name: 'Dependency Security Scan',
      type: 'pre-execution',
      criteria: [
        {
          metric: 'critical_vulnerabilities',
          operator: 'equals',
          threshold: 0,
          description: 'No critical security vulnerabilities'
        },
        {
          metric: 'high_vulnerabilities',
          operator: 'less',
          threshold: 3,
          description: 'Maximum 3 high severity vulnerabilities'
        }
      ],
      severity: 'FATAL',
      automated: true
    },
    {
      id: 'security-secrets',
      name: 'Secret Detection',
      type: 'pre-execution',
      criteria: [
        {
          metric: 'exposed_secrets',
          operator: 'equals',
          threshold: 0,
          description: 'No exposed secrets or credentials'
        },
        {
          metric: 'hardcoded_endpoints',
          operator: 'equals',
          threshold: 0,
          description: 'No hardcoded production endpoints'
        }
      ],
      severity: 'FATAL',
      automated: true
    },

    // Performance Gates
    {
      id: 'performance-api-response',
      name: 'API Response Time',
      type: 'post-execution',
      criteria: [
        {
          metric: 'p50_response_time',
          operator: 'less',
          threshold: 100,
          description: 'P50 response time under 100ms'
        },
        {
          metric: 'p95_response_time',
          operator: 'less',
          threshold: 200,
          description: 'P95 response time under 200ms'
        },
        {
          metric: 'p99_response_time',
          operator: 'less',
          threshold: 500,
          description: 'P99 response time under 500ms'
        }
      ],
      severity: 'WARNING',
      automated: true
    },
    {
      id: 'performance-spatial-query',
      name: 'Spatial Query Performance',
      type: 'post-execution',
      criteria: [
        {
          metric: 'spatial_query_time',
          operator: 'less',
          threshold: 1000,
          description: 'Spatial queries complete within 1 second'
        },
        {
          metric: 'geometry_processing_time',
          operator: 'less',
          threshold: 500,
          description: 'Geometry processing under 500ms'
        }
      ],
      severity: 'ERROR',
      automated: true
    },

    // Database Gates
    {
      id: 'database-migration-safety',
      name: 'Migration Safety Check',
      type: 'pre-execution',
      criteria: [
        {
          metric: 'reversible_migration',
          operator: 'equals',
          threshold: 'true',
          description: 'Migration must be reversible'
        },
        {
          metric: 'data_loss_risk',
          operator: 'equals',
          threshold: 'false',
          description: 'No risk of data loss'
        },
        {
          metric: 'index_lock_duration',
          operator: 'less',
          threshold: 5000,
          description: 'Index creation locks table for less than 5 seconds'
        }
      ],
      severity: 'FATAL',
      automated: true
    },
    {
      id: 'database-query-optimization',
      name: 'Query Optimization Requirements',
      type: 'pre-execution',
      criteria: [
        {
          metric: 'query_cost',
          operator: 'less',
          threshold: 10000,
          description: 'Query cost below threshold'
        },
        {
          metric: 'full_table_scans',
          operator: 'equals',
          threshold: 0,
          description: 'No full table scans on large tables'
        },
        {
          metric: 'index_usage',
          operator: 'equals',
          threshold: 'true',
          description: 'Appropriate indexes used'
        }
      ],
      severity: 'ERROR',
      automated: true
    },

    // Infrastructure Gates
    {
      id: 'infrastructure-resource-limits',
      name: 'Resource Limit Validation',
      type: 'pre-execution',
      criteria: [
        {
          metric: 'cpu_request_defined',
          operator: 'equals',
          threshold: 'true',
          description: 'CPU requests defined for all containers'
        },
        {
          metric: 'memory_limit_defined',
          operator: 'equals',
          threshold: 'true',
          description: 'Memory limits defined for all containers'
        },
        {
          metric: 'resource_quota_compliance',
          operator: 'equals',
          threshold: 'true',
          description: 'Resources within namespace quotas'
        }
      ],
      severity: 'ERROR',
      automated: true
    },
    {
      id: 'infrastructure-health-checks',
      name: 'Health Check Configuration',
      type: 'pre-execution',
      criteria: [
        {
          metric: 'liveness_probe_defined',
          operator: 'equals',
          threshold: 'true',
          description: 'Liveness probe configured'
        },
        {
          metric: 'readiness_probe_defined',
          operator: 'equals',
          threshold: 'true',
          description: 'Readiness probe configured'
        },
        {
          metric: 'startup_probe_defined',
          operator: 'equals',
          threshold: 'true',
          description: 'Startup probe configured for slow-starting containers'
        }
      ],
      severity: 'ERROR',
      automated: true
    },

    // Compliance Gates
    {
      id: 'compliance-data-privacy',
      name: 'Data Privacy Compliance',
      type: 'continuous',
      criteria: [
        {
          metric: 'pii_encryption',
          operator: 'equals',
          threshold: 'true',
          description: 'All PII data encrypted at rest'
        },
        {
          metric: 'data_retention_policy',
          operator: 'equals',
          threshold: 'implemented',
          description: 'Data retention policy implemented'
        },
        {
          metric: 'consent_management',
          operator: 'equals',
          threshold: 'active',
          description: 'User consent properly managed'
        }
      ],
      severity: 'FATAL',
      automated: true
    },
    {
      id: 'compliance-audit-logging',
      name: 'Audit Logging Requirements',
      type: 'continuous',
      criteria: [
        {
          metric: 'audit_log_enabled',
          operator: 'equals',
          threshold: 'true',
          description: 'Audit logging enabled for all sensitive operations'
        },
        {
          metric: 'log_retention_days',
          operator: 'greater',
          threshold: 90,
          description: 'Logs retained for at least 90 days'
        },
        {
          metric: 'log_integrity',
          operator: 'equals',
          threshold: 'verified',
          description: 'Log integrity verification in place'
        }
      ],
      severity: 'ERROR',
      automated: true
    }
  ],

  globalSettings: {
    failureStrategy: 'escalate',
    retryAttempts: 3,
    retryDelay: 5000, // 5 seconds
    notificationChannels: [
      'slack://gis-platform-alerts',
      'email://devops@gis-platform.com',
      'pagerduty://gis-platform-oncall'
    ]
  }
};

/**
 * Quality gate executor that runs checks against criteria
 */
export class QualityGateExecutor {
  constructor(private config: QualityGateConfig) {}

  async executeGate(gateId: string, metrics: Record<string, any>): Promise<{
    passed: boolean;
    failures: Array<{ criteria: QualityCriteria; actual: any }>;
    warnings: Array<{ criteria: QualityCriteria; actual: any }>;
  }> {
    const gate = this.config.gates.find(g => g.id === gateId);
    if (!gate) {
      throw new Error(`Quality gate ${gateId} not found`);
    }

    const failures: Array<{ criteria: QualityCriteria; actual: any }> = [];
    const warnings: Array<{ criteria: QualityCriteria; actual: any }> = [];

    for (const criteria of gate.criteria) {
      const actual = metrics[criteria.metric];
      const passed = this.evaluateCriteria(criteria, actual);

      if (!passed) {
        if (gate.severity === 'FATAL' || gate.severity === 'ERROR') {
          failures.push({ criteria, actual });
        } else {
          warnings.push({ criteria, actual });
        }
      }
    }

    return {
      passed: failures.length === 0,
      failures,
      warnings
    };
  }

  private evaluateCriteria(criteria: QualityCriteria, actual: any): boolean {
    const threshold = criteria.threshold;

    switch (criteria.operator) {
      case 'equals':
        return actual === threshold;
      case 'greater':
        return Number(actual) > Number(threshold);
      case 'less':
        return Number(actual) < Number(threshold);
      case 'contains':
        return String(actual).includes(String(threshold));
      case 'regex':
        return new RegExp(String(threshold)).test(String(actual));
      default:
        return false;
    }
  }

  async executeAllGates(
    gateType: 'pre-execution' | 'post-execution' | 'continuous',
    metrics: Record<string, any>
  ): Promise<{
    overallPassed: boolean;
    results: Array<{
      gateId: string;
      gateName: string;
      passed: boolean;
      failures: Array<{ criteria: QualityCriteria; actual: any }>;
      warnings: Array<{ criteria: QualityCriteria; actual: any }>;
    }>;
  }> {
    const gates = this.config.gates.filter(g => g.type === gateType);
    const results = [];
    let overallPassed = true;

    for (const gate of gates) {
      const result = await this.executeGate(gate.id, metrics);
      results.push({
        gateId: gate.id,
        gateName: gate.name,
        ...result
      });

      if (!result.passed) {
        overallPassed = false;
      }
    }

    return {
      overallPassed,
      results
    };
  }
}