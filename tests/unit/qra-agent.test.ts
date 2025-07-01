import { describe, it, expect } from '@jest/globals';

// QRA Agent Basic Functionality Tests
describe('QRA Agent Integration Tests', () => {
  it('should be able to import QRA agent module', () => {
    const QRAAgent = require('../../scripts/qra-agent.js');
    expect(QRAAgent).toBeDefined();
    expect(typeof QRAAgent).toBe('function');
  });

  it('should create QRA agent instance with proper initialization', () => {
    const QRAAgent = require('../../scripts/qra-agent.js');
    const agent = new QRAAgent();
    
    expect(agent).toBeDefined();
    expect(agent.testResults).toBeDefined();
    expect(agent.issues).toBeDefined();
    expect(agent.verdict).toBe('PENDING');
    expect(Array.isArray(agent.issues)).toBe(true);
  });

  it('should have required test result properties', () => {
    const QRAAgent = require('../../scripts/qra-agent.js');
    const agent = new QRAAgent();
    
    const requiredProperties = [
      'codeQuality',
      'testCoverage', 
      'desktopUX',
      'mobileUX',
      'performance',
      'accessibility',
      'security'
    ];

    for (const prop of requiredProperties) {
      expect(agent.testResults).toHaveProperty(prop);
    }
  });

  it('should have logging functionality', () => {
    const QRAAgent = require('../../scripts/qra-agent.js');
    const agent = new QRAAgent();
    
    expect(typeof agent.log).toBe('function');
    
    // Should not throw when logging
    expect(() => {
      agent.log('Test message');
      agent.log('Test warning', 'WARN');
      agent.log('Test error', 'ERROR');
    }).not.toThrow();
  });

  it('should have proper verdict determination logic', () => {
    const QRAAgent = require('../../scripts/qra-agent.js');
    const agent = new QRAAgent();
    
    expect(typeof agent.determineVerdict).toBe('function');
    
    // Test with no issues
    agent.issues = [];
    agent.determineVerdict();
    expect(agent.verdict).toBe('APPROVED');
    
    // Test with critical issues
    agent.issues = ['Build failure detected'];
    agent.determineVerdict();
    expect(agent.verdict).toBe('REJECTED');
    
    // Test with many issues
    agent.issues = Array(12).fill('Minor issue');
    agent.determineVerdict();
    expect(agent.verdict).toBe('MAJOR');
    
    // Test with few issues  
    agent.issues = Array(3).fill('Minor issue');
    agent.determineVerdict();
    expect(agent.verdict).toBe('APPROVED'); // Fixed: 3 issues should still be APPROVED (threshold is >5 for MINOR)
  });

  it('should generate proper report format', () => {
    const QRAAgent = require('../../scripts/qra-agent.js');
    const agent = new QRAAgent();
    
    agent.verdict = 'APPROVED';
    agent.testResults.testCoverage = 90;
    agent.testResults.codeQuality = 'PASS';
    
    const report = agent.generateReport();
    
    expect(typeof report).toBe('string');
    expect(report).toContain('QRA Review');
    expect(report).toContain('**Verdict**: APPROVED');
    expect(report).toContain('Test Coverage | 90%');
    expect(report).toContain('Code Quality | PASS');
    expect(report).toContain('QRA-001 Quality Review Agent');
  });

  it('should handle source file detection', () => {
    const QRAAgent = require('../../scripts/qra-agent.js');
    const agent = new QRAAgent();
    
    expect(typeof agent.getSourceFiles).toBe('function');
    
    const sourceFiles = agent.getSourceFiles();
    expect(Array.isArray(sourceFiles)).toBe(true);
    
    // Should find at least some source files
    const hasTypeScriptFiles = sourceFiles.some(file => 
      file.endsWith('.ts') || file.endsWith('.tsx')
    );
    const hasJavaScriptFiles = sourceFiles.some(file => 
      file.endsWith('.js') || file.endsWith('.jsx')
    );
    
    expect(hasTypeScriptFiles || hasJavaScriptFiles).toBe(true);
  });
});